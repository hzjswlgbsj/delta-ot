/**
 * 缓存登录状态
 */
const loggedInUsers = new Map<string, string>(); // userId -> token

export const LoggedInUserStore = {
  set(userId: string, token: string) {
    loggedInUsers.set(userId, token);
  },

  get(userId: string): string | undefined {
    return loggedInUsers.get(userId);
  },

  has(userId: string): boolean {
    return loggedInUsers.has(userId);
  },

  remove(userId: string) {
    loggedInUsers.delete(userId);
  },

  clear() {
    loggedInUsers.clear();
  },
};
