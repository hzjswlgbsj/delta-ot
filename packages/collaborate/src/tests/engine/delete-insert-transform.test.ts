/**
 * @file delete-insert-transform.test.ts
 * @description
 * 本文件测试 Delete 操作与 Insert 操作在同一位置的 transform 行为。
 *
 * 涉及场景包括：
 * - Insert 插入位置正好被 Delete 删除（应被丢弃）
 * - Insert 在 Delete 前（应保留原位）
 * - Insert 在 Delete 后（需向前偏移）
 *
 * ✅ 验证冲突下 Insert 是否保留、移动或被丢弃
 */

import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - delete vs insert", () => {
  it("Insert is within deleted region - should be kept (Delta preserves inserts)", () => {
    const base = new Delta().insert("hello");
    const opDel = new Delta().retain(1).delete(3); // 删除 "ell"
    const opIns = new Delta().retain(2).insert("X"); // 插入在 index 2

    const opInsPrime = OTEngine.transform(opDel, opIns);
    const final = base.compose(opDel).compose(opInsPrime);

    expect(final).toEqual(new Delta().insert("hXo")); // ✅ Delta 保留插入
  });

  it("Insert is before Delete - should stay", () => {
    const base = new Delta().insert("hello");
    const opIns = new Delta().retain(1).insert("X"); // 在 index 1 插入 "X"，变成 "hXello"
    const opDel = new Delta().retain(2).delete(2); // 删除 "ll"，此时 index 2 是 "e"

    const opDelPrime = OTEngine.transform(opIns, opDel); // Insert 先到，Delete 后到需 transform
    const final = base.compose(opIns).compose(opDelPrime);

    expect(final).toEqual(new Delta().insert("hXeo")); // "X" 插入成功，"ll" 被删
  });

  it("Insert is after Delete - should shift", () => {
    const base = new Delta().insert("hello");
    const opDel = new Delta().retain(1).delete(2); // 删除 "el"，只保留 "hlo"
    const opIns = new Delta().retain(4).insert("X"); // index 4 插入，在 "l" 后插入 "X"

    const opInsPrime = OTEngine.transform(opDel, opIns); // Delete 先到，Insert 后到需 transform
    const final = base.compose(opDel).compose(opInsPrime);

    expect(final).toEqual(new Delta().insert("hloX")); // 插入位置被左移后仍插入成功
  });
});
