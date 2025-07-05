import Delta, { Op } from "quill-delta";
import { ClientConnection } from "../socket/ClientConnection";
import { ClientMessage, MessageType } from "../socket/types";
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
      client.send(client.encodeCmd(cmd));
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
    console.log(
      "当前文档的协同用户列表:",
      JSON.stringify(this.clients),
      JSON.stringify(
        Array.from(this.clients)
          .map((c) => c.getUserId())
          .filter(Boolean)
      )
    );
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

    // === 判断客户端是否落后过多（transform 所需历史是否足够） ===
    const currentSeq = this.sequence;
    const missedCount = currentSeq - incomingSeq;

    // 只有落后才 transform
    let transformedDelta = cmd.data as Delta;

    if (missedCount > 0) {
      const opsToTransformAgainst = this.historyBuffer.getOpsSince(incomingSeq);
      const availableCount = opsToTransformAgainst.length;

      if (availableCount < missedCount) {
        // ❗历史不足，无法 transform，拒绝该操作
        console.warn(
          `[DocumentSession] 客户端 sequence 落后过多：客户端 ${incomingSeq}, 当前 ${currentSeq}，仅找到 ${availableCount} 条历史`
        );

        from.sendCmd(MessageType.NEED_REFRESH, {
          reason: "当前操作已落后过多，协同历史无法补全，请刷新页面",
        });
        return;
      }

      // 有足够的历史，可以 transform
      for (const historyCmd of opsToTransformAgainst) {
        const historyDelta = new Delta(historyCmd.data);
        transformedDelta = OTEngine.transform(historyDelta, transformedDelta);
      }
    }

    // === 2. 应用操作到全文内容 ===
    const newContent = this.model.apply(transformedDelta);

    // === 3. 序列号递增 ===
    this.incrementSequence();

    // === 4. 构造新的广播命令 ===
    const broadcastCmd: ClientMessage<Delta> = {
      ...cmd,
      data: transformedDelta,
      sequence: this.sequence,
      timestamp: Date.now(),
    };

    // === 5. 缓存
    this.historyBuffer.push(broadcastCmd);

    // === 6. 广播
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
