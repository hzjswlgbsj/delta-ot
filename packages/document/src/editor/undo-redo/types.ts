import { Delta } from "quill-delta";

// 操作类型枚举 - 支持未来扩展
export enum OperationType {
  // 基础操作类型
  INSERT = "insert",
  DELETE = "delete",
  FORMAT = "format",
  UNDO = "undo",
  REDO = "redo",

  // 复合操作类型
  COMPOSITE = "composite",
  BATCH = "batch",

  // 未来扩展的操作类型
  IMAGE_INSERT = "image_insert",
  TABLE_OPERATION = "table_operation",
  CODE_BLOCK = "code_block",
  MATH_FORMULA = "math_formula",
  COMMENT = "comment",
  ANNOTATION = "annotation",
  MARKDOWN_CONVERSION = "markdown_conversion",
  PLUGIN_OPERATION = "plugin_operation",
}

// 协同状态枚举
export enum CollaborativeState {
  IDLE = "idle", // 空闲状态
  UNDOING = "undoing", // 撤销中
  REDOING = "redoing", // 重做中
  CONFLICT = "conflict", // 冲突状态
  SYNCING = "syncing", // 同步中
  PLUGIN_PROCESSING = "plugin_processing", // 插件处理中
}

// 操作历史项接口
export interface OperationHistoryItem {
  id: string; // 唯一标识
  type: OperationType; // 操作类型
  operation: Delta; // Delta操作
  timestamp: number; // 时间戳
  userId: string; // 操作用户ID
  documentId: string; // 文档ID
  sequenceNumber: number; // 全局序列号
  undoable: boolean; // 是否可撤销
  redoable: boolean; // 是否可重做
  metadata?: Record<string, any>; // 扩展元数据

  // 扩展字段
  parentOperationId?: string; // 父操作ID（用于复合操作）
  childOperationIds?: string[]; // 子操作ID列表
  pluginId?: string; // 插件ID（如果是插件操作）
  category?: string; // 操作分类
  tags?: string[]; // 操作标签
  priority?: number; // 操作优先级
}

// 撤销重做状态接口
export interface UndoRedoState {
  canUndo: boolean; // 是否可撤销
  canRedo: boolean; // 是否可重做
  undoStackSize: number; // 撤销栈大小
  redoStackSize: number; // 重做栈大小
  collaborativeState: CollaborativeState; // 协同状态
  lastSyncTimestamp: number; // 最后同步时间

  // 扩展状态信息
  activePlugins: string[]; // 活跃插件列表
  storageStats?: StorageStats; // 存储统计信息
  performanceMetrics?: PerformanceMetrics; // 性能指标
}

// 撤销重做结果接口
export interface UndoRedoResult {
  success: boolean; // 是否成功
  operation?: Delta; // 操作结果
  error?: string; // 错误信息
  metadata?: Record<string, any>; // 扩展元数据
}

// 存储统计信息接口
export interface StorageStats {
  totalOperations: number; // 总操作数
  operationsByType: Record<OperationType, number>; // 按类型统计
  operationsByUser: Record<string, number>; // 按用户统计
  operationsByCategory: Record<string, number>; // 按分类统计
  memoryUsage: number; // 内存使用量
  lastCleanupTime: number; // 最后清理时间
}

// 性能指标接口
export interface PerformanceMetrics {
  averageOperationTime: number; // 平均操作处理时间
  memoryUsage: number; // 内存使用量
  storageLatency: number; // 存储延迟
  networkLatency: number; // 网络延迟
  lastUpdateTime: number; // 最后更新时间
}

// 操作过滤器接口
export interface OperationFilter {
  type?: OperationType; // 操作类型
  userId?: string; // 用户ID
  documentId?: string; // 文档ID
  category?: string; // 分类
  tags?: string[]; // 标签
  startTime?: number; // 开始时间
  endTime?: number; // 结束时间
  limit?: number; // 限制数量
  offset?: number; // 偏移量
  sortBy?: "timestamp" | "sequenceNumber" | "priority"; // 排序字段
  sortOrder?: "asc" | "desc"; // 排序顺序
}

// 冲突信息接口
export interface ConflictInfo {
  id: string; // 冲突ID
  type: "operation_order" | "state_inconsistency" | "operation_conflict";
  localOperation: OperationHistoryItem;
  remoteOperation: OperationHistoryItem;
  timestamp: number;
  severity: "low" | "medium" | "high";
  description: string;
}

// 冲突解决结果接口
export interface ConflictResolution {
  id: string; // 解决ID
  conflictId: string; // 冲突ID
  resolution: "local_wins" | "remote_wins" | "merged" | "manual";
  timestamp: number;
  description: string;
  metadata?: Record<string, any>;
}

// 操作处理结果接口
export interface ProcessResult {
  success: boolean;
  operation: Delta;
  metadata?: Record<string, any>;
  error?: string;
}

// 操作验证结果接口
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, any>;
}

// 撤销结果接口
export interface UndoResult {
  operation: Delta;
  metadata?: Record<string, any>;
}

// 重做结果接口
export interface RedoResult {
  operation: Delta;
  metadata?: Record<string, any>;
}

// 操作链执行结果接口
export interface ChainExecutionResult {
  success: boolean;
  chainId: string;
  operations: OperationHistoryItem[];
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

// 操作链元数据接口
export interface ChainMetadata {
  category: string; // 分类
  tags: string[]; // 标签
  priority: number; // 优先级
  estimatedDuration: number; // 预估执行时间
  requiresConfirmation: boolean; // 是否需要用户确认
  canBeInterrupted: boolean; // 是否可以被中断
  dependencies: string[]; // 依赖的其他操作链
}

// 操作链执行状态枚举
export enum ChainExecutionState {
  PENDING = "pending", // 等待执行
  EXECUTING = "executing", // 执行中
  COMPLETED = "completed", // 执行完成
  FAILED = "failed", // 执行失败
  INTERRUPTED = "interrupted", // 被中断
  ROLLED_BACK = "rolled_back", // 已回滚
}

// 插件配置接口
export interface PluginConfig {
  enabled: boolean; // 是否启用
  priority: number; // 优先级
  settings: Record<string, any>; // 插件特定设置
}

// 依赖检查结果接口
export interface DependencyCheckResult {
  satisfied: boolean; // 依赖是否满足
  missing: string[]; // 缺失的依赖
  conflicts: string[]; // 冲突的依赖
  warnings: string[]; // 警告信息
}
