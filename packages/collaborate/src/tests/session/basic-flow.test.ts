import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTSession } from "../../session/OTSession";

describe("OTSession basic flow", () => {
  it("should apply local and remote operations consistently", () => {
    const userA = new OTSession("A", new Delta().insert("hello"));
    const userB = new OTSession("B", new Delta().insert("hello"));

    const opA = new Delta().retain(0).insert("A");

    // 用户 A 本地提交操作
    userA.commitLocal(opA);

    // 模拟 opA 从 A 传到 B，被 B 接收并 transform 应用
    userB.apply(opA);

    // 两端最终文档内容应一致
    expect(userA.getDocument().getContents()).toEqual(
      new Delta().insert("Ahello")
    );
    expect(userB.getDocument().getContents()).toEqual(
      new Delta().insert("Ahello")
    );
  });
});
