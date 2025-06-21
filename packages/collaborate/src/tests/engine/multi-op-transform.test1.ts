/**
 * 本文件测试多个连续 Delta 操作组合下的 transform 行为（多段复合）。
 *
 * 涉及场景包括：
 * - Insert + Retain / Delete 混合操作组合 transform
 * - 多段操作组合如何影响 transform 的位移计算
 *
 * ✅ 建议通过组合 Delta 模拟真实文档编辑路径，验证 transform 的整体一致性与可组合性。
 */
import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - multi-op complex combinations", () => {
  it("insert + delete vs insert", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(1).insert("X").delete(2); // aXdef

    const opB = new Delta().retain(2).insert("Y"); // insert Y after X

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("aXYdef"));
  });

  it("retain + delete vs insert + retain", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).delete(2); // abef
    const opB = new Delta().insert("X").retain(4); // Xabcdef

    const opAPrime = OTEngine.transform(opB, opA);
    const final = base.compose(opB).compose(opAPrime);

    expect(final).toEqual(new Delta().insert("Xabef"));
  });
});
