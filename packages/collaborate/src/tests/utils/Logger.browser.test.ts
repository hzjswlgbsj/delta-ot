/**
 * 浏览器环境下的日志系统测试
 * 这个测试主要展示日志系统的实际输出效果
 */

import { describe, it, expect } from "vitest";
import {
  Logger,
  GlobalLoggerManager,
} from "../../../../common/src/utils/Logger";

describe("Logger Browser Demo", () => {
  it("should demonstrate multi-client logging", () => {
    console.log("=== 多客户端日志演示 ===");

    // 模拟两个不同的客户端
    const clientA = new Logger({
      namespace: "Client",
      username: "Alice",
      color: "#ff4444",
    });

    const clientB = new Logger({
      namespace: "Client",
      username: "Bob",
      color: "#44ff44",
    });

    // 模拟协同编辑场景
    clientA.info("用户Alice开始编辑文档");
    clientB.info("用户Bob加入编辑");

    clientA.info("Alice插入文本", { position: 0, text: "Hello" });
    clientB.info("Bob插入文本", { position: 5, text: "World" });

    clientA.warn("检测到网络延迟");
    clientB.error("发生冲突", { conflict: "same position" });

    clientA.info("冲突解决完成", { result: "BAbase" });
    clientB.info("同步完成");

    // 验证缓存功能
    expect(clientA.getCacheSize()).toBe(4);
    expect(clientB.getCacheSize()).toBe(4);
  });

  it("should demonstrate different log levels", () => {
    console.log("=== 不同日志级别演示 ===");

    const logger = new Logger({
      namespace: "Demo",
      username: "TestUser",
    });

    logger.debug("调试信息", { debug: true });
    logger.info("一般信息", { info: true });
    logger.warn("警告信息", { warn: true });
    logger.error("错误信息", { error: true });

    expect(logger.getCacheSize()).toBe(4);
  });

  it("should demonstrate log manager functionality", () => {
    console.log("=== 日志管理器演示 ===");

    const manager = GlobalLoggerManager.getInstance();

    // 创建不同模块的日志器
    const sessionLogger = manager.getLogger("session", { username: "User1" });
    const engineLogger = manager.getLogger("engine", { username: "User1" });
    const transportLogger = manager.getLogger("transport", {
      username: "User1",
    });

    sessionLogger.info("会话初始化");
    engineLogger.info("OT引擎启动");
    transportLogger.info("WebSocket连接建立");

    // 导出所有日志
    const allLogs = manager.exportAllLogs();
    console.log("所有日志:", allLogs);

    expect(Object.keys(allLogs)).toHaveLength(3);
  });

  it("should demonstrate configuration changes", () => {
    console.log("=== 配置变更演示 ===");

    const logger = new Logger({ username: "User1" });

    logger.info("初始配置下的日志");

    // 动态更新配置
    logger.setConfig({
      username: "User2",
      namespace: "Updated",
      color: "#ff00ff",
    });

    logger.info("更新配置后的日志");

    // 创建子日志器
    const childLogger = logger.createChild({ namespace: "Child" });
    childLogger.info("子日志器消息");

    expect(logger.getCacheSize()).toBe(2);
    expect(childLogger.getCacheSize()).toBe(1);
  });
});
