import { describe, it, expect, beforeEach } from "vitest";
import {
  Logger,
  GlobalLoggerManager,
  createLogger,
  getLogger,
  LogLevel,
} from "../../../../common/src/utils/Logger";

describe("Logger System", () => {
  beforeEach(() => {
    // 清空全局日志管理器
    GlobalLoggerManager.getInstance().clearAllLoggers();
  });

  describe("Basic Logger Functionality", () => {
    it("should create logger with basic configuration", () => {
      const logger = new Logger({
        namespace: "test",
        username: "user1",
      });

      expect(logger).toBeInstanceOf(Logger);
    });

    it("should log messages with correct format", () => {
      const logger = new Logger({
        namespace: "test",
        username: "user1",
      });

      // 模拟 console.info 来捕获输出
      const originalInfo = console.info;
      const logs: any[] = [];
      console.info = (...args: any[]) => logs.push(args);

      logger.info("Test message", { data: "test" });

      console.info = originalInfo;

      expect(logs.length).toBeGreaterThan(0);
      const logArgs = logs[0];
      expect(logArgs[0]).toContain("[INFO]");
      expect(logArgs[0]).toContain("[test]");
      expect(logArgs[0]).toContain("[user1]");
      expect(logArgs[2]).toContain("Test message");
    });

    it("should support multiple log levels", () => {
      const logger = new Logger({ username: "user1" });
      const logs: any[] = [];

      const originalError = console.error;
      const originalWarn = console.warn;
      const originalInfo = console.info;
      const originalDebug = console.debug;

      console.error = (...args: any[]) => logs.push({ level: "error", args });
      console.warn = (...args: any[]) => logs.push({ level: "warn", args });
      console.info = (...args: any[]) => logs.push({ level: "info", args });
      console.debug = (...args: any[]) => logs.push({ level: "debug", args });

      logger.error("Error message");
      logger.warn("Warning message");
      logger.info("Info message");
      logger.debug("Debug message");

      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      console.debug = originalDebug;

      expect(logs).toHaveLength(4);
      expect(logs[0].level).toBe("error");
      expect(logs[1].level).toBe("warn");
      expect(logs[2].level).toBe("info");
      expect(logs[3].level).toBe("debug");
    });

    it("should support multiple arguments like console.log", () => {
      const logger = new Logger({ username: "user1" });
      const logs: any[] = [];

      const originalInfo = console.info;
      console.info = (...args: any[]) => logs.push(args);

      logger.info("Message", "arg1", { obj: "test" }, [1, 2, 3]);

      console.info = originalInfo;

      expect(logs[0]).toHaveLength(6); // title + style + message + 3 args
      expect(logs[0][2]).toContain("Message");
      expect(logs[0][3]).toBe("arg1");
      expect(logs[0][4]).toEqual({ obj: "test" });
      expect(logs[0][5]).toEqual([1, 2, 3]);
    });
  });

  describe("Caching Functionality", () => {
    it("should cache logs when enabled", () => {
      const logger = new Logger({
        username: "user1",
        enableCache: true,
      });

      logger.info("Test message 1");
      logger.error("Test message 2");

      const cachedLogs = logger.getCachedLogs();
      expect(cachedLogs).toHaveLength(2);
      expect(cachedLogs[0].message).toBe("Test message 1");
      expect(cachedLogs[0].level).toBe(LogLevel.INFO);
      expect(cachedLogs[1].message).toBe("Test message 2");
      expect(cachedLogs[1].level).toBe(LogLevel.ERROR);
    });

    it("should respect max cache size", () => {
      const logger = new Logger({
        username: "user1",
        enableCache: true,
        maxCacheSize: 3,
      });

      logger.info("Message 1");
      logger.info("Message 2");
      logger.info("Message 3");
      logger.info("Message 4");

      const cachedLogs = logger.getCachedLogs();
      expect(cachedLogs).toHaveLength(3);
      expect(cachedLogs[0].message).toBe("Message 2"); // 第一条被移除
      expect(cachedLogs[2].message).toBe("Message 4");
    });

    it("should not cache when disabled", () => {
      const logger = new Logger({
        username: "user1",
        enableCache: false,
      });

      logger.info("Test message");
      const cachedLogs = logger.getCachedLogs();
      expect(cachedLogs).toHaveLength(0);
    });

    it("should clear cache", () => {
      const logger = new Logger({ username: "user1" });
      logger.info("Test message");
      expect(logger.getCacheSize()).toBe(1);

      logger.clearCache();
      expect(logger.getCacheSize()).toBe(0);
    });
  });

  describe("Color Functionality", () => {
    it("should assign different colors to different users", () => {
      const logger1 = new Logger({ username: "user1" });
      const logger2 = new Logger({ username: "user2" });
      const logger3 = new Logger({ username: "user3" });

      // 通过导出日志来检查颜色
      logger1.info("Message 1");
      logger2.info("Message 2");
      logger3.info("Message 3");

      const logs1 = logger1.getCachedLogs();
      const logs2 = logger2.getCachedLogs();
      const logs3 = logger3.getCachedLogs();

      expect(logs1[0].color).toBeDefined();
      expect(logs2[0].color).toBeDefined();
      expect(logs3[0].color).toBeDefined();

      // 不同用户应该有不同颜色
      expect(logs1[0].color).not.toBe(logs2[0].color);
      expect(logs2[0].color).not.toBe(logs3[0].color);
    });

    it("should use custom color when provided", () => {
      const customColor = "#ff0000";
      const logger = new Logger({
        username: "user1",
        color: customColor,
      });

      logger.info("Test message");
      const logs = logger.getCachedLogs();
      expect(logs[0].color).toBe(customColor);
    });
  });

  describe("LogManager Functionality", () => {
    it("should manage multiple loggers", () => {
      const manager = GlobalLoggerManager.getInstance();

      const logger1 = manager.getLogger("client1", { username: "user1" });
      const logger2 = manager.getLogger("client2", { username: "user2" });

      logger1.info("Message from client1");
      logger2.info("Message from client2");

      const allLogs = manager.exportAllLogs();
      expect(Object.keys(allLogs)).toHaveLength(2);
      expect(allLogs.client1).toHaveLength(1);
      expect(allLogs.client2).toHaveLength(1);
    });

    it("should reuse existing loggers", () => {
      const manager = GlobalLoggerManager.getInstance();

      const logger1 = manager.getLogger("test", { username: "user1" });
      const logger2 = manager.getLogger("test", { username: "user2" }); // 应该返回同一个实例

      expect(logger1).toBe(logger2);
    });
  });

  describe("Convenience Functions", () => {
    it("should create logger with createLogger function", () => {
      const logger = createLogger({ username: "user1" });
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should get logger with getLogger function", () => {
      const logger = getLogger("test", { username: "user1" });
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe("Configuration Management", () => {
    it("should update configuration", () => {
      const logger = new Logger({ username: "user1" });

      logger.setConfig({ username: "user2", namespace: "new-namespace" });

      logger.info("Test message");
      const logs = logger.getCachedLogs();

      expect(logs[0].username).toBe("user2");
      expect(logs[0].namespace).toBe("new-namespace");
    });

    it("should create child logger", () => {
      const parent = new Logger({ username: "user1", namespace: "parent" });
      const child = parent.createChild({ namespace: "child" });

      expect(child).toBeInstanceOf(Logger);

      child.info("Test message");
      const logs = child.getCachedLogs();

      expect(logs[0].username).toBe("user1"); // 继承自父级
      expect(logs[0].namespace).toBe("child"); // 覆盖父级
    });
  });

  describe("Export Functionality", () => {
    it("should export logs as JSON", () => {
      const logger = new Logger({ username: "user1" });
      logger.info("Test message", { data: "test" });

      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].message).toBe("Test message");
      expect(parsed[0].username).toBe("user1");
      expect(parsed[0].args).toEqual([{ data: "test" }]);
    });
  });
});
