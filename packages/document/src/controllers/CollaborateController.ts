import Delta from "quill-delta";
import { UserInfo } from "../types/base";
import type { WebsocketController } from "./WebsocketController";
import { OTSession, CursorInfo } from "@delta-ot/collaborate";

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

  // 光标管理相关
  private cursorUpdateCb: ((cursor: CursorInfo) => void) | null = null;

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

  /** 上层调用：提交本地变更 */
  commitLocalChange(delta: Delta) {
    const cmd = this.ws.sendCmd(delta);
    this.otSession.commitLocal(cmd);
  }

  /** 注册光标更新回调 */
  onCursorUpdate(cb: (cursor: CursorInfo) => void) {
    this.cursorUpdateCb = cb;
  }

  /** 处理远程光标消息 */
  handleCursorMessage(message: any): void {
    if (message.type === "cursor_update") {
      this.cursorUpdateCb?.(message.data);
    }
  }

  destroy() {
    this.ws?.destroy();
    this.remoteChangeCb = null;
    this.otSession?.destroy();
    this.cursorUpdateCb = null;
  }
}
