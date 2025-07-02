import { CollaborationWS, SendCommandType } from "@delta-ot/collaborate";
import { WebsocketControllerOptions } from "../types/base";
import Delta from "quill-delta";

export class WebsocketController {
  private ws!: CollaborationWS;
  private options: WebsocketControllerOptions;

  constructor(options: WebsocketControllerOptions) {
    this.options = options;
  }

  onConnected() {
    console.log("[WS] connected");
  }
  onClosed() {
    console.log("[WS] closed");
  }
  onReconnect() {
    console.log("[WS] reconnecting");
  }
  onReconnected() {
    console.log("[WS] reconnected");
  }
  onNotRecMsgTimeout() {
    console.log("[WS] heartbeat timeout");
  }
  dealCmd(msg) {
    console.log("[WS] received msg", msg);
  }

  async initWsConnection() {
    const getWsUrl = async () => {
      return "ws://localhost:4000"; // Replace with actual URL logic
    };

    const url = await getWsUrl();
    const { userInfo, documentId } = this.options;

    this.ws = new CollaborationWS(documentId, userInfo, { url }, this);
  }

  sendCmd(delta: Delta) {
    this.ws.sendCmd(SendCommandType.OP, delta);
  }

  destroy() {
    this.ws?.destroy();
  }
}
