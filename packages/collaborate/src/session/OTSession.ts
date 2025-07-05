import Delta from "quill-delta";
import { DocumentModel } from "../model/DocumentModel";
import { OTEngine } from "../engine/OTEngine";
import { ClientMessage } from "../transport";

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

  /** 本地提交：立即 apply 到文档，同时记录为未确认状态 */
  commitLocal(msg: ClientMessage<Delta>): void {
    console.log(`[OTSession] commitLocal: ${JSON.stringify(msg.data)}`);
    this.unAckOps.push(msg);
    const op: Delta = msg.data as Delta;
    this.base = this.base.compose(op);
    this.document.apply(op); // 增量更新，无需 rebuild
  }

  /**
   * 接收远端操作，并 transform 后合入 base，再叠加本地未 ack 的操作
   */
  receiveRemote(remoteOp: Delta) {
    let transformed = remoteOp;

    this.unAckOps.forEach((localMsg) => {
      transformed = OTEngine.transform(localMsg.data, transformed);
    });

    this.base = this.base.compose(transformed);
    this.rebuildDocument();

    // 通知 UI 更新
    this.notifyRemoteChange(transformed);
  }

  /**
   * 服务端确认 ack 后，根据 uuid 精确移除本地未确认的 op
   */
  ackByIds(uuids: string[]): void {
    console.log(
      `[OTSession] before ackByIds: ${uuids.join(", ")}`,
      this.unAckOps
    );

    if (uuids.length === 0) return;

    this.unAckOps = this.unAckOps.filter((msg) => !uuids.includes(msg.uuid));

    console.log(
      `[OTSession] after ackByIds: ${uuids.join(", ")}`,
      this.unAckOps
    );

    this.rebuildDocument();
  }

  /** 重建视图文档：= base + 所有未确认操作 */
  private rebuildDocument(): void {
    let composed = this.base;
    for (const msg of this.unAckOps) {
      composed = composed.compose(msg.data);
    }
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
