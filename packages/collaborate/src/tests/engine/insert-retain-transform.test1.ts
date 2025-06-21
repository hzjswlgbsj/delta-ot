/**
 * 本文件测试 Insert 与 Retain 操作在同一位置或相邻位置上的 transform 行为。
 *
 * 涉及场景包括：
 * - Insert 插入位置位于 Retain 之前
 * - Insert 插入位置位于 Retain 之后
 * - Insert 插入位置正好在 Retain 开始位置
 *
 * ✅ 验证 transform 后位置偏移是否符合预期
 */

import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - insert vs retain", () => {
  it("insert before retain", () => {
    const op1 = new Delta().retain(2);
    const op2 = new Delta().retain(0).insert("X");

    const op2Prime = OTEngine.transform(op1, op2);
    const result = new Delta().insert("hello").compose(op1).compose(op2Prime);

    expect(result).toEqual(new Delta().insert("heXllo"));
  });

  it("insert after retain", () => {
    const op1 = new Delta().retain(2);
    const op2 = new Delta().retain(4).insert("X");

    const op2Prime = OTEngine.transform(op1, op2);
    const result = new Delta().insert("hello").compose(op1).compose(op2Prime);

    expect(result).toEqual(new Delta().insert("helloX"));
  });

  it("insert exactly at retain start", () => {
    const op1 = new Delta().retain(3);
    const op2 = new Delta().retain(3).insert("X");

    const op2Prime = OTEngine.transform(op1, op2);
    const result = new Delta().insert("hello").compose(op1).compose(op2Prime);

    expect(result).toEqual(new Delta().insert("helXlo"));
  });
});
