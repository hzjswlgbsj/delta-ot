import {
  UndoRedoState,
  ConflictInfo,
  ConflictResolution,
  CollaborativeState,
  PerformanceMetrics,
} from "./types";
import { EventEmitter } from "./events/EventEmitter";
import { UndoRedoEventManager } from "./events/UndoRedoEvents";
import { Logger } from "../../../../common/src/utils/Logger";
import { DEFAULT_UNDO_REDO_CONFIG } from "./constants";

/**
 * 协同状态同步器
 * 负责管理多用户环境下的撤销重做状态同步
 */
export class CollaborativeStateSync {
  private eventEmitter: EventEmitter;
  private eventManager: UndoRedoEventManager;
  private logger: Logger;
  private documentId: string;
  private userId: string;
  private config: typeof DEFAULT_UNDO_REDO_CONFIG;

  private localState: UndoRedoState;
  private remoteStates: Map<string, UndoRedoState> = new Map();
  private conflicts: Map<string, ConflictInfo> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;
  private isSyncing: boolean = false;

  constructor(
    eventEmitter: EventEmitter,
    documentId: string,
    userId: string,
    config = DEFAULT_UNDO_REDO_CONFIG
  ) {
    this.eventEmitter = eventEmitter;
    this.documentId = documentId;
    this.userId = userId;
    this.config = config;

    this.eventManager = new UndoRedoEventManager(eventEmitter);
    this.logger = new Logger({
      namespace: "CollaborativeStateSync",
      username: userId,
    });

    // 初始化本地状态
    this.localState = this.getInitialState();

    // 启动同步
    this.startSync();

    this.logger.info("CollaborativeStateSync initialized", {
      documentId,
      userId,
      syncInterval: config.syncInterval,
    });
  }

