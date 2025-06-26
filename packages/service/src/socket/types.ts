export enum MessageType {
  HEARTBEAT = "heartbeat",
  JOIN = "join",
  KEY_FRAME = "key_frame",
}

/** 心跳类型，分为服务端和客户端，各自会检测是否是自己发送的心跳回来了，回来的称之为 ack */
export enum HeartbeatType {
  SERVER = 1,
  CLIENT,
}

export interface ClientMessage<T = any> {
  type: MessageType;
  timestamp: number;
  documentId: string;
  userId: string;
  sequence: number;
  data?: T;
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
