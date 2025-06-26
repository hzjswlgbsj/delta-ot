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

  private handleJoin(data: JoinPayload) {
    console.log(`👤 User ${data.userId} joined document ${data.documentId}`);
    this.userId = data.userId;
    this.documentId = data.documentId;
    // TODO: 后续这里可以记录连接状态、广播等
  }

  private handleKeyFrame(cmd: ClientMessage<KeyFramePayload>) {
    console.log(
      `📦 KeyFrame request from ${cmd.userId} for doc ${cmd.documentId}`
    );
    // TODO: 实际发送关键帧内容
  }

  private handleOp(cmd: ClientMessage<KeyFramePayload>) {
    console.log(
      `📦 Op request from ${cmd.userId} for doc ${cmd.documentId}`,
      JSON.stringify(cmd)
    );
  }
}
