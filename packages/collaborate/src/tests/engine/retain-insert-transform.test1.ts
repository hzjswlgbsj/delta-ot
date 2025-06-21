/**
 * 本文件测试 Retain 操作与 Insert 操作在 transform 中的行为。
 *
 * 涉及场景包括：
 * - 插入发生在 retain 范围前、中、后
 * - retain 操作如何穿越插入操作
 *
 * ✅ 注意：Retain 应正确跳过 insert 所引入的字符长度，保持对文档后续结构的引用不变。
 */
import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - retain vs insert", () => {
  it("insert before retain", () => {
    const base = new Delta().insert("world");

    const opA = new Delta().retain(0).insert("A"); // insert A at beginning
    const opB = new Delta().retain(2).insert("X"); // insert X after "wo"

    const opBPrime = OTEngine.transform(opA, opB); // A 先，B 后
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("AwXorld"));
  });

  it("insert inside retained region", () => {
    const base = new Delta().insert("hello world");

    const opA = new Delta().retain(6).insert("X"); // insert X after "hello "
    const opB = new Delta().retain(5).insert("Y"); // insert Y after "hello"

    const opBPrime = OTEngine.transform(opA, opB); // A 先，B 后
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("helloYX world"));
  });

  it("retain completely after insert", () => {
    const base = new Delta().insert("12345");

    const opA = new Delta().retain(0).insert("A");
    const opB = new Delta().retain(5).insert("Z");

    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("A12345Z"));
  });
});
