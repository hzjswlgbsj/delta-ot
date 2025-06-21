/**
 * 本文件测试两个 Delete 操作重叠或相邻时的 transform 行为。
 *
 * 涉及场景包括：
 * - 双方删除相同区域（幂等性检验）
 * - 一端删除包含另一端删除（子区间 transform）
 * - 两端删除相邻区域（位置偏移判断）
 *
 * ✅ 注意：Delete 操作之间的 transform 应避免重复删除或遗漏字符，保证最终删除区间一致。
 */

import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - delete vs delete", () => {
  it("same delete range - result should be empty", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(1).delete(3); // 删除 bcd
    const opB = new Delta().retain(1).delete(3); // 删除 bcd

    // opB 先到，opA transform 后应成为 noop
    const opAPrime = OTEngine.transform(opB, opA);
    const final = base.compose(opB).compose(opAPrime);

    expect(final).toEqual(new Delta().insert("aef")); // 删除区间不重复删除
  });

  it("nested delete - opA deletes more", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(1).delete(4); // 删除 bcde
    const opB = new Delta().retain(2).delete(2); // 删除 cd

    // opA 先到，opB transform 后范围被 opA 覆盖，opB′ 应为空
    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("af")); // 只剩 a 和 f
  });

  it("adjacent deletes - B after A", () => {
    const base = new Delta().insert("abcdef");

    const opA = new Delta().retain(1).delete(2); // 删除 bc
    const opB = new Delta().retain(3).delete(2); // 删除 de

    // opA 删除了 2 个字符，opB 的位置应左移 2：retain(1) delete(2)
    const opBPrime = OTEngine.transform(opA, opB);
    const final = base.compose(opA).compose(opBPrime);

    expect(final).toEqual(new Delta().insert("af")); // bc 和 de 都被删除
  });
});
