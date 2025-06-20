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

export class ClientConnection extends BaseSocketConnection {
  private userId = "";
  private documentId = "";

  constructor(ws: WebSocket) {
    super(ws);
  }

  protected onConnected(): void {
    console.log("✅ Client connected, sending initial heartbeat");
  }

  protected onDisconnected(): void {
    console.log(`❌ Client disconnected: ${this.userId}`);
  }

  protected onHeartbeatTimeout(): void {
    console.warn(`💔 Heartbeat timeout for user ${this.userId}`);
    this.onClose();
  }

  protected onReceiveMessage(msg: ClientMessage): void {
    switch (msg.type) {
      case MessageType.HEARTBEAT:
        this.handleHeartbeat(msg.data);
        break;
      case MessageType.JOIN:
        this.handleJoin(msg.data);
        break;
      case MessageType.KEY_FRAME:
        this.handleKeyFrame(msg.data);
        break;
      default:
        console.warn("⚠️ Unknown message type:", msg.type);
    }
  }

  private handleHeartbeat(data: HeartbeatPayload) {
    console.log("💓 Received heartbeat:", data);
    if (data.heartbeatType !== HeartbeatType.CLIENT) return;
    this.resetRecvHBTimer();
    this.sendHeartbeat();
  }

  private handleJoin(data: JoinPayload) {
    console.log(`👤 User ${data.userId} joined document ${data.documentId}`);
    this.userId = data.userId;
    this.documentId = data.documentId;
    // TODO: 后续这里可以记录连接状态、广播等
  }

  private handleKeyFrame(data: KeyFramePayload) {
    console.log(
      `📦 KeyFrame request from ${data.userId} for doc ${data.documentId}`
    );
    // TODO: 实际发送关键帧内容
  }
}
