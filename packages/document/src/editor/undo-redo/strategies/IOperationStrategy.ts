import {
  OperationHistoryItem,
  ProcessResult,
  ValidationResult,
  UndoResult,
  RedoResult,
} from "../types";

/**
 * 操作处理策略接口
 * 定义不同操作类型的处理策略
 */
export interface IOperationStrategy {
  name: string;

  /**
   * 判断是否可以处理该操作
   */
  canHandle(operation: OperationHistoryItem): boolean;

  /**
   * 处理操作
   */
  process(operation: OperationHistoryItem): Promise<ProcessResult>;

  /**
   * 验证操作
   */
  validate(operation: OperationHistoryItem): ValidationResult;

  /**
   * 撤销操作
   */
  undo(operation: OperationHistoryItem): Promise<UndoResult>;

  /**
   * 重做操作
   */
  redo(operation: OperationHistoryItem): Promise<RedoResult>;

  /**
   * 获取策略优先级
   */
  getPriority(): number;

  /**
   * 获取策略描述
   */
  getDescription(): string;
}
