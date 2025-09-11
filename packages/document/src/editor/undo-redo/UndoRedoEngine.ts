import Delta from "quill-delta";
import {
  OperationHistoryItem,
  UndoRedoResult,
  UndoRedoState,
  OperationType,
  CollaborativeState,
  ProcessResult,
  ValidationResult,
  UndoResult,
  RedoResult,
} from "./types";
import { OperationHistoryManager } from "./OperationHistoryManager";
import { EventEmitter } from "./events/EventEmitter";
import { UndoRedoEventManager } from "./events/UndoRedoEvents";
import { EVENT_TYPES } from "./constants";
import { IOperationStrategy } from "./strategies/IOperationStrategy";
import { TextOperationStrategy } from "./strategies/TextOperationStrategy";
import { IUndoRedoPlugin } from "./plugins/IUndoRedoPlugin";
import { DEFAULT_UNDO_REDO_CONFIG } from "./constants";
import { Logger } from "../../../../common/src/utils/Logger";

/**
 * 编辑器代理接口
 * 用于与 Quill 编辑器交互，避免直接操作编辑器导致的事件冲突
 */
export interface IEditorProxy {
  applyDelta(delta: Delta): Promise<void>;
  getContents(): Delta;
  setContents(delta: Delta): Promise<void>;
  getSelection(): any;
  setSelection(range: any): void;
}

/**
 * 撤销重做引擎
 * 负责处理撤销重做操作、策略管理、插件管理等
 */
export class UndoRedoEngine {
  private operationHistory: OperationHistoryManager;
  private strategies: Map<string, IOperationStrategy> = new Map();
  private plugins: Map<string, IUndoRedoPlugin> = new Map();
  private eventEmitter: EventEmitter;
  private eventManager: UndoRedoEventManager;
  private logger: Logger;
  private documentId: string;
  private userId: string;
  private config: typeof DEFAULT_UNDO_REDO_CONFIG;
  private isProcessing: boolean = false;
  private editorProxy?: IEditorProxy;

  constructor(
    operationHistory: OperationHistoryManager,
    documentId: string,
    userId: string,
    config = DEFAULT_UNDO_REDO_CONFIG
  ) {
    this.operationHistory = operationHistory;
    this.documentId = documentId;
    this.userId = userId;
    this.config = config;

    this.eventEmitter = new EventEmitter("UndoRedoEngine");
    this.eventManager = new UndoRedoEventManager(this.eventEmitter);
    this.logger = new Logger({ namespace: "UndoRedoEngine", username: userId });

    // 初始化默认策略
    this.initializeDefaultStrategies();

    // 加载插件（可选）
    const maybePlugins = (config as any).plugins as
      | IUndoRedoPlugin[]
      | undefined;
    if (Array.isArray(maybePlugins) && maybePlugins.length > 0) {
      this.loadPlugins(maybePlugins);
    }

    this.logger.info("UndoRedoEngine initialized", {
      documentId,
      userId,
      strategyCount: this.strategies.size,
      pluginCount: this.plugins.size,
    });
  }

  /**
   * 注册操作策略
   */
  registerStrategy(strategy: IOperationStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.logger.info("Strategy registered", {
      strategyName: strategy.name,
      totalStrategies: this.strategies.size,
    });
  }

  /**
   * 设置编辑器代理
   */
  setEditorProxy(proxy: IEditorProxy): void {
    this.editorProxy = proxy;
    this.logger.info("Editor proxy set");
  }

