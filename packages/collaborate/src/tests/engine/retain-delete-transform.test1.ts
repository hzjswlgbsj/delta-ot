/**
 * 本文件测试 Retain 操作与 Delete 操作之间的 transform 行为。
 *
 * 涉及场景包括：
 * - Retain 覆盖 Delete 区域前、中、后
 * - Delete 操作如何影响 Retain 的跳过逻辑
 *
 * ✅ 注意：Retain 需正确调整偏移位置，跳过已删除区域，避免越界。
 */

import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - retain vs delete", () => {
  it("retain after delete", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).delete(2); // delete cd
    const opB = new Delta().retain(4).insert("X"); // insert after d (被删了)

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abXef"));
  });

  it("retain overlaps delete", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(3).delete(2); // delete de
    const opB = new Delta().retain(4).insert("X"); // insert after d (被删了)

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abcXf"));
  });

  it("retain ends at delete boundary", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).delete(2); // delete cd
    const opB = new Delta().retain(2).insert("X"); // insert right before delete

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abXef"));
  });
});
