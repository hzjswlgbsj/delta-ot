/**
 * 日志系统使用示例
 * 展示如何在协同编辑项目中使用日志系统
 */

import { Logger, GlobalLoggerManager, createLogger, getLogger } from "./Logger";

// 示例1: 基本用法
export function basicUsageExample() {
  console.log("=== 基本用法示例 ===");

  // 创建日志器
  const logger = new Logger({
    namespace: "OTSession",
    username: "user1",
    color: "#ff4444",
  });

  // 记录不同级别的日志
  logger.info("用户登录成功");
  logger.warn("网络连接不稳定");
  logger.error("操作失败", { error: "timeout" });
  logger.debug("调试信息", { data: "test" });
}

// 示例2: 多客户端场景
export function multiClientExample() {
  console.log("=== 多客户端场景示例 ===");

  // 客户端A
  const clientA = new Logger({
    namespace: "Client",
    username: "Alice",
    color: "#44ff44",
  });

  // 客户端B
  const clientB = new Logger({
    namespace: "Client",
    username: "Bob",
    color: "#4444ff",
  });

  // 模拟协同编辑场景
  clientA.info("用户Alice开始编辑文档");
  clientB.info("用户Bob加入编辑");
  clientA.info("Alice插入文本", { position: 0, text: "Hello" });
  clientB.info("Bob插入文本", { position: 5, text: "World" });
  clientA.error("发生冲突", { conflict: "same position" });
}

// 示例3: 使用全局日志管理器
export function logManagerExample() {
  console.log("=== 全局日志管理器示例 ===");

  const manager = GlobalLoggerManager.getInstance();

  // 获取或创建日志器
  const sessionLogger = manager.getLogger("session", { username: "user1" });
  const engineLogger = manager.getLogger("engine", { username: "user1" });
  const transportLogger = manager.getLogger("transport", { username: "user1" });

  // 记录不同模块的日志
  sessionLogger.info("会话初始化");
  engineLogger.info("OT引擎启动");
  transportLogger.info("WebSocket连接建立");

  // 导出所有日志
  const allLogs = manager.exportAllLogs();
  console.log("所有日志:", allLogs);
}

// 示例4: 便捷函数用法
export function convenienceFunctionsExample() {
  console.log("=== 便捷函数示例 ===");

  // 使用便捷函数创建日志器
  const logger1 = createLogger({ username: "user1" });
  const logger2 = getLogger("test", { username: "user2" });

  logger1.info("使用createLogger创建的日志器");
  logger2.info("使用getLogger获取的日志器");
}

// 示例5: 配置管理
export function configurationExample() {
  console.log("=== 配置管理示例 ===");

  const logger = new Logger({ username: "user1" });

  // 初始日志
  logger.info("初始配置");

  // 动态更新配置
  logger.setConfig({
    username: "user2",
    namespace: "updated",
    color: "#ff00ff",
  });

  logger.info("更新配置后");

  // 创建子日志器
  const childLogger = logger.createChild({ namespace: "child" });
  childLogger.info("子日志器消息");
}

// 示例6: 缓存功能
export function cachingExample() {
  console.log("=== 缓存功能示例 ===");

  const logger = new Logger({
    username: "user1",
    enableCache: true,
    maxCacheSize: 5,
  });

  // 记录多条日志
  for (let i = 1; i <= 7; i++) {
    logger.info(`日志消息 ${i}`);
  }

  // 查看缓存
  console.log("缓存大小:", logger.getCacheSize());
  console.log("缓存的日志:", logger.getCachedLogs());

  // 导出日志
  console.log("导出的JSON:", logger.exportLogs());

  // 清空缓存
  logger.clearCache();
  console.log("清空后缓存大小:", logger.getCacheSize());
}

// 示例7: 在协同编辑中的实际应用
export function collaborativeEditingExample() {
  console.log("=== 协同编辑实际应用示例 ===");

  // 创建不同模块的日志器
  const sessionLogger = new Logger({
    namespace: "OTSession",
    username: "Alice",
    color: "#ff4444",
  });

  const engineLogger = new Logger({
    namespace: "OTEngine",
    username: "Alice",
    color: "#44ff44",
  });

  const conflictLogger = new Logger({
    namespace: "ConflictResolver",
    username: "Alice",
    color: "#4444ff",
  });

  // 模拟协同编辑流程
  sessionLogger.info("用户Alice开始编辑");

  engineLogger.info("本地操作提交", {
    operation: { retain: 4, insert: "A" },
    sequence: 1,
  });

  sessionLogger.info("收到远程操作", {
    from: "Bob",
    operation: { retain: 4, insert: "B" },
  });

  engineLogger.info("执行transform", {
    localOp: { retain: 4, insert: "A" },
    remoteOp: { retain: 4, insert: "B" },
    priority: false,
  });

  conflictLogger.warn("检测到属性冲突", {
    attribute: "color",
    localValue: "red",
    remoteValue: "blue",
  });

  sessionLogger.info("冲突解决完成", {
    result: { retain: 4, insert: "B", attributes: { color: "blue" } },
  });
}

// 运行所有示例
export function runAllExamples() {
  basicUsageExample();
  multiClientExample();
  logManagerExample();
  convenienceFunctionsExample();
  configurationExample();
  cachingExample();
  collaborativeEditingExample();
}

// 如果直接运行此文件，执行所有示例
if (typeof window !== "undefined") {
  // 在浏览器环境中，可以添加到全局对象
  (window as any).LoggerExamples = {
    runAllExamples,
    basicUsageExample,
    multiClientExample,
    logManagerExample,
    convenienceFunctionsExample,
    configurationExample,
    cachingExample,
    collaborativeEditingExample,
  };
}
