import { Server } from "ws";
import type { Server as HTTPServer } from "http";

export function setupWebSocket(server: HTTPServer) {
  const wss = new Server({ server });

  wss.on("connection", (ws) => {
    console.log("🔗 Client connected");

    ws.on("message", (msg) => {
      console.log("📩 Message received:", msg.toString());
      // 回传原样
      ws.send(`Echo: ${msg.toString()}`);
    });

    ws.on("close", () => {
      console.log("❌ Client disconnected");
    });
  });
}
