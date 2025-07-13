import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("Transform with retain(0) bug", () => {
  it("should handle retain(0) correctly", () => {
    // 本地操作：在位置4插入"4"
    const localOp = new Delta().retain(4).insert("4");

    // 远端操作：在位置0插入"1" (注意这里有retain(0))
    const remoteOp = new Delta().retain(0).insert("1");

    console.log("本地操作:", JSON.stringify(localOp.ops));
    console.log("远端操作:", JSON.stringify(remoteOp.ops));

    // 远端操作被本地操作 transform
    const transformed = OTEngine.transform(localOp, remoteOp);
    console.log("transform结果:", JSON.stringify(transformed.ops));

    // 验证结果
    console.log("期望结果:", JSON.stringify([{ retain: 1 }, { insert: "1" }]));
    console.log("实际结果:", JSON.stringify(transformed.ops));

    // 这个结果可能是正确的，让我分析一下为什么
    expect(transformed.ops).toEqual([{ retain: 1 }, { insert: "1" }]);
  });

  it("should compare with and without retain(0)", () => {
    // 本地操作：在位置4插入"4"
    const localOp = new Delta().retain(4).insert("4");

    // 远端操作1：retain(0).insert("1")
    const remoteOp1 = new Delta().retain(0).insert("1");

    // 远端操作2：insert("1") (没有retain(0))
    const remoteOp2 = new Delta().insert("1");

    console.log("本地操作:", JSON.stringify(localOp.ops));
    console.log("远端操作1 (with retain(0)):", JSON.stringify(remoteOp1.ops));
    console.log(
      "远端操作2 (without retain(0)):",
      JSON.stringify(remoteOp2.ops)
    );

    const transformed1 = OTEngine.transform(localOp, remoteOp1);
    const transformed2 = OTEngine.transform(localOp, remoteOp2);

    console.log("transform结果1:", JSON.stringify(transformed1.ops));
    console.log("transform结果2:", JSON.stringify(transformed2.ops));

    // 这两个结果应该不同！
    expect(transformed1.ops).not.toEqual(transformed2.ops);
  });
});
