import Delta from "quill-delta";
import { UserInfo } from "../types/base";
import type { WebsocketController } from "./WebsocketController";
import {
  OTSession,
  CursorInfo,
  ReceiveCommandType,
  ServiceMessage,
  OperationBuffer,
  OperationBufferOptions,
} from "@delta-ot/collaborate";
import { documentLogger } from "../utils/logger";

interface CollaborateInitConfig {
  userInfo: UserInfo;
  guid: string;
  ws: WebsocketController;
  /** 操作缓冲器配置 */
  bufferOptions?: OperationBufferOptions;
}

export class CollaborateController {
  private ws!: WebsocketController;
  public otSession!: OTSession;
  private userInfo!: UserInfo;
  private guid!: string;
  private remoteChangeCb: ((delta: Delta) => void) | null = null;
  // 光标管理相关
  private cursorUpdateCb: ((cursor: CursorInfo) => void) | null = null;
  // 操作缓冲器
  private operationBuffer!: OperationBuffer;

  init(config: CollaborateInitConfig, initialContent?: Delta) {
    const { userInfo, guid, ws, bufferOptions } = config;
    this.userInfo = userInfo;
    this.guid = guid;
    this.ws = ws;

    // 初始化 WebSocket 连接
    this.ws.initWsConnection();

    // 初始化 OT 会话
    this.otSession = new OTSession(userInfo.userId, initialContent);

    // 初始化操作缓冲器
    this.operationBuffer = new OperationBuffer(
      (composedDelta: Delta) => {
        this.sendBufferedOperation(composedDelta);
      },
      bufferOptions,
      () => {
        // 远程操作回调：当收到远程操作时，确保缓冲区已清空
        documentLogger.info(
          "CollaborateController: 远程操作回调，缓冲区已清空"
        );
      }
    );

    // 注册 OTSession 的远端变更监听器
    this.otSession.onRemoteChange((delta: Delta) => {
      this.remoteChangeCb?.(delta);
    });
  }

  /** 上层注册监听器：用于接收 transform 后的远端 delta */
  onRemoteChange(cb: (delta: Delta) => void) {
    this.remoteChangeCb = cb;
  }

  /** 上层调用：提交本地变更（现在会先缓冲） */
  commitLocalChange(delta: Delta) {
    documentLogger.info("CollaborateController.commitLocalChange:", {
      delta: delta.ops,
      timestamp: Date.now(),
    });

    // 将操作添加到缓冲器，而不是直接发送
    this.operationBuffer.addOperation(delta);
  }

  /** 发送缓冲后的操作 */
  private sendBufferedOperation(composedDelta: Delta) {
    documentLogger.info("CollaborateController.sendBufferedOperation:", {
      composedDelta: composedDelta.ops,
      timestamp: Date.now(),
    });

    const cmd = this.ws.sendCmd(composedDelta);
    this.otSession.commitLocal(cmd);
  }

  /** 处理远程操作 - 关键方法：确保操作顺序正确 */
  handleRemoteOperation(remoteDelta: Delta) {
    // 通知缓冲器有远程操作到达，立即刷新缓冲区
    this.operationBuffer.notifyRemoteOperation();

    // 然后处理远程操作
    this.otSession.receiveRemote(remoteDelta);
  }

  /** 注册光标更新回调 */
  onCursorUpdate(cb: (cursor: CursorInfo) => void) {
    this.cursorUpdateCb = cb;
  }

  /** 处理远程光标消息 */
  handleCursorMessage(message: ServiceMessage<CursorInfo>): void {
    if (message.type === ReceiveCommandType.CURSOR_UPDATE) {
      this.cursorUpdateCb?.(message.data);
    }
  }

  /** 发送光标消息 */
  sendCursorMessage(cursorData: any) {
    if (this.ws) {
      this.ws.sendCursorMessage(cursorData);
    }
  }

  /** 获取操作缓冲器状态 */
  getBufferStatus() {
    return this.operationBuffer.getStatus();
  }

  /** 强制刷新缓冲区 */
  flushBuffer() {
    this.operationBuffer.flush();
  }

  /** 清空缓冲区 */
  clearBuffer() {
    this.operationBuffer.clear();
  }

  /** 检查缓冲区是否为空 */
  isBufferEmpty() {
    return this.operationBuffer.isEmpty();
  }

  destroy() {
    this.ws?.destroy();
    this.remoteChangeCb = null;
    this.otSession?.destroy();
    this.cursorUpdateCb = null;
    this.operationBuffer?.destroy();
  }
}
