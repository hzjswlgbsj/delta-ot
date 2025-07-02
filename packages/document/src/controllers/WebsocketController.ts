import {
  CollaborationWS,
  ReceiveCommandType,
  SendCommandType,
} from "@delta-ot/collaborate";
import { WebsocketControllerOptions } from "../types/base";
import Delta from "quill-delta";
import { CollaborationMediator } from "./CollaborationMediator";

export class WebsocketController {
  private ws!: CollaborationWS;

  constructor(
    private options: WebsocketControllerOptions,
    private mediator: CollaborationMediator
  ) {}

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
  dealCmd(cmd) {
    /** 这里只会显式的处理通用的信令类型比如心跳，其他业务相关的信令会交给外部实例处理 */
    switch (cmd.type) {
      case ReceiveCommandType.OP:
        // 这里已经是 UI 层的通知了，操作转换已经在下层做好了，所以这里需要排除自己
        if (cmd.userId === this.options.userInfo.userId) {
          // 忽略自己发送的操作
          return;
        }
        this.mediator.handleRemoteOp(cmd.data);
        break;
      default:
        console.log("暂未处理的信令", cmd);
        break;
    }
  }

  async initWsConnection() {
    const getWsUrl = async () => {
      return "ws://localhost:4000"; // Replace with actual URL logic
    };

    const url = await getWsUrl();
    const { userInfo, guid } = this.options;
    this.ws = new CollaborationWS(guid, userInfo, { url }, this);
  }

  sendCmd(delta: Delta) {
    this.ws.sendCmd(SendCommandType.OP, delta);
  }

  destroy() {
    this.ws?.destroy();
  }
}
