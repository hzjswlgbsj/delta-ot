import {
  OperationHistoryItem,
  UndoRedoState,
  OperationFilter,
  StorageStats,
  OperationType,
  OPERATION_PRIORITIES,
  CLEANUP_STRATEGIES,
} from "./types";
import { DEFAULT_UNDO_REDO_CONFIG } from "./constants";
import { Logger } from "@delta-ot/common";

/**
 * 操作历史管理器
 * 负责管理操作历史栈、内存优化、操作分类等
 */
export class OperationHistoryManager {
  private undoStack: OperationHistoryItem[] = [];
  private redoStack: OperationHistoryItem[] = [];
  private maxStackSize: number;
  private maxMemoryUsage: number;
  private cleanupStrategy: string;
  private logger: Logger;
  private documentId: string;
  private userId: string;

  constructor(
    documentId: string,
    userId: string,
    config = DEFAULT_UNDO_REDO_CONFIG
  ) {
    this.documentId = documentId;
    this.userId = userId;
    this.maxStackSize = config.maxHistorySize;
    this.maxMemoryUsage = config.maxMemoryUsage;
    this.cleanupStrategy = config.enableCompression
      ? CLEANUP_STRATEGIES.LRU
      : CLEANUP_STRATEGIES.FIFO;
    this.logger = new Logger("OperationHistoryManager", userId);

    this.logger.info("OperationHistoryManager initialized", {
      documentId,
      userId,
      maxStackSize: this.maxStackSize,
      maxMemoryUsage: this.maxMemoryUsage,
      cleanupStrategy: this.cleanupStrategy,
    });
  }

  /**
   * 推送操作到历史栈
   */
  pushOperation(operation: OperationHistoryItem): void {
    try {
      // 验证操作
      this.validateOperation(operation);

      // 添加到撤销栈
      this.undoStack.push(operation);

      // 清空重做栈（新操作会清空重做历史）
      this.clearRedoStack();

      // 检查内存使用
      this.checkMemoryUsage();

      // 优化内存
      this.optimizeMemory();

      this.logger.debug("Operation pushed to history", {
        operationId: operation.id,
        type: operation.type,
        undoStackSize: this.undoStack.length,
        redoStackSize: this.redoStack.length,
      });
    } catch (error) {
      this.logger.error("Failed to push operation", error);
      throw error;
    }
  }

  /**
   * 从撤销栈弹出操作
   */
  popUndo(): OperationHistoryItem | undefined {
    const operation = this.undoStack.pop();

    if (operation) {
      // 将操作添加到重做栈
      this.redoStack.push(operation);

      this.logger.debug("Operation popped from undo stack", {
        operationId: operation.id,
        type: operation.type,
        undoStackSize: this.undoStack.length,
        redoStackSize: this.redoStack.length,
      });
    }

    return operation;
  }

  /**
   * 从重做栈弹出操作
   */
  popRedo(): OperationHistoryItem | undefined {
    const operation = this.redoStack.pop();

    if (operation) {
      // 将操作重新添加到撤销栈
      this.undoStack.push(operation);

      this.logger.debug("Operation popped from redo stack", {
        operationId: operation.id,
        type: operation.type,
        undoStackSize: this.undoStack.length,
        redoStackSize: this.redoStack.length,
      });
    }

    return operation;
  }

  /**
   * 清空重做栈
   */
  clearRedoStack(): void {
    const clearedCount = this.redoStack.length;
    this.redoStack = [];

    if (clearedCount > 0) {
      this.logger.debug("Redo stack cleared", { clearedCount });
    }
  }

