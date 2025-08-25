import { Logger } from "@delta-ot/common";

/**
 * 事件发射器
 * 提供事件发布订阅机制
 */
export class EventEmitter {
  private listeners = new Map<string, Function[]>();
  private logger: Logger;

  constructor(namespace = "EventEmitter") {
    this.logger = new Logger(namespace);
  }

  /**
   * 注册事件监听器
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event)!.push(listener);

    this.logger.debug("Event listener registered", {
      event,
      listenerCount: this.listeners.get(event)!.length,
    });
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      return;
    }

    const eventListeners = this.listeners.get(event)!;
    const index = eventListeners.indexOf(listener);

    if (index !== -1) {
      eventListeners.splice(index, 1);

      if (eventListeners.length === 0) {
        this.listeners.delete(event);
      }

      this.logger.debug("Event listener removed", {
        event,
        remainingListeners: eventListeners.length,
      });
    }
  }

  /**
   * 发射事件
   */
  emit(event: string, ...args: any[]): void {
    if (!this.listeners.has(event)) {
      return;
    }

    const eventListeners = this.listeners.get(event)!;

    this.logger.debug("Event emitted", {
      event,
      listenerCount: eventListeners.length,
      args,
    });

    // 复制监听器数组，避免在回调中修改数组
    const listenersCopy = [...eventListeners];

    listenersCopy.forEach((listener, index) => {
      try {
        listener(...args);
      } catch (error) {
        this.logger.error("Error in event listener", {
          event,
          listenerIndex: index,
          error: error.message,
        });
      }
    });
  }

  /**
   * 注册一次性事件监听器
   */
  once(event: string, listener: Function): void {
    const onceListener = (...args: any[]) => {
      listener(...args);
      this.off(event, onceListener);
    };

    this.on(event, onceListener);
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.logger.debug("All listeners removed for event", { event });
    } else {
      this.listeners.clear();
      this.logger.debug("All listeners removed");
    }
  }

  /**
   * 销毁事件发射器
   */
  destroy(): void {
    this.listeners.clear();
    this.logger.info("EventEmitter destroyed");
  }
}
