import Delta, { Op } from "quill-delta";
import { ClientConnection } from "../socket/ClientConnection";
import { ClientMessage } from "../socket/types";
import { OTEngine, DocumentModel } from "@delta-ot/collaborate";
import { OpHistoryBuffer } from "./OpHistoryBuffer";

/**
 * 表示一个文档的协同会话状态
 */
export class DocumentSession {
  documentId: string;
  sequence = 0;

  private clients: Set<ClientConnection> = new Set();
  private historyBuffer = new OpHistoryBuffer();
  private model: DocumentModel;

  constructor(documentId: string) {
    this.documentId = documentId;
    this.model = new DocumentModel();
  }

  addClient(client: ClientConnection) {
    this.clients.add(client);
  }

  removeClient(client: ClientConnection) {
    this.clients.delete(client);
  }

  /** 广播 OP 其他客户端 */
  broadcastOp(cmd: ClientMessage<Delta>, excludeUserId?: string) {
    this.clients.forEach((client) => {
      if (excludeUserId && client.getUserId() === excludeUserId) return;
      client.send(cmd);
    });
  }

  /** 当前编辑器内容 */
  getContent(): Op[] {
    return this.model.getContents().ops;
  }

  setContent(delta: Delta) {
    this.model.setContents(delta);
  }

  /** 当前序列号 */
  getSequence(): number {
    return this.sequence;
  }

  /** 当前协同用户列表（userId） */
  getUserIds(): string[] {
    return Array.from(
      new Set(
        Array.from(this.clients)
          .map((c) => c.getUserId())
          .filter(Boolean)
      )
    );
  }

  getClientCount(): number {
    return this.clients.size;
  }

  /** 处理并应用客户端发来的 OP（包含 transform、缓存、广播） */
  applyClientOperation(cmd: ClientMessage<Delta>, from: ClientConnection) {
    // === 1. Transform against buffered history ===
    const opsToTransformAgainst = this.historyBuffer.getOpsSince(cmd.sequence);
    let transformedDelta = cmd.data as Delta;

    opsToTransformAgainst.forEach((historyCmd) => {
      const historyDelta = new Delta(historyCmd.data);
      transformedDelta = OTEngine.transform(historyDelta, transformedDelta);
    });

    // === 2. 应用操作到全文内容 ===
    const newContent = this.model.apply(transformedDelta);
    // do something with newContent，例如持久化、日志等场景

    // === 3. 序列号递增 ===
    this.incrementSequence();

    // === 4. 构造新的广播命令 ===
    const broadcastCmd: ClientMessage<Delta> = {
      ...cmd,
      data: transformedDelta,
      sequence: this.sequence,
      timestamp: Date.now(),
    };

    // === 5. 写入历史 buffer ===
    this.historyBuffer.push(broadcastCmd);

    // === 6. 广播，包含自己因为需要 ack
    this.broadcastOp(broadcastCmd);

    // === 7. TODO：后续持久化钩子
    // this.persistOps([broadcastCmd]);
  }

  /** 增加序列号（transform 后） */
  incrementSequence() {
    this.sequence += 1;
  }

  destroy() {
    this.clients.clear();
    this.historyBuffer.clear();
    this.model = new DocumentModel();
    this.sequence = 0;
  }
}
