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
import { generateUuidV4 } from "../utils";
import { getServiceLogger } from "../utils/logger";

export class ClientConnection extends BaseSocketConnection {
  private userId = "";
  private documentId = "";

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
    const logger = getServiceLogger("socket");
    logger.info(`User ${userId} joined document ${documentId}`);
  }

  private handleKeyFrame(cmd: ClientMessage<KeyFramePayload>) {
    const { documentId } = cmd;
    const session = documentSessionManager.getSession(documentId);

    if (!session) {
      const logger = getServiceLogger("socket");
      logger.warn(`No session found for document ${documentId}`);
      return;
    }

    const content = session.getContent();
    const userIds = session.getUserIds();

    this.sendCmd(MessageType.KEY_FRAME, {
      content,
      userIds,
      sequence: session.sequence,
    });
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
