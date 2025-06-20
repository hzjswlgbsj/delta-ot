export enum WsStatus {
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
  RECONNECTING,
  CLOSED,
}

export interface WebsocketConfig<T = any> {
  url: string;
  reConnectDelay?: number;
  refreshUrl?: () => Promise<string>;
}

/** 心跳类型，分为服务端和客户端，各自会检测是否是自己发送的心跳回来了，回来的称之为 ack */
export enum HeartbeatType {
  SERVER = 1,
  CLIENT,
}

/** 客户端发送的命令 */
export type CMD = {
  type: SendCommandType;
  // 这里先试用 any，但实际上最好是每个 Type 都有对应的 data 数据结构定义
  data: any;
};

/** 接收的信令 */
export type Message = {
  type: ReceiveCommandType;
  // 这里先试用 any，但实际上最好是每个 Type 都有对应的 data 数据结构定义
  data: any;
};

/** 接收的信令类型 */
export enum ReceiveCommandType {
  // 心跳
  HEARTBEAT = "heartbeat",
  // 有其他人进入文档
  JOINED = "joined",
}

/** 客户端发送的命令类型 */
export enum SendCommandType {
  // 心跳
  HEARTBEAT = "heartbeat",
  // 进入文档
  JOIN = "join",
  // 离开文档
  LEAVE = "leave",
}

/** 进入原因 1000-正常进入 1001-重连进入 */
export enum JoinReason {
  NORMAL = 1000,
  RECONNECT = 1001,
}

export type UserInfo = {
  userId: string;
  userName: string;
  avatar?: string;
};
