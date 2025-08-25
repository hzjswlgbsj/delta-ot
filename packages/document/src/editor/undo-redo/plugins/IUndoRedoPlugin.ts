import { OperationHistoryItem, ProcessResult, PluginConfig } from "../types";

/**
 * 撤销重做插件接口
 * 定义插件的统一接口
 */
export interface IUndoRedoPlugin {
  name: string; // 插件名称
  version: string; // 插件版本
  description: string; // 插件描述
  author: string; // 插件作者
  dependencies?: string[]; // 依赖的其他插件

  // 生命周期方法
  initialize(engine: any): Promise<void>; // 这里需要导入UndoRedoEngine
  destroy(): Promise<void>;

  // 操作处理
  canHandleOperation(operation: OperationHistoryItem): boolean;
  processOperation(operation: OperationHistoryItem): Promise<ProcessResult>;

  // 事件处理
  onOperationApplied(operation: OperationHistoryItem): void;
  onOperationUndone(operation: OperationHistoryItem): void;
  onOperationRedone(operation: OperationHistoryItem): void;

  // 状态管理
  getPluginState(): Record<string, any>;
  setPluginState(state: Record<string, any>): void;

  // 配置管理
  getConfig(): PluginConfig;
  updateConfig(config: Partial<PluginConfig>): void;
}
