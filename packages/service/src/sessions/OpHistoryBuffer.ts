import Delta from "quill-delta";
import { ClientMessage } from "../socket/types";

/**
 * 简单的 OP 历史缓存，用于 transform 与持久化前的缓存操作
 */
export class OpHistoryBuffer {
  private buffer: ClientMessage<Delta>[] = [];
  private maxSize = 1000;

  push(op: ClientMessage<Delta>) {
    this.buffer.push(op);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift(); // 移除最早的 op，限制内存使用
    }
  }

  /** 获取 sequence > 某个值的全部操作，用于 transform */
  getOpsSince(sequence: number): ClientMessage<Delta>[] {
    return this.buffer.filter((op) => op.sequence > sequence);
  }

  /** 获取所有历史操作（用于测试或调试） */
  getAll(): ClientMessage<Delta>[] {
    return this.buffer;
  }

  clear() {
    this.buffer = [];
  }

  size(): number {
    return this.buffer.length;
  }
}
