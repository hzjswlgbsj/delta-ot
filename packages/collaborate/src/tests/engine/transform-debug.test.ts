import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("Transform debug", () => {
  it("should debug the exact scenario from logs", () => {
    // 本地操作：在位置4插入"4"
    const localOp = new Delta().retain(4).insert("4");

    // 远端操作：在位置0插入"1" (注意这里有retain(0))
    const remoteOp = new Delta().retain(0).insert("1");

    console.log("=== 详细调试 ===");
    console.log("本地操作:", JSON.stringify(localOp.ops));
    console.log("远端操作:", JSON.stringify(remoteOp.ops));

    // 直接调用 quill-delta 的 transform
    const rawTransform = localOp.transform(remoteOp, true);
    console.log("quill-delta transform结果:", JSON.stringify(rawTransform.ops));

    // 通过我们的 OTEngine
    const engineTransform = OTEngine.transform(localOp, remoteOp);
    console.log("OTEngine transform结果:", JSON.stringify(engineTransform.ops));

    // 验证两个结果是否一致
    expect(rawTransform.ops).toEqual(engineTransform.ops);

    // 验证最终结果
    const base = new Delta().insert("base");
    const afterLocal = base.compose(localOp);
    const final = afterLocal.compose(engineTransform);

    console.log("基础内容:", JSON.stringify(base.ops));
    console.log("本地操作后:", JSON.stringify(afterLocal.ops));
    console.log("最终结果:", JSON.stringify(final.ops));

    // 期望最终结果是 "1base4"
    expect(final.ops).toEqual([{ insert: "1base4" }]);
  });
});
