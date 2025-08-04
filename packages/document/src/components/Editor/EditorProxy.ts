import Quill from "quill";
import Delta from "quill-delta";
import { documentLogger } from "../../utils/logger";

/**
 * 操作状态枚举
 */
export enum OperationState {
  IDLE = "idle",
  PROCESSING_REMOTE_UPDATE = "processing_remote_update",
  PROCESSING_USER_INPUT = "processing_user_input",
  PROCESSING_SYSTEM_UPDATE = "processing_system_update",
}

/**
 * 编辑器代理类
 * 完全掌控 Quill 编辑器的输入输出，避免竞态条件和事件冲突
 */
export class EditorProxy {
  private quill: Quill | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private originalQuillMethods: Map<string, Function> = new Map();
  private operationState: OperationState = OperationState.IDLE;

  constructor(quill: Quill) {
    this.quill = quill;
    this.setupProxy();
  }

  /**
   * 设置代理，拦截所有 Quill 的事件和方法
   */
  private setupProxy() {
    if (!this.quill) return;

    documentLogger.info("EditorProxy: 开始设置代理层");

    // 保存原始的 Quill 方法
    this.originalQuillMethods.set(
      "updateContents",
      this.quill.updateContents.bind(this.quill)
    );
    this.originalQuillMethods.set(
      "setContents",
      this.quill.setContents.bind(this.quill)
    );
    this.originalQuillMethods.set(
      "getContents",
      this.quill.getContents.bind(this.quill)
    );

    // 移除所有原始的事件监听器
    this.quill.off("text-change");
    this.quill.off("selection-change");

    // 设置我们自己的事件监听器
    this.quill.on("text-change", this.handleTextChange.bind(this));
    this.quill.on("selection-change", this.handleSelectionChange.bind(this));

    documentLogger.info("EditorProxy: 代理层设置完成");
  }

  /**
   * 处理文本变更事件
   */
  private handleTextChange(delta: Delta, oldContents: Delta, source: string) {
    documentLogger.info("EditorProxy: 拦截到 text-change 事件", {
      delta: delta.ops,
      source,
      operationState: this.operationState,
    });

    // 检查是否应该处理这个事件
    if (!this.shouldProcessEvent("text-change", source)) {
      documentLogger.info("EditorProxy: 忽略 text-change 事件", {
        source,
        operationState: this.operationState,
      });
      return;
    }

    // 如果是用户输入，更新操作状态
    if (source === "user") {
      this.setOperationState(OperationState.PROCESSING_USER_INPUT);
      documentLogger.info("EditorProxy: 开始处理用户输入");
    }

    // 触发我们自己的事件处理器
    this.triggerEvent("text-change", delta, oldContents, source);

    // 如果是用户输入，延迟重置状态
    if (source === "user") {
      setTimeout(() => {
        this.setOperationState(OperationState.IDLE);
        documentLogger.info("EditorProxy: 用户输入处理完成");
      }, 0);
    }
  }

  /**
   * 处理选区变更事件
   */
  private handleSelectionChange(range: any, oldRange: any, source: string) {
    documentLogger.info("EditorProxy: 拦截到 selection-change 事件", {
      source,
      operationState: this.operationState,
    });

    // 检查是否应该处理这个事件
    if (!this.shouldProcessEvent("selection-change", source)) {
      documentLogger.info("EditorProxy: 忽略 selection-change 事件", {
        source,
        operationState: this.operationState,
      });
      return;
    }

    // 触发我们自己的事件处理器
    this.triggerEvent("selection-change", range, oldRange, source);
  }

  /**
   * 判断是否应该处理事件
   */
  private shouldProcessEvent(eventName: string, source: string): boolean {
    // 如果正在处理远程更新，忽略所有事件
    if (this.operationState === OperationState.PROCESSING_REMOTE_UPDATE) {
      return false;
    }

    // 如果正在处理系统更新，只处理系统事件
    if (this.operationState === OperationState.PROCESSING_SYSTEM_UPDATE) {
      return source === "api" || source === "silent";
    }

    // 其他情况下都处理
    return true;
  }

  /**
   * 设置操作状态
   */
  private setOperationState(state: OperationState) {
    const oldState = this.operationState;
    this.operationState = state;
    documentLogger.info("EditorProxy: 操作状态变更", {
      from: oldState,
      to: state,
    });
  }

  /**
   * 注册事件监听器
   */
  on(eventName: string, handler: Function) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName)!.push(handler);
    documentLogger.info("EditorProxy: 注册事件监听器", { eventName });
  }

  /**
   * 移除事件监听器
   */
  off(eventName: string, handler?: Function) {
    if (!handler) {
      this.eventHandlers.delete(eventName);
      documentLogger.info("EditorProxy: 移除所有事件监听器", { eventName });
    } else {
      const handlers = this.eventHandlers.get(eventName);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
          documentLogger.info("EditorProxy: 移除事件监听器", { eventName });
        }
      }
    }
  }

  /**
   * 触发事件
   */
  private triggerEvent(eventName: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          documentLogger.error("EditorProxy: 事件处理器错误", error);
        }
      });
    }
  }

  /**
   * 安全的远程更新方法
   */
  updateContents(delta: Delta) {
    if (!this.quill) return;

    documentLogger.info("EditorProxy: 开始远程更新", {
      delta: delta.ops,
      operationState: this.operationState,
    });

    // 设置操作状态
    this.setOperationState(OperationState.PROCESSING_REMOTE_UPDATE);

    try {
      // 调用原始的 updateContents 方法
      const originalMethod = this.originalQuillMethods.get("updateContents");
      if (originalMethod) {
        originalMethod.call(this.quill, delta, "silent");
      }
    } finally {
      // 延迟重置状态，确保所有事件都处理完成
      setTimeout(() => {
        this.setOperationState(OperationState.IDLE);
        documentLogger.info("EditorProxy: 远程更新完成");
      }, 50);
    }
  }

  /**
   * 安全的设置内容方法
   */
  setContents(delta: Delta) {
    if (!this.quill) return;

    documentLogger.info("EditorProxy: 设置内容", {
      delta: delta.ops,
      operationState: this.operationState,
    });

    // 设置操作状态
    this.setOperationState(OperationState.PROCESSING_SYSTEM_UPDATE);

    try {
      // 调用原始的 setContents 方法
      const originalMethod = this.originalQuillMethods.get("setContents");
      if (originalMethod) {
        originalMethod.call(this.quill, delta, "silent");
      }
    } finally {
      // 延迟重置状态
      setTimeout(() => {
        this.setOperationState(OperationState.IDLE);
        documentLogger.info("EditorProxy: 内容设置完成");
      }, 50);
    }
  }

  /**
   * 获取内容
   */
  getContents(): Delta {
    if (!this.quill) return new Delta();

    const originalMethod = this.originalQuillMethods.get("getContents");
    if (originalMethod) {
      return originalMethod.call(this.quill);
    }
    return new Delta();
  }

  /**
   * 获取当前的 Quill 实例（用于其他方法）
   */
  getQuill(): Quill | null {
    return this.quill;
  }

  /**
   * 获取当前操作状态
   */
  getOperationState(): OperationState {
    return this.operationState;
  }

  /**
   * 销毁代理
   */
  destroy() {
    documentLogger.info("EditorProxy: 开始销毁代理层");

    if (this.quill) {
      this.quill.off("text-change");
      this.quill.off("selection-change");
    }

    this.eventHandlers.clear();
    this.originalQuillMethods.clear();
    this.quill = null;
    this.operationState = OperationState.IDLE;

    documentLogger.info("EditorProxy: 代理层销毁完成");
  }
}
