import redis from "./redis";
import { getServiceLogger } from "./logger";

const logger = getServiceLogger("redis-monitor");

/**
 * Redis 内存监控和清理工具
 */
export class RedisMonitor {
  /**
   * 获取Redis内存使用情况
   */
  async getMemoryInfo() {
    try {
      const info = await redis.info("memory");
      const lines = info.split("\n");
      const memoryInfo: Record<string, string> = {};

      for (const line of lines) {
        if (line.includes(":")) {
          const [key, value] = line.split(":");
          memoryInfo[key] = value;
        }
      }

      return {
        usedMemory: memoryInfo.used_memory || "0",
        usedMemoryHuman: memoryInfo.used_memory_human || "0B",
        usedMemoryPeak: memoryInfo.used_memory_peak || "0",
        usedMemoryPeakHuman: memoryInfo.used_memory_peak_human || "0B",
        maxMemory: memoryInfo.maxmemory || "0",
        maxMemoryHuman: memoryInfo.maxmemory_human || "0B",
        maxMemoryPolicy: memoryInfo.maxmemory_policy || "noeviction",
      };
    } catch (error) {
      logger.error("获取Redis内存信息失败:", error);
      // 返回默认值而不是null
      return {
        usedMemory: "0",
        usedMemoryHuman: "0B",
        usedMemoryPeak: "0",
        usedMemoryPeakHuman: "0B",
        maxMemory: "0",
        maxMemoryHuman: "0B",
        maxMemoryPolicy: "noeviction",
      };
    }
  }

  /**
   * 获取所有键的数量
   */
  async getKeyCount() {
    try {
      const count = await redis.dbsize();
      return count;
    } catch (error) {
      logger.error("获取Redis键数量失败:", error);
      return 0;
    }
  }

  /**
   * 获取指定模式的键
   */
  async getKeys(pattern: string = "*") {
    try {
      const keys = await redis.keys(pattern);
      return keys;
    } catch (error) {
      logger.error("获取Redis键失败:", error);
      return [];
    }
  }

  /**
   * 清理过期的用户token
   */
  async cleanupExpiredTokens() {
    try {
      const userTokenKeys = await redis.keys("user:token:*");
      let cleanedCount = 0;

      for (const key of userTokenKeys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          // 没有设置过期时间
          logger.warn(`发现没有过期时间的token: ${key}`);
          // 可以选择删除或设置过期时间
          // await redis.del(key);
          // cleanedCount++;
        } else if (ttl === -2) {
          // 键不存在（已过期）
          await redis.del(key);
          cleanedCount++;
        }
      }

      logger.info(`清理了 ${cleanedCount} 个过期的用户token`);
      return cleanedCount;
    } catch (error) {
      logger.error("清理过期token失败:", error);
      return 0;
    }
  }

  /**
   * 获取内存使用统计
   */
  async getMemoryStats() {
    const memoryInfo = await this.getMemoryInfo();
    const keyCount = await this.getKeyCount();
    const userTokenKeys = await this.getKeys("user:token:*");

    return {
      memoryInfo,
      keyCount,
      userTokenCount: userTokenKeys.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 定期监控Redis内存使用
   */
  startMonitoring(intervalMs: number = 5 * 60 * 1000) {
    // 默认5分钟
    const monitor = async () => {
      const stats = await this.getMemoryStats();

      // 添加更详细的内存信息日志
      if (stats.memoryInfo) {
        const usedMemoryMB = (
          parseInt(stats.memoryInfo.usedMemory) /
          1024 /
          1024
        ).toFixed(2);
        const maxMemoryMB =
          stats.memoryInfo.maxMemory !== "0"
            ? (parseInt(stats.memoryInfo.maxMemory) / 1024 / 1024).toFixed(2)
            : "未设置";

        logger.info(
          `Redis内存监控 - 已用: ${usedMemoryMB}MB, 上限: ${maxMemoryMB}MB, 键数量: ${stats.keyCount}`
        );
      }

      // 如果内存使用超过80%，进行清理
      if (
        stats.memoryInfo &&
        stats.memoryInfo.usedMemory &&
        stats.memoryInfo.maxMemory
      ) {
        const usedMemory = parseInt(stats.memoryInfo.usedMemory);
        const maxMemory = parseInt(stats.memoryInfo.maxMemory);

        // 检查maxMemory是否为有效值（大于0）
        if (maxMemory > 0) {
          const usagePercent = (usedMemory / maxMemory) * 100;

          if (usagePercent > 80) {
            logger.warn(`Redis内存使用率过高: ${usagePercent.toFixed(2)}%`);
            await this.cleanupExpiredTokens();
          }
        } else {
          // 如果没有设置maxmemory，只记录当前内存使用量
          const usedMemoryMB = (usedMemory / 1024 / 1024).toFixed(2);
          logger.info(`Redis当前内存使用: ${usedMemoryMB}MB (未设置内存上限)`);

          // 如果内存使用超过1GB，进行清理（可配置的阈值）
          const MEMORY_THRESHOLD_BYTES = 1024 * 1024 * 1024; // 1GB
          if (usedMemory > MEMORY_THRESHOLD_BYTES) {
            logger.warn(
              `Redis内存使用超过${
                MEMORY_THRESHOLD_BYTES / 1024 / 1024
              }MB，开始清理`
            );
            await this.cleanupExpiredTokens();
          }
        }
      }
    };

    // 立即执行一次
    monitor();

    // 设置定时器
    setInterval(monitor, intervalMs);

    logger.info(`Redis内存监控已启动，间隔: ${intervalMs}ms`);
  }

  /**
   * 强制清理所有数据（谨慎使用）
   */
  async flushAll() {
    try {
      await redis.flushall();
      logger.warn("Redis所有数据已清空");
    } catch (error) {
      logger.error("清空Redis失败:", error);
    }
  }
}

export const redisMonitor = new RedisMonitor();
