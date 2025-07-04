import { DocumentSession } from "./DocumentSession";
import { ClientConnection } from "../socket/ClientConnection";
import { ClientMessage } from "../socket/types";

export class DocumentSessionManager {
  private sessions: Map<string, DocumentSession> = new Map();

  getSession(documentId: string): DocumentSession {
    if (!this.sessions.has(documentId)) {
      const session = new DocumentSession(documentId);
      this.sessions.set(documentId, session);
    }
    return this.sessions.get(documentId)!;
  }

  removeSession(documentId: string): void {
    this.sessions.delete(documentId);
  }

  hasSession(documentId: string): boolean {
    return this.sessions.has(documentId);
  }

  getAllDocumentIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  getAllSessions(): DocumentSession[] {
    return Array.from(this.sessions.values());
  }

  /** 将客户端加入对应文档会话 */
  addClientToDocument(documentId: string, client: ClientConnection) {
    const session = this.getSession(documentId);
    session.addClient(client);
  }

  /** 将客户端从文档会话移除 */
  removeClientFromDocument(documentId: string, client: ClientConnection) {
    const session = this.sessions.get(documentId);
    if (session) {
      session.removeClient(client);
      if (session.getClientCount() === 0) {
        this.removeSession(documentId); // 没有客户端后自动清理
      }
    }
  }
}

export const documentSessionManager = new DocumentSessionManager();
