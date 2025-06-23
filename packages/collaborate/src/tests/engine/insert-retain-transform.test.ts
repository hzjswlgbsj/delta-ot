/**
 * 本文件测试 Insert 与 Retain 操作在同一位置或相邻位置上的 transform 行为。
 *
 * 涉及场景包括：
 * - Insert 插入位置位于 Retain 之前、之后或正好在开始位置
 * - 验证 Insert 是否被 Retain 正确偏移
 *
 * ✅ transform(opA, opB)：opA 是已应用的操作，opB 是待 transform 的操作
 */

import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - insert vs retain", () => {
  it("insert before retain: retain 应向后偏移", () => {
    const opA = new Delta().retain(2); // 已应用，保留前两个字符
    const opB = new Delta().retain(0).insert("X"); // 插入 "X" 在最前 → 插入后 retain 应右移

    const opBPrime = OTEngine.transform(opA, opB); // 让 insert/retain 适配已应用的 retain
    const result = new Delta().insert("hello").compose(opA).compose(opBPrime);

    expect(result).toEqual(new Delta().insert("Xhello")); // 插入后，retain 正确偏移
  });

  it("insert after retain: retain 不影响 insert", () => {
    const opA = new Delta().retain(2); // retain 前两个字符
    const opB = new Delta().retain(4).insert("X"); // 插入在更后面，不受干扰

    const opBPrime = OTEngine.transform(opA, opB); // retain 不影响 insert
    const result = new Delta().insert("hello").compose(opA).compose(opBPrime);

    expect(result).toEqual(new Delta().insert("hellXo")); // 插入在末尾
  });

  it("insert exactly at retain start: retain 与 insert 同起点", () => {
    const opA = new Delta().retain(3); // 保留前 3 个字符
    const opB = new Delta().retain(3).insert("X"); // 插入在 index 3 处（"hel|lo"）

    const opBPrime = OTEngine.transform(opA, opB);
    const result = new Delta().insert("hello").compose(opA).compose(opBPrime);

    expect(result).toEqual(new Delta().insert("helXlo")); // 插入在 l 前
  });
});
