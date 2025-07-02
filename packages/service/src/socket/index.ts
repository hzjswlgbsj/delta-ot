import { Server } from "ws";
import type { Server as HTTPServer } from "http";
import { createConnectionHandler } from "./connection";

export function setupWebSocket(server: HTTPServer) {
  const wss = new Server({ server });
  wss.on("connection", createConnectionHandler());
  console.log("WebSocket server is listening...");
}
