import Delta from "quill-delta";
import { CollaborateController } from "./CollaborateController";
import { WebsocketController } from "./WebsocketController";
import { useUserStore, useDocStore } from "../store";
import { CollaborationMediator } from "./CollaborationMediator";
import { KeyFramePayload } from "@/types/cmd";
import { isReactive, isReadonly, toRaw } from "vue";

export class DocumentManager implements CollaborationMediator {
  private websocket!: WebsocketController;
  private collaborate!: CollaborateController;
  private remoteDeltaCallback: ((delta: Delta) => void) | null = null;

  async setup(guid: string, initialContent?: Delta) {
    const userStore = useUserStore();
    const { id, userId, userName, avatar, loginName, createdAt, updatedAt } =
      userStore.userInfo;
    const userInfo = {
      id,
      userId,
      userName,
      avatar,
      loginName,
      createdAt,
      updatedAt,
    };

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
      this.remoteDeltaCallback?.(delta);
    });
  }

  /** 上层调用：提交本地变更 */
  commitDelta(delta: Delta) {
    this.collaborate.commitLocalChange(delta);
  }

  /** 上层注册远端协同变更回调 */
  onRemoteDelta(cb: (delta: Delta) => void) {
    this.remoteDeltaCallback = cb;
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

  ackOpById(uuids: string[]) {
    this.collaborate.otSession.ackByIds(uuids);
  }

  handleKeyFrame(data: KeyFramePayload): void {
    console.log("[DocumentManager] Applying KeyFrame", data);
    const docStore = useDocStore();
    const { sequence, content, userIds } = data;
    this.websocket.ws.sequence = sequence;
    this.collaborate.otSession.setContents(new Delta(content));
    docStore.setUserIds(userIds);
  }
}
