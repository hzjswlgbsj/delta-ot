import Koa from "koa";
import { createServer } from "http";
import bodyParser from "koa-bodyparser";
import { setupWebSocket } from "./socket";
import router from "./routes";
import { getServiceLogger } from "./utils/logger";
import { PORT } from "./config/env";
import cors from "@koa/cors";
import { redisMonitor } from "./utils/redis-monitor";

const app = new Koa();

// 启用 CORS 跨域支持
app.use(cors());
// 中间件顺序非常重要
app.use(
  bodyParser({
    enableTypes: ["json", "form"],
    jsonLimit: "5mb",
    onerror: (err, ctx) => {
      ctx.throw(422, "Invalid JSON");
    },
  })
);
app.use(router.routes());
app.use(router.allowedMethods());

const server = createServer(app.callback());

// 启动 WebSocket 服务
setupWebSocket(server);

server.listen(PORT, () => {
  const logger = getServiceLogger("main");
  logger.info(`🚀 Server running at http://localhost:${PORT}`);

  // 启动Redis内存监控
  redisMonitor.startMonitoring(2 * 60 * 1000); // 每2分钟监控一次
});
