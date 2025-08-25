// 撤销重做系统常量定义

// 默认配置
export const DEFAULT_UNDO_REDO_CONFIG = {
  // 基础配置
  maxHistorySize: 1000, // 最大历史记录数
  maxMemoryUsage: 100 * 1024 * 1024, // 最大内存使用量 (100MB)
  syncInterval: 1000, // 同步间隔 (1秒)
  retryAttempts: 3, // 重试次数
  conflictTimeout: 5000, // 冲突超时时间 (5秒)

  // 性能配置
  enableCompression: true, // 是否启用压缩
  enableLazyLoading: true, // 是否启用懒加载
  batchSize: 50, // 批处理大小
  maxConcurrentOperations: 10, // 最大并发操作数

  // 协同配置
  conflictResolution: "optimistic" as const, // 冲突解决策略
  syncMode: "realtime" as const, // 同步模式
  enableOperationChaining: true, // 是否启用操作链
  maxChainLength: 100, // 最大操作链长度

  // 插件配置
  pluginConfig: {
    autoLoad: true, // 自动加载插件
    pluginDirectory: "./plugins", // 插件目录
    enableHotReload: false, // 启用热重载
    maxPluginMemory: 50 * 1024 * 1024, // 插件最大内存使用 (50MB)
  },

  // 监控配置
  enableMetrics: true, // 启用性能监控
  metricsInterval: 5000, // 监控间隔 (5秒)
  enableLogging: true, // 启用日志记录
  logLevel: "info" as const, // 日志级别
};

// 操作类型分类
export const OPERATION_CATEGORIES = {
  TEXT: "text", // 文本操作
  FORMAT: "format", // 格式操作
  STRUCTURE: "structure", // 结构操作
  MEDIA: "media", // 媒体操作
  PLUGIN: "plugin", // 插件操作
  SYSTEM: "system", // 系统操作
} as const;

// 操作优先级
export const OPERATION_PRIORITIES = {
  LOW: 1, // 低优先级
  NORMAL: 5, // 普通优先级
  HIGH: 10, // 高优先级
  CRITICAL: 20, // 关键优先级
} as const;

// 默认标签
export const DEFAULT_TAGS = {
  USER_GENERATED: "user_generated", // 用户生成
  SYSTEM_GENERATED: "system_generated", // 系统生成
  IMPORTED: "imported", // 导入
  EXPORTED: "exported", // 导出
  TEMPORARY: "temporary", // 临时
  PERMANENT: "permanent", // 永久
} as const;

// 事件类型
export const EVENT_TYPES = {
  // 操作事件
  OPERATION_APPLIED: "operationApplied",
  OPERATION_UNDONE: "operationUndone",
  OPERATION_REDONE: "operationRedone",
  OPERATION_FAILED: "operationFailed",

  // 状态事件
  STATE_CHANGED: "stateChanged",
  UNDO_STACK_CHANGED: "undoStackChanged",
  REDO_STACK_CHANGED: "redoStackChanged",

  // 协同事件
  CONFLICT_DETECTED: "conflictDetected",
  CONFLICT_RESOLVED: "conflictResolved",
  REMOTE_STATE_RECEIVED: "remoteStateReceived",

  // 性能事件
  MEMORY_USAGE_CHANGED: "memoryUsageChanged",
  OPERATION_PROCESSED: "operationProcessed",

  // 插件事件
  PLUGIN_LOADED: "pluginLoaded",
  PLUGIN_ERROR: "pluginError",
} as const;

// 存储类型
export const STORAGE_TYPES = {
  MEMORY: "memory",
  DATABASE: "database",
  HYBRID: "hybrid",
  CUSTOM: "custom",
} as const;

// 冲突类型
export const CONFLICT_TYPES = {
  OPERATION_ORDER: "operation_order",
  STATE_INCONSISTENCY: "state_inconsistency",
  OPERATION_CONFLICT: "operation_conflict",
} as const;

// 冲突严重程度
export const CONFLICT_SEVERITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

// 冲突解决策略
export const CONFLICT_RESOLUTIONS = {
  LOCAL_WINS: "local_wins",
  REMOTE_WINS: "remote_wins",
  MERGED: "merged",
  MANUAL: "manual",
} as const;

// 操作链执行状态
export const CHAIN_EXECUTION_STATES = {
  PENDING: "pending",
  EXECUTING: "executing",
  COMPLETED: "completed",
  FAILED: "failed",
  INTERRUPTED: "interrupted",
  ROLLED_BACK: "rolled_back",
} as const;

// 性能阈值
export const PERFORMANCE_THRESHOLDS = {
  MAX_OPERATION_TIME: 1000, // 最大操作时间 (1秒)
  MAX_MEMORY_USAGE: 200 * 1024 * 1024, // 最大内存使用 (200MB)
  MAX_STORAGE_LATENCY: 100, // 最大存储延迟 (100ms)
  MAX_NETWORK_LATENCY: 500, // 最大网络延迟 (500ms)
} as const;

// 清理策略
export const CLEANUP_STRATEGIES = {
  LRU: "lru", // 最近最少使用
  FIFO: "fifo", // 先进先出
  PRIORITY: "priority", // 优先级
  SIZE: "size", // 大小
  TIME: "time", // 时间
} as const;

// 压缩算法
export const COMPRESSION_ALGORITHMS = {
  NONE: "none", // 不压缩
  GZIP: "gzip", // GZIP压缩
  LZ4: "lz4", // LZ4压缩
  SNAPPY: "snappy", // Snappy压缩
} as const;

// 错误代码
export const ERROR_CODES = {
  OPERATION_NOT_FOUND: "OPERATION_NOT_FOUND",
  OPERATION_INVALID: "OPERATION_INVALID",
  STORAGE_ERROR: "STORAGE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  CONFLICT_UNRESOLVABLE: "CONFLICT_UNRESOLVABLE",
  PLUGIN_ERROR: "PLUGIN_ERROR",
  STRATEGY_NOT_FOUND: "STRATEGY_NOT_FOUND",
  CHAIN_EXECUTION_FAILED: "CHAIN_EXECUTION_FAILED",
} as const;
