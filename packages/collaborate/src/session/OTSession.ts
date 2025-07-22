import Delta from "quill-delta";
import { DocumentModel } from "../model/DocumentModel";
import { OTEngine } from "../engine/OTEngine";
import { ClientMessage } from "../transport";
import { AttributeConflictResolver } from "../utils/AttributeConflictResolver";
import { getGlobalLogger } from "../../../common/src/utils/Logger";

/**
 * 表示一个客户端的协同会话（OT Session）
 * 管理本地状态、未提交操作、服务端同步状态
 */
export class OTSession {
  private userId: string;

  // Shadow Document：与服务端同步的最后快照
  private base: Delta;

  // 所有尚未被服务器 ack 的本地操作（按顺序）
  private unAckOps: ClientMessage<Delta>[] = [];

  // 实际用户看到的当前文档内容（= base + unacknowledgedOps）
  private document: DocumentModel;

  // 远端变更监听器
  private remoteChangeListeners: ((delta: Delta) => void)[] = [];

  constructor(userId: string, initialContent?: Delta) {
    this.userId = userId;
    this.base = initialContent ?? new Delta();
    this.document = new DocumentModel(this.base);
  }

  /**
   * 注册远端变更回调
   */
  onRemoteChange(cb: (delta: Delta) => void) {
    this.remoteChangeListeners.push(cb);
  }

  /** 通知外部有远端变更 */
  private notifyRemoteChange(delta: Delta) {
    this.remoteChangeListeners.forEach((cb) => cb(delta));
  }

  /**
   * 清理 retain(0) 操作，避免 transform 问题
   * Quill 编辑器会产生 retain(0) 操作，这会导致 transform 结果错误
   */
  private cleanRetainZero(delta: Delta): Delta {
    const cleanedOps = delta.ops.filter((op) => !(op.retain === 0));
    return new Delta(cleanedOps);
  }

  /** 本地提交：立即 apply 到文档，同时记录为未确认状态 */
  commitLocal(msg: ClientMessage<Delta>): void {
    const logger = getGlobalLogger("collaborate");
    logger.info("commitLocal", JSON.stringify(msg.data));

    // 清理 retain(0) 操作，避免 transform 问题
    const cleanedOp = this.cleanRetainZero(msg.data as Delta);

    // 更新 unAckOps 中的操作
    const cleanedMsg = { ...msg, data: cleanedOp };
    this.unAckOps.push(cleanedMsg);
    // 只更新视图，不动 base
    this.document.apply(cleanedOp);
  }

  /**
   * 接收远端操作，并 transform 后合入 base，再叠加本地未 ack 的操作
   */
  receiveRemote(remoteOp: Delta) {
    const logger = getGlobalLogger("collaborate");
    logger.info("receiveRemote", JSON.stringify(remoteOp));
    logger.info("unAckOps", JSON.stringify(this.unAckOps));

    // 清理 retain(0) 操作，避免 transform 问题
    const cleanedRemoteOp = this.cleanRetainZero(remoteOp);

    // 正确的 OT 逻辑：远端操作需要被所有本地未确认操作 transform
    const transformed = this.unAckOps.reduce((acc, localMsg) => {
      // 同样清理本地操作中的 retain(0)
      const cleanedLocalOp = this.cleanRetainZero(localMsg.data);
      // 客户端处理：本地操作优先级更高（默认值 true）
      return OTEngine.transform(cleanedLocalOp, acc);
    }, cleanedRemoteOp);

    logger.info("transformed", JSON.stringify(transformed));

    // 检查并合并属性冲突（只有在确实有属性冲突时才合并）
    let mergedDelta = transformed;
    if (
      AttributeConflictResolver.isAttributeConflict(cleanedRemoteOp) &&
      AttributeConflictResolver.hasAttributeConflict(
        cleanedRemoteOp,
        transformed
      )
    ) {
      logger.info("检测到属性冲突，执行合并");
      mergedDelta = AttributeConflictResolver.mergeAttributeConflicts(
        cleanedRemoteOp,
        transformed,
        this.unAckOps,
        true // 客户端采用后到优先策略
      );
    } else {
      logger.info("无属性冲突，使用 transform 结果");
    }

    logger.info("merged", JSON.stringify(mergedDelta));

    // 将合并后的远端操作应用到 base
    this.base = this.base.compose(mergedDelta);

    // 本地未确认操作需要被远端操作 transform（反向）
    this.unAckOps.forEach((localMsg) => {
      // 客户端处理：远端操作优先级更高
      localMsg.data = OTEngine.transform(mergedDelta, localMsg.data, false);
    });

    this.rebuildDocument();

    // 通知 UI 更新
    this.notifyRemoteChange(mergedDelta);
  }

  /**
   * 服务端确认 ack 后，根据 uuid 精确移除本地未确认的 op
   *
   * @param uuids 被确认的操作 UUID 列表
   */
  ackByIds(uuids: string[]): void {
    if (uuids.length === 0) return;

    // 移除已确认的操作
    this.unAckOps = this.unAckOps.filter((msg) => !uuids.includes(msg.uuid));

    this.rebuildDocument();
  }

  /**
   * 应用服务端广播的最终操作到本地文档
   * 用于处理属性冲突等需要服务端最终决定的情况
   *
   * @param broadcastOp 服务端广播的最终操作
   */
  applyServerBroadcast(broadcastOp: Delta): void {
    const logger = getGlobalLogger("collaborate");
    logger.info(
      `applyServerBroadcast: 应用服务端广播操作 ${JSON.stringify(broadcastOp)}`
    );

    // 清理 retain(0) 操作
    const cleanedBroadcastOp = this.cleanRetainZero(broadcastOp);

    // 直接应用到 base，因为这是服务端的最终结果
    this.base = this.base.compose(cleanedBroadcastOp);

    // 通知 UI 更新，因为应用了服务端广播的操作
    this.notifyRemoteChange(cleanedBroadcastOp);

    this.rebuildDocument();
  }

  /** 重建视图文档：= base + 所有未确认操作 */
  private rebuildDocument(): void {
    const composed = this.unAckOps.reduce(
      (acc, msg) => acc.compose(msg.data),
      this.base
    );
    this.document.setContents(composed);
  }

  setContents(delta: Delta): void {
    this.base = delta;
    this.document.setContents(delta);
  }

  /** 直接应用远端已经 transform 过的操作（跳过 transform 流程） */
  apply(op: Delta): void {
    this.base = this.base.compose(op);
    this.document.apply(op);
    this.notifyRemoteChange(op);
  }

  getDocument(): DocumentModel {
    return this.document;
  }

  getUserId(): string {
    return this.userId;
  }

  destroy(): void {
    this.unAckOps = [];
    this.base = new Delta();
    this.document = new DocumentModel();
    this.remoteChangeListeners = [];
  }
}
