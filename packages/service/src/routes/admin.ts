import Router from "koa-router";
import { redisMonitor } from "../utils/redis-monitor";
import { getServiceLogger } from "../utils/logger";
import redis from "../utils/redis";

const router = new Router();
const logger = getServiceLogger("admin");

// 获取Redis内存统计
router.get("/redis/stats", async (ctx) => {
  try {
    const stats = await redisMonitor.getMemoryStats();
    ctx.body = {
      code: 0,
      data: stats,
      msg: "获取Redis统计成功",
    };
  } catch (error) {
    logger.error("获取Redis统计失败:", error);
    ctx.body = {
      code: 1,
      msg: "获取Redis统计失败",
    };
  }
});

// 清理过期的用户token
router.post("/redis/cleanup-tokens", async (ctx) => {
  try {
    const cleanedCount = await redisMonitor.cleanupExpiredTokens();
    ctx.body = {
      code: 0,
      data: { cleanedCount },
      msg: `清理了 ${cleanedCount} 个过期的用户token`,
    };
  } catch (error) {
    logger.error("清理过期token失败:", error);
    ctx.body = {
      code: 1,
      msg: "清理过期token失败",
    };
  }
});

// 获取所有用户token
router.get("/redis/user-tokens", async (ctx) => {
  try {
    const keys = await redisMonitor.getKeys("user:token:*");
    const tokens = [];

    for (const key of keys) {
      const token = await redis.get(key);
      const ttl = await redis.ttl(key);
      tokens.push({
        key,
        ttl,
        hasToken: !!token,
      });
    }

    ctx.body = {
      code: 0,
      data: {
        count: keys.length,
        tokens,
      },
      msg: "获取用户token列表成功",
    };
  } catch (error) {
    logger.error("获取用户token列表失败:", error);
    ctx.body = {
      code: 1,
      msg: "获取用户token列表失败",
    };
  }
});

// 强制清空Redis（谨慎使用）
router.post("/redis/flush-all", async (ctx) => {
  try {
    await redisMonitor.flushAll();
    ctx.body = {
      code: 0,
      msg: "Redis已清空",
    };
  } catch (error) {
    logger.error("清空Redis失败:", error);
    ctx.body = {
      code: 1,
      msg: "清空Redis失败",
    };
  }
});

// 清除所有用户token（强制重新登录）
router.post("/redis/clear-all-tokens", async (ctx) => {
  try {
    const keys = await redisMonitor.getKeys("user:token:*");
    let clearedCount = 0;

    for (const key of keys) {
      await redis.del(key);
      clearedCount++;
    }

    ctx.body = {
      code: 0,
      data: { clearedCount },
      msg: `清除了 ${clearedCount} 个用户token，所有用户需要重新登录`,
    };
  } catch (error) {
    logger.error("清除所有token失败:", error);
    ctx.body = {
      code: 1,
      msg: "清除所有token失败",
    };
  }
});

export default router;
