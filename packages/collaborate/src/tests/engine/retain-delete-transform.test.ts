/**
 * 本文件测试 Retain 操作与 Delete 操作之间的 transform 行为。
 *
 * 涉及场景包括：
 * - Retain 区域在 Delete 区域之后，插入点需前移
 * - Retain 插入点落在被删除区域中，需跳过该删除区
 * - Retain 插入点正好在删除区边界，可能仍保留
 *
 * ✅ 注意：Retain 中的插入点需根据 Delete 操作偏移调整，跳过已删除区域，避免越界。
 */

import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - retain vs delete", () => {
  it("retain after delete: retain 应左移", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).delete(2); // 删除 cd（index 2 和 3）
    const opB = new Delta().retain(4).insert("X"); // 原本在 d 后插入 X（index 4）

    const opBPrime = OTEngine.transform(opA, opB); // 插入点应左移 2 位 → retain(2)
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abXef")); // 插入成功于删除后的位置
  });

  it("retain overlaps delete: retain 插入点在删除区域中", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(3).delete(2); // 删除 de（index 3 和 4）
    const opB = new Delta().retain(4).insert("X"); // 原本在 e 后插入（index 4）

    const opBPrime = OTEngine.transform(opA, opB); // 插入点落入被删区域，偏移 -2 → retain(2)
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abcXf")); // 插入成功跳过删除区
  });

  it("retain ends at delete boundary: 插入点正好在删除区前", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).delete(2); // 删除 cd（index 2 和 3）
    const opB = new Delta().retain(2).insert("X"); // 在 c 前插入（index 2）

    const opBPrime = OTEngine.transform(opA, opB); // 插入点在删除区前，无需偏移
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abXef")); // 插入成功于删除前
  });
});
