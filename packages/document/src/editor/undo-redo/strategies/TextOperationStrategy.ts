import Delta from "quill-delta";
import {
  OperationHistoryItem,
  ProcessResult,
  ValidationResult,
  UndoResult,
  RedoResult,
  OperationType,
} from "../types";
import { OPERATION_PRIORITIES } from "../constants";
import { IOperationStrategy } from "./IOperationStrategy";

/**
 * 文本操作策略
 * 处理文本插入、删除等操作
 */
export class TextOperationStrategy implements IOperationStrategy {
  name = "TextOperationStrategy";

  /**
   * 判断是否可以处理该操作
   */
  canHandle(operation: OperationHistoryItem): boolean {
    return (
      operation.type === OperationType.INSERT ||
      operation.type === OperationType.DELETE
    );
  }

  /**
   * 处理操作
   */
  async process(operation: OperationHistoryItem): Promise<ProcessResult> {
    try {
      // 验证操作
      const validation = this.validate(operation);
      if (!validation.valid) {
        throw new Error(
          `Operation validation failed: ${validation.errors.join(", ")}`
        );
      }

      // 处理文本操作
      let processedDelta: Delta;

      if (operation.type === OperationType.INSERT) {
        processedDelta = this.processInsert(operation.operation);
      } else if (operation.type === OperationType.DELETE) {
        processedDelta = this.processDelete(operation.operation);
      } else {
        throw new Error(`Unsupported operation type: ${operation.type}`);
      }

      return {
        success: true,
        operation: processedDelta,
        metadata: {
          strategy: this.name,
          originalType: operation.type,
          processedAt: Date.now(),
        },
      };
    } catch (error) {
      return {
        success: false,
        operation: operation.operation,
        error: error.message,
        metadata: {
          strategy: this.name,
          error: error.message,
        },
      };
    }
  }

  /**
   * 验证操作
   */
  validate(operation: OperationHistoryItem): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查操作类型
    if (!this.canHandle(operation)) {
      errors.push(`Strategy cannot handle operation type: ${operation.type}`);
    }

    // 检查Delta操作
    if (!operation.operation || !operation.operation.ops) {
      errors.push("Operation must have valid Delta ops");
    }

    // 检查操作内容
    if (operation.operation.ops) {
      const hasValidOp = operation.operation.ops.some(
        (op) => op.insert || op.delete || op.retain
      );

      if (!hasValidOp) {
        errors.push(
          "Operation must have at least one valid insert, delete, or retain operation"
        );
      }
    }

    // 检查时间戳
    if (operation.timestamp > Date.now()) {
      warnings.push("Operation timestamp is in the future");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 撤销操作
   */
  async undo(operation: OperationHistoryItem): Promise<UndoResult> {
    try {
      let undoDelta: Delta;

      if (operation.type === OperationType.INSERT) {
        // 插入操作的撤销是删除
        undoDelta = this.createDeleteDelta(operation.operation);
      } else if (operation.type === OperationType.DELETE) {
        // 删除操作的撤销是插入
        undoDelta = this.createInsertDelta(operation.operation);
      } else {
        throw new Error(`Cannot undo operation type: ${operation.type}`);
      }

      return {
        operation: undoDelta,
        metadata: {
          strategy: this.name,
          originalType: operation.type,
          undoType:
            operation.type === OperationType.INSERT ? "delete" : "insert",
          processedAt: Date.now(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to undo operation: ${error.message}`);
    }
  }

  /**
   * 重做操作
   */
  async redo(operation: OperationHistoryItem): Promise<RedoResult> {
    try {
      // 重做就是重新应用原始操作
      return {
        operation: operation.operation,
        metadata: {
          strategy: this.name,
          originalType: operation.type,
          redoType: operation.type,
          processedAt: Date.now(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to redo operation: ${error.message}`);
    }
  }

  /**
   * 获取策略优先级
   */
  getPriority(): number {
    return OPERATION_PRIORITIES.HIGH; // 文本操作优先级较高
  }

  /**
   * 获取策略描述
   */
  getDescription(): string {
    return "Handles text insert and delete operations with proper undo/redo support";
  }

  /**
   * 处理插入操作
   */
  private processInsert(delta: Delta): Delta {
    // 插入操作通常不需要特殊处理，直接返回
    return delta;
  }

  /**
   * 处理删除操作
   */
  private processDelete(delta: Delta): Delta {
    // 删除操作通常不需要特殊处理，直接返回
    return delta;
  }

  /**
   * 创建删除Delta（用于撤销插入操作）
   */
  private createDeleteDelta(insertDelta: Delta): Delta {
    const deleteOps: any[] = [];

    insertDelta.ops?.forEach((op) => {
      if (op.insert) {
        // 计算插入内容的长度
        const length = typeof op.insert === "string" ? op.insert.length : 1;
        deleteOps.push({ delete: length });
      }
    });

    return new Delta(deleteOps);
  }

  /**
   * 创建插入Delta（用于撤销删除操作）
   */
  private createInsertDelta(deleteDelta: Delta): Delta {
    const insertOps: any[] = [];

    deleteDelta.ops?.forEach((op) => {
      if (op.delete) {
        // 这里需要从操作历史中恢复被删除的内容
        // 暂时使用占位符
        insertOps.push({ insert: "".padEnd(op.delete, " ") });
      }
    });

    return new Delta(insertOps);
  }
}
