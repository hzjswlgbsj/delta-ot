import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("Transform array vs method construction", () => {
  it("should show difference between array and method construction", () => {
    // 本地操作：在位置4插入"4"
    const localOp = new Delta().retain(4).insert("4");

    // 远端操作1：使用方法构造
    const remoteOp1 = new Delta().retain(0).insert("1");

    // 远端操作2：使用数组构造（模拟你的测试用例）
    const remoteOp2 = new Delta([{ retain: 0 }, { insert: "1" }]);

    console.log("=== 对比构造方式 ===");
    console.log("本地操作:", JSON.stringify(localOp.ops));
    console.log("远端操作1 (方法构造):", JSON.stringify(remoteOp1.ops));
    console.log("远端操作2 (数组构造):", JSON.stringify(remoteOp2.ops));

    const result1 = OTEngine.transform(localOp, remoteOp1);
    const result2 = OTEngine.transform(localOp, remoteOp2);

    console.log("结果1 (方法构造):", JSON.stringify(result1.ops));
    console.log("结果2 (数组构造):", JSON.stringify(result2.ops));

    // 这两个结果应该不同！
    expect(result1.ops).not.toEqual(result2.ops);

    // 验证结果2 是否包含 retain(1)
    const hasRetain1 = result2.ops.some((op) => op.retain === 1);
    console.log("结果2 是否包含 retain(1):", hasRetain1);

    if (hasRetain1) {
      console.log("✅ 找到了！这就是你看到的 retain(1) 现象");
    }
  });

  it("should test the exact scenario from your test cases", () => {
    // 模拟你的测试用例
    const localOp = new Delta([{ retain: 4 }, { insert: "4" }]);
    const remoteOp = new Delta([{ retain: 0 }, { insert: "1" }]);

    console.log("=== 你的测试用例场景 ===");
    console.log("本地操作:", JSON.stringify(localOp.ops));
    console.log("远端操作:", JSON.stringify(remoteOp.ops));

    const result = OTEngine.transform(localOp, remoteOp);
    console.log("transform结果:", JSON.stringify(result.ops));

    // 验证是否包含 retain(1)
    const hasRetain1 = result.ops.some((op) => op.retain === 1);
    console.log("是否包含 retain(1):", hasRetain1);

    if (hasRetain1) {
      console.log("✅ 确认！这就是你看到的 retain(1) 现象");
    }
  });
});
