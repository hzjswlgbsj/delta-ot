/**
 * Service 包的日志工具
 * 使用 common 包中的 Logger，但针对服务端环境进行了适配
 */

import { Logger, LoggerConfig } from "../../../common/src/utils/Logger";

// 全局服务端日志实例
let globalServiceLogger: Logger | null = null;

export function initServiceLogger(config: LoggerConfig = {}): void {
  globalServiceLogger = new Logger({
    namespace: config.namespace || "service",
    username: config.username || "server",
    enableConsole: true,
    enableCache: false, // 服务端不需要缓存
    ...config,
  });
  console.log("[ServiceLogger] 初始化服务端日志系统:", JSON.stringify(config));
}

export function getServiceLogger(namespace?: string): Logger {
  if (!globalServiceLogger) {
    globalServiceLogger = new Logger({
      namespace: namespace || "service",
      username: "server",
      enableConsole: true,
      enableCache: false,
    });
  }
  return globalServiceLogger;
}

// 为了向后兼容，保留原有的接口
export interface ServiceLoggerConfig extends LoggerConfig {}
