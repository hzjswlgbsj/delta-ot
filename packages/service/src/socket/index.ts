import { Server } from "ws";
import type { Server as HTTPServer } from "http";
import { createConnectionHandler } from "./connection";
import { getServiceLogger } from "../utils/logger";

export function setupWebSocket(server: HTTPServer) {
  const wss = new Server({ server });
  wss.on("connection", createConnectionHandler());
  const logger = getServiceLogger("socket");
  logger.info("WebSocket server is listening...");
}
