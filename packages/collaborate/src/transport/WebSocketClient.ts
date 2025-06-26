import { WsStatus, WebsocketConfig } from "./types";

export abstract class WebSocketClient {
  protected state: WsStatus = WsStatus.CONNECTING;
  protected ws?: WebSocket;
  protected retryTimer?: number;
  protected sendHBTimer?: number;
  protected recvHBTimer?: number;
  protected _autoReconnect = true;

  constructor(protected config: WebsocketConfig) {
    this.open(config.url);
    window.addEventListener("online", this.onOnline);
    window.addEventListener("offline", this.onOffline);
  }

  protected onOnline = () => {
    this.adjustState(this._autoReconnect && true);
  };

  protected onOffline = () => {
    this.close();
    this.adjustState(false);
  };

  set autoReconnect(value: boolean) {
    this._autoReconnect = value;
    this.adjustState(value && navigator.onLine);
  }
  get autoReconnect() {
    return this._autoReconnect;
  }

  protected adjustState(shouldReconnect: boolean) {
    if (shouldReconnect && this.state === WsStatus.DISCONNECTED) {
      this.reconnect();
    } else if (!shouldReconnect && this.state === WsStatus.RECONNECTING) {
      clearTimeout(this.retryTimer);
      this.state = WsStatus.DISCONNECTED;
    }
  }

  protected open(url: string) {
    this.ws = new WebSocket(url);
    this.state = WsStatus.CONNECTING;

    this.ws.onopen = () => {
      if (this.state === WsStatus.CONNECTING) {
        this.onConnected();
      } else if (this.state === WsStatus.RECONNECTING) {
        this.onReconnected();
      }
      this.resetRecvHBTimer();
      this.ws!.onmessage = (evt) => this.onMessage(evt);
      this.state = WsStatus.CONNECTED;
    };

    this.ws.onclose = () => {
      this.close();
      if (this._autoReconnect) this.reconnect();
    };

    this.ws.onerror = () => {
      this.close();
      if (this._autoReconnect) this.reconnect();
    };
  }

  protected close() {
    clearTimeout(this.sendHBTimer);
    clearTimeout(this.recvHBTimer);
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = undefined;
    }
    this.state = WsStatus.DISCONNECTED;
    this.onClosed();
  }

  protected reconnect() {
    this.state = WsStatus.RECONNECTING;
    this.onReconnect();
    this.retryTimer = window.setTimeout(() => {
      this.open(this.config.url);
    }, this.config.reConnectDelay ?? 1000);
  }

  protected resetSendHBTimer() {
    clearTimeout(this.sendHBTimer);
    this.sendHBTimer = window.setTimeout(() => {
      this.sendHeartbeat();
      this.resetSendHBTimer();
    }, 10000);
  }

  protected resetRecvHBTimer() {
    clearTimeout(this.recvHBTimer);
    this.recvHBTimer = window.setTimeout(() => {
      this.close();
      if (this._autoReconnect) this.reconnect();
    }, 50000);
  }

  protected send(data: string) {
    if (!this.ws) return;
    this.resetSendHBTimer();
    this.ws.send(data);
  }

  protected onMessage(evt: MessageEvent) {
    this.resetRecvHBTimer();
    this.onReceiveMsg(evt);
  }

  protected abstract onReceiveMsg(evt: MessageEvent): void;

  protected abstract sendHeartbeat(): void;

  protected onConnected() {}
  protected onClosed() {}
  protected onReconnect() {}
  protected onReconnected() {}

  destroy() {
    this.close();
    clearTimeout(this.retryTimer);
    this.state = WsStatus.CLOSED;
    window.removeEventListener("online", this.onOnline);
    window.removeEventListener("offline", this.onOffline);
  }
}
