import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTSession } from "../../session/OTSession";
import { ClientMessage, SendCommandType } from "../../transport";

describe("Client OTSession attribute conflict handling", () => {
  it("should handle attribute conflicts in receiveRemote", () => {
    console.log("=== 客户端属性冲突处理测试 ===");

    // 创建两个用户的会话
    const userA = new OTSession("userA");
    const userB = new OTSession("userB");

    // 设置初始内容
    const initialContent = new Delta().insert("Hello World");
    userA.setContents(initialContent);
    userB.setContents(initialContent);

    console.log("初始内容:", JSON.stringify(initialContent.ops));

    // 用户A提交本地操作：设置颜色为红色
    const opA: ClientMessage<Delta> = {
      type: SendCommandType.OP,
      timestamp: Date.now(),
      documentId: "test-doc",
      userId: "userA",
      sequence: 1,
      uuid: "op-a",
      data: new Delta().retain(4, { color: "red" }),
    };
    userA.commitLocal(opA);

    console.log("用户A本地操作:", JSON.stringify(opA.data.ops));

    // 用户B提交本地操作：设置颜色为蓝色
    const opB: ClientMessage<Delta> = {
      type: SendCommandType.OP,
      timestamp: Date.now(),
      documentId: "test-doc",
      userId: "userB",
      sequence: 1,
      uuid: "op-b",
      data: new Delta().retain(4, { color: "blue" }),
    };
    userB.commitLocal(opB);

    console.log("用户B本地操作:", JSON.stringify(opB.data.ops));

    // 模拟用户A收到用户B的操作
    console.log("用户A收到用户B的操作...");
    userA.receiveRemote(opB.data);

    // 模拟用户B收到用户A的操作
    console.log("用户B收到用户A的操作...");
    userB.receiveRemote(opA.data);

    // 验证最终结果
    const finalContentA = userA.getDocument().getContents();
    const finalContentB = userB.getDocument().getContents();

    console.log("用户A最终内容:", JSON.stringify(finalContentA.ops));
    console.log("用户B最终内容:", JSON.stringify(finalContentB.ops));

    // 验证两个用户看到相同的内容（一致性）
    expect(finalContentA.ops).toEqual(finalContentB.ops);
  });

  it("should merge non-conflicting attributes correctly", () => {
    console.log("=== 非冲突属性合并测试 ===");

    const userA = new OTSession("userA");
    const userB = new OTSession("userB");

    const initialContent = new Delta().insert("Hello World");
    userA.setContents(initialContent);
    userB.setContents(initialContent);

    // 用户A设置粗体
    const opA: ClientMessage<Delta> = {
      type: MessageType.OP,
      timestamp: Date.now(),
      documentId: "test-doc",
      userId: "userA",
      sequence: 1,
      uuid: "op-a",
      data: new Delta().retain(4, { bold: true }),
    };
    userA.commitLocal(opA);

    // 用户B设置斜体
    const opB: ClientMessage<Delta> = {
      type: MessageType.OP,
      timestamp: Date.now(),
      documentId: "test-doc",
      userId: "userB",
      sequence: 1,
      uuid: "op-b",
      data: new Delta().retain(4, { italic: true }),
    };
    userB.commitLocal(opB);

    console.log("用户A操作:", JSON.stringify(opA.data.ops));
    console.log("用户B操作:", JSON.stringify(opB.data.ops));

    // 交换操作
    userA.receiveRemote(opB.data);
    userB.receiveRemote(opA.data);

    const finalContentA = userA.getDocument().getContents();
    const finalContentB = userB.getDocument().getContents();

    console.log("用户A最终内容:", JSON.stringify(finalContentA.ops));
    console.log("用户B最终内容:", JSON.stringify(finalContentB.ops));

    // 应该合并为粗体+斜体
    expect(finalContentA.ops).toEqual(finalContentB.ops);

    // 验证属性合并
    const retainOp = finalContentA.ops.find((op) => op.retain && op.attributes);
    expect(retainOp).toBeDefined();
    expect(retainOp?.attributes).toEqual({ bold: true, italic: true });
  });

  it("should handle mixed content and attribute operations", () => {
    console.log("=== 混合内容和属性操作测试 ===");

    const userA = new OTSession("userA");
    const userB = new OTSession("userB");

    const initialContent = new Delta().insert("Hello World");
    userA.setContents(initialContent);
    userB.setContents(initialContent);

    // 用户A插入文本并设置颜色
    const opA: ClientMessage<Delta> = {
      type: MessageType.OP,
      timestamp: Date.now(),
      documentId: "test-doc",
      userId: "userA",
      sequence: 1,
      uuid: "op-a",
      data: new Delta().retain(5).insert(" ", { color: "red" }),
    };
    userA.commitLocal(opA);

    // 用户B设置颜色
    const opB: ClientMessage<Delta> = {
      type: MessageType.OP,
      timestamp: Date.now(),
      documentId: "test-doc",
      userId: "userB",
      sequence: 1,
      uuid: "op-b",
      data: new Delta().retain(5, { color: "blue" }),
    };
    userB.commitLocal(opB);

    console.log("用户A操作:", JSON.stringify(opA.data.ops));
    console.log("用户B操作:", JSON.stringify(opB.data.ops));

    // 交换操作
    userA.receiveRemote(opB.data);
    userB.receiveRemote(opA.data);

    const finalContentA = userA.getDocument().getContents();
    const finalContentB = userB.getDocument().getContents();

    console.log("用户A最终内容:", JSON.stringify(finalContentA.ops));
    console.log("用户B最终内容:", JSON.stringify(finalContentB.ops));

    // 验证一致性
    expect(finalContentA.ops).toEqual(finalContentB.ops);
  });
});
