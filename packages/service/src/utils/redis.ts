import Redis from "ioredis";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from "../config/env";

const redis = new Redis({
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASSWORD,
  db: 0,
  // 添加连接优化配置
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export default redis;
