import { OperationHistoryItem, OperationFilter, StorageStats } from "../types";

/**
 * 操作存储接口
 * 定义存储层的统一接口
 */
export interface IOperationStorage {
  name: string;
  type: "memory" | "database" | "hybrid" | "custom";

  // 基础CRUD操作
  save(operation: OperationHistoryItem): Promise<void>;
  load(id: string): Promise<OperationHistoryItem | null>;
  query(filter: OperationFilter): Promise<OperationHistoryItem[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;

  // 批量操作
  batchSave(operations: OperationHistoryItem[]): Promise<void>;
  batchLoad(ids: string[]): Promise<OperationHistoryItem[]>;

  // 高级查询
  findByType(type: string): Promise<OperationHistoryItem[]>;
  findByUser(userId: string): Promise<OperationHistoryItem[]>;
  findByTimeRange(start: number, end: number): Promise<OperationHistoryItem[]>;
  findByCategory(category: string): Promise<OperationHistoryItem[]>;

  // 统计信息
  getStats(): Promise<StorageStats>;
  getSize(): Promise<number>;

  // 生命周期管理
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}
