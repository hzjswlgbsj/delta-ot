import { WebSocket } from "ws";
import { ClientConnection } from "./ClientConnection";

/**
 * 创建 WebSocket 客户端连接处理器
 */
export function createConnectionHandler() {
  return (ws: WebSocket) => new ClientConnection(ws);
}
