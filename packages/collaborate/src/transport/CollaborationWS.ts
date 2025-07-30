import {
  ReceiveCommandType,
  JoinReason,
  ClientMessage,
  ServiceMessage,
  WebsocketConfig,
  SendCommandType,
  HeartbeatType,
  UserInfo,
} from "./types";
import { WebSocketClient } from "./WebSocketClient";
import { generateUuidV4, safeJsonParse } from "../utils/common";
import { getGlobalLogger } from "../../../common/src/utils/Logger";

/** 与客户端通信心跳过程中没有收到任何回应超过 20s 时，就会认为心跳异常，进而踢出用户 */
const HEARTBEAT_TIMEOUT = 1000 * 20;

export class CollaborationWS extends WebSocketClient {
  private _sequence = 0;

  constructor(
    private documentId: string,
    private userInfo: UserInfo,
    config: WebsocketConfig,
    private msgConsumer: {
      onClosed: () => unknown;
      onConnected: () => unknown;
      onReconnect: () => unknown;
      onReconnected: () => unknown;
      dealCmd: (msg: ServiceMessage<any>) => unknown;
      onNotRecMsgTimeout: () => unknown;
    }
  ) {
    super(config);
  }

  get sequence() {
    return this._sequence;
  }

  set sequence(sequence: number) {
    this._sequence = sequence ?? 0;
  }

  private notRecMsgTimer: ReturnType<typeof setTimeout> | null = null;

  private encodeCmd(cmd: ClientMessage<any>) {
    return JSON.stringify(cmd);
  }

  /**
   * 当前我们没有做加密混淆什么的，直接使用的 JSON 字符串所以这里的解密函数暂时就是 JSON.parse
   */
  decodeCmd(data: string): ServiceMessage<any> {
    return safeJsonParse(data);
  }

  /** 发送进入文档命令，实际上是表示当前用户进入到这篇文档中了 */
  private sendJoinCmd(isReconnect: boolean = false) {
    // 正常进入和重连进入服务端可能有不同的处理逻辑
    const joinReason = isReconnect ? JoinReason.RECONNECT : JoinReason.NORMAL;
    this.sendCmd(SendCommandType.JOIN, {
      loginReason: joinReason,
    });
  }

  onReceiveMsg = (event: MessageEvent) => {
    const payload: string = event.data;
    // 重置接收心跳的定时器
    this.resetRecvHBTimer();
    if (this.notRecMsgTimer) {
      clearTimeout(this.notRecMsgTimer);
    }

    this.notRecMsgTimer = setTimeout(() => {
      this.msgConsumer.onNotRecMsgTimeout();
    }, HEARTBEAT_TIMEOUT);

    const cmd = this.decodeCmd(payload);

    /** 这里只会显式的处理通用的信令类型比如心跳，其他业务相关的信令会交给外部实例处理 */
    switch (cmd.type) {
      case ReceiveCommandType.HEARTBEAT:
        // 客户端如果收到心跳后会检查心跳类型是不是 Client，如果是证明是客户端自己发送的心跳被服务端回过来了，那么这个消息称之为 Ack
        const isAck = cmd.data.heartbeatType === HeartbeatType.CLIENT;
        if (!isAck) {
          // 服务端发送过来的,需要将原文回复
          this.sendHeartbeat(cmd);
        }
        break;
      default:
        const logger = getGlobalLogger("collaborate");
        logger.info("Received message:", payload);
        this.msgConsumer.dealCmd(cmd);
        break;
    }
  };

  onReady = (isReconnect: boolean = false) => {
    // ws 准备就绪后，发送进入房间的命令
    this.sendJoinCmd(isReconnect);

    // 然后发送索要关键帧的命令
    // 这里的关键帧是指告诉服务端，当前客户端需要获取最新的文档数据，这里指的是 delta 的 ops
    this.sendCmd(SendCommandType.KEY_FRAME);
  };

  onClosed = () => {
    const logger = getGlobalLogger("collaborate");
    logger.info("Connection closed");
    this.msgConsumer.onClosed();
    this.notRecMsgTimer && clearTimeout(this.notRecMsgTimer);
  };

  onConnected = () => {
    const logger = getGlobalLogger("collaborate");
    logger.info("Connected to collab server");
    this.onReady();
    this.msgConsumer.onConnected();
  };

  onReconnected = () => {
    const logger = getGlobalLogger("collaborate");
    logger.info("Reconnected to collab server");
    this.onReady(true);
    this.msgConsumer.onReconnected();
  };

  onReconnect = () => {
    const logger = getGlobalLogger("collaborate");
    logger.info("Reconnecting to collab server...");
    this.msgConsumer.onReconnect();
    this.notRecMsgTimer && clearTimeout(this.notRecMsgTimer);
  };

  sendHeartbeat(data?: any) {
    // 发送心跳的命令，不重置发送心跳的定时器
    const c = data || {
      type: SendCommandType.HEARTBEAT,
      data: { heartbeatType: HeartbeatType.CLIENT, timestamp: Date.now() },
    };

    this.send(this.encodeCmd(c));
  }

  sendCmd(type: SendCommandType, data?: any): ClientMessage<any> {
    // 重置发送心跳的timer
    this.resetSendHBTimer();
    const cmd = this.generateCmd(type, data);
    const logger = getGlobalLogger("collaborate");
    logger.info("客户端发送操作：", JSON.stringify(cmd));
    this.send(this.encodeCmd(cmd));
    return cmd;
  }

  generateCmd(type: SendCommandType, data?: any): ClientMessage<any> {
    return {
      type,
      data,
      documentId: this.documentId,
      userId: this.userInfo.userId,
      sequence: this.sequence,
      uuid: generateUuidV4(),
      timestamp: Date.now(),
    };
  }

  destroy(): void {
    super.destroy();
    this.notRecMsgTimer && clearTimeout(this.notRecMsgTimer);
  }
}
