import { describe, it, expect, beforeEach, vi } from "vitest";
import { UndoRedoEngine } from "../UndoRedoEngine";
import { OperationHistoryManager } from "../OperationHistoryManager";
import { TextOperationStrategy } from "../strategies/TextOperationStrategy";
import { OperationType } from "../types";
import { DEFAULT_UNDO_REDO_CONFIG } from "../constants";

// Mock Logger
vi.mock("@delta-ot/common", () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe("UndoRedoEngine", () => {
  let engine: UndoRedoEngine;
  let historyManager: OperationHistoryManager;
  const documentId = "test-doc-1";
  const userId = "test-user-1";

  beforeEach(() => {
    historyManager = new OperationHistoryManager(documentId, userId);
    engine = new UndoRedoEngine(historyManager, documentId, userId);
  });

  describe("constructor", () => {
    it("should initialize with correct configuration", () => {
      expect(engine).toBeInstanceOf(UndoRedoEngine);
    });
  });

  describe("registerStrategy", () => {
    it("should register strategy successfully", () => {
      const strategy = new TextOperationStrategy();
      engine.registerStrategy(strategy);

      // 验证策略是否被注册
      expect(engine.getState().activePlugins).toEqual([]);
    });
  });

  describe("undo", () => {
    it("should return error when no operation to undo", async () => {
      const result = await engine.undo();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No operation to undo");
    });

    it("should return error when no strategy found", async () => {
      // 添加一个不支持的操作类型
      const operation = {
        id: "op-1",
        type: "unsupported_type" as any,
        operation: { ops: [{ insert: "test" }] } as any,
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 1,
        undoable: true,
        redoable: false,
      };

      historyManager.pushOperation(operation);

      const result = await engine.undo();

      expect(result.success).toBe(false);
      expect(result.error).toContain("No strategy found for operation type");
    });

    it("should handle undo operation with strategy", async () => {
      // 注册文本操作策略
      const strategy = new TextOperationStrategy();
      engine.registerStrategy(strategy);

      // 添加一个文本插入操作
      const operation = {
        id: "op-1",
        type: OperationType.INSERT,
        operation: { ops: [{ insert: "test" }] } as any,
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 1,
        undoable: true,
        redoable: false,
      };

      historyManager.pushOperation(operation);

      const result = await engine.undo();

      expect(result.success).toBe(true);
      expect(result.operation).toBeDefined();
    });
  });

  describe("redo", () => {
    it("should return error when no operation to redo", async () => {
      const result = await engine.redo();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No operation to redo");
    });

    it("should handle redo operation with strategy", async () => {
      // 注册文本操作策略
      const strategy = new TextOperationStrategy();
      engine.registerStrategy(strategy);

      // 添加一个操作，然后撤销它
      const operation = {
        id: "op-1",
        type: OperationType.INSERT,
        operation: { ops: [{ insert: "test" }] } as any,
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 1,
        undoable: true,
        redoable: false,
      };

      historyManager.pushOperation(operation);
      await engine.undo(); // 先撤销

      const result = await engine.redo(); // 再重做

      expect(result.success).toBe(true);
      expect(result.operation).toBeDefined();
    });
  });

  describe("batchUndo", () => {
    it("should handle batch undo operations", async () => {
      // 注册文本操作策略
      const strategy = new TextOperationStrategy();
      engine.registerStrategy(strategy);

      // 添加多个操作
      for (let i = 1; i <= 3; i++) {
        const operation = {
          id: `op-${i}`,
          type: OperationType.INSERT,
          operation: { ops: [{ insert: `test${i}` }] } as any,
          timestamp: Date.now() + i,
          userId,
          documentId,
          sequenceNumber: i,
          undoable: true,
          redoable: false,
        };
        historyManager.pushOperation(operation);
      }

      const results = await engine.batchUndo(2);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it("should stop batch undo on error", async () => {
      // 注册文本操作策略
      const strategy = new TextOperationStrategy();
      engine.registerStrategy(strategy);

      // 添加一个操作
      const operation = {
        id: "op-1",
        type: OperationType.INSERT,
        operation: { ops: [{ insert: "test" }] } as any,
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 1,
        undoable: true,
        redoable: false,
      };

      historyManager.pushOperation(operation);

      const results = await engine.batchUndo(3);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe("batchRedo", () => {
    it("should handle batch redo operations", async () => {
      // 注册文本操作策略
      const strategy = new TextOperationStrategy();
      engine.registerStrategy(strategy);

      // 添加多个操作，然后撤销它们
      for (let i = 1; i <= 3; i++) {
        const operation = {
          id: `op-${i}`,
          type: OperationType.INSERT,
          operation: { ops: [{ insert: `test${i}` }] } as any,
          timestamp: Date.now() + i,
          userId,
          documentId,
          sequenceNumber: i,
          undoable: true,
          redoable: false,
        };
        historyManager.pushOperation(operation);
      }

      // 先撤销所有操作
      await engine.batchUndo(3);

      // 再重做2个操作
      const results = await engine.batchRedo(2);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe("getState", () => {
    it("should return current state", () => {
      const state = engine.getState();

      expect(state).toBeDefined();
      expect(state.documentId).toBe(documentId);
      expect(state.userId).toBe(userId);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });
  });

  describe("event system", () => {
    it("should provide event emitter", () => {
      const eventEmitter = engine.getEventEmitter();
      expect(eventEmitter).toBeDefined();
    });

    it("should provide event manager", () => {
      const eventManager = engine.getEventManager();
      expect(eventManager).toBeDefined();
    });
  });

  describe("concurrent operations", () => {
    it("should prevent concurrent undo operations", async () => {
      // 注册文本操作策略
      const strategy = new TextOperationStrategy();
      engine.registerStrategy(strategy);

      // 添加一个操作
      const operation = {
        id: "op-1",
        type: OperationType.INSERT,
        operation: { ops: [{ insert: "test" }] } as any,
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 1,
        undoable: true,
        redoable: false,
      };

      historyManager.pushOperation(operation);

      // 启动第一个撤销操作
      const undo1 = engine.undo();

      // 尝试启动第二个撤销操作
      const undo2 = engine.undo();

      const [result1, result2] = await Promise.all([undo1, undo2]);

      // 一个应该成功，一个应该失败
      const successCount = [result1, result2].filter((r) => r.success).length;
      expect(successCount).toBe(1);
    });
  });

  describe("destroy", () => {
    it("should destroy engine properly", () => {
      expect(() => engine.destroy()).not.toThrow();
    });
  });
});

