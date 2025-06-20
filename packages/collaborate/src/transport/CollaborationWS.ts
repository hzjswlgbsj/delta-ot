import {
  ReceiveCommandType,
  JoinReason,
  CMD,
  Message,
  WebsocketConfig,
  SendCommandType,
  HeartbeatType,
  UserInfo,
} from "./types";
import { WebSocketClient } from "./WebSocketClient";
import { safeJsonParse } from "../utils/common";

/** 不太需要具体业务关心的通用信令 */
enum client_ctrl_cmd {
  HEARTBEAT = 1,
  KEY_FRAME = 21,
  LOGIN = 100,
}

/** 与客户端通信心跳过程中没有收到任何回应超过 20s 时，就会认为心跳异常，进而踢出用户 */
const HEARTBEAT_TIMEOUT = 1000 * 20;

export class CollaborationWS extends WebSocketClient {
  constructor(
    private documentId: string,
    config: WebsocketConfig,
    private msgConsumer: {
      onClosed: () => unknown;
      onConnected: () => unknown;
      onReconnect: () => unknown;
      onReconnected: () => unknown;
      dealControlCmd: (msg: Message) => unknown;
      onNotRecMsgTimeout: () => unknown;
    },
    private userInfo: UserInfo
  ) {
    super(config);
  }

  notRecMsgTimer: ReturnType<typeof setTimeout> | null = null;

  onReceiveMsg = (event: MessageEvent) => {
    const payload: string = event.data;
    console.info("[CollaborationWS]", "onReceiveMsg", event.data);

    // 重置接收心跳的定时器
    this.resetRecvHBTimer();
    if (this.notRecMsgTimer) {
      clearTimeout(this.notRecMsgTimer);
    }

    this.notRecMsgTimer = setTimeout(() => {
      this.msgConsumer.onNotRecMsgTimeout();
    }, HEARTBEAT_TIMEOUT);

    const { type, data } = this.decodeCmd(payload);

    /** 这里只会显式的处理通用的信令类型比如心跳，其他业务相关的信令会交给外部实例处理 */
    switch (type) {
      case ReceiveCommandType.HEARTBEAT:
        // 客户端如果收到心跳后会检查心跳类型是不是 Client，如果是证明是客户端自己发送的心跳被服务端回过来了，那么这个消息称之为 Ack
        const isAck = data.heartbeatType === HeartbeatType.CLIENT;
        if (!isAck) {
          // 服务端发送过来的,需要将原文回复
          this.sendHeartbeat(payload);
        }
        break;
      default:
        console.info("[CollaborationWS]", "dealReceiveMsg", payload);
        this.msgConsumer.dealControlCmd({ type, data });
        break;
    }
  };

  onReady = (isReconnect: boolean = false) => {
    // ws 准备就绪后，发送进入房间的命令
    this.sendLoginCmd(isReconnect);

    // 然后发送索要关键帧的命令
    // 这里的关键帧是指告诉服务端，当前客户端需要获取最新的文档数据，这里指的是 delta 的 ops
    this.sendCmd({
      type: SendCommandType.JOIN,
      data: {
        userId: this.userInfo.userId,
        documentId: this.documentId,
      },
    });
  };

  onClosed = () => {
    this.msgConsumer.onClosed();
    this.notRecMsgTimer && clearTimeout(this.notRecMsgTimer);
  };

  onConnected = () => {
    this.onReady();
    this.msgConsumer.onConnected();
  };

  onReconnected = () => {
    this.onReady(true);
    this.msgConsumer.onReconnected();
  };

  onReconnect = () => {
    this.msgConsumer.onReconnect();
    this.notRecMsgTimer && clearTimeout(this.notRecMsgTimer);
  };

  sendHeartbeat(recvCmd?: any) {
    // 发送心跳的命令，不重置发送心跳的定时器
    const c = recvCmd || [
      client_ctrl_cmd.HEARTBEAT,
      HeartbeatType.CLIENT,
      Date.now(),
    ];
    this.send(this.encodeCmd(c));
  }

  sendCmd(cmd: CMD) {
    // 重置发送心跳的timer
    this.resetSendHBTimer();

    this.send(
      this.encodeCmd({
        type: SendCommandType.JOIN,
        data: {},
      })
    );
  }

  private encodeCmd(cmd: any) {
    return JSON.stringify(cmd);
  }

  /**
   * 当前我们没有做加密混淆什么的，直接使用的 JSON 字符串所以这里的解密函数暂时就是 JSON.parse
   */
  decodeCmd(data: string): Message {
    return safeJsonParse(data);
  }

  /** 发送登录命令，实际上是表示当前用户进入到这篇文档中了 */
  private sendLoginCmd(isReconnect: boolean = false) {
    // 正常进入和重连进入服务端可能有不同的处理逻辑
    const joinReason = isReconnect ? JoinReason.RECONNECT : JoinReason.NORMAL;
    this.sendCmd({
      type: SendCommandType.JOIN,
      data: {
        userId: this.userInfo.userId,
        documentId: this.documentId,
        loginReason: joinReason,
      },
    });
  }

  destroy(): void {
    super.destroy();
    this.notRecMsgTimer && clearTimeout(this.notRecMsgTimer);
  }
}
