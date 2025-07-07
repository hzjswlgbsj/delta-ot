import redis from "../utils/redis";
import { decodeToken } from "../utils/jwt";

const PREFIX = "user:token:";

/**
 * 管理已登录用户的缓存（基于 Redis 存储 userId -> token 映射）
 * Redis 自带过期机制，无需手动清理
 */
class LoggedInUserStore {
  /**
   * 添加已登录用户记录
   * @param userId 用户 ID
   * @param token JWT token（带有 exp 字段）
   */
  async add(userId: string, token: string) {
    const decoded = decodeToken(token);
    const now = Math.floor(Date.now() / 1000); // 当前时间（单位：秒）
    const exp =
      typeof decoded?.exp === "number" ? decoded.exp : now + 7 * 24 * 60 * 60;

    const ttl = exp - now; // 计算剩余过期秒数

    if (ttl <= 0) {
      console.warn(
        `[LoggedInUserStore] Token 已过期，不再缓存 userId=${userId}`
      );
      return;
    }

    await redis.set(`${PREFIX}${userId}`, token, "EX", ttl);
  }

  /**
   * 获取用户的 token，如果不存在或已过期则返回 null
   */
  async getToken(userId: string): Promise<string | null> {
    const token = await redis.get(`${PREFIX}${userId}`);
    return token ?? null;
  }

  /**
   * 验证用户是否已登录（token 存在即可）
   */
  async isLoggedIn(userId: string): Promise<boolean> {
    const token = await this.getToken(userId);
    return !!token;
  }

  /**
   * 手动移除某个用户的 token（退出登录等场景）
   */
  async remove(userId: string) {
    await redis.del(`${PREFIX}${userId}`);
  }

  /**
   * 刷新用户 token（常用于延长有效期）
   */
  async refresh(userId: string, newToken: string) {
    await this.add(userId, newToken);
  }
}

export const loggedInUserStore = new LoggedInUserStore();
