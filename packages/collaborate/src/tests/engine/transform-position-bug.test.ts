import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("Transform position calculation bug", () => {
  it("should not transform insert at position 0 when local insert is at position 4", () => {
    // 本地操作：在位置4插入"4"
    const localOp = new Delta().retain(4).insert("4");

    // 远端操作：在位置0插入"1"
    const remoteOp = new Delta().retain(0).insert("1");

    console.log("本地操作:", JSON.stringify(localOp.ops));
    console.log("远端操作:", JSON.stringify(remoteOp.ops));

    // 远端操作被本地操作 transform
    const transformed = OTEngine.transform(localOp, remoteOp);
    console.log("transform结果:", JSON.stringify(transformed.ops));

    // 期望：远端操作不应该被改变，因为位置0的插入不受位置4插入的影响
    expect(transformed.ops).toEqual(remoteOp.ops);
  });

  it("should correctly transform when positions overlap", () => {
    // 本地操作：在位置0插入"4"
    const localOp = new Delta().retain(0).insert("4");

    // 远端操作：在位置0插入"1"
    const remoteOp = new Delta().retain(0).insert("1");

    console.log("本地操作:", JSON.stringify(localOp.ops));
    console.log("远端操作:", JSON.stringify(remoteOp.ops));

    // 远端操作被本地操作 transform
    const transformed = OTEngine.transform(localOp, remoteOp);
    console.log("transform结果:", JSON.stringify(transformed.ops));

    // 期望：远端操作应该被调整为在位置1插入
    expect(transformed.ops).toEqual([{ retain: 1 }, { insert: "1" }]);
  });

  it("should correctly transform when remote insert is after local insert", () => {
    // 本地操作：在位置0插入"4"
    const localOp = new Delta().retain(0).insert("4");

    // 远端操作：在位置1插入"1"
    const remoteOp = new Delta().retain(1).insert("1");

    console.log("本地操作:", JSON.stringify(localOp.ops));
    console.log("远端操作:", JSON.stringify(remoteOp.ops));

    // 远端操作被本地操作 transform
    const transformed = OTEngine.transform(localOp, remoteOp);
    console.log("transform结果:", JSON.stringify(transformed.ops));

    // 期望：远端操作应该被调整为在位置2插入
    expect(transformed.ops).toEqual([{ retain: 2 }, { insert: "1" }]);
  });
});
