/**
 * 本文件测试两个 Insert 操作在同一位置发生时的 transform 行为。
 *
 * 涉及场景包括：
 * - 两端同时插入不同字符（冲突位置处理）
 * - 模拟 A 先到、B 后到（transform B）
 * - 模拟 B 先到、A 后到（transform A）
 *
 * ✅ 强调：transform 是单纯的位移逻辑，优先级控制应由上层业务判断谁先谁后。
 */
import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - insert vs insert", () => {
  it("A inserts at pos 0, then B inserts at pos 0 (A first)", () => {
    const base = new Delta().insert("hello");

    const opA = new Delta().retain(0).insert("A");
    const opB = new Delta().retain(0).insert("B");

    const opBPrime = OTEngine.transform(opA, opB); // B 后到
    const result = base.compose(opA).compose(opBPrime);

    expect(result).toEqual(new Delta().insert("ABhello"));
  });

  it("B inserts at pos 0, then A inserts at pos 0 (B first)", () => {
    const base = new Delta().insert("hello");

    const opA = new Delta().retain(0).insert("A");
    const opB = new Delta().retain(0).insert("B");

    const opAPrime = OTEngine.transform(opB, opA); // A 后到
    const result = base.compose(opB).compose(opAPrime);

    expect(result).toEqual(new Delta().insert("BAhello"));
  });

  it("A inserts at pos 2, B inserts at pos 2 (A first)", () => {
    const base = new Delta().insert("hello");

    const opA = new Delta().retain(2).insert("A");
    const opB = new Delta().retain(2).insert("B");

    const opBPrime = OTEngine.transform(opA, opB);
    const result = base.compose(opA).compose(opBPrime);

    expect(result).toEqual(new Delta().insert("heABllo"));
  });

  it("A inserts at pos 1, B inserts at pos 2", () => {
    const base = new Delta().insert("hello");

    const opA = new Delta().retain(1).insert("A");
    const opB = new Delta().retain(2).insert("B");

    // B 后到达，无需调整位置
    const opBPrime = OTEngine.transform(opA, opB);
    const result = base.compose(opA).compose(opBPrime);

    expect(result).toEqual(new Delta().insert("hAeBllo"));
  });
});
