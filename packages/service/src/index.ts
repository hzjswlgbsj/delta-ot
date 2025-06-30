import Koa from "koa";
import { createServer } from "http";
import bodyParser from "koa-bodyparser";
import { setupWebSocket } from "./socket";
import router from "./routes";
import { PORT } from "./config/env";

const app = new Koa();

// ✅ 中间件顺序非常重要
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

const server = createServer(app.callback());

// ✅ 启动 WebSocket 服务
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
