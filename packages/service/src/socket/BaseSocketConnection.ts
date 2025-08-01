import type { WebSocket } from "ws";
import { MessageType, HeartbeatType, ClientMessage } from "./types";
import { safeJsonParse } from "../utils";
import { ErrorCode } from "../types/error-code";
import { getServiceLogger } from "../utils/logger";

export abstract class BaseSocketConnection {
  protected ws: WebSocket;
  private sendHBTimer: NodeJS.Timeout | null = null;
  private recvHBTimer: NodeJS.Timeout | null = null;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.setup();
  }

  private setup() {
    this.ws.on("message", (raw) => this.onMessage(raw.toString()));
    this.ws.on("close", () => this.onClose());

    this.onConnected();
    this.sendHeartbeat();
    this.resetSendHBTimer();
    this.resetRecvHBTimer();
  }

  private onMessage(raw: string) {
    this.resetRecvHBTimer();
    const msg = safeJsonParse(raw);
    if (!msg) return;
    this.onReceiveMessage(msg);
  }

  encodeCmd(cmd: any) {
    return JSON.stringify(cmd);
  }

  protected sendHeartbeat() {
    this.send(
      this.encodeCmd({
        type: MessageType.HEARTBEAT,
        data: {
          heartbeatType: HeartbeatType.SERVER,
          timestamp: Date.now(),
        },
      })
    );
  }

  send(msg: string) {
    try {
      this.ws.send(msg);
    } catch (err) {
      const logger = getServiceLogger("socket");
      logger.error("[BaseSocketConnection] send error:", err);
    }
  }

  protected sendError(code: ErrorCode, message: string) {
    const logger = getServiceLogger("socket");
    logger.warn("[BaseSocketConnection] send error:", code, message);
    this.send(
      this.encodeCmd({
        type: MessageType.ERROR,
        data: {
          code,
          message,
          timestamp: Date.now(),
        },
      })
    );
  }

  protected resetSendHBTimer() {
    if (this.sendHBTimer) clearTimeout(this.sendHBTimer);
    this.sendHBTimer = setTimeout(() => {
      this.sendHeartbeat();
      this.resetSendHBTimer();
    }, 5000); // 每 5 秒发送心跳
  }

  protected resetRecvHBTimer() {
    if (this.recvHBTimer) clearTimeout(this.recvHBTimer);
    this.recvHBTimer = setTimeout(() => {
      this.onHeartbeatTimeout();
    }, 20000); // 超过 20 秒未收到心跳视为超时
  }

  protected onClose() {
    if (this.sendHBTimer) clearTimeout(this.sendHBTimer);
    if (this.recvHBTimer) clearTimeout(this.recvHBTimer);
    this.onDisconnected();
  }

  destroy() {
    if (this.sendHBTimer) clearTimeout(this.sendHBTimer);
    if (this.recvHBTimer) clearTimeout(this.recvHBTimer);
    this.ws.close();
  }

  /** 生命周期钩子 - 供子类复写 */
  protected abstract onReceiveMessage(msg: any): void;
  protected abstract onConnected(): void;
  protected abstract onDisconnected(): void;
  protected abstract onHeartbeatTimeout(): void;
}
