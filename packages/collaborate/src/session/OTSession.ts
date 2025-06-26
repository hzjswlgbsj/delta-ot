import Delta from "quill-delta";
import { DocumentModel } from "../model/DocumentModel";
import { OTEngine } from "../engine/OTEngine";

/**
 * 表示一个客户端的协同会话（OT Session）
 * 管理本地状态、未提交操作、服务端同步状态
 */
export class OTSession {
  private userId: string;

  // Shadow Document：与服务端同步的最后快照
  private base: Delta;

  // 所有尚未被服务器 ack 的本地操作（按顺序）
  private unAckOps: Delta[] = [];

  // 实际用户看到的当前文档内容（= base + unacknowledgedOps）
  private document: DocumentModel;

  // 远端变更监听器
  private remoteChangeListeners: ((delta: Delta) => void)[] = [];

  constructor(userId: string, initialContent?: Delta) {
    this.userId = userId;
    this.base = initialContent ?? new Delta();
    console.log(`[OTSession] 初始化文档: ${this.base}`);
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
  commitLocal(op: Delta): void {
    console.log(`[OTSession] commitLocal: ${JSON.stringify(op)}`);
    this.unAckOps.push(op);
    this.base = this.base.compose(op);
    this.document.apply(op); // 增量更新，无需 rebuild
  }

  /** 接收远端操作，并 transform 后合入 base，再叠加本地未 ack 的操作 */
  receiveRemote(remoteOp: Delta) {
    let transformed = remoteOp;

    this.unAckOps.forEach((localOp) => {
      transformed = OTEngine.transform(localOp, transformed);
    });

    this.base = this.base.compose(transformed);
    this.rebuildDocument();
    this.notifyRemoteChange(transformed); // 通知监听者
  }

  /**
   * 服务端确认首个 unack 操作：从队列移除，重建文档
   * TODO: 后续支持按 op-id 精确 ack
   */
  ack(): void {
    this.unAckOps.shift();
    this.rebuildDocument();
  }

  /** 重建视图文档：= base + 所有未确认操作 */
  private rebuildDocument(): void {
    let composed = this.base;
    for (const op of this.unAckOps) {
      composed = composed.compose(op);
    }
    this.document.setContents(composed);
  }

  /** 直接应用远端已经 transform 过的操作（跳过 transform 流程） */
  apply(op: Delta): void {
    this.base = this.base.compose(op);
    this.document.apply(op);
    this.notifyRemoteChange(op); // 同样通知外部
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
