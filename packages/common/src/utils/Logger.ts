/**
 * 通用日志系统
 * 支持挂载到 window 对象上作为全局单例
 * 在客户端登录时初始化，整个应用中使用
 */

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

export interface LoggerConfig {
  namespace?: string;
  username?: string;
  docId?: string;
  color?: string;
  clientId?: string; // 客户端标识，用于确定颜色
  enableCache?: boolean;
  maxCacheSize?: number;
  enableConsole?: boolean;
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  namespace?: string;
  username?: string;
  docId?: string;
  message: string;
  args: any[];
  color?: string;
}

export class Logger {
  private namespace?: string;
  private username?: string;
  private docId?: string;
  private color?: string;
  private enableCache: boolean;
  private maxCacheSize: number;
  private enableConsole: boolean;
  private cache: LogEntry[] = [];

  // 预定义的颜色方案
  private static readonly COLORS = {
    error: "#ff4444",
    warn: "#ff8800",
    info: "#0088ff",
    debug: "#888888",
    default: "#333333",
  };

  // 用户名颜色映射（用于区分不同用户）
  private static readonly USER_COLORS = [
    "#ff4444",
    "#44ff44",
    "#4444ff",
    "#ffff44",
    "#ff44ff",
    "#44ffff",
    "#ff8844",
    "#44ff88",
    "#8844ff",
    "#ff4488",
    "#88ff44",
    "#4488ff",
  ];

  constructor(config: LoggerConfig = {}) {
    this.namespace = config.namespace;
    this.username = config.username;
    this.docId = config.docId || this.getDocIdFromUrl();
    // 优先使用 clientId 确定颜色，然后是自定义颜色，最后是用户名
    this.color =
      config.color || this.getUserColor(config.clientId || config.username);
    this.enableCache = config.enableCache ?? true;
    this.maxCacheSize = config.maxCacheSize ?? 1000;
    this.enableConsole = config.enableConsole ?? true;
  }

