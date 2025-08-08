import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OperationBuffer } from "./OperationBuffer";
import Delta from "quill-delta";

describe("OperationBuffer", () => {
  let buffer: OperationBuffer;
  let mockOnFlush: ReturnType<typeof vi.fn>;
  let mockOnRemoteOperation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnFlush = vi.fn();
    mockOnRemoteOperation = vi.fn();
    buffer = new OperationBuffer(
      mockOnFlush,
      {
        debounceDelay: 50,
        maxBufferTime: 200,
        maxOperations: 3,
        enableCompose: true,
      },
      mockOnRemoteOperation
    );
  });

  afterEach(() => {
    buffer.destroy();
    vi.clearAllTimers();
  });

  it("应该正确初始化", () => {
    expect(buffer.getStatus().size).toBe(0);
    expect(buffer.isEmpty()).toBe(true);
  });

  it("应该缓冲单个操作", () => {
    const delta = new Delta().insert("hello");
    buffer.addOperation(delta);

    expect(buffer.getStatus().size).toBe(1);
    expect(mockOnFlush).not.toHaveBeenCalled();
  });

  it("应该在防抖延迟后刷新", async () => {
    const delta = new Delta().insert("hello");
    buffer.addOperation(delta);

    // 等待防抖延迟
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(mockOnFlush).toHaveBeenCalledWith(delta);
    expect(buffer.getStatus().size).toBe(0);
  });

  it("应该合并多个操作", async () => {
    const delta1 = new Delta().insert("hello");
    const delta2 = new Delta().retain(5).insert(" world");

    buffer.addOperation(delta1);
    buffer.addOperation(delta2);

    // 等待防抖延迟
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(mockOnFlush).toHaveBeenCalledWith(
      expect.objectContaining({
        ops: expect.arrayContaining([
          expect.objectContaining({ insert: "hello world" }),
        ]),
      })
    );
  });

  it("应该在达到最大操作数量时立即刷新", () => {
    const delta1 = new Delta().insert("a");
    const delta2 = new Delta().insert("b");
    const delta3 = new Delta().insert("c");

    buffer.addOperation(delta1);
    buffer.addOperation(delta2);
    buffer.addOperation(delta3);

    // 应该立即刷新，不需要等待
    expect(mockOnFlush).toHaveBeenCalled();
    expect(buffer.getStatus().size).toBe(0);
  });

  it("应该在最大缓冲时间后强制刷新", async () => {
    const delta = new Delta().insert("hello");
    buffer.addOperation(delta);

    // 等待最大缓冲时间
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(mockOnFlush).toHaveBeenCalledWith(delta);
  });

  it("应该正确处理防抖重置", async () => {
    const delta1 = new Delta().insert("hello");
    const delta2 = new Delta().insert(" world");

    buffer.addOperation(delta1);

    // 在防抖延迟之前添加第二个操作
    await new Promise((resolve) => setTimeout(resolve, 30));
    buffer.addOperation(delta2);

    // 等待防抖延迟
    await new Promise((resolve) => setTimeout(resolve, 60));

    // 应该只调用一次，合并两个操作
    expect(mockOnFlush).toHaveBeenCalledTimes(1);
  });

  it("应该支持手动刷新", () => {
    const delta = new Delta().insert("hello");
    buffer.addOperation(delta);

    buffer.flush();

    expect(mockOnFlush).toHaveBeenCalledWith(delta);
    expect(buffer.getStatus().size).toBe(0);
  });

  it("应该支持清空缓冲区", () => {
    const delta = new Delta().insert("hello");
    buffer.addOperation(delta);

    buffer.clear();

    expect(mockOnFlush).not.toHaveBeenCalled();
    expect(buffer.getStatus().size).toBe(0);
  });

  it("应该禁用操作合并时返回最后一个操作", async () => {
    const bufferWithoutCompose = new OperationBuffer(mockOnFlush, {
      debounceDelay: 50,
      enableCompose: false,
    });

    const delta1 = new Delta().insert("hello");
    const delta2 = new Delta().insert(" world");

    bufferWithoutCompose.addOperation(delta1);
    bufferWithoutCompose.addOperation(delta2);

    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(mockOnFlush).toHaveBeenCalledWith(delta2);

    bufferWithoutCompose.destroy();
  });

  it("应该正确获取缓冲区状态", () => {
    const delta = new Delta().insert("hello");
    buffer.addOperation(delta);

    const status = buffer.getStatus();

    expect(status.size).toBe(1);
    expect(status.oldestTimestamp).toBe(status.newestTimestamp);
    expect(status.oldestTimestamp).toBeGreaterThan(0);
  });

  it("应该在收到远程操作时立即刷新缓冲区", () => {
    const delta = new Delta().insert("hello");
    buffer.addOperation(delta);

    // 模拟收到远程操作
    buffer.notifyRemoteOperation();

    expect(mockOnFlush).toHaveBeenCalledWith(delta);
    expect(mockOnRemoteOperation).toHaveBeenCalled();
    expect(buffer.getStatus().size).toBe(0);
  });

  it("应该在缓冲区为空时不触发远程操作回调", () => {
    // 缓冲区为空时调用notifyRemoteOperation
    buffer.notifyRemoteOperation();

    expect(mockOnFlush).not.toHaveBeenCalled();
    expect(mockOnRemoteOperation).toHaveBeenCalled();
  });
});
