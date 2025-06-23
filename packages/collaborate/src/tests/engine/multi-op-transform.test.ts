/**
 * 本文件测试多个连续 Delta 操作组合下的 transform 行为（多段复合）。
 *
 * 涉及场景包括：
 * - Insert + Retain / Delete 混合操作组合 transform
 * - 多段操作组合如何影响 transform 的位移计算
 *
 * ✅ 建议通过组合 Delta 模拟真实文档编辑路径，验证 transform 的整体一致性与可组合性。
 */
import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - multi-op complex combinations", () => {
  it("insert + delete vs insert", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(1).insert("X").delete(2); // aXdef
    const opB = new Delta().retain(2).insert("Y"); // insert Y after X

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("aXYdef")); // 直接验证最终文本结构
  });

  it("retain + delete vs insert + retain", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).delete(2); // delete "cd" → "abef"
    const opB = new Delta().insert("X").retain(4); // Xabcdef

    const opAPrime = OTEngine.transform(opB, opA);
    const final = base.compose(opB).compose(opAPrime);

    expect(final).toEqual(new Delta().insert("Xabef")); // 最终应为 "Xabef"
  });

  it("insert + delete vs delete - insert 被删掉", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).insert("X").delete(2); // abXef
    const opB = new Delta().retain(2).delete(3); // 删除 "cde"

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abXf")); // "X" 被 opB 删除覆盖
  });

  it("insert before delete - delete 不受影响", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).insert("X"); // abXcdef
    const opB = new Delta().retain(4).delete(2); // 删除 "ef"

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abXcd")); // "ef" 被删，"X" 保留
  });

  it("insert + retain + insert vs insert", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(1).insert("X").retain(2).insert("Y"); // aXbcYdef
    const opB = new Delta().retain(4).insert("Z"); // 在 d 之后插入 Z

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("aXbcYdZef"));
  });

  it("retain + delete vs retain + insert", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).delete(2); // abef
    const opB = new Delta().retain(3).insert("X"); // abcXdef

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abXef")); // "c" 被删，"X" 插在原 "d" 后
  });

  it("delete + insert vs delete + insert - conflict insert", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).delete(2).insert("X"); // abXef
    const opB = new Delta().retain(2).delete(2).insert("Y"); // abYef

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    // 顺序是 A 先插 X，B 后插 Y（按 transform 规则应 Y 在 X 后）
    expect(final).toEqual(new Delta().insert("abXYef"));
  });

  it("insert with formatting vs delete - formatting retained", () => {
    const base = new Delta().insert("abc");

    const opA = new Delta().retain(1).insert("X", { bold: true }); // aXbc
    const opB = new Delta().retain(1).delete(2); // 删除 "bc"

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("a").insert("X", { bold: true }));
  });

  it("insert + delete vs retain + insert - shift across delete", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).insert("X").delete(2); // abXef
    const opB = new Delta().retain(4).insert("Y"); // 想插入在原来的 e 后

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abXYef")); // 插入点需根据 delete 向左偏移
  });

  it("insert + delete vs retain + insert - shift across delete", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).insert("X").delete(2); // abXef
    const opB = new Delta().retain(4).insert("Y"); // 插入在原来的 e 后

    const opBPrime = OTEngine.transform(opA, opB); // 修正为 retain(3).insert("Y")
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abXYef")); // ✅ 正确结果
  });

  it("insert + delete vs retain + insert - shift across delete", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(2).insert("X").delete(2); // abXef
    const opB = new Delta().retain(4).insert("Y"); // 插入在原来的 e 后

    const opBPrime = OTEngine.transform(opA, opB); // 应变成 retain(3).insert("Y")
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("abXYef")); // ✅ 正确断言
  });
});
