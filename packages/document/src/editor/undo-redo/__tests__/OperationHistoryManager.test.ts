import { describe, it, expect, beforeEach, vi } from "vitest";
import { OperationHistoryManager } from "../OperationHistoryManager";
import { OperationType, OPERATION_PRIORITIES } from "../types";
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

describe("OperationHistoryManager", () => {
  let manager: OperationHistoryManager;
  const documentId = "test-doc-1";
  const userId = "test-user-1";

  beforeEach(() => {
    manager = new OperationHistoryManager(documentId, userId);
  });

  describe("constructor", () => {
    it("should initialize with correct configuration", () => {
      expect(manager).toBeInstanceOf(OperationHistoryManager);
    });
  });

  describe("pushOperation", () => {
    it("should push operation to undo stack", () => {
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

      manager.pushOperation(operation);
      const state = manager.getState();

      expect(state.undoStackSize).toBe(1);
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
    });

    it("should clear redo stack when new operation is pushed", () => {
      // First, add an operation and then undo it to populate redo stack
      const operation1 = {
        id: "op-1",
        type: OperationType.INSERT,
        operation: { ops: [{ insert: "test1" }] } as any,
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 1,
        undoable: true,
        redoable: false,
      };

      manager.pushOperation(operation1);
      manager.popUndo(); // This moves op-1 to redo stack

      expect(manager.getState().canRedo).toBe(true);

      // Now push a new operation
      const operation2 = {
        id: "op-2",
        type: OperationType.INSERT,
        operation: { ops: [{ insert: "test2" }] } as any,
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 2,
        undoable: true,
        redoable: false,
      };

      manager.pushOperation(operation2);

      expect(manager.getState().canRedo).toBe(false);
    });
  });

  describe("popUndo", () => {
    it("should pop operation from undo stack and add to redo stack", () => {
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

      manager.pushOperation(operation);
      const poppedOperation = manager.popUndo();

      expect(poppedOperation).toEqual(operation);
      expect(manager.getState().canUndo).toBe(false);
      expect(manager.getState().canRedo).toBe(true);
    });

    it("should return undefined when undo stack is empty", () => {
      const poppedOperation = manager.popUndo();
      expect(poppedOperation).toBeUndefined();
    });
  });

  describe("popRedo", () => {
    it("should pop operation from redo stack and add back to undo stack", () => {
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

      manager.pushOperation(operation);
      manager.popUndo(); // Move to redo stack

      const redoneOperation = manager.popRedo();

      expect(redoneOperation).toEqual(operation);
      expect(manager.getState().canUndo).toBe(true);
      expect(manager.getState().canRedo).toBe(false);
    });

    it("should return undefined when redo stack is empty", () => {
      const redoneOperation = manager.popRedo();
      expect(redoneOperation).toBeUndefined();
    });
  });

  describe("query", () => {
    beforeEach(() => {
      const operations = [
        {
          id: "op-1",
          type: OperationType.INSERT,
          operation: { ops: [{ insert: "test1" }] } as any,
          timestamp: 1000,
          userId: "user1",
          documentId,
          sequenceNumber: 1,
          undoable: true,
          redoable: false,
          category: "text",
          tags: ["important"],
        },
        {
          id: "op-2",
          type: OperationType.FORMAT,
          operation: {
            ops: [{ retain: 4, attributes: { bold: true } }],
          } as any,
          timestamp: 2000,
          userId: "user2",
          documentId,
          sequenceNumber: 2,
          undoable: true,
          redoable: false,
          category: "format",
          tags: ["style"],
        },
      ];

      operations.forEach((op) => manager.pushOperation(op));
    });

    it("should filter by operation type", () => {
      const results = manager.query({ type: OperationType.INSERT });
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(OperationType.INSERT);
    });

    it("should filter by user", () => {
      const results = manager.query({ userId: "user1" });
      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe("user1");
    });

    it("should filter by category", () => {
      const results = manager.query({ category: "text" });
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe("text");
    });

    it("should filter by tags", () => {
      const results = manager.query({ tags: ["important"] });
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain("important");
    });

    it("should filter by time range", () => {
      const results = manager.query({ startTime: 1500, endTime: 2500 });
      expect(results).toHaveLength(1);
      expect(results[0].timestamp).toBe(2000);
    });

    it("should sort by timestamp", () => {
      const results = manager.query({
        sortBy: "timestamp",
        sortOrder: "asc",
      });
      expect(results[0].timestamp).toBe(1000);
      expect(results[1].timestamp).toBe(2000);
    });

    it("should apply pagination", () => {
      const results = manager.query({ limit: 1, offset: 1 });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("op-2");
    });
  });

  describe("getStorageStats", () => {
    it("should return correct storage statistics", () => {
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
        category: "text",
      };

      manager.pushOperation(operation);
      const stats = manager.getStorageStats();

      expect(stats.totalOperations).toBe(1);
      expect(stats.operationsByType[OperationType.INSERT]).toBe(1);
      expect(stats.operationsByUser[userId]).toBe(1);
      expect(stats.operationsByCategory["text"]).toBe(1);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe("memory optimization", () => {
    it("should respect max stack size limit", () => {
      const config = { ...DEFAULT_UNDO_REDO_CONFIG, maxHistorySize: 2 };
      const limitedManager = new OperationHistoryManager(
        documentId,
        userId,
        config
      );

      // Add 3 operations
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
        limitedManager.pushOperation(operation);
      }

      const state = limitedManager.getState();
      expect(state.undoStackSize).toBeLessThanOrEqual(2);
    });
  });

  describe("validation", () => {
    it("should throw error for invalid operation", () => {
      const invalidOperation = {
        id: "", // Invalid: empty ID
        type: OperationType.INSERT,
        operation: { ops: [{ insert: "test" }] } as any,
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 1,
        undoable: true,
        redoable: false,
      };

      expect(() => manager.pushOperation(invalidOperation as any)).toThrow(
        "Operation ID is required"
      );
    });
  });

  describe("destroy", () => {
    it("should clear all stacks when destroyed", () => {
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

      manager.pushOperation(operation);
      expect(manager.getState().undoStackSize).toBe(1);

      manager.destroy();
      expect(manager.getState().undoStackSize).toBe(0);
      expect(manager.getState().redoStackSize).toBe(0);
    });
  });
});