  /**
   * 撤销操作
   */
  async undo(): Promise<UndoRedoResult> {
    if (this.isProcessing) {
      return {
        success: false,
        error: "Another operation is in progress",
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();

    let operation: OperationHistoryItem | undefined;
    try {
      operation = this.operationHistory.popUndo();
      if (!operation) {
        return { success: false, error: "No operation to undo" };
      }

      this.logger.debug("Starting undo operation", {
        operationId: operation.id,
        type: operation.type,
      });

      // 查找合适的策略处理操作
      const strategy = this.findStrategy(operation);
      if (!strategy) {
        throw new Error(
          `No strategy found for operation type: ${operation.type}`
        );
      }

      // 通过策略处理撤销
      const undoResult = await strategy.undo(operation);

      // 应用撤销操作
      await this.applyOperation(undoResult.operation, operation);

      // 更新状态
      this.updateUndoRedoState();
      // 发射撤销栈、重做栈变化
      this.eventManager.emitUndoStackChanged(
        this.operationHistory.getUndoStack()
      );
      this.eventManager.emitRedoStackChanged(
        this.operationHistory.getRedoStack()
      );

      // 触发事件
      this.eventManager.emitOperationUndone(operation);

      const duration = Date.now() - startTime;
      this.eventManager.emitOperationProcessed(operation, duration);

      this.logger.info("Undo operation completed", {
        operationId: operation.id,
        duration,
        success: true,
      });

      return {
        success: true,
        operation: undoResult.operation,
        metadata: undoResult.metadata,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error("Undo operation failed", {
        error: error.message,
        duration,
      });

      // 触发错误事件
      if (operation) {
        this.eventManager.emitOperationFailed(operation, error as Error);
      }

      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 重做操作
   */
  async redo(): Promise<UndoRedoResult> {
    if (this.isProcessing) {
      return {
        success: false,
        error: "Another operation is in progress",
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();

    let operation: OperationHistoryItem | undefined;
    try {
      operation = this.operationHistory.popRedo();
      if (!operation) {
        return { success: false, error: "No operation to redo" };
      }

      this.logger.debug("Starting redo operation", {
        operationId: operation.id,
        type: operation.type,
      });

      // 查找合适的策略处理操作
      const strategy = this.findStrategy(operation);
      if (!strategy) {
        throw new Error(
          `No strategy found for operation type: ${operation.type}`
        );
      }

      // 通过策略处理重做
      const redoResult = await strategy.redo(operation);

      // 应用重做操作
      await this.applyOperation(redoResult.operation, operation);

      // 更新状态
      this.updateUndoRedoState();
      // 发射撤销栈、重做栈变化
      this.eventManager.emitUndoStackChanged(
        this.operationHistory.getUndoStack()
      );
      this.eventManager.emitRedoStackChanged(
        this.operationHistory.getRedoStack()
      );

      // 触发事件
      this.eventManager.emitOperationRedone(operation);

      const duration = Date.now() - startTime;
      this.eventManager.emitOperationProcessed(operation, duration);

      this.logger.info("Redo operation completed", {
        operationId: operation.id,
        duration,
        success: true,
      });

      return {
        success: true,
        operation: redoResult.operation,
        metadata: redoResult.metadata,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error("Redo operation failed", {
        error: error.message,
        duration,
      });

      // 触发错误事件
      if (operation) {
        this.eventManager.emitOperationFailed(operation, error as Error);
      }

      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 批量撤销操作
   */
  async batchUndo(count: number): Promise<UndoRedoResult[]> {
    const results: UndoRedoResult[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.undo();
      results.push(result);

      if (!result.success) {
        break; // 遇到错误就停止
      }
    }

    return results;
  }

  /**
   * 批量重做操作
   */
  async batchRedo(count: number): Promise<UndoRedoResult[]> {
    const results: UndoRedoResult[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.redo();
      results.push(result);

      if (!result.success) {
        break; // 遇到错误就停止
      }
    }

    return results;
  }

  /**
   * 获取当前状态
   */
  getState(): UndoRedoState {
    const baseState = this.operationHistory.getState();
    // 由当前是否正在处理和最近一次操作类型来确定状态
    const collaborativeState: CollaborativeState = this.isProcessing
      ? ("syncing" as CollaborativeState)
      : ("idle" as CollaborativeState);

    return {
      ...baseState,
      collaborativeState,
      activePlugins: Array.from(this.plugins.keys()),
      lastSyncTimestamp: Date.now(),
    };
  }

  /**
   * 获取事件发射器
   */
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  /**
   * 获取事件管理器
   */
  getEventManager(): UndoRedoEventManager {
    return this.eventManager;
  }

  /**
   * 查找合适的策略
   */
  private findStrategy(
    operation: OperationHistoryItem
  ): IOperationStrategy | undefined {
    // 按优先级排序策略
    const sortedStrategies = Array.from(this.strategies.values()).sort(
      (a, b) => b.getPriority() - a.getPriority()
    );

    for (const strategy of sortedStrategies) {
      if (strategy.canHandle(operation)) {
        return strategy;
      }
    }

    return undefined;
  }

  /**
   * 应用操作
   */
  private async applyOperation(
    operation: Delta,
    originalOperation: OperationHistoryItem
  ): Promise<void> {
    try {
      this.logger.debug("Applying operation", {
        operationId: originalOperation.id,
        operationType: originalOperation.type,
        deltaOps: operation.ops?.length || 0,
      });

      if (this.editorProxy) {
        // 通过编辑器代理应用操作，避免直接操作编辑器导致的事件冲突
        await this.editorProxy.applyDelta(operation);

        this.logger.debug("Operation applied successfully", {
          operationId: originalOperation.id,
        });
      } else {
        this.logger.warn("No editor proxy set, operation not applied", {
          operationId: originalOperation.id,
        });
        // 即使没有编辑器代理，也不抛出错误，允许引擎继续工作
      }
    } catch (error) {
      this.logger.error("Failed to apply operation", {
        operationId: originalOperation.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 更新撤销重做状态
   */
  private updateUndoRedoState(): void {
    const newState = this.getState();
    this.eventManager.emitStateChanged(newState);
    // 撤销/重做栈变化在具体操作处发射，这里不重复发射
  }

  /**
   * 初始化默认策略
   */
  private initializeDefaultStrategies(): void {
    // 注册文本操作策略
    this.registerStrategy(new TextOperationStrategy());

    this.logger.info("Default strategies initialization completed", {
      registeredStrategies: Array.from(this.strategies.keys()),
    });
  }

  /**
   * 加载插件
   */
  private async loadPlugins(plugins: IUndoRedoPlugin[]): Promise<void> {
    for (const plugin of plugins) {
      try {
        await plugin.initialize(this);
        this.plugins.set(plugin.name, plugin);

        this.logger.info("Plugin loaded successfully", {
          pluginName: plugin.name,
          version: plugin.version,
        });

        this.eventManager.emitPluginLoaded(plugin.name);
      } catch (error) {
        this.logger.error("Failed to load plugin", {
          pluginName: plugin.name,
          error: error.message,
        });

        this.eventManager.emitPluginError(plugin.name, error as Error);
      }
    }
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    // 销毁插件
    this.plugins.forEach((plugin) => {
      try {
        plugin.destroy();
      } catch (error) {
        this.logger.error("Error destroying plugin", {
          pluginName: plugin.name,
          error: error.message,
        });
      }
    });

    // 清空策略和插件
    this.strategies.clear();
    this.plugins.clear();

    // 销毁事件系统
    this.eventEmitter.destroy();

    this.logger.info("UndoRedoEngine destroyed");
  }
}