  /**
   * 同步状态
   */
  async syncState(): Promise<void> {
    if (this.isSyncing) {
      this.logger.debug("Sync already in progress, skipping");
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      this.logger.debug("Starting state synchronization");

      // 广播本地状态
      await this.broadcastStateChange();

      // 检查冲突
      await this.checkConflicts();

      // 解决冲突
      await this.resolveConflicts();

      const duration = Date.now() - startTime;
      this.lastSyncTime = Date.now();

      this.logger.info("State synchronization completed", {
        duration,
        conflictCount: this.conflicts.size,
      });
    } catch (error) {
      this.logger.error("State synchronization failed", {
        error: error.message,
      });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 广播状态变更
   */
  async broadcastStateChange(): Promise<void> {
    try {
      // 这里应该通过WebSocket或其他方式广播状态
      // 暂时只是记录日志
      this.logger.debug("Broadcasting state change", {
        localState: this.localState,
      });

      // TODO: 实际的状态广播
      // await this.websocket.broadcast('stateChange', this.localState);
    } catch (error) {
      this.logger.error("Failed to broadcast state change", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 处理远程状态变更
   */
  async handleRemoteStateChange(
    remoteUserId: string,
    remoteState: UndoRedoState
  ): Promise<void> {
    try {
      this.logger.debug("Received remote state change", {
        remoteUserId,
        remoteState,
      });

      // 保存远程状态
      this.remoteStates.set(remoteUserId, remoteState);

      // 检查是否与本地状态冲突
      const conflict = this.detectConflict(remoteUserId, remoteState);
      if (conflict) {
        this.conflicts.set(conflict.id, conflict);
        this.eventManager.emitConflictDetected(conflict);
      }

      // 触发事件
      this.eventManager.emitRemoteStateReceived(remoteState);
    } catch (error) {
      this.logger.error("Failed to handle remote state change", {
        remoteUserId,
        error: error.message,
      });
    }
  }

  /**
   * 检查冲突
   */
  private async checkConflicts(): Promise<void> {
    const newConflicts: ConflictInfo[] = [];

    this.remoteStates.forEach((remoteState, remoteUserId) => {
      const conflict = this.detectConflict(remoteUserId, remoteState);
      if (conflict && !this.conflicts.has(conflict.id)) {
        newConflicts.push(conflict);
      }
    });

    if (newConflicts.length > 0) {
      this.logger.info("New conflicts detected", {
        conflictCount: newConflicts.length,
      });

      newConflicts.forEach((conflict) => {
        this.conflicts.set(conflict.id, conflict);
        this.eventManager.emitConflictDetected(conflict);
      });
    }
  }

  /**
   * 解决冲突
   */
  private async resolveConflicts(): Promise<void> {
    if (this.conflicts.size === 0) {
      return;
    }

    this.logger.info("Resolving conflicts", {
      conflictCount: this.conflicts.size,
    });

    for (const [conflictId, conflict] of this.conflicts) {
      try {
        const resolution = await this.resolveConflict(conflict);

        if (resolution) {
          this.conflicts.delete(conflictId);
          this.eventManager.emitConflictResolved(conflict, resolution);

          this.logger.info("Conflict resolved", {
            conflictId,
            resolution: resolution.resolution,
          });
        }
      } catch (error) {
        this.logger.error("Failed to resolve conflict", {
          conflictId,
          error: error.message,
        });
      }
    }
  }

  /**
   * 检测冲突
   */
  private detectConflict(
    remoteUserId: string,
    remoteState: UndoRedoState
  ): ConflictInfo | null {
    // 检查撤销重做状态是否一致
    if (
      this.localState.canUndo !== remoteState.canUndo ||
      this.localState.canRedo !== remoteState.canRedo
    ) {
      return {
        id: `conflict-${Date.now()}-${remoteUserId}`,
        type: "state_inconsistency",
        localOperation: {
          id: "local-state",
          type: "format" as any,
          operation: {} as any,
          timestamp: Date.now(),
          userId: this.userId,
          documentId: this.documentId,
          sequenceNumber: 0,
          undoable: this.localState.canUndo,
          redoable: this.localState.canRedo,
        },
        remoteOperation: {
          id: "remote-state",
          type: "format" as any,
          operation: {} as any,
          timestamp: Date.now(),
          userId: remoteUserId,
          documentId: this.documentId,
          sequenceNumber: 0,
          undoable: remoteState.canUndo,
          redoable: remoteState.canRedo,
        },
        timestamp: Date.now(),
        severity: "medium",
        description: "Undo/Redo state inconsistency detected",
      };
    }

    return null;
  }

  /**
   * 解决单个冲突
   */
  private async resolveConflict(
    conflict: ConflictInfo
  ): Promise<ConflictResolution | null> {
    try {
      let resolution: ConflictResolution;
      const mode = (this.config as any).conflictResolution || "optimistic";

      switch (mode) {
        case "optimistic":
          // 乐观策略：本地优先
          resolution = {
            id: `resolution-${Date.now()}`,
            conflictId: conflict.id,
            resolution: "local_wins",
            timestamp: Date.now(),
            description: "Local state wins (optimistic resolution)",
          };
          break;

        case "pessimistic":
          // 悲观策略：远程优先
          resolution = {
            id: `resolution-${Date.now()}`,
            conflictId: conflict.id,
            resolution: "remote_wins",
            timestamp: Date.now(),
            description: "Remote state wins (pessimistic resolution)",
          };
          break;

        case "hybrid":
          // 混合策略：基于时间戳
          if (
            conflict.localOperation.timestamp >
            conflict.remoteOperation.timestamp
          ) {
            resolution = {
              id: `resolution-${Date.now()}`,
              conflictId: conflict.id,
              resolution: "local_wins",
              timestamp: Date.now(),
              description: "Local state wins (newer timestamp)",
            };
          } else {
            resolution = {
              id: `resolution-${Date.now()}`,
              conflictId: conflict.id,
              resolution: "remote_wins",
              timestamp: Date.now(),
              description: "Remote state wins (newer timestamp)",
            };
          }
          break;

        default:
          // 手动解决
          resolution = {
            id: `resolution-${Date.now()}`,
            conflictId: conflict.id,
            resolution: "manual",
            timestamp: Date.now(),
            description: "Manual resolution required",
          };
      }

      // 应用解决方案
      await this.applyConflictResolution(conflict, resolution);

      return resolution;
    } catch (error) {
      this.logger.error("Failed to resolve conflict", {
        conflictId: conflict.id,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 应用冲突解决方案
   */
  private async applyConflictResolution(
    conflict: ConflictInfo,
    resolution: ConflictResolution
  ): Promise<void> {
    try {
      switch (resolution.resolution) {
        case "local_wins":
          // 保持本地状态不变
          this.logger.debug("Keeping local state (local wins)");
          break;

        case "remote_wins":
          // 采用远程状态
          this.logger.debug("Adopting remote state (remote wins)");
          // TODO: 更新本地状态以匹配远程状态
          break;

        case "merged":
          // 合并状态
          this.logger.debug("Merging states");
          // TODO: 实现状态合并逻辑
          break;

        case "manual":
          // 手动解决，需要用户干预
          this.logger.debug("Manual resolution required");
          // TODO: 通知用户需要手动解决
          break;
      }
    } catch (error) {
      this.logger.error("Failed to apply conflict resolution", {
        conflictId: conflict.id,
        resolution: resolution.resolution,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 更新本地状态
   */
  updateLocalState(newState: Partial<UndoRedoState>): void {
    this.localState = { ...this.localState, ...newState };

    this.logger.debug("Local state updated", {
      newState: this.localState,
    });

    // 触发状态变更事件
    this.eventManager.emitStateChanged(this.localState);
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): UndoRedoState {
    return this.localState;
  }

  /**
   * 获取远程状态
   */
  getRemoteStates(): Map<string, UndoRedoState> {
    return new Map(this.remoteStates);
  }

  /**
   * 获取活跃冲突
   */
  getActiveConflicts(): ConflictInfo[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return {
      averageOperationTime: 0, // 需要从外部传入
      memoryUsage: 0, // 需要从外部传入
      storageLatency: 0, // 需要从外部传入
      networkLatency: Date.now() - this.lastSyncTime,
      lastUpdateTime: Date.now(),
    };
  }

  /**
   * 启动同步
   */
  private startSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.syncState().catch((error) => {
        this.logger.error("Periodic sync failed", { error: error.message });
      });
    }, this.config.syncInterval);

    this.logger.info("Periodic sync started", {
      interval: this.config.syncInterval,
    });
  }

  /**
   * 停止同步
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;

      this.logger.info("Periodic sync stopped");
    }
  }

  /**
   * 获取初始状态
   */
  private getInitialState(): UndoRedoState {
    return {
      canUndo: false,
      canRedo: false,
      undoStackSize: 0,
      redoStackSize: 0,
      collaborativeState: "idle" as CollaborativeState,
      lastSyncTimestamp: Date.now(),
      activePlugins: [],
      storageStats: {
        totalOperations: 0,
        operationsByType: {
          insert: 0 as any,
          delete: 0 as any,
          format: 0 as any,
          undo: 0 as any,
          redo: 0 as any,
          composite: 0 as any,
          batch: 0 as any,
          image_insert: 0 as any,
          table_operation: 0 as any,
          code_block: 0 as any,
          math_formula: 0 as any,
          comment: 0 as any,
          annotation: 0 as any,
          markdown_conversion: 0 as any,
          plugin_operation: 0 as any,
        } as any,
        operationsByUser: {},
        operationsByCategory: {},
        memoryUsage: 0,
        lastCleanupTime: Date.now(),
      },
      performanceMetrics: {
        averageOperationTime: 0,
        memoryUsage: 0,
        storageLatency: 0,
        networkLatency: 0,
        lastUpdateTime: Date.now(),
      },
    };
  }

  /**
   * 销毁同步器
   */
  destroy(): void {
    this.stopSync();
    this.remoteStates.clear();
    this.conflicts.clear();

    this.logger.info("CollaborativeStateSync destroyed");
  }
}
