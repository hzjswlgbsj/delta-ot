import { CollaborateController } from "./controller/collaborate";
import { WebsocketController } from "./controller/websocket";
import { DocumentManagerConfig } from "./types/document";

export class DocumentManager {
  private services = new Map<string, unknown>();

  setup(config: DocumentManagerConfig) {
    console.log("[DocumentManager] Init with doc:", config.documentId);
    const ws = new WebsocketController({
      userInfo: config.userInfo,
      documentId: config.documentId,
    });

    this.register("websocket", ws);

    const collaborateCtrl = new CollaborateController();
    collaborateCtrl.init({
      userInfo: config.userInfo,
      documentId: config.documentId,
      ws: ws,
    });

    this.register("collaborate", collaborateCtrl);
  }

  register<T>(key: string, instance: T) {
    this.services.set(key, instance);
  }

  get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service "${key}" not found in DocumentManager.`);
    }
    return service as T;
  }
}
