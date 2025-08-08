import Delta from "quill-delta";
import { CollaborateController } from "./CollaborateController";
import { WebsocketController } from "./WebsocketController";
import { useDocStore } from "../store";
import { CollaborationMediator } from "./CollaborationMediator";
import { KeyFramePayload } from "@/types/cmd";
import { UserInfo } from "@/types/base";
import { documentLogger } from "../utils/logger";
import { CursorInfo, OperationBufferOptions } from "@delta-ot/collaborate";

export interface DocumentManagerOptions {
  /** 操作缓冲器配置 */
  bufferOptions?: OperationBufferOptions;
}

export class DocumentManager implements CollaborationMediator {
  private websocket!: WebsocketController;
  private collaborate!: CollaborateController;
  private remoteDeltaCallback: ((delta: Delta) => void) | null = null;

  // 光标相关回调
  private cursorUpdateCallback: ((cursor: CursorInfo) => void) | null = null;

  async setup(
    guid: string,
    userInfo: UserInfo,
    initialContent?: Delta,
    options: DocumentManagerOptions = {}
  ) {
    // 验证用户信息
    if (!userInfo || !userInfo.userId || !userInfo.userName) {
      throw new Error("用户信息不完整，无法初始化文档管理器");
    }

    this.websocket = new WebsocketController(
      {
        userInfo,
        guid,
      },
      this
    );

    this.collaborate = new CollaborateController();
    this.collaborate.init(
      {
        userInfo,
        guid: guid,
        ws: this.websocket,
        bufferOptions: options.bufferOptions,
      },
      initialContent
    );

    // 注册远端变更回调
    this.collaborate.onRemoteChange((delta) => {
      documentLogger.info("主动执行更新编辑器内容", delta);
      this.remoteDeltaCallback?.(delta);
    });

    // 注册光标相关回调
    this.collaborate.onCursorUpdate((cursor) => {
      this.cursorUpdateCallback?.(cursor);
    });
  }

  /** 上层调用：提交本地变更 */
  commitDelta(delta: Delta) {
    documentLogger.info("DocumentManager.commitDelta:", {
      delta: delta.ops,
      timestamp: Date.now(),
    });
    this.collaborate.commitLocalChange(delta);
  }

  /** 注册远端变更回调 */
  onRemoteDelta(callback: (delta: Delta) => void) {
    this.remoteDeltaCallback = callback;
  }

  /** 注册光标更新回调 */
  onCursorUpdate(callback: (cursor: CursorInfo) => void) {
    this.cursorUpdateCallback = callback;
  }

  /** 发送光标消息 */
  sendCursorMessage(cursorData: any) {
    this.collaborate.sendCursorMessage(cursorData);
  }

  /** 获取操作缓冲器状态 */
  getBufferStatus() {
    return this.collaborate.getBufferStatus();
  }

  /** 强制刷新缓冲区 */
  flushBuffer() {
    this.collaborate.flushBuffer();
  }

  /** 清空缓冲区 */
  clearBuffer() {
    this.collaborate.clearBuffer();
  }

  /** 检查缓冲区是否为空 */
  isBufferEmpty() {
    return this.collaborate.isBufferEmpty();
  }

  // CollaborationMediator 接口实现
  handleRemoteOp(delta: Delta): void {
    // 使用新的远程操作处理机制，确保操作顺序正确
    this.collaborate.handleRemoteOperation(delta);
  }

  ackOpById(uuid: string[], broadcastOp?: Delta): void {
    // 清空未确认操作
    this.collaborate.otSession.ackByIds(uuid);

    // 如果有广播操作，应用它
    if (broadcastOp) {
      this.collaborate.otSession.applyServerBroadcast(broadcastOp);
    }
  }

  handleKeyFrame(data: KeyFramePayload): void {
    // 处理关键帧数据
    documentLogger.info("DocumentManager.handleKeyFrame:", data);
  }

  handleCursorMessage(message: any): void {
    this.collaborate.handleCursorMessage(message);
  }

  destroy() {
    this.collaborate?.destroy();
    this.websocket?.destroy();
    this.remoteDeltaCallback = null;
    this.cursorUpdateCallback = null;
  }
}
