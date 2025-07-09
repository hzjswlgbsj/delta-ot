import { DocumentSession } from "./DocumentSession";
import { ClientConnection } from "../socket/ClientConnection";

export class DocumentSessionManager {
  private sessions: Map<string, DocumentSession> = new Map();

  getSession(documentId: string): DocumentSession {
    if (!this.sessions.has(documentId)) {
      const session = new DocumentSession(documentId);
      session.startPersistence();
      this.sessions.set(documentId, session);
    }
    return this.sessions.get(documentId)!;
  }

  async removeSession(documentId: string): Promise<void> {
    const session = this.sessions.get(documentId);
    if (session) {
      await session.destroy();
      this.sessions.delete(documentId);
    }
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

  addClientToDocument(documentId: string, client: ClientConnection) {
    const session = this.getSession(documentId);
    session.addClient(client);
  }

  async removeClientFromDocument(documentId: string, client: ClientConnection) {
    const session = this.sessions.get(documentId);
    if (session) {
      session.removeClient(client);

      // 用户刚断开就立刻判断是否为最后一人退出可能不准确，有可能是网络抖动，所以使用 setTimeout 来做一个延迟判断
      setTimeout(async () => {
        if (session.getClientCount() === 0) {
          await this.removeSession(documentId);
        }
      }, 1000);
    }
  }
}

export const documentSessionManager = new DocumentSessionManager();
