import Delta from "quill-delta";
import { UserInfo } from "../types/base";
import type { WebsocketController } from "./WebsocketController";
import { OTSession } from "@delta-ot/collaborate";

interface CollaborateInitConfig {
  userInfo: UserInfo;
  guid: string;
  ws: WebsocketController;
}

export class CollaborateController {
  private ws!: WebsocketController;
  public otSession!: OTSession;
  private userInfo!: UserInfo;
  private guid!: string;
  private remoteChangeCb: ((delta: Delta) => void) | null = null;

  init(config: CollaborateInitConfig, initialContent?: Delta) {
    const { userInfo, guid, ws } = config;
    this.userInfo = userInfo;
    this.guid = guid;
    this.ws = ws;

    // 初始化 WebSocket 连接
    this.ws.initWsConnection();

    // 初始化 OT 会话
    this.otSession = new OTSession(userInfo.userId, initialContent);

    // 注册 OTSession 的远端变更监听器
    this.otSession.onRemoteChange((delta: Delta) => {
      this.remoteChangeCb?.(delta);
    });
  }

  /** 上层注册监听器：用于接收 transform 后的远端 delta */
  onRemoteChange(cb: (delta: Delta) => void) {
    this.remoteChangeCb = cb;
  }

  /** 提交本地 delta */
  commitLocalChange(delta: Delta) {
    this.otSession.commitLocal(delta);
    this.ws.sendCmd(delta);
  }

  destroy() {
    this.ws?.destroy();
    this.remoteChangeCb = null;
    this.otSession?.destroy();
  }
}
