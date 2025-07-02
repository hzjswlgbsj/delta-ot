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

export class ClientConnection extends BaseSocketConnection {
  private userId = "";
  private documentId = "";

  constructor(ws: WebSocket) {
    super(ws);
  }

  protected onConnected(): void {
    console.log("✅ Client connected");
  }

  protected onDisconnected(): void {
    console.log(`❌ Client disconnected: ${this.userId}`);
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
        this.handleJoin(cmd.data);
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

  private async handleJoin(data: JoinPayload) {
    const { userId, documentId } = data;
    this.userId = data.userId;
    this.documentId = data.documentId;
    // TODO：从缓存中获取 token
    const token = "";
    const decoded = verifyToken(token); // 封装好的 verifyToken

    if (!decoded || decoded.userId !== userId) {
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

    this.userId = userId;
    this.documentId = documentId;
    documentSessionManager.addClientToDocument(documentId, this);

    console.log(`👤 User ${userId} joined document ${documentId}`);
  }

  private handleKeyFrame(cmd: ClientMessage<KeyFramePayload>) {
    const { documentId } = cmd;
    const session = documentSessionManager.getSession(documentId);

    if (!session) {
      console.warn(`📭 No session found for document ${documentId}`);
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

  private handleOp(cmd: ClientMessage) {
    console.log(
      `📦 Op request from ${cmd.userId} for doc ${cmd.documentId}`,
      JSON.stringify(cmd)
    );
    documentSessionManager.handleClientOp(cmd, this);
  }

  getUserId(): string {
    return this.userId;
  }
}
