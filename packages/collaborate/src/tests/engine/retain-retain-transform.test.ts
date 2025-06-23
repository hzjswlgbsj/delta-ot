/**
 * 本文件测试两个 Retain 操作同时修改属性时的 transform 行为。
 *
 * 涉及场景包括：
 * - 同时修改同一段文字的不同属性，属性应合并
 * - 属性冲突时的处理（后者优先）
 * - Retain 与无属性操作的互相 transform
 */
import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - retain-retain attribute transform", () => {
  it("should merge different attributes on same retain range", () => {
    const base = new Delta().insert("hello");
    const opA = new Delta().retain(5, { bold: true });
    const opB = new Delta().retain(5, { italic: true });

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);
    expect(final).toEqual(
      base.compose(new Delta().retain(5, { italic: true, bold: true }))
    );
  });

  it("should override conflicting attributes by later operation", () => {
    const base = new Delta().insert("hello");
    const opA = new Delta().retain(5, { color: "red" });
    const opB = new Delta().retain(5, { color: "blue" });

    /**
     * 注意这里transform的动作是 opA 去调整 opB，所以这里 opB 是会被转换掉所以没有 blue 了
     * 但是这可能不符合我们的直觉，所以我们需要上层自己去控制当前 case 到底需不需要 transform
     * 这里 opB 是后来的按道理应该覆盖前面的，他们的 retain 是一样的，所以 opB 不需要 transform
     */
    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opB);

    // 按照续期这里的 opB 是不需要 transform 的，但是这里也可以验证一下，transform 后是空的
    expect(opBPrime.ops).toEqual([]);
    expect(final).toEqual(
      base.compose(new Delta().retain(5, { color: "blue" }))
    );
  });

  it("should transform retain with no attributes correctly", () => {
    const base = new Delta().insert("hello");
    const opA = new Delta().retain(5); // no formatting
    const opB = new Delta().retain(5, { underline: true }); // B wants to format

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(opBPrime.ops).toEqual([
      { retain: 5, attributes: { underline: true } },
    ]);
    expect(final).toEqual(
      base.compose(new Delta().retain(5, { underline: true }))
    );
  });

  it("should merge attributes on overlapping retain region", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(3, { bold: true }); // bold: a,b,c
    const opB = new Delta().retain(5, { italic: true }); // italic: a,b,c,d,e

    const opBPrime = OTEngine.transform(opA, opB); // B 是后到，transform A
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(
      base.compose(
        new Delta()
          .retain(3, { bold: true, italic: true }) // 合并属性
          .retain(2, { italic: true }) // A 不再控制的范围只带 italic
      )
    );
  });

  it("should merge multiple overlapping retain attributes from A B C", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2, { bold: true }); // a, b
    const opB = new Delta().retain(5, { italic: true }); // a - e
    const opC = new Delta().retain(3, { underline: true }); // a - c

    // opB 相对于 opA transform（A 先应用）
    const opBPrime = OTEngine.transform(opA, opB);

    // opC 相对于 (A + BPrime) transform
    const opCPrime = OTEngine.transform(opA.compose(opBPrime), opC);

    // 最终效果
    const final = base.compose(opA).compose(opBPrime).compose(opCPrime);

    expect(final).toEqual(
      base.compose(
        new Delta()
          .retain(2, { bold: true, italic: true, underline: true }) // a, b
          .retain(1, { italic: true, underline: true }) // c
          .retain(2, { italic: true }) // d, e
      )
    );
  });
});
