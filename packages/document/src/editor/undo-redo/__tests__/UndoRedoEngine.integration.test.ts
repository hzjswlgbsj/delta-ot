import Delta from "quill-delta";
import { UndoRedoEngine, IEditorProxy } from "../UndoRedoEngine";
import { OperationHistoryManager } from "../OperationHistoryManager";
import { OperationType } from "../types";

// Mock 编辑器代理
class MockEditorProxy implements IEditorProxy {
  private contents: Delta = new Delta();
  private selection: any = null;

  async applyDelta(delta: Delta): Promise<void> {
    this.contents = this.contents.compose(delta);
  }

  getContents(): Delta {
    return this.contents;
  }

  async setContents(delta: Delta): Promise<void> {
    this.contents = delta;
  }

  getSelection(): any {
    return this.selection;
  }

  setSelection(range: any): void {
    this.selection = range;
  }
}

describe("UndoRedoEngine Integration Tests", () => {
  let engine: UndoRedoEngine;
  let historyManager: OperationHistoryManager;
  let editorProxy: MockEditorProxy;
  const documentId = "test-doc";
  const userId = "test-user";

  beforeEach(() => {
    historyManager = new OperationHistoryManager(documentId, userId);
    engine = new UndoRedoEngine(historyManager, documentId, userId);
    editorProxy = new MockEditorProxy();
    engine.setEditorProxy(editorProxy);
  });

  afterEach(() => {
    engine.destroy();
    historyManager.destroy();
  });

  describe("Basic Undo/Redo Operations", () => {
    it("should handle insert operation undo/redo", async () => {
      // 创建插入操作
      const insertDelta = new Delta([{ insert: "Hello" }]);
      const operation = {
        id: "op-1",
        type: OperationType.INSERT,
        operation: insertDelta,
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 1,
        undoable: true,
        redoable: false,
      };

      // 添加操作到历史
      historyManager.pushOperation(operation);

      // 设置初始内容
      await editorProxy.setContents(new Delta([{ insert: "Hello" }]));

      // 撤销操作
      const undoResult = await engine.undo();
      expect(undoResult.success).toBe(true);
      expect(undoResult.operation).toBeDefined();

      // 验证编辑器内容被清空
      const contentsAfterUndo = editorProxy.getContents();
      expect(contentsAfterUndo.ops).toEqual([{ insert: "" }]);

      // 重做操作
      const redoResult = await engine.redo();
      expect(redoResult.success).toBe(true);
      expect(redoResult.operation).toBeDefined();

      // 验证编辑器内容恢复
      const contentsAfterRedo = editorProxy.getContents();
      expect(contentsAfterRedo.ops).toEqual([{ insert: "Hello" }]);
    });

    it("should handle delete operation undo/redo", async () => {
      // 设置初始内容
      await editorProxy.setContents(new Delta([{ insert: "Hello World" }]));

      // 创建删除操作
      const deleteDelta = new Delta([{ delete: 5 }]); // 删除 "Hello"
      const operation = {
        id: "op-2",
        type: OperationType.DELETE,
        operation: deleteDelta,
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 2,
        undoable: true,
        redoable: false,
      };

      // 添加操作到历史
      historyManager.pushOperation(operation);

      // 应用删除操作
      await editorProxy.applyDelta(deleteDelta);
      expect(editorProxy.getContents().ops).toEqual([{ insert: " World" }]);

      // 撤销操作
      const undoResult = await engine.undo();
      expect(undoResult.success).toBe(true);

      // 验证内容恢复
      const contentsAfterUndo = editorProxy.getContents();
      expect(contentsAfterUndo.ops).toEqual([{ insert: "Hello World" }]);

      // 重做操作
      const redoResult = await engine.redo();
      expect(redoResult.success).toBe(true);

      // 验证内容再次被删除
      const contentsAfterRedo = editorProxy.getContents();
      expect(contentsAfterRedo.ops).toEqual([{ insert: " World" }]);
    });

    it("should handle multiple operations undo/redo", async () => {
      // 设置初始内容
      await editorProxy.setContents(new Delta([{ insert: "" }]));

      // 创建多个操作
      const operations = [
        {
          id: "op-1",
          type: OperationType.INSERT,
          operation: new Delta([{ insert: "Hello" }]),
          timestamp: Date.now(),
          userId,
          documentId,
          sequenceNumber: 1,
          undoable: true,
          redoable: false,
        },
        {
          id: "op-2",
          type: OperationType.INSERT,
          operation: new Delta([{ insert: " World" }]),
          timestamp: Date.now() + 1,
          userId,
          documentId,
          sequenceNumber: 2,
          undoable: true,
          redoable: false,
        },
        {
          id: "op-3",
          type: OperationType.INSERT,
          operation: new Delta([{ insert: "!" }]),
          timestamp: Date.now() + 2,
          userId,
          documentId,
          sequenceNumber: 3,
          undoable: true,
          redoable: false,
        },
      ];

      // 添加所有操作到历史
      operations.forEach((op) => historyManager.pushOperation(op));

      // 应用所有操作
      await editorProxy.applyDelta(new Delta([{ insert: "Hello World!" }]));
      expect(editorProxy.getContents().ops).toEqual([
        { insert: "Hello World!" },
      ]);

      // 撤销所有操作
      const undoResults = await engine.batchUndo(3);
      expect(undoResults).toHaveLength(3);
      expect(undoResults.every((result) => result.success)).toBe(true);

      // 验证内容被清空
      expect(editorProxy.getContents().ops).toEqual([{ insert: "" }]);

      // 重做所有操作
      const redoResults = await engine.batchRedo(3);
      expect(redoResults).toHaveLength(3);
      expect(redoResults.every((result) => result.success)).toBe(true);

      // 验证内容恢复
      expect(editorProxy.getContents().ops).toEqual([
        { insert: "Hello World!" },
      ]);
    });
  });

  describe("State Management", () => {
    it("should track undo/redo state correctly", () => {
      const state = engine.getState();
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
      expect(state.undoStackSize).toBe(0);
      expect(state.redoStackSize).toBe(0);

      // 添加操作
      const operation = {
        id: "op-1",
        type: OperationType.INSERT,
        operation: new Delta([{ insert: "Hello" }]),
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 1,
        undoable: true,
        redoable: false,
      };

      historyManager.pushOperation(operation);

      const stateAfterPush = engine.getState();
      expect(stateAfterPush.canUndo).toBe(true);
      expect(stateAfterPush.canRedo).toBe(false);
      expect(stateAfterPush.undoStackSize).toBe(1);
      expect(stateAfterPush.redoStackSize).toBe(0);
    });

    it("should emit state change events", (done) => {
      let eventCount = 0;

      engine.getEventEmitter().on("stateChanged", (state) => {
        eventCount++;
        if (eventCount === 1) {
          expect(state.canUndo).toBe(true);
          done();
        }
      });

      // 添加操作触发状态变化
      const operation = {
        id: "op-1",
        type: OperationType.INSERT,
        operation: new Delta([{ insert: "Hello" }]),
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 1,
        undoable: true,
        redoable: false,
      };

      historyManager.pushOperation(operation);
    });
  });

  describe("Error Handling", () => {
    it("should handle undo when no operations available", async () => {
      const result = await engine.undo();
      expect(result.success).toBe(false);
      expect(result.error).toBe("No operation to undo");
    });

    it("should handle redo when no operations available", async () => {
      const result = await engine.redo();
      expect(result.success).toBe(false);
      expect(result.error).toBe("No operation to redo");
    });

    it("should handle concurrent operations", async () => {
      const operation = {
        id: "op-1",
        type: OperationType.INSERT,
        operation: new Delta([{ insert: "Hello" }]),
        timestamp: Date.now(),
        userId,
        documentId,
        sequenceNumber: 1,
        undoable: true,
        redoable: false,
      };

      historyManager.pushOperation(operation);

      // 启动两个并发操作
      const [result1, result2] = await Promise.all([
        engine.undo(),
        engine.undo(),
      ]);

      // 其中一个应该成功，另一个应该失败
      const successCount = [result1, result2].filter((r) => r.success).length;
      const failureCount = [result1, result2].filter((r) => !r.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
      expect(
        [result1, result2].some(
          (r) => r.error === "Another operation is in progress"
        )
      ).toBe(true);
    });
  });

  describe("Strategy Integration", () => {
    it("should use TextOperationStrategy for text operations", async () => {
      const operation = {
        id: "op-1",
        type: OperationType.INSERT,
        operation: new Delta([{ insert: "Hello" }]),
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
});
