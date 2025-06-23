/**
 * insert vs insert 操作发生在相同位置，测试在不同优先级策略下 transform 的结果是否正确。
 *
 * 涉及场景包括：
 * - 情况 A：本地 insert 在位置 0，远端 insert 在同一位置
 * - 情况 B：远端 insert 优先时，本地 insert 应向后偏移
 * - 测试目标：确认 transform(opEarlier, opLater) 能正确偏移后来的 op
 *
 * ✅ 强调：transform 是单纯的位移逻辑，优先级控制应由上层业务判断谁先谁后。
 */
import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - insert vs insert", () => {
  it("same position: opA first, then opB", () => {
    const base = new Delta().insert("hello");
    const opA = new Delta().retain(0).insert("A");
    const opB = new Delta().retain(0).insert("B");

    // A 先到，B 被 transform
    const opBPrime = OTEngine.transform(opA, opB);
    const result = base.compose(opA).compose(opBPrime);

    expect(result).toEqual(new Delta().insert("ABhello"));
  });

  it("same position: opB first, then opA", () => {
    const base = new Delta().insert("hello");
    const opA = new Delta().retain(0).insert("A");
    const opB = new Delta().retain(0).insert("B");

    // B 先到，A 被 transform
    const opAPrime = OTEngine.transform(opB, opA);
    const result = base.compose(opB).compose(opAPrime);

    expect(result).toEqual(new Delta().insert("BAhello"));
  });

  it("opA inserts in middle, opB inserts before", () => {
    const base = new Delta().insert("hello");
    const opA = new Delta().retain(3).insert("A");
    const opB = new Delta().retain(1).insert("B");

    // A 先，B 后
    const opBPrime = OTEngine.transform(opA, opB);
    const result = base.compose(opA).compose(opBPrime);

    expect(result).toEqual(new Delta().insert("hBelAlo"));
  });

  it("opA inserts after, opB inserts before (no overlap)", () => {
    const base = new Delta().insert("hello");
    const opA = new Delta().retain(4).insert("A");
    const opB = new Delta().retain(1).insert("B");

    // B 先，A 后
    const opAPrime = OTEngine.transform(opB, opA);
    const result = base.compose(opB).compose(opAPrime);

    expect(result).toEqual(new Delta().insert("hBellAo"));
  });

  it("opA and opB insert in different places (no transform needed)", () => {
    const base = new Delta().insert("hello");
    const opA = new Delta().retain(1).insert("A"); // hAello
    const opB = new Delta().retain(3).insert("B"); // 意图是 helBlo

    const opBPrime = OTEngine.transform(opA, opB); // 或者写明顺序

    const result = base.compose(opA).compose(opBPrime);

    expect(result).toEqual(new Delta().insert("hAelBlo"));
  });
});
