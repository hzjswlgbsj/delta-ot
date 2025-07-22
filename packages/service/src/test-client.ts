import WebSocket from "ws";
import { getServiceLogger } from "./utils/logger";

const logger = getServiceLogger("test-client");
const ws = new WebSocket("ws://localhost:4000");

ws.on("open", () => {
  logger.info("🟢 Connected to server");
  ws.send("Hello from client!");
});

ws.on("message", (msg) => {
  logger.info("📨 Received:", msg.toString());
});

ws.on("close", () => {
  logger.info("🔴 Disconnected");
});
