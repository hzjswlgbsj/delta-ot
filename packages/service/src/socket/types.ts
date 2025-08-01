export enum MessageType {
  HEARTBEAT = "heartbeat",
  JOIN = "join",
  KEY_FRAME = "key_frame",
  OP = "op",
  ERROR = "error",
  NEED_REFRESH = "need_refresh",
  // 光标相关消息类型
  CURSOR_UPDATE = "cursor_update",
}

/** 心跳类型，分为服务端和客户端，各自会检测是否是自己发送的心跳回来了，回来的称之为 ack */
export enum HeartbeatType {
  SERVER = 1,
  CLIENT,
}

/** 用户状态 */
export enum UserStatus {
  ACTIVE = "active",
  IDLE = "idle",
  OFFLINE = "offline",
}

export interface ClientMessage<T = any> {
  type: MessageType;
  timestamp: number;
  documentId: string;
  userId: string;
  /** 操作序列，主要是 OP 类型的信令使用 */
  sequence: number;
  /** 信令的唯一标识 */
  uuid: string;
  data: T;
}

export interface JoinPayload {
  userId: string;
  documentId: string;
  loginReason: number;
}

export interface HeartbeatPayload {
  heartbeatType: HeartbeatType;
  timestamp: number;
}

export interface KeyFramePayload {
  userId: string;
  documentId: string;
}

// 光标相关类型定义
export interface CursorUpdateData {
  index: number;
  length: number;
  userName: string;
  color: string;
  status: UserStatus;
  lastActivity: number;
  avatar?: string;
}

export interface CursorInfo {
  index: number;
  length: number;
  userId: string;
  userName: string;
  timestamp: number;
  color: string;
  status: UserStatus;
  lastActivity: number;
  avatar?: string;
  metadata?: Record<string, any>;
}
