import Koa from "koa";
import { createServer } from "http";
import { setupWebSocket } from "./socket";

const app = new Koa();
const server = createServer(app.callback());

setupWebSocket(server);

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
