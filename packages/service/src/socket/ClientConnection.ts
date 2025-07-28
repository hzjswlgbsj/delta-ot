import { WebSocket } from "ws";
import { BaseSocketConnection } from "./BaseSocketConnection";
import {
  MessageType,
  HeartbeatPayload,
  HeartbeatType,
  JoinPayload,
  KeyFramePayload,
  ClientMessage,
  CursorUpdateData,
  CursorInfo,
} from "./types";
import { documentSessionManager } from "../sessions/DocumentSessionManager";
import { User, File } from "../db/models";
import { verifyToken } from "../utils/jwt";
import { ErrorCode } from "../types/error-code";
import { loggedInUserStore } from "../auth/LoggedInUserStore";
import { generateUuidV4 } from "../utils";
import { getServiceLogger } from "../utils/logger";

export class ClientConnection extends BaseSocketConnection {
  private userId = "";
  private documentId = "";
  private userCursor: CursorInfo | null = null;

  constructor(ws: WebSocket) {
    super(ws);
  }

  protected onConnected(): void {
    const logger = getServiceLogger("socket");
    logger.info("Client connected");
  }

  protected onDisconnected(): void {
    const logger = getServiceLogger("socket");
    logger.info(`Client disconnected: ${this.userId}`);
    if (this.documentId) {
      // 清除用户光标
      this.clearUserCursor();
      documentSessionManager.removeClientFromDocument(this.documentId, this);
    }
  }

  protected onHeartbeatTimeout(): void {
    const logger = getServiceLogger("socket");
    logger.warn(`💔 Heartbeat timeout for user ${this.userId}`);
    this.onClose();
  }

  protected generateCmd(type: MessageType, data?: any): ClientMessage<any> {
    return {
      type,
      data,
      documentId: this.documentId,
      userId: this.userId,
      sequence: 0, // 服务端主动发送的消息，序列号为 0
      uuid: generateUuidV4(),
      timestamp: Date.now(),
    };
  }

  sendCmd(type: MessageType, data?: any): ClientMessage<any> {
    const cmd = this.generateCmd(type, data);
    this.send(this.encodeCmd(cmd));
    return cmd;
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
      // 光标相关消息处理
      case MessageType.CURSOR_UPDATE:
        this.handleCursorUpdate(cmd);
        break;
      default:
        const logger = getServiceLogger("socket");
        logger.warn("⚠️ Unknown message type:", cmd.type);
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
    const token = (await loggedInUserStore.getToken(userId)) ?? "";
    if (!token) {
      this.sendError(ErrorCode.INVALID_TOKEN, "Token not found for user");
      return;
    }

    try {
      const decoded = verifyToken(token);
      if (!decoded) {
        this.sendError(ErrorCode.INVALID_TOKEN, "Invalid token");
        return;
      }

      // 检查文档是否存在
      const file = await File.findOne({ where: { guid: documentId } });
      if (!file) {
        this.sendError(ErrorCode.FILE_NOT_FOUND, "Document not found");
        return;
      }

      // 加入文档会话
      const session = documentSessionManager.getOrCreateSession(documentId);
      session.addClient(this);

      const logger = getServiceLogger("socket");
      logger.info(`User ${userId} joined document ${documentId}`);
    } catch (error) {
      const logger = getServiceLogger("socket");
      logger.error("Error handling join:", error);
      this.sendError(ErrorCode.INTERNAL_ERROR, "Internal server error");
    }
  }

  private handleKeyFrame(cmd: ClientMessage<KeyFramePayload>) {
    const session = documentSessionManager.getSession(this.documentId);
    if (session) {
      session.handleKeyFrameRequest(this);
    }
  }

  private handleOp(cmd: ClientMessage) {
    const session = documentSessionManager.getSession(this.documentId);
    if (session) {
      session.handleOp(cmd);
    }
  }

  // ========== 光标相关处理方法 ==========

  private handleCursorUpdate(cmd: ClientMessage<CursorUpdateData>) {
    const { data } = cmd;

    // 更新用户光标信息
    this.userCursor = {
      index: data.index,
      length: data.length,
      userId: this.userId,
      userName: data.userName,
      timestamp: cmd.timestamp,
      color: data.color,
      status: data.status,
      lastActivity: data.lastActivity,
      avatar: data.avatar,
    };

    // 广播给其他用户
    this.broadcastCursorUpdate(cmd);
  }

  private broadcastCursorUpdate(cmd: ClientMessage<CursorUpdateData>) {
    const session = documentSessionManager.getSession(this.documentId);
    if (session) {
      session.broadcastToOthers(this, cmd);
    }
  }

  private clearUserCursor() {
    if (this.userCursor) {
      this.userCursor = null;
    }
  }

  // 获取用户光标信息
  getUserCursor(): CursorInfo | null {
    return this.userCursor;
  }

  getUserId(): string {
    return this.userId;
  }

  getDocumentId(): string {
    return this.documentId;
  }
}
