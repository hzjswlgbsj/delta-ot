export enum ErrorCode {
  /** 用户已存在（注册） */
  USER_ALREADY_EXISTS = 1001,

  /** 登录名或密码错误 */
  INVALID_CREDENTIALS = 1002,

  /** 缺少 loginName */
  MISSING_LOGIN_NAME = 1003,

  /** 用户不存在 */
  USER_NOT_FOUND = 1004,

  /** 文件不存在 */
  FILE_NOT_FOUND = 1009,

  /** 令牌无效或过期 */
  INVALID_TOKEN = -1,

  /** 内部服务器错误 */
  INTERNAL_ERROR = 5000,

  // ✅ 可以按模块往下扩展
}
