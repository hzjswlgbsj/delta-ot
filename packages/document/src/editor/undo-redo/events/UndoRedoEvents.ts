import {
  OperationHistoryItem,
  UndoRedoState,
  ConflictInfo,
  ConflictResolution,
  PerformanceMetrics,
} from "../types";

/**
 * 撤销重做事件接口
 * 定义所有撤销重做相关的事件处理器
 */
export interface IUndoRedoEvents {
  // 操作事件
  onOperationApplied(operation: OperationHistoryItem): void;
  onOperationUndone(operation: OperationHistoryItem): void;
  onOperationRedone(operation: OperationHistoryItem): void;
  onOperationFailed(operation: OperationHistoryItem, error: Error): void;

  // 状态事件
  onStateChanged(state: UndoRedoState): void;
  onUndoStackChanged(operations: OperationHistoryItem[]): void;
  onRedoStackChanged(operations: OperationHistoryItem[]): void;

  // 协同事件
  onConflictDetected(conflict: ConflictInfo): void;
  onConflictResolved(
    conflict: ConflictInfo,
    resolution: ConflictResolution
  ): void;
  onRemoteStateReceived(remoteState: UndoRedoState): void;

  // 性能事件
  onMemoryUsageChanged(usage: number, limit: number): void;
  onOperationProcessed(operation: OperationHistoryItem, duration: number): void;

  // 插件事件
  onPluginLoaded(pluginName: string): void;
  onPluginError(pluginName: string, error: Error): void;
}

/**
 * 撤销重做事件管理器
 * 管理所有撤销重做相关的事件
 */
export class UndoRedoEventManager {
  private eventEmitter: any; // 这里需要导入EventEmitter

  constructor(eventEmitter: any) {
    this.eventEmitter = eventEmitter;
  }

  // 操作事件
  emitOperationApplied(operation: OperationHistoryItem): void {
    this.eventEmitter.emit("operationApplied", operation);
  }

  emitOperationUndone(operation: OperationHistoryItem): void {
    this.eventEmitter.emit("operationUndone", operation);
  }

  emitOperationRedone(operation: OperationHistoryItem): void {
    this.eventEmitter.emit("operationRedone", operation);
  }

  emitOperationFailed(operation: OperationHistoryItem, error: Error): void {
    this.eventEmitter.emit("operationFailed", operation, error);
  }

  // 状态事件
  emitStateChanged(state: UndoRedoState): void {
    this.eventEmitter.emit("stateChanged", state);
  }

  emitUndoStackChanged(operations: OperationHistoryItem[]): void {
    this.eventEmitter.emit("undoStackChanged", operations);
  }

  emitRedoStackChanged(operations: OperationHistoryItem[]): void {
    this.eventEmitter.emit("redoStackChanged", operations);
  }

  // 协同事件
  emitConflictDetected(conflict: ConflictInfo): void {
    this.eventEmitter.emit("conflictDetected", conflict);
  }

  emitConflictResolved(
    conflict: ConflictInfo,
    resolution: ConflictResolution
  ): void {
    this.eventEmitter.emit("conflictResolved", conflict, resolution);
  }

  emitRemoteStateReceived(remoteState: UndoRedoState): void {
    this.eventEmitter.emit("remoteStateReceived", remoteState);
  }

  // 性能事件
  emitMemoryUsageChanged(usage: number, limit: number): void {
    this.eventEmitter.emit("memoryUsageChanged", usage, limit);
  }

  emitOperationProcessed(
    operation: OperationHistoryItem,
    duration: number
  ): void {
    this.eventEmitter.emit("operationProcessed", operation, duration);
  }

  // 插件事件
  emitPluginLoaded(pluginName: string): void {
    this.eventEmitter.emit("pluginLoaded", pluginName);
  }

  emitPluginError(pluginName: string, error: Error): void {
    this.eventEmitter.emit("pluginError", pluginName, error);
  }
}
