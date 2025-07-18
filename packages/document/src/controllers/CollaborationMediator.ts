import { KeyFramePayload } from "@/types/cmd";
import type Delta from "quill-delta";

/**
 * 协同控制中介者接口（中介者模式）
 * 用于解耦 WebSocketController 和 CollaborateController 的直接依赖
 * 所有“文档协作相关的跨模块处理”都通过该接口完成
 */
export interface CollaborationMediator {
  /** 处理远端协作操作（广播收到的 Delta）*/
  handleRemoteOp(delta: Delta): void;

  /** 清理当前客户端自己发出的未确认的操作 */
  ackOpById(uuid: string[], broadcastOp?: Delta): void;

  /**
   * 应用服务端下发的 KeyFrame 快照（例如重连、初始加载）
   */
  handleKeyFrame(data: KeyFramePayload): void;
}
