import Delta, { Op } from "quill-delta";
import { ClientConnection } from "../socket/ClientConnection";
import { ClientMessage, MessageType } from "../socket/types";

/**
 * 表示一个文档的协同会话状态
 */
export class DocumentSession {
  documentId: string;
  content: Op[] = [];
  sequence = 0;

  private clients: Set<ClientConnection> = new Set();
  private pendingOps: ClientMessage<Delta>[] = [];

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

  /** 接收 OP，缓存并广播（暂不 transform） */
  handleClientOp(cmd: ClientMessage<Delta>, from: ClientConnection) {
    this.pendingOps.push(cmd);
    this.broadcastOp(cmd);
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

  /** 服务端广播关键帧 */
  broadcastKeyFrame() {
    const keyFrame: ClientMessage = {
      type: MessageType.KEY_FRAME,
      timestamp: Date.now(),
      documentId: this.documentId,
      userId: "", // 服务端发出的
      sequence: this.sequence,
      data: {
        content: this.content,
        userIds: this.getUserIds(),
      },
    };

    for (const client of this.clients) {
      client.send(keyFrame);
    }
  }

  /** 增加序列号（transform 后） */
  incrementSequence() {
    this.sequence += 1;
  }
}
