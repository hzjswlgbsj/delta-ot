import {
  OperationHistoryItem,
  UndoRedoState,
  ConflictInfo,
  ConflictResolution,
} from "../types";
import { EventEmitter } from "./EventEmitter";
import { EVENT_TYPES } from "../constants";

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
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  // 操作事件
  emitOperationApplied(operation: OperationHistoryItem): void {
    this.eventEmitter.emit(EVENT_TYPES.OPERATION_APPLIED, operation);
  }

  emitOperationUndone(operation: OperationHistoryItem): void {
    this.eventEmitter.emit(EVENT_TYPES.OPERATION_UNDONE, operation);
  }

  emitOperationRedone(operation: OperationHistoryItem): void {
    this.eventEmitter.emit(EVENT_TYPES.OPERATION_REDONE, operation);
  }

  emitOperationFailed(operation: OperationHistoryItem, error: Error): void {
    this.eventEmitter.emit(EVENT_TYPES.OPERATION_FAILED, operation, error);
  }

  // 状态事件
  emitStateChanged(state: UndoRedoState): void {
    this.eventEmitter.emit(EVENT_TYPES.STATE_CHANGED, state);
  }

  emitUndoStackChanged(operations: OperationHistoryItem[]): void {
    this.eventEmitter.emit(EVENT_TYPES.UNDO_STACK_CHANGED, operations);
  }

  emitRedoStackChanged(operations: OperationHistoryItem[]): void {
    this.eventEmitter.emit(EVENT_TYPES.REDO_STACK_CHANGED, operations);
  }

  // 协同事件
  emitConflictDetected(conflict: ConflictInfo): void {
    this.eventEmitter.emit(EVENT_TYPES.CONFLICT_DETECTED, conflict);
  }

  emitConflictResolved(
    conflict: ConflictInfo,
    resolution: ConflictResolution
  ): void {
    this.eventEmitter.emit(EVENT_TYPES.CONFLICT_RESOLVED, conflict, resolution);
  }

  emitRemoteStateReceived(remoteState: UndoRedoState): void {
    this.eventEmitter.emit(EVENT_TYPES.REMOTE_STATE_RECEIVED, remoteState);
  }

  // 性能事件
  emitMemoryUsageChanged(usage: number, limit: number): void {
    this.eventEmitter.emit(EVENT_TYPES.MEMORY_USAGE_CHANGED, usage, limit);
  }

  emitOperationProcessed(
    operation: OperationHistoryItem,
    duration: number
  ): void {
    this.eventEmitter.emit(
      EVENT_TYPES.OPERATION_PROCESSED,
      operation,
      duration
    );
  }

  // 插件事件
  emitPluginLoaded(pluginName: string): void {
    this.eventEmitter.emit(EVENT_TYPES.PLUGIN_LOADED, pluginName);
  }

  emitPluginError(pluginName: string, error: Error): void {
    this.eventEmitter.emit(EVENT_TYPES.PLUGIN_ERROR, pluginName, error);
  }
}