  /**
   * 获取当前状态
   */
  getState(): UndoRedoState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
      collaborativeState: "idle" as any, // 这里需要从外部传入
      lastSyncTimestamp: Date.now(),
      activePlugins: [], // 这里需要从外部传入
      storageStats: this.getStorageStats(),
      performanceMetrics: this.getPerformanceMetrics(),
    };
  }

  /**
   * 查询操作历史
   */
  query(filter: OperationFilter): OperationHistoryItem[] {
    let results = [...this.undoStack, ...this.redoStack];

    // 应用过滤器
    if (filter.type) {
      results = results.filter((op) => op.type === filter.type);
    }

    if (filter.userId) {
      results = results.filter((op) => op.userId === filter.userId);
    }

    if (filter.documentId) {
      results = results.filter((op) => op.documentId === filter.documentId);
    }

    if (filter.category) {
      results = results.filter((op) => op.category === filter.category);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(
        (op) => op.tags && filter.tags!.some((tag) => op.tags!.includes(tag))
      );
    }

    if (filter.startTime) {
      results = results.filter((op) => op.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      results = results.filter((op) => op.timestamp <= filter.endTime!);
    }

    // 排序
    if (filter.sortBy) {
      const sortOrder = filter.sortOrder || "desc";
      results.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (filter.sortBy) {
          case "timestamp":
            aValue = a.timestamp;
            bValue = b.timestamp;
            break;
          case "sequenceNumber":
            aValue = a.sequenceNumber;
            bValue = b.sequenceNumber;
            break;
          case "priority":
            aValue = a.priority || OPERATION_PRIORITIES.NORMAL;
            bValue = b.priority || OPERATION_PRIORITIES.NORMAL;
            break;
          default:
            return 0;
        }

        if (sortOrder === "asc") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }

    // 分页
    if (filter.offset) {
      results = results.slice(filter.offset);
    }

    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * 按类型查询操作
   */
  findByType(type: OperationType): OperationHistoryItem[] {
    return this.query({ type });
  }

  /**
   * 按用户查询操作
   */
  findByUser(userId: string): OperationHistoryItem[] {
    return this.query({ userId });
  }

  /**
   * 按时间范围查询操作
   */
  findByTimeRange(start: number, end: number): OperationHistoryItem[] {
    return this.query({ startTime: start, endTime: end });
  }

  /**
   * 按分类查询操作
   */
  findByCategory(category: string): OperationHistoryItem[] {
    return this.query({ category });
  }

  /**
   * 获取存储统计信息
   */
  getStorageStats(): StorageStats {
    const operations = [...this.undoStack, ...this.redoStack];
    const operationsByType: Record<OperationType, number> = {} as any;
    const operationsByUser: Record<string, number> = {};
    const operationsByCategory: Record<string, number> = {};

    // 统计操作类型
    operations.forEach((op) => {
      operationsByType[op.type] = (operationsByType[op.type] || 0) + 1;
    });

    // 统计用户操作
    operations.forEach((op) => {
      operationsByUser[op.userId] = (operationsByUser[op.userId] || 0) + 1;
    });

    // 统计分类操作
    operations.forEach((op) => {
      if (op.category) {
        operationsByCategory[op.category] =
          (operationsByCategory[op.category] || 0) + 1;
      }
    });

    return {
      totalOperations: operations.length,
      operationsByType,
      operationsByUser,
      operationsByCategory,
      memoryUsage: this.estimateMemoryUsage(),
      lastCleanupTime: Date.now(),
    };
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      averageOperationTime: 0, // 这里需要从外部传入
      memoryUsage: this.estimateMemoryUsage(),
      storageLatency: 0, // 这里需要从外部传入
      networkLatency: 0, // 这里需要从外部传入
      lastUpdateTime: Date.now(),
    };
  }

  /**
   * 检查内存使用
   */
  private checkMemoryUsage(): void {
    const currentUsage = this.estimateMemoryUsage();

    if (currentUsage > this.maxMemoryUsage) {
      this.logger.warn("Memory usage exceeded limit", {
        currentUsage,
        maxMemoryUsage: this.maxMemoryUsage,
        usagePercentage: (currentUsage / this.maxMemoryUsage) * 100,
      });
    }
  }

  /**
   * 优化内存使用
   */
  private optimizeMemory(): void {
    // 如果超过最大栈大小，进行清理
    if (this.undoStack.length > this.maxStackSize) {
      this.cleanupOldOperations();
    }

    // 如果内存使用过高，进行清理
    if (this.estimateMemoryUsage() > this.maxMemoryUsage * 0.8) {
      this.cleanupMemory();
    }
  }

  /**
   * 清理旧操作
   */
  private cleanupOldOperations(): void {
    const itemsToRemove = this.undoStack.length - this.maxStackSize;

    if (itemsToRemove > 0) {
      if (this.cleanupStrategy === CLEANUP_STRATEGIES.LRU) {
        // LRU策略：移除最旧的操作
        this.undoStack.splice(0, itemsToRemove);
      } else if (this.cleanupStrategy === CLEANUP_STRATEGIES.PRIORITY) {
        // 优先级策略：移除低优先级的操作
        this.undoStack.sort(
          (a, b) =>
            (b.priority || OPERATION_PRIORITIES.NORMAL) -
            (a.priority || OPERATION_PRIORITIES.NORMAL)
        );
        this.undoStack.splice(this.maxStackSize);
      } else {
        // 默认FIFO策略
        this.undoStack.splice(0, itemsToRemove);
      }

      this.logger.info("Old operations cleaned up", {
        removedCount: itemsToRemove,
        strategy: this.cleanupStrategy,
      });
    }
  }

  /**
   * 清理内存
   */
  private cleanupMemory(): void {
    // 清理重做栈（通常重做栈不太重要）
    if (this.redoStack.length > 0) {
      const clearedCount = this.redoStack.length;
      this.redoStack = [];
      this.logger.info("Redo stack cleared for memory optimization", {
        clearedCount,
      });
    }

    // 清理低优先级的操作
    if (this.undoStack.length > this.maxStackSize * 0.5) {
      const lowPriorityOps = this.undoStack.filter(
        (op) =>
          (op.priority || OPERATION_PRIORITIES.NORMAL) <=
          OPERATION_PRIORITIES.LOW
      );

      if (lowPriorityOps.length > 0) {
        this.undoStack = this.undoStack.filter(
          (op) =>
            (op.priority || OPERATION_PRIORITIES.NORMAL) >
            OPERATION_PRIORITIES.LOW
        );

        this.logger.info("Low priority operations cleaned up", {
          removedCount: lowPriorityOps.length,
        });
      }
    }
  }

  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): number {
    const operations = [...this.undoStack, ...this.redoStack];
    let totalSize = 0;

    operations.forEach((op) => {
      // 估算每个操作的大小
      totalSize += JSON.stringify(op).length;
    });

    return totalSize;
  }

  /**
   * 验证操作
   */
  private validateOperation(operation: OperationHistoryItem): void {
    if (!operation.id) {
      throw new Error("Operation ID is required");
    }

    if (!operation.type) {
      throw new Error("Operation type is required");
    }

    if (!operation.operation) {
      throw new Error("Operation data is required");
    }

    if (!operation.userId) {
      throw new Error("User ID is required");
    }

    if (!operation.documentId) {
      throw new Error("Document ID is required");
    }

    if (operation.sequenceNumber < 0) {
      throw new Error("Sequence number must be non-negative");
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.logger.info("OperationHistoryManager destroyed");
  }
}
