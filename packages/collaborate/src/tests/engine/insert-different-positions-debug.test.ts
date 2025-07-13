import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("Debug insertAtDifferentPositions issue", () => {
  it("should correctly handle insert at different positions", () => {
    // 基础内容：base (长度4)
    const base = new Delta().insert("base");
    console.log("基础内容:", JSON.stringify(base.ops));

    // 用户A操作：在位置0插入"1"
    const opA = new Delta().retain(0).insert("1");
    console.log("用户A操作:", JSON.stringify(opA.ops));

    // 用户B操作：在位置4插入"4"
    const opB = new Delta().retain(4).insert("4");
    console.log("用户B操作:", JSON.stringify(opB.ops));

    console.log("\n=== 场景1: A先到，B后到 ===");
    // 1. A先应用
    const afterA = base.compose(opA);
    console.log("A应用后:", JSON.stringify(afterA.ops));

    // 2. B需要transform
    const opBTransformed = OTEngine.transform(opA, opB);
    console.log("B transform后:", JSON.stringify(opBTransformed.ops));

    // 3. 最终结果
    const final1 = afterA.compose(opBTransformed);
    console.log("最终结果1:", JSON.stringify(final1.ops));

    console.log("\n=== 场景2: B先到，A后到 ===");
    // 1. B先应用
    const afterB = base.compose(opB);
    console.log("B应用后:", JSON.stringify(afterB.ops));

    // 2. A需要transform
    const opATransformed = OTEngine.transform(opB, opA);
    console.log("A transform后:", JSON.stringify(opATransformed.ops));

    // 3. 最终结果
    const final2 = afterB.compose(opATransformed);
    console.log("最终结果2:", JSON.stringify(final2.ops));

    console.log("\n=== 问题分析 ===");
    console.log("期望结果应该是: 1base4");
    console.log("实际结果1:", final1.toString());
    console.log("实际结果2:", final2.toString());

    // 检查问题所在
    console.log("\n=== 详细分析 ===");
    console.log("用户B的retain(4)在基础内容'base'(长度4)中，应该指向末尾");
    console.log("但是当A在位置0插入'1'后，文档变成'1base'(长度5)");
    console.log("此时B的retain(4)应该变成retain(5)才能正确插入到末尾");

    // 验证这个假设
    const correctOpB = new Delta().retain(5).insert("4");
    console.log("正确的B操作应该是:", JSON.stringify(correctOpB.ops));
    const correctFinal = afterA.compose(correctOpB);
    console.log("使用正确操作的结果:", correctFinal.toString());

    // 期望结果
    expect(final1.ops).toEqual([{ insert: "1base4" }]);
    expect(final2.ops).toEqual([{ insert: "1base4" }]);
  });
});
