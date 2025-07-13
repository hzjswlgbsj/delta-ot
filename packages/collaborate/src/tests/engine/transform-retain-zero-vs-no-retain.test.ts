import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("Transform retain(0) vs no retain", () => {
  it("should show the difference between retain(0) and no retain", () => {
    // 本地操作：在位置4插入"4"
    const localOp = new Delta().retain(4).insert("4");

    // 远端操作1：没有 retain(0)
    const remoteOp1 = new Delta().insert("1");

    // 远端操作2：有 retain(0)
    const remoteOp2 = new Delta().retain(0).insert("1");

    console.log("=== 对比 retain(0) 和没有 retain ===");
    console.log("本地操作:", JSON.stringify(localOp.ops));
    console.log("远端操作1 (无 retain):", JSON.stringify(remoteOp1.ops));
    console.log("远端操作2 (有 retain(0)):", JSON.stringify(remoteOp2.ops));

    const result1 = OTEngine.transform(localOp, remoteOp1);
    const result2 = OTEngine.transform(localOp, remoteOp2);

    console.log("结果1 (无 retain):", JSON.stringify(result1.ops));
    console.log("结果2 (有 retain(0)):", JSON.stringify(result2.ops));

    // 这两个结果应该不同！
    expect(result1.ops).not.toEqual(result2.ops);

    // 验证结果2 是否包含 retain(1)
    const hasRetain1 = result2.ops.some((op) => op.retain === 1);
    console.log("结果2 是否包含 retain(1):", hasRetain1);

    // 如果结果2 包含 retain(1)，说明这就是你看到的现象
    if (hasRetain1) {
      console.log("✅ 找到了！这就是你看到的 retain(1) 现象");
    }
  });

  it("should verify that retain(0) is preserved in Delta", () => {
    // 测试 retain(0) 是否被保留
    const op1 = new Delta().insert("1");
    const op2 = new Delta().retain(0).insert("1");

    console.log("op1 (无 retain):", JSON.stringify(op1.ops));
    console.log("op2 (有 retain(0)):", JSON.stringify(op2.ops));

    // 这两个操作应该不同
    expect(op1.ops).not.toEqual(op2.ops);
  });
});