  /**
   * 从浏览器 URL 获取 docId 参数
   */
  private getDocIdFromUrl(): string | undefined {
    if (typeof window === "undefined") return undefined;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("docId") || undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * 根据用户名生成颜色
   * 为不同的客户端设置固定的颜色，便于区分
   */
  private getUserColor(username?: string): string {
    if (!username) return Logger.COLORS.default;

    // 为不同的客户端设置固定的颜色
    // 使用常见的 UI 蓝色和绿色，避免过于突兀的颜色
    const clientColors: Record<string, string> = {
      // 第一个客户端使用蓝色（常见的 UI 蓝色）
      client1: "#3B82F6", // 现代 UI 常用的蓝色
      user1: "#3B82F6",
      alice: "#3B82F6",
      test1: "#3B82F6",
      "1": "#3B82F6",
      "client-1": "#3B82F6",
      "user-1": "#3B82F6",
      sixty: "#3B82F6", // 测试用例中的用户名
      "temp-user": "#3B82F6", // 测试环境中的默认用户

      // 第二个客户端使用绿色
      client2: "#10B981", // 现代 UI 常用的绿色
      user2: "#10B981",
      bob: "#10B981",
      test2: "#10B981",
      "2": "#10B981",
      "client-2": "#10B981",
      "user-2": "#10B981",
      wangwu: "#10B981", // 测试用例中的用户名
    };

    // 检查是否有预定义的颜色
    const lowerUsername = username.toLowerCase();
    if (clientColors[lowerUsername]) {
      return clientColors[lowerUsername];
    }

    // 如果没有预定义，使用简单的哈希算法
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % Logger.USER_COLORS.length;
    return Logger.USER_COLORS[index];
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const milliseconds = date.getMilliseconds().toString().padStart(3, "0");
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  /**
   * 构建日志标题
   */
  private buildTitle(level: LogLevel): string {
    const parts: string[] = [];

    // 时间
    parts.push(this.formatTimestamp(Date.now()));

    // 级别
    parts.push(level.toUpperCase());

    // 命名空间（如果有）
    if (this.namespace) {
      parts.push(this.namespace);
    }

    // 用户名（如果有）
    if (this.username) {
      parts.push(this.username);
    }

    // 文档ID（如果有）
    if (this.docId) {
      parts.push(this.docId);
    }

    return `[${parts.join("][")}]`;
  }

  /**
   * 获取级别对应的颜色
   */
  private getLevelColor(level: LogLevel): string {
    return Logger.COLORS[level] || Logger.COLORS.default;
  }

  /**
   * 创建带颜色的日志消息
   */
  private createColoredMessage(
    title: string,
    message: string,
    args: any[]
  ): any[] {
    const titleColor = this.color || this.getLevelColor(LogLevel.INFO);
    const coloredTitle = `%c${title}`;
    const titleStyle = `color: ${titleColor}; font-weight: bold;`;

    return [coloredTitle, titleStyle, `${message}`, ...args];
  }

  /**
   * 缓存日志条目
   */
  private cacheLog(entry: LogEntry): void {
    if (!this.enableCache) return;

    this.cache.push(entry);

    // 限制缓存大小
    if (this.cache.length > this.maxCacheSize) {
      this.cache.shift();
    }
  }

  /**
   * 输出日志到控制台
   */
  private outputToConsole(
    level: LogLevel,
    title: string,
    message: string,
    args: any[]
  ): void {
    if (!this.enableConsole) return;

    // 检查是否在浏览器环境中
    if (typeof window !== "undefined") {
      const coloredMessage = this.createColoredMessage(title, message, args);

      switch (level) {
        case LogLevel.ERROR:
          console.error(...coloredMessage);
          break;
        case LogLevel.WARN:
          console.warn(...coloredMessage);
          break;
        case LogLevel.INFO:
          console.info(...coloredMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(...coloredMessage);
          break;
        default:
          console.log(...coloredMessage);
      }
    } else {
      // 服务端环境，使用简单的格式化输出
      const timestamp = new Date().toISOString();
      const logMessage = `${timestamp} [${level.toUpperCase()}] ${title}: ${message}`;

      switch (level) {
        case LogLevel.ERROR:
          console.error(logMessage, ...args);
          break;
        case LogLevel.WARN:
          console.warn(logMessage, ...args);
          break;
        case LogLevel.INFO:
          console.log(logMessage, ...args);
          break;
        case LogLevel.DEBUG:
          console.debug(logMessage, ...args);
          break;
        default:
          console.log(logMessage, ...args);
      }
    }
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = Date.now();
    const title = this.buildTitle(level);

    // 创建日志条目
    const entry: LogEntry = {
      timestamp,
      level,
      namespace: this.namespace,
      username: this.username,
      docId: this.docId,
      message,
      args,
      color: this.color,
    };

    // 缓存日志
    this.cacheLog(entry);

    // 输出到控制台
    this.outputToConsole(level, title, message, args);

    // 预留：上报到服务器
    this.reportToServer(entry);
  }

  /**
   * 错误日志
   */
  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * 调试日志
   */
  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * 获取缓存的日志
   */
  getCachedLogs(): LogEntry[] {
    return [...this.cache];
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache = [];
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.cache.length;
  }

  /**
   * 导出日志（用于调试或上报）
   */
  exportLogs(): string {
    return JSON.stringify(this.cache, null, 2);
  }

  /**
   * 预留：上报到服务器
   */
  private reportToServer(entry: LogEntry): void {
    // TODO: 实现日志上报到服务器的逻辑
    // 可以在这里添加批量上报、错误上报等功能
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<LoggerConfig>): void {
    if (config.namespace !== undefined) this.namespace = config.namespace;
    if (config.username !== undefined) {
      this.username = config.username;
      this.color = config.color || this.getUserColor(config.username);
    }
    if (config.color !== undefined) this.color = config.color;
    if (config.enableCache !== undefined) this.enableCache = config.enableCache;
    if (config.maxCacheSize !== undefined)
      this.maxCacheSize = config.maxCacheSize;
    if (config.enableConsole !== undefined)
      this.enableConsole = config.enableConsole;
  }

  /**
   * 创建子日志器（继承配置但可以覆盖）
   */
  createChild(config: Partial<LoggerConfig>): Logger {
    return new Logger({
      namespace: config.namespace || this.namespace,
      username: config.username || this.username,
      color: config.color || this.color,
      enableCache: config.enableCache ?? this.enableCache,
      maxCacheSize: config.maxCacheSize ?? this.maxCacheSize,
      enableConsole: config.enableConsole ?? this.enableConsole,
    });
  }
}

/**
 * 全局日志管理器
 */
export class GlobalLoggerManager {
  private static instance: GlobalLoggerManager;
  private loggers: Map<string, Logger> = new Map();
  private defaultConfig: LoggerConfig = {
    enableCache: true,
    maxCacheSize: 1000,
    enableConsole: true,
  };

  private constructor() {}

  static getInstance(): GlobalLoggerManager {
    if (!GlobalLoggerManager.instance) {
      GlobalLoggerManager.instance = new GlobalLoggerManager();
    }
    return GlobalLoggerManager.instance;
  }

  /**
   * 获取或创建日志器
   */
  getLogger(name: string, config?: LoggerConfig): Logger {
    if (!this.loggers.has(name)) {
      const mergedConfig = { ...this.defaultConfig, ...config };
      this.loggers.set(name, new Logger(mergedConfig));
    }
    return this.loggers.get(name)!;
  }

  /**
   * 设置默认配置
   */
  setDefaultConfig(config: LoggerConfig): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * 获取所有日志器
   */
  getAllLoggers(): Map<string, Logger> {
    return new Map(this.loggers);
  }

  /**
   * 清空所有日志器
   */
  clearAllLoggers(): void {
    this.loggers.clear();
  }

  /**
   * 导出所有日志
   */
  exportAllLogs(): Record<string, LogEntry[]> {
    const result: Record<string, LogEntry[]> = {};
    for (const [name, logger] of this.loggers) {
      result[name] = logger.getCachedLogs();
    }
    return result;
  }
}

/**
 * 便捷函数：创建日志器
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}

/**
 * 便捷函数：获取全局日志器
 */
export function getLogger(name: string, config?: LoggerConfig): Logger {
  return GlobalLoggerManager.getInstance().getLogger(name, config);
}

// 声明全局类型
declare global {
  interface Window {
    Logger: typeof Logger;
    GlobalLoggerManager: typeof GlobalLoggerManager;
    createLogger: typeof createLogger;
    getLogger: typeof getLogger;
    logger: {
      [namespace: string]: Logger;
    };
  }
}

/**
 * 初始化全局日志系统
 * 在客户端登录成功后调用
 */
export function initGlobalLogger(config: LoggerConfig): void {
  if (typeof window !== "undefined") {
    // 尝试从 URL 参数获取客户端标识
    let clientId = config.clientId;
    if (!clientId) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        clientId =
          urlParams.get("clientId") || urlParams.get("client") || undefined;
      } catch (error) {
        // 忽略错误
      }
    }

    // 如果有客户端标识，更新配置
    if (clientId) {
      config.clientId = clientId;
    }

    // 挂载到 window 对象
    window.Logger = Logger;
    window.GlobalLoggerManager = GlobalLoggerManager;
    window.createLogger = createLogger;
    window.getLogger = getLogger;

    // 初始化默认配置
    const manager = GlobalLoggerManager.getInstance();
    manager.setDefaultConfig(config);

    // 创建一些常用的日志器
    window.logger = {
      collaborate: manager.getLogger("collaborate", config),
      document: manager.getLogger("document", config),
      service: manager.getLogger("service", config),
    };

    console.log("[GlobalLogger] 初始化日志系统:", config);
  }
}

/**
 * 获取全局日志器（从 window 对象）
 */
export function getGlobalLogger(namespace: string): Logger {
  if (typeof window !== "undefined") {
    // 如果 window.logger 不存在，尝试自动初始化
    if (!window.logger) {
      // 尝试从 URL 参数获取用户信息
      let username = "temp-user";
      let clientId: string | undefined;

      try {
        const urlParams = new URLSearchParams(window.location.search);
        clientId =
          urlParams.get("clientId") || urlParams.get("client") || undefined;

        // 尝试从 localStorage 获取用户信息
        const userInfoStr = localStorage.getItem("userInfo");

        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          username = userInfo.userName || "temp-user";
        }
      } catch (error) {
        console.error("[Logger] 自动初始化时出错:", error);
      }

      // 自动初始化 Logger
      initGlobalLogger({
        username,
        clientId,
        enableCache: false, // 测试环境不需要缓存
      });
    }

    return window.logger[namespace] || window.getLogger(namespace);
  }

  // 如果 window 对象不可用，返回一个临时日志器
  return new Logger({ namespace, username: "temp-user", docId: "temp-doc" });
}
