/**
 * 场景说明：insert vs insert 操作在相同位置的 transform 行为
 *
 * 涉及场景包括：
 * - 模拟同位置插入字符时，根据先后顺序进行 transform
 * - A 插入 "A"，B 插入 "B"，当 A 先到，B 后到应 transform
 *
 * ✅ 强调：transform 是单纯的位移逻辑，优先级控制应由上层业务判断谁先谁后。
 */
import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";

describe("OTEngine.transform - insert vs delete", () => {
  it("insert before delete: no conflict", () => {
    const base = new Delta().insert("hello");
    const opInsert = new Delta().retain(0).insert("A"); // 插入在最前
    const opDelete = new Delta().retain(1).delete(1); // 删除 'e'

    const opDeletePrime = OTEngine.transform(opInsert, opDelete);
    const final = base.compose(opInsert).compose(opDeletePrime);

    expect(final).toEqual(new Delta().insert("Ahllo"));
  });

  it("insert inside delete: insert should be removed", () => {
    const base = new Delta().insert("hello");
    const opInsert = new Delta().retain(1).insert("A"); // 插入在 'h' 和 'e' 之间
    const opDelete = new Delta().retain(1).delete(2); // 删除 "el"

    const opDeletePrime = OTEngine.transform(opInsert, opDelete); // 让 delete 适配插入后的文档
    const final = base.compose(opInsert).compose(opDeletePrime);

    expect(final).toEqual(new Delta().insert("hAlo")); // 删除生效，结果保留插入 A
  });

  it("insert after delete: retain adjusted", () => {
    const base = new Delta().insert("hello");
    const opInsert = new Delta().retain(4).insert("A"); // 插入在 'l' 之后，'hellAo'
    const opDelete = new Delta().retain(1).delete(2); // 删除 "el"，'hlAo'

    const opDeletePrime = OTEngine.transform(opInsert, opDelete);
    const final = base.compose(opInsert).compose(opDeletePrime);

    expect(final).toEqual(new Delta().insert("hlAo")); // 插入位置向前移
  });
});
