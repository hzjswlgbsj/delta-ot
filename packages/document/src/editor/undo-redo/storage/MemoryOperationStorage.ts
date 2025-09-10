import {
  OperationHistoryItem,
  OperationFilter,
  StorageStats,
  OperationType,
} from "../types";
import { IOperationStorage } from "./IOperationStorage";
import { Logger } from "@delta-ot/common";

/**
 * 内存操作存储实现
 * 提供基于内存的操作存储，适用于开发测试和临时存储
 */
export class MemoryOperationStorage implements IOperationStorage {
  name = "memory";
  type = "memory" as const;

  private operations = new Map<string, OperationHistoryItem>();
  private logger: Logger;
  private initialized = false;

  constructor(userId: string = "system") {
    this.logger = new Logger("MemoryOperationStorage", userId);
  }

  /**
   * 保存操作
   */
  async save(operation: OperationHistoryItem): Promise<void> {
    try {
      this.operations.set(operation.id, operation);

      this.logger.debug("Operation saved to memory", {
        operationId: operation.id,
        type: operation.type,
        totalOperations: this.operations.size,
      });
    } catch (error) {
      this.logger.error("Failed to save operation to memory", {
        operationId: operation.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 加载操作
   */
  async load(id: string): Promise<OperationHistoryItem | null> {
    try {
      const operation = this.operations.get(id);

      if (operation) {
        this.logger.debug("Operation loaded from memory", {
          operationId: id,
          type: operation.type,
        });
      } else {
        this.logger.debug("Operation not found in memory", { operationId: id });
      }

      return operation || null;
    } catch (error) {
      this.logger.error("Failed to load operation from memory", {
        operationId: id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 查询操作
   */
  async query(filter: OperationFilter): Promise<OperationHistoryItem[]> {
    try {
      let results = Array.from(this.operations.values());

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
              aValue = a.priority || 5;
              bValue = b.priority || 5;
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

      this.logger.debug("Operation query completed", {
        filter,
        resultCount: results.length,
        totalOperations: this.operations.size,
      });

      return results;
    } catch (error) {
      this.logger.error("Failed to query operations from memory", {
        filter,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 删除操作
   */
  async delete(id: string): Promise<void> {
    try {
      const deleted = this.operations.delete(id);

      if (deleted) {
        this.logger.debug("Operation deleted from memory", {
          operationId: id,
          totalOperations: this.operations.size,
        });
      } else {
        this.logger.debug("Operation not found for deletion", {
          operationId: id,
        });
      }
    } catch (error) {
      this.logger.error("Failed to delete operation from memory", {
        operationId: id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 清空所有操作
   */
  async clear(): Promise<void> {
    try {
      const count = this.operations.size;
      this.operations.clear();

      this.logger.info("All operations cleared from memory", {
        clearedCount: count,
      });
    } catch (error) {
      this.logger.error("Failed to clear operations from memory", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 批量保存操作
   */
  async batchSave(operations: OperationHistoryItem[]): Promise<void> {
    try {
      const startTime = Date.now();

      for (const operation of operations) {
        this.operations.set(operation.id, operation);
      }

      const duration = Date.now() - startTime;

      this.logger.info("Batch save completed", {
        operationCount: operations.length,
        duration,
        totalOperations: this.operations.size,
      });
    } catch (error) {
      this.logger.error("Failed to batch save operations to memory", {
        operationCount: operations.length,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 批量加载操作
   */
  async batchLoad(ids: string[]): Promise<OperationHistoryItem[]> {
    try {
      const operations: OperationHistoryItem[] = [];

      for (const id of ids) {
        const operation = this.operations.get(id);
        if (operation) {
          operations.push(operation);
        }
      }

      this.logger.debug("Batch load completed", {
        requestedCount: ids.length,
        loadedCount: operations.length,
        totalOperations: this.operations.size,
      });

      return operations;
    } catch (error) {
      this.logger.error("Failed to batch load operations from memory", {
        requestedCount: ids.length,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 按类型查找操作
   */
  async findByType(type: string): Promise<OperationHistoryItem[]> {
    return this.query({ type: type as OperationType });
  }

  /**
   * 按用户查找操作
   */
  async findByUser(userId: string): Promise<OperationHistoryItem[]> {
    return this.query({ userId });
  }

  /**
   * 按时间范围查找操作
   */
  async findByTimeRange(
    start: number,
    end: number
  ): Promise<OperationHistoryItem[]> {
    return this.query({ startTime: start, endTime: end });
  }

  /**
   * 按分类查找操作
   */
  async findByCategory(category: string): Promise<OperationHistoryItem[]> {
    return this.query({ category });
  }

  /**
   * 获取存储统计信息
   */
  async getStats(): Promise<StorageStats> {
    try {
      const operations = Array.from(this.operations.values());
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

      // 估算内存使用量
      const memoryUsage = this.estimateMemoryUsage();

      const stats: StorageStats = {
        totalOperations: operations.length,
        operationsByType,
        operationsByUser,
        operationsByCategory,
        memoryUsage,
        lastCleanupTime: Date.now(),
      };

      this.logger.debug("Storage stats retrieved", {
        totalOperations: stats.totalOperations,
        memoryUsage: stats.memoryUsage,
      });

      return stats;
    } catch (error) {
      this.logger.error("Failed to get storage stats", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取存储大小
   */
  async getSize(): Promise<number> {
    return this.operations.size;
  }

  /**
   * 初始化存储
   */
  async initialize(): Promise<void> {
    try {
      this.initialized = true;
      this.logger.info("Memory storage initialized");
    } catch (error) {
      this.logger.error("Failed to initialize memory storage", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 销毁存储
   */
  async destroy(): Promise<void> {
    try {
      this.operations.clear();
      this.initialized = false;
      this.logger.info("Memory storage destroyed");
    } catch (error) {
      this.logger.error("Failed to destroy memory storage", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;

    this.operations.forEach((op) => {
      totalSize += JSON.stringify(op).length;
    });

    return totalSize;
  }

  /**
   * 检查是否已初始化
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        "Memory storage not initialized. Call initialize() first."
      );
    }
  }
}

