import Delta, { Op } from "quill-delta";
import { ClientConnection } from "../socket/ClientConnection";
import { ClientMessage, MessageType } from "../socket/types";
import { OTEngine, DocumentModel } from "@delta-ot/collaborate";
import { OpHistoryBuffer } from "./OpHistoryBuffer";
import { File } from "../db/models/File";

/** 表示一个文档的协同会话状态 */
export class DocumentSession {
  documentId: string;
  sequence = 0;

  private clients: Set<ClientConnection> = new Set();
  private historyBuffer = new OpHistoryBuffer();
  private model: DocumentModel;

  private persistTimer?: NodeJS.Timeout;
  private isDirty = false;

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

  /** 广播 OP 给其他客户端 */
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

  /**
   * 处理并应用客户端发来的 OP（包含 transform、缓存、广播）
   *
   * 1. transform against historyBuffer（如果 seq 落后）
   * 2. apply 到 DocumentModel
   * 3. increment sequence
   * 4. 更新缓存，push 到 historyBuffer
   * 5. broadcast 给所有客户端
   */
  applyClientOperation(cmd: ClientMessage<Delta>, from: ClientConnection) {
    const incomingSeq = cmd.sequence;
    const currentSeq = this.sequence;
    const missedCount = currentSeq - incomingSeq;

    let transformedDelta = cmd.data as Delta;

    // 1.如果客户端落后，则需要 transform
    if (missedCount > 0) {
      const opsToTransformAgainst = this.historyBuffer.getOpsSince(incomingSeq);
      const availableCount = opsToTransformAgainst.length;

      if (availableCount < missedCount) {
        // 历史不足，无法 transform，拒绝该操作
        console.warn(
          `[DocumentSession] 客户端 sequence 落后过多：客户端 ${incomingSeq}, 当前 ${currentSeq}，仅找到 ${availableCount} 条历史`
        );

        from.sendCmd(MessageType.NEED_REFRESH, {
          reason: "当前操作已落后过多，协同历史无法补全，请刷新页面",
        });
        return;
      }

      // transform 所有未处理历史
      for (const historyCmd of opsToTransformAgainst) {
        const historyDelta = new Delta(historyCmd.data);
        transformedDelta = OTEngine.transform(historyDelta, transformedDelta);
      }
    }

    // 2.应用到文档模型
    const newContent = this.model.apply(transformedDelta);
    this.isDirty = true;

    // 3.序列号递增
    this.incrementSequence();

    // 4.构造广播消息并缓存
    const broadcastCmd: ClientMessage<Delta> = {
      ...cmd,
      data: transformedDelta,
      sequence: this.sequence,
      timestamp: Date.now(),
    };
    this.historyBuffer.push(broadcastCmd);

    // 5.广播给所有客户端（包含自己）
    this.broadcastOp(broadcastCmd);
  }

  /** 启动定时持久化（每 30 秒） */
  startPersistence() {
    if (this.persistTimer) return;

    this.persistTimer = setInterval(() => {
      this.persistToDatabase();
    }, 30000);
  }

  /** 停止持久化定时器 */
  stopPersistence() {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = undefined;
    }
  }

  /** 将当前文档内容写入数据库 */
  private async persistToDatabase() {
    if (!this.isDirty) return;

    try {
      const content = this.model.getContents();
      await File.update(
        {
          content: JSON.stringify(content),
          updatedAt: new Date(),
        },
        { where: { guid: this.documentId } }
      );
      console.log(
        `[DocumentSession] 文档 ${this.documentId} 持久化成功`,
        JSON.stringify(content)
      );
      this.isDirty = false;
    } catch (err) {
      console.error(
        `[DocumentSession] 文档 ${this.documentId} 持久化失败`,
        err
      );
    }
  }

  /** 序列号递增 */
  incrementSequence() {
    this.sequence += 1;
  }

  /** 销毁 session，清理资源并持久化 */
  async destroy() {
    this.clients.clear();
    this.historyBuffer.clear();
    this.sequence = 0;
    // await this.persistToDatabase();
    this.stopPersistence();
    this.model = new DocumentModel();
  }
}
