import Redis from "ioredis";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from "../config/env";

const redis = new Redis({
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASSWORD,
  db: 0,
});
// const redis = new Redis({
//   host: "106.54.192.37",
//   port: 6379,
//   password: "MyRedis2025#",
//   db: 0,
// });

export default redis;
