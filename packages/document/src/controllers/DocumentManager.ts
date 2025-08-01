import Delta from "quill-delta";
import { CollaborateController } from "./CollaborateController";
import { WebsocketController } from "./WebsocketController";
import { useDocStore } from "../store";
import { CollaborationMediator } from "./CollaborationMediator";
import { KeyFramePayload } from "@/types/cmd";
import { UserInfo } from "@/types/base";
import { documentLogger } from "../utils/logger";
import { CursorInfo } from "@delta-ot/collaborate";

export class DocumentManager implements CollaborationMediator {
  private websocket!: WebsocketController;
  private collaborate!: CollaborateController;
  private remoteDeltaCallback: ((delta: Delta) => void) | null = null;

  // 光标相关回调
  private cursorUpdateCallback: ((cursor: CursorInfo) => void) | null = null;

  async setup(guid: string, userInfo: UserInfo, initialContent?: Delta) {
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

  /** 上层注册远端协同变更回调 */
  onRemoteDelta(cb: (delta: Delta) => void) {
    this.remoteDeltaCallback = cb;
  }

  /** 注册光标更新回调 */
  onCursorUpdate(cb: (cursor: CursorInfo) => void) {
    this.cursorUpdateCallback = cb;
  }

  /** 发送光标消息 */
  sendCursorMessage(cursorData: any) {
    if (this.websocket) {
      this.websocket.sendCursorMessage(cursorData);
    }
  }

  /** 暴露底层 controller（可选） */
  getWebsocket() {
    return this.websocket;
  }

  getCollaborateController() {
    return this.collaborate;
  }

  /** 处理远端操作：由 WebSocket 调用 */
  handleRemoteOp(delta: Delta) {
    this.collaborate.otSession.receiveRemote(delta);
  }

  ackOpById(uuids: string[], broadcastOp?: Delta) {
    documentLogger.info(`ackOpById:`, {
      uuids,
      broadcastOp: broadcastOp?.ops,
      hasBroadcastOp: !!broadcastOp,
    });

    // 先执行 ack 操作，清理已确认的操作
    this.collaborate.otSession.ackByIds(uuids);

    // 如果有服务端广播操作，单独应用
    if (broadcastOp) {
      this.collaborate.otSession.applyServerBroadcast(broadcastOp);
    }
  }

  /**
   * 清理 retain(0) 操作，避免 transform 问题
   * Quill 编辑器会产生 retain(0) 操作，这会导致 transform 结果错误
   */
  private cleanRetainZero(delta: Delta): Delta {
    const cleanedOps = delta.ops.filter((op) => !(op.retain === 0));
    return new Delta(cleanedOps);
  }

  handleKeyFrame(data: KeyFramePayload): void {
    documentLogger.info("Applying KeyFrame", data);
    const docStore = useDocStore();
    const { sequence, content, userIds } = data;
    this.websocket.ws.sequence = sequence;

    // 清理 retain(0) 操作，避免 transform 问题
    const cleanedContent = this.cleanRetainZero(new Delta(content));
    this.collaborate.otSession.setContents(cleanedContent);

    docStore.setUserIds(userIds);
  }

  /** 处理光标相关消息 */
  handleCursorMessage(message: any): void {
    this.collaborate.handleCursorMessage(message);
  }
}
