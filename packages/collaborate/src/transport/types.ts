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
export type ClientMessage<T> = {
  type: SendCommandType;
  timestamp: number;
  documentId: string;
  userId: string;
  sequence: number;
  data?: T;
};

/** 接收的信令 */
export type ServiceMessage<T> = {
  type: ReceiveCommandType;
  timestamp: number;
  documentId: string;
  userId: string;
  sequence: number;
  data: T;
};
/** 接收的信令类型 */
export enum ReceiveCommandType {
  // 服务端心跳响应（也可作为 push 的心跳包）
  HEARTBEAT = "heartbeat",
  // 有其他人加入文档
  JOINED = "joined",
  // 有用户离开
  LEFT = "left",
  // 接收到操作（如 Delta diff）
  REMOTE_OP = "remote_op",
  // 接收到关键帧（用于首次进入或重连）
  KEY_FRAME = "key_frame",
  // 当前文档的用户列表
  USER_LIST = "user_list",
  // 服务端拒绝请求（如无权限、文档不存在等）
  REJECTED = "rejected",
}

/** 客户端发送的命令类型 */
export enum SendCommandType {
  // 客户端心跳
  HEARTBEAT = "heartbeat",
  // 加入文档
  JOIN = "join",
  // 发送关键帧（包含完整内容）
  KEY_FRAME = "key_frame",
  // 发送操作（Delta diff）
  OP = "op",
  // 离开文档
  LEAVE = "leave",
  // 请求当前文档状态（适用于重连）
  REQUEST_DOC = "request_doc",
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
