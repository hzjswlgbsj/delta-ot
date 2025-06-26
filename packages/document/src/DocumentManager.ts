import Delta from "quill-delta";
import { CollaborateController } from "./controller/collaborate";
import { WebsocketController } from "./controller/websocket";
import { DocumentManagerConfig } from "./types/document";

export class DocumentManager {
  private websocket!: WebsocketController;
  private collaborate!: CollaborateController;
  private remoteDeltaCallback: ((delta: Delta) => void) | null = null;

  setup(config: DocumentManagerConfig, initialContent?: Delta) {
    console.log("[DocumentManager] Init with doc:", config.documentId);

    this.websocket = new WebsocketController({
      userInfo: config.userInfo,
      documentId: config.documentId,
    });

    this.collaborate = new CollaborateController();
    this.collaborate.init(
      {
        userInfo: config.userInfo,
        documentId: config.documentId,
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
}
