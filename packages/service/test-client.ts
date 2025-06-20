import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:4000");

ws.on("open", () => {
  console.log("🟢 Connected to server");
  ws.send("Hello from client!");
});

ws.on("message", (msg) => {
  console.log("📨 Received:", msg.toString());
});

ws.on("close", () => {
  console.log("🔴 Disconnected");
});
