import Delta from "quill-delta";
import { getGlobalLogger } from "../../../common/src/utils/Logger";
import { OTEngine } from "../engine/OTEngine";

export interface OperationBufferOptions {
  /** 防抖延迟时间（毫秒），默认 100ms */
  debounceDelay?: number;
  /** 最大缓冲时间（毫秒），默认 500ms */
  maxBufferTime?: number;
  /** 最大操作数量，默认 10 个 */
  maxOperations?: number;
  /** 是否启用操作合并，默认 true */
  enableCompose?: boolean;
}

export interface BufferedOperation {
  delta: Delta;
  timestamp: number;
}

/**
 * 操作缓冲器 - 简化版本
 * 
 * 设计原则：
 * 1. 避免复杂的transform逻辑，保持OTSession的简单性
 * 2. 只在用户快速输入时进行缓冲，减少网络请求
 * 3. 当收到远程操作时，立即刷新缓冲区，确保操作顺序正确
 */
export class OperationBuffer {
  private buffer: BufferedOperation[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private options: Required<OperationBufferOptions>;
  private onFlush: (composedDelta: Delta) => void;
  private onRemoteOperation?: () => void; // 远程操作回调
  private logger = getGlobalLogger("collaborate");

  constructor(
    onFlush: (composedDelta: Delta) => void,
    options: OperationBufferOptions = {},
    onRemoteOperation?: () => void
  ) {
    this.onFlush = onFlush;
    this.onRemoteOperation = onRemoteOperation;
    this.options = {
      debounceDelay: 100,
      maxBufferTime: 500,
      maxOperations: 10,
      enableCompose: true,
      ...options,
    };
  }

  /**
   * 添加操作到缓冲区
   * @param delta 操作增量
   */
  addOperation(delta: Delta): void {
    const operation: BufferedOperation = {
      delta,
      timestamp: Date.now(),
    };

    this.buffer.push(operation);
    this.logger.info("OperationBuffer.addOperation:", {
      delta: delta.ops,
      bufferSize: this.buffer.length,
      timestamp: operation.timestamp,
    });

    // 检查是否需要立即刷新
    if (this.shouldFlushImmediately()) {
      this.flush();
      return;
    }

    // 设置防抖定时器
    this.scheduleDebounce();
    
    // 设置最大缓冲时间定时器
    this.scheduleMaxBufferTime();
  }

  /**
   * 通知收到远程操作，立即刷新缓冲区
   * 这是关键方法：确保本地操作在远程操作之前发送
   */
  notifyRemoteOperation(): void {
    if (this.buffer.length > 0) {
      this.logger.info("OperationBuffer.notifyRemoteOperation: 收到远程操作，立即刷新缓冲区");
      this.flush();
    }
    
    // 调用回调函数，通知上层
    this.onRemoteOperation?.();
  }

  /**
   * 立即刷新缓冲区
   */
  flush(): void {
    if (this.buffer.length === 0) {
      return;
    }

    // 清理定时器
    this.clearTimers();

    // 合并操作
    const composedDelta = this.composeOperations();
    
    // 清空缓冲区
    this.buffer = [];

    this.logger.info("OperationBuffer.flush:", {
      originalCount: this.buffer.length,
      composedDelta: composedDelta.ops,
      timestamp: Date.now(),
    });

    // 调用回调函数
    this.onFlush(composedDelta);
  }

  /**
   * 清空缓冲区（不发送操作）
   */
  clear(): void {
    this.clearTimers();
    this.buffer = [];
    this.logger.info("OperationBuffer.clear: 缓冲区已清空");
  }

  /**
   * 获取当前缓冲区状态
   */
  getStatus(): {
    size: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    if (this.buffer.length === 0) {
      return {
        size: 0,
        oldestTimestamp: null,
        newestTimestamp: null,
      };
    }

    return {
      size: this.buffer.length,
      oldestTimestamp: this.buffer[0].timestamp,
      newestTimestamp: this.buffer[this.buffer.length - 1].timestamp,
    };
  }

  /**
   * 检查缓冲区是否为空
   */
  isEmpty(): boolean {
    return this.buffer.length === 0;
  }

  /**
   * 销毁缓冲器
   */
  destroy(): void {
    this.clearTimers();
    this.buffer = [];
    this.onFlush = () => {};
    this.onRemoteOperation = undefined;
  }

  /**
   * 检查是否需要立即刷新
   */
  private shouldFlushImmediately(): boolean {
    // 达到最大操作数量
    if (this.buffer.length >= this.options.maxOperations) {
      this.logger.info("OperationBuffer: 达到最大操作数量，立即刷新");
      return true;
    }

    return false;
  }

  /**
   * 设置防抖定时器
   */
  private scheduleDebounce(): void {
    // 清除之前的定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 设置新的防抖定时器
    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, this.options.debounceDelay);
  }

  /**
   * 设置最大缓冲时间定时器
   */
  private scheduleMaxBufferTime(): void {
    // 清除之前的定时器
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // 设置最大缓冲时间定时器
    this.flushTimer = setTimeout(() => {
      this.logger.info("OperationBuffer: 达到最大缓冲时间，强制刷新");
      this.flush();
    }, this.options.maxBufferTime);
  }

  /**
   * 清理所有定时器
   */
  private clearTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * 合并操作
   */
  private composeOperations(): Delta {
    if (this.buffer.length === 0) {
      return new Delta();
    }

    if (this.buffer.length === 1) {
      return this.buffer[0].delta;
    }

    if (!this.options.enableCompose) {
      // 如果不启用合并，返回最后一个操作
      return this.buffer[this.buffer.length - 1].delta;
    }

    // 使用 compose 方法合并所有操作
    const composedDelta = this.buffer.reduce((acc, operation) => {
      return OTEngine.compose(acc, operation.delta);
    }, new Delta());

    this.logger.info("OperationBuffer.composeOperations:", {
      operationCount: this.buffer.length,
      originalOps: this.buffer.map(op => op.delta.ops),
      composedOps: composedDelta.ops,
    });

    return composedDelta;
  }
}
