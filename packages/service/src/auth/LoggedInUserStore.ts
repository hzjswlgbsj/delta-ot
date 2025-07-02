import { decodeToken } from "../utils/jwt";

interface UserSession {
  token: string;
  expireAt: number;
}

/**
 * 管理已登录用户的缓存（基于 userId -> token 结构）
 * 支持自动过期清理
 */
class LoggedInUserStore {
  private store: Map<string, UserSession> = new Map();

  constructor() {
    // 启动定时清理任务
    setInterval(() => this.cleanup(), 60 * 1000); // 每分钟清理一次
  }

  /**
   * 添加已登录用户记录
   */
  add(userId: string, token: string) {
    const decoded = decodeToken(token);
    const expireAt =
      decoded?.exp && typeof decoded.exp === "number"
        ? decoded.exp * 1000 // 转为毫秒
        : Date.now() + 7 * 24 * 60 * 60 * 1000; // 默认 7 天

    this.store.set(userId, { token, expireAt });
  }

  /**
   * 验证用户是否已登录
   */
  isLoggedIn(userId: string): boolean {
    const session = this.store.get(userId);
    if (!session) return false;
    if (Date.now() > session.expireAt) {
      this.store.delete(userId);
      return false;
    }
    return true;
  }

  /**
   * 获取用户的 token（用于验证场景）
   */
  getToken(userId: string): string | undefined {
    const session = this.store.get(userId);
    if (!session || Date.now() > session.expireAt) {
      this.store.delete(userId);
      return undefined;
    }
    return session.token;
  }

  remove(userId: string) {
    this.store.delete(userId);
  }

  refresh(userId: string, newToken: string) {
    this.add(userId, newToken);
  }

  /**
   * 清理过期 token
   */
  private cleanup() {
    const now = Date.now();
    for (const [userId, session] of this.store.entries()) {
      if (session.expireAt <= now) {
        console.log(`cleanup expired token for user ${userId}`);
        this.store.delete(userId);
      }
    }
  }
}

export const loggedInUserStore = new LoggedInUserStore();
