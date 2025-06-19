import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - insert-in-same-position with implicit right-priority", () => {
  it("should resolve insert conflict - A then B", () => {
    const base = new Delta().insert("hello");

    const opA = new Delta().retain(0).insert("A"); // A 先到达
    const opB = new Delta().retain(0).insert("B"); // B 后到达

    const opBPrime = OTEngine.transform(opA, opB); // B transform 到 A 后
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("BAhello")); // 后来的 B 在前
  });

  it("should resolve insert conflict - B then A", () => {
    const base = new Delta().insert("hello");

    const opA = new Delta().retain(0).insert("A"); // A 后到达
    const opB = new Delta().retain(0).insert("B"); // B 先到达

    const opAPrime = OTEngine.transform(opB, opA); // A transform 到 B 后
    const final = base.compose(opB).compose(opAPrime);

    expect(final).toEqual(new Delta().insert("ABhello")); // 后来的 A 在前
  });
});
