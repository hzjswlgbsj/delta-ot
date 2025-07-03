import Delta, { Op } from "quill-delta";
import { ClientConnection } from "../socket/ClientConnection";
import { ClientMessage, MessageType } from "../socket/types";
import { OTEngine } from "@delta-ot/collaborate";
import { OpHistoryBuffer } from "./OpHistoryBuffer";

/**
 * 表示一个文档的协同会话状态
 */
export class DocumentSession {
  documentId: string;
  content: Op[] = [];
  sequence = 0;

  private clients: Set<ClientConnection> = new Set();
  private historyBuffer = new OpHistoryBuffer();

  constructor(documentId: string) {
    this.documentId = documentId;
  }

  addClient(client: ClientConnection) {
    this.clients.add(client);
  }

  removeClient(client: ClientConnection) {
    this.clients.delete(client);
  }

  /** 广播 OP 给所有客户端（包含自己） */
  broadcastOp(cmd: ClientMessage<Delta>) {
    for (const client of this.clients) {
      client.send(cmd);
    }
  }

  /** 当前编辑器内容 */
  getContent(): Op[] {
    return this.content;
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
    const incomingSeq = cmd.sequence;
    const baseSeq = this.sequence;

    // === 1. Transform against buffered history ===
    const opsToTransformAgainst = this.historyBuffer.getOpsSince(incomingSeq);
    let transformedDelta = cmd.data as Delta;
    for (const historyCmd of opsToTransformAgainst) {
      transformedDelta = OTEngine.transform(
        historyCmd.data as Delta,
        transformedDelta
      );
    }

    // === 2. 应用操作到全文内容 ===
    const currentContent = new Delta(this.content);
    const newContent = OTEngine.apply(currentContent, transformedDelta);
    this.content = newContent.ops;

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

    // === 6. 广播 ===
    this.broadcastOp(broadcastCmd);

    // === 7. TODO：后续数据持久化钩子 ===
    // this.persistOps([broadcastCmd]);
  }

  /** 增加序列号（transform 后） */
  incrementSequence() {
    this.sequence += 1;
  }
}
