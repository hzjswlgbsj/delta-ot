import { UserInfo } from "../types/base";
import type { WebsocketController } from "./websocket";

interface CollaborateInitConfig {
  userInfo: UserInfo;
  documentId: string;
  ws: WebsocketController;
}

export class CollaborateController {
  private ws!: WebsocketController;

  init(config: CollaborateInitConfig) {
    this.ws = config.ws;
    console.log("[CollaborateController] Init with doc:", config.documentId);
    this.ws.initWsConnection();
  }

  destroy() {
    this.ws?.destroy();
  }
}
