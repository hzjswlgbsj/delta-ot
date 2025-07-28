import {
  CollaborationWS,
  ReceiveCommandType,
  SendCommandType,
} from "@delta-ot/collaborate";
import { WebsocketControllerOptions } from "../types/base";
import Delta from "quill-delta";
import { CollaborationMediator } from "./CollaborationMediator";
import { getGlobalLogger } from "../../../common/src/utils/Logger";

export class WebsocketController {
  ws!: CollaborationWS;

  constructor(
    private options: WebsocketControllerOptions,
    private mediator: CollaborationMediator
  ) {}

  onConnected() {
    const logger = getGlobalLogger("document");
    logger.info("[WS] connected");
  }
  onClosed() {
    const logger = getGlobalLogger("document");
    logger.info("[WS] closed");
  }
  onReconnect() {
    const logger = getGlobalLogger("document");
    logger.info("[WS] reconnecting");
  }
  onReconnected() {
    const logger = getGlobalLogger("document");
    logger.info("[WS] reconnected");
  }
  onNotRecMsgTimeout() {
    const logger = getGlobalLogger("document");
    logger.info("[WS] heartbeat timeout");
  }
  dealCmd(cmd) {
    switch (cmd.type) {
      case ReceiveCommandType.OP:
        // 更新 sequence
        this.ws.sequence = cmd.sequence;

        // 这里已经是 UI 层的通知了，操作转换已经在下层做好了，所以这里需要排除自己
        if (cmd.userId === this.options.userInfo.userId) {
          // 已广播自己的操作，进行 ack
          const logger = getGlobalLogger("document");
          logger.info(`收到自己的操作确认:`, {
            uuid: cmd.uuid,
            userId: cmd.userId,
            data: cmd.data?.ops,
            isOwnOperation: true,
          });

          // 智能判断是否需要传递广播操作
          const shouldPassBroadcastOp = this.shouldPassBroadcastOp(cmd.data);
          const broadcastOp = shouldPassBroadcastOp ? cmd.data : undefined;

          logger.info(`是否需要传递广播操作:`, {
            shouldPassBroadcastOp,
            broadcastOp: broadcastOp?.ops,
          });

          this.mediator.ackOpById([cmd.uuid], broadcastOp);
          return;
        }
        this.mediator.handleRemoteOp(cmd.data);
        break;
      case ReceiveCommandType.KEY_FRAME:
        this.mediator.handleKeyFrame(cmd.data);
        break;
      // 光标相关信令处理
      case ReceiveCommandType.CURSOR_UPDATE:
        this.mediator.handleCursorMessage(cmd);
        break;
      default:
        const logger = getGlobalLogger("document");
        logger.info("暂未处理的信令", cmd);
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

  /**
   * 发送光标更新消息
   */
  sendCursorMessage(cursorData: any) {
    if (this.ws) {
      this.ws.sendCmd(SendCommandType.CURSOR_UPDATE, cursorData);
    }
  }

  destroy() {
    this.ws?.destroy();
  }

  /**
   * 智能判断是否需要传递广播操作
   *
   * 规则：
   * 1. 属性冲突操作 - 需要传递，因为客户端可能已经被其他操作覆盖
   * 2. 插入/删除操作 - 不需要传递，避免重复应用
   *
   * @param broadcastData 服务端广播的操作数据
   * @returns 是否需要传递广播操作
   */
  private shouldPassBroadcastOp(broadcastData: Delta): boolean {
    if (
      !broadcastData ||
      !broadcastData.ops ||
      broadcastData.ops.length === 0
    ) {
      return false;
    }

    // 检查是否包含属性操作（retain with attributes）
    const hasAttributeOp = broadcastData.ops.some(
      (op) =>
        op.retain && op.attributes && Object.keys(op.attributes).length > 0
    );

    if (hasAttributeOp) {
      const logger = getGlobalLogger("document");
      logger.info(`检测到属性操作，需要传递广播操作`);
      return true;
    }

    // 检查是否只有插入/删除操作
    const hasOnlyInsertDelete = broadcastData.ops.every(
      (op) =>
        op.insert ||
        op.delete ||
        (op.retain &&
          (!op.attributes || Object.keys(op.attributes).length === 0))
    );

    if (hasOnlyInsertDelete) {
      const logger = getGlobalLogger("document");
      logger.info(`检测到插入/删除操作，不需要传递广播操作`);
      return false;
    }

    // 默认不传递，避免意外重复应用
    const logger = getGlobalLogger("document");
    logger.info(`未知操作类型，默认不传递广播操作`);
    return false;
  }
}
