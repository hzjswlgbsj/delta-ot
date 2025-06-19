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
  private pending: Delta[] = [];

  // 实际用户看到的当前文档内容（= base + pending）
  private document: DocumentModel;

  constructor(userId: string, initialContent?: Delta) {
    this.userId = userId;
    this.base = initialContent ?? new Delta();
    this.document = new DocumentModel(this.base);
  }

  /**
   * 提交一个本地操作：立即应用到文档，并添加到 pending
   */
  commitLocal(op: Delta): void {
    this.pending.push(op);
    this.document.apply(op);
  }

  /**
   * 接收一个远端操作，并将其 transform 后应用到文档
   * （远端操作基于服务器状态，即本地的 base）
   */
  receiveRemote(remoteOp: Delta): void {
    // 先将远端操作基于 pending 逐一转换
    let transformed = remoteOp;
    for (const localOp of this.pending) {
      // transformed = OTEngine.transform(transformed, localOp);
      transformed = OTEngine.transform(localOp, transformed);
    }

    // 应用到 base
    this.base = this.base.compose(transformed);

    // 重新计算可视文档 = base + pending
    this.rebuildDocument();
  }

  /**
   * 服务器确认本地的第一个操作（即 pending[0]），表示该操作已被广播
   */
  ack(): void {
    const ackedOp = this.pending.shift();
    if (!ackedOp) return;

    this.base = this.base.compose(ackedOp);

    // 重建文档
    this.rebuildDocument();
  }

  /**
   * 重新构造 document：= base + all pending
   */
  private rebuildDocument(): void {
    let composed = this.base;
    for (const op of this.pending) {
      composed = composed.compose(op);
    }
    this.document.setContents(composed);
  }

  getDocument(): DocumentModel {
    return this.document;
  }

  getUserId(): string {
    return this.userId;
  }

  /**
   * 释放资源，清理状态（可扩展）
   */
  destroy(): void {
    this.pending = [];
    this.base = new Delta();
    this.document = new DocumentModel();
  }
}
