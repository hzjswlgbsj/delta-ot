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
    const opA = new Delta().retain(5, { bold: true });
    const opB = new Delta().retain(5, { italic: true });

    // opB 是后到，需要根据 opA transform
    const opBPrime = OTEngine.transform(opA, opB);

    expect(opBPrime.ops).toEqual([
      { retain: 5, attributes: { italic: true, bold: true } },
    ]);
  });

  it("should override conflicting attributes by later operation", () => {
    const opA = new Delta().retain(5, { color: "red" });
    const opB = new Delta().retain(5, { color: "blue" });

    // opB 是后到，需要根据 opA transform，后者优先
    const opBPrime = OTEngine.transform(opA, opB);

    expect(opBPrime.ops).toEqual([
      { retain: 5, attributes: { color: "blue" } },
    ]);
  });

  it("should transform retain with no attributes correctly", () => {
    const opA = new Delta().retain(5);
    const opB = new Delta().retain(5, { underline: true });

    const opBPrime = OTEngine.transform(opA, opB);
    expect(opBPrime.ops).toEqual([
      { retain: 5, attributes: { underline: true } },
    ]);
  });
});
