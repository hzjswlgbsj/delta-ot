/**
 * 本文件测试 Retain 操作与 Insert 操作在 transform 中的行为。
 *
 * 涉及场景包括：
 * - 插入发生在 retain 范围前、中、后
 * - retain 操作如何穿越插入操作
 *
 * ✅ 注意：Retain 应正确跳过 insert 所引入的字符长度，保持对文档后续结构的引用不变。
 */

import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - retain vs insert", () => {
  it("insert before retain: retain should be shifted right", () => {
    const base = new Delta().insert("world");

    const opA = new Delta().retain(0).insert("A"); // 在 index 0 插入 "A" → "Aworld"
    const opB = new Delta().retain(2).insert("X"); // 原本是插入在 "wo" 后，即 index 2

    const opBPrime = OTEngine.transform(opA, opB); // 插入操作使 retain 偏移 +1
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("AwoXrld"));
  });

  it("insert inside retained region: retain 不被后插入影响", () => {
    const base = new Delta().insert("hello world");

    const opA = new Delta().retain(6).insert("X"); // index 6: 在 " " 和 "w" 之间
    const opB = new Delta().retain(5).insert("Y"); // index 5: 在 "o" 和 " " 之间

    const opBPrime = OTEngine.transform(opA, opB); // opB 在 opA 之前，不应变动
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("helloY Xworld")); // 插入互不干扰
  });

  it("retain completely after insert: retain 不受 insert 影响", () => {
    const base = new Delta().insert("12345");

    const opA = new Delta().retain(0).insert("A"); // 开头插入 A → "A12345"
    const opB = new Delta().retain(5).insert("Z"); // 原结尾插入 Z → "12345Z"

    const opBPrime = OTEngine.transform(opA, opB); // B 的 retain 应偏移 +1（变成 retain(6)）
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("A12345Z"));
  });
});
