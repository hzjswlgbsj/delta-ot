import { WebSocket } from "ws";
import { BaseSocketConnection } from "./BaseSocketConnection";
import {
  MessageType,
  HeartbeatPayload,
  HeartbeatType,
  JoinPayload,
  KeyFramePayload,
  ClientMessage,
} from "./types";
import { documentSessionManager } from "../sessions/DocumentSessionManager";
import { User, File } from "../db/models";
import { verifyToken } from "../utils/jwt";
import { ErrorCode } from "../types/error-code";
import { loggedInUserStore } from "../auth/LoggedInUserStore";

export class ClientConnection extends BaseSocketConnection {
  private userId = "";
  private documentId = "";

  constructor(ws: WebSocket) {
    super(ws);
  }

  protected onConnected(): void {
    console.log("Client connected");
  }

  protected onDisconnected(): void {
    console.log(`Client disconnected: ${this.userId}`);
    if (this.documentId) {
      documentSessionManager.removeClientFromDocument(this.documentId, this);
    }
  }

  protected onHeartbeatTimeout(): void {
    console.warn(`💔 Heartbeat timeout for user ${this.userId}`);
    this.onClose();
  }

  protected onReceiveMessage(cmd: ClientMessage<any>): void {
    switch (cmd.type) {
      case MessageType.HEARTBEAT:
        this.handleHeartbeat(cmd.data);
        break;
      case MessageType.JOIN:
        this.handleJoin(cmd);
        break;
      case MessageType.KEY_FRAME:
        this.handleKeyFrame(cmd);
        break;
      case MessageType.OP:
        this.handleOp(cmd);
        break;
      default:
        console.warn("⚠️ Unknown message type:", cmd.type);
    }
  }

  private handleHeartbeat(data: HeartbeatPayload) {
    if (data.heartbeatType !== HeartbeatType.CLIENT) return;
    this.resetRecvHBTimer();
    this.sendHeartbeat();
  }

  private async handleJoin(cmd: ClientMessage<JoinPayload>) {
    const { userId, documentId } = cmd;

    this.userId = userId;
    this.documentId = documentId;
    // 从缓存中获取 token，检查 token 是否有效
    const token = loggedInUserStore.getToken(userId) ?? "";
    if (!token) {
      this.sendError(ErrorCode.INVALID_TOKEN, "Token not found for user");
      return;
    }

    try {
      const decoded = verifyToken(token);

      if (!decoded || decoded.userId !== userId) {
        this.sendError(
          ErrorCode.INVALID_TOKEN,
          "Invalid token or userId mismatch"
        );
        return;
      }
    } catch (err) {
      this.sendError(
        ErrorCode.INVALID_TOKEN,
        "Invalid token or userId mismatch"
      );
      return;
    }

    // 校验用户是否存在
    const user = await User.findOne({ where: { userId } });
    if (!user) {
      this.sendError(ErrorCode.USER_NOT_FOUND, "User not found");
      return;
    }

    // 校验文档是否存在
    const file = await File.findOne({ where: { guid: documentId } });
    if (!file) {
      this.sendError(ErrorCode.FILE_NOT_FOUND, "Document not found");
      return;
    }

    documentSessionManager.addClientToDocument(documentId, this);
    console.log(`User ${userId} joined document ${documentId}`);
  }

  private handleKeyFrame(cmd: ClientMessage<KeyFramePayload>) {
    const { documentId } = cmd;
    const session = documentSessionManager.getSession(documentId);

    if (!session) {
      console.warn(`No session found for document ${documentId}`);
      return;
    }

    const content = session.getContent();
    const sequence = session.getSequence();
    const userIds = session.getUserIds();

    const response: ClientMessage = {
      type: MessageType.KEY_FRAME,
      timestamp: Date.now(),
      documentId,
      userId: this.userId,
      sequence,
      data: {
        content,
        userIds,
      },
    };

    this.send(response);
  }

  /** 接收到某个客户端的 OP 信令 */
  private handleOp(cmd: ClientMessage) {
    const session = documentSessionManager.getSession(cmd.documentId);
    session.applyClientOperation(cmd, this);
  }

  getUserId(): string {
    return this.userId;
  }
}
