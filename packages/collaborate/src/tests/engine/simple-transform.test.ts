import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - insert-in-same-position with implicit right-priority", () => {
  it("A then B, A client: do not need transform", () => {
    const base = new Delta().insert("hello");

    const opA = new Delta().retain(0).insert("A");
    const opB = new Delta().retain(0).insert("B");

    // 注意OTEngine.transform的动作是 op1 优先，op2 被调整，仅此而已它只是一个 transform 的机器，要不要 transform 是业务情况自己定的
    // 比如这里就不应该调用，因为模拟的是 A 先到达，所以 A 收到 B 的时候不需要 transform B，而下一个示例就需要了
    // const opBPrime = OTEngine.transform(opA, opB);

    const final = base.compose(opA).compose(opB);

    // 这是站在 A 的视角
    expect(final).toEqual(new Delta().insert("BAhello")); // 被调整的 B 在后
  });

  it("A then B, B client: need transform", () => {
    const base = new Delta().insert("hello");

    const opA = new Delta().retain(0).insert("A");
    const opB = new Delta().retain(0).insert("B");

    // A 先到达所以在 B 的客户端，opA 需要 被 opB transform
    const opAPrime = OTEngine.transform(opB, opA); // A transform 到 B 后
    const final = base.compose(opB).compose(opAPrime);

    // 这是站在 B 的视角
    expect(final).toEqual(new Delta().insert("BAhello")); // 后来的 A 在前
  });
});
