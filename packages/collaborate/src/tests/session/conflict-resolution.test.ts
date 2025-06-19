import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTSession } from "../../session/OTSession";

describe("OTSession conflict resolution", () => {
  it("should resolve same-position insert: B after A (with transform)", () => {
    const userA = new OTSession("A", new Delta().insert("hello"));
    const userB = new OTSession("B", new Delta().insert("hello"));

    const opA = new Delta().retain(0).insert("A");
    const opB = new Delta().retain(0).insert("B");

    // A 和 B 分别提交本地操作
    userA.commitLocal(opA);
    userB.commitLocal(opB);

    // 模拟 B 的操作传到 A，A 有本地 pending，需要 transform B
    userA.receiveRemote(opB);

    // 模拟 A 的操作传到 B，B 有本地 pending，需要 transform A
    userB.receiveRemote(opA);

    // 两者最终内容应一致
    expect(userA.getDocument().getContents()).toEqual(
      new Delta().insert("BAhello")
    );
    expect(userB.getDocument().getContents()).toEqual(
      new Delta().insert("BAhello")
    );
  });
});
