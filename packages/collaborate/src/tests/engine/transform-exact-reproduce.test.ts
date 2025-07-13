import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("Transform exact reproduce", () => {
  it("should reproduce the exact scenario from user logs", () => {
    // 本地操作：在位置4插入"4"
    const localOp = new Delta().retain(4).insert("4");

    // 远端操作：在位置0插入"1" (注意这里有retain(0))
    const remoteOp = new Delta().retain(0).insert("1");

    console.log("=== 精确复现用户日志 ===");
    console.log("本地操作:", JSON.stringify(localOp.ops));
    console.log("远端操作:", JSON.stringify(remoteOp.ops));

    // 直接调用 quill-delta 的 transform，不使用我们的 OTEngine
    const rawTransform = localOp.transform(remoteOp, true);
    console.log(
      "quill-delta 直接 transform:",
      JSON.stringify(rawTransform.ops)
    );

    // 通过我们的 OTEngine
    const engineTransform = OTEngine.transform(localOp, remoteOp);
    console.log("OTEngine transform:", JSON.stringify(engineTransform.ops));

    // 检查两个结果是否一致
    console.log(
      "结果是否一致:",
      JSON.stringify(rawTransform.ops) === JSON.stringify(engineTransform.ops)
    );

    // 如果结果不一致，说明 OTEngine 有问题
    expect(rawTransform.ops).toEqual(engineTransform.ops);
  });

  it("should check if Delta constructor affects the result", () => {
    // 测试不同的构造方式是否会影响结果
    const localOp1 = new Delta().retain(4).insert("4");
    const localOp2 = new Delta([{ retain: 4 }, { insert: "4" }]);

    const remoteOp1 = new Delta().retain(0).insert("1");
    const remoteOp2 = new Delta([{ retain: 0 }, { insert: "1" }]);

    console.log("=== 测试不同构造方式 ===");
    console.log("localOp1:", JSON.stringify(localOp1.ops));
    console.log("localOp2:", JSON.stringify(localOp2.ops));
    console.log("remoteOp1:", JSON.stringify(remoteOp1.ops));
    console.log("remoteOp2:", JSON.stringify(remoteOp2.ops));

    const result1 = localOp1.transform(remoteOp1, true);
    const result2 = localOp2.transform(remoteOp2, true);

    console.log("result1:", JSON.stringify(result1.ops));
    console.log("result2:", JSON.stringify(result2.ops));

    expect(result1.ops).toEqual(result2.ops);
  });

  it("should check if there are multiple transform calls", () => {
    // 模拟可能的多次 transform 调用
    const localOp = new Delta().retain(4).insert("4");
    const remoteOp = new Delta().retain(0).insert("1");

    console.log("=== 测试多次 transform ===");
    console.log("初始远端操作:", JSON.stringify(remoteOp.ops));

    // 第一次 transform
    let transformed = localOp.transform(remoteOp, true);
    console.log("第一次 transform:", JSON.stringify(transformed.ops));

    // 第二次 transform（模拟可能的重复调用）
    transformed = localOp.transform(transformed, true);
    console.log("第二次 transform:", JSON.stringify(transformed.ops));

    // 第三次 transform
    transformed = localOp.transform(transformed, true);
    console.log("第三次 transform:", JSON.stringify(transformed.ops));

    // 检查是否会出现 retain(1) 的情况
    console.log(
      "是否包含 retain(1):",
      transformed.ops.some((op) => op.retain === 1)
    );
  });
});
