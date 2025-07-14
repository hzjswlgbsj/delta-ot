import {
  CollaborationWS,
  ReceiveCommandType,
  SendCommandType,
} from "@delta-ot/collaborate";
import { WebsocketControllerOptions } from "../types/base";
import Delta from "quill-delta";
import { CollaborationMediator } from "./CollaborationMediator";

export class WebsocketController {
  ws!: CollaborationWS;

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
    switch (cmd.type) {
      case ReceiveCommandType.OP:
        // 更新 sequence
        this.ws.sequence = cmd.sequence;

        // 这里已经是 UI 层的通知了，操作转换已经在下层做好了，所以这里需要排除自己
        if (cmd.userId === this.options.userInfo.userId) {
          // 已广播自己的操作，进行 ack
          this.mediator.ackOpById([cmd.uuid]);
          return;
        }
        this.mediator.handleRemoteOp(cmd.data);
        break;
      case ReceiveCommandType.KEY_FRAME:
        this.mediator.handleKeyFrame(cmd.data);
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
    return this.ws.sendCmd(SendCommandType.OP, delta);
  }

  destroy() {
    this.ws?.destroy();
  }
}
