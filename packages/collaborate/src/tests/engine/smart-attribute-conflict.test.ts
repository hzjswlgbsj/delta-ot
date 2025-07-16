import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { Op } from "quill-delta";

describe("Smart attribute conflict detection and merging", () => {
  /**
   * 检测操作是否包含属性冲突
   */
  function isAttributeConflict(delta: Delta): boolean {
    return delta.ops.some((op) => {
      return (
        op.retain && op.attributes && Object.keys(op.attributes).length > 0
      );
    });
  }

  /**
   * 检查两个操作是否作用于相同的文本范围
   */
  function isSameTextRange(op1: Delta, op2: Delta): boolean {
    const retain1 = op1.ops.find((op) => op.retain);
    const retain2 = op2.ops.find((op) => op.retain);
    return !!(retain1 && retain2 && retain1.retain === retain2.retain);
  }

  /**
   * 提取操作中的属性
   */
  function extractAttributes(delta: Delta): Record<string, any> {
    const retainOp = delta.ops.find((op) => op.retain && op.attributes);
    return retainOp?.attributes || {};
  }

  /**
   * 合并两个属性对象
   * 策略：不冲突的属性保留两者，冲突的属性采用先到先得（history 优先）
   */
  function mergeAttributes(
    currentAttrs: Record<string, any>,
    historyAttrs: Record<string, any>
  ): Record<string, any> {
    const merged = { ...currentAttrs };

    // 合并历史属性，冲突时历史优先
    for (const [key, value] of Object.entries(historyAttrs)) {
      if (key in merged) {
        console.log(
          `属性冲突 ${key}: 历史值=${value}, 当前值=${merged[key]}, 采用历史值`
        );
      }
      merged[key] = value; // 历史优先
    }

    return merged;
  }

  it("should detect attribute conflicts correctly", () => {
    // 测试颜色冲突
    const colorOp = new Delta().retain(4, { color: "red" });
    expect(isAttributeConflict(colorOp)).toBe(true);

    // 测试非属性操作
    const insertOp = new Delta().retain(2).insert("A");
    expect(isAttributeConflict(insertOp)).toBe(false);

    // 测试空操作
    const emptyOp = new Delta();
    expect(isAttributeConflict(emptyOp)).toBe(false);
  });

  it("should detect same text range correctly", () => {
    const op1 = new Delta().retain(4, { color: "red" });
    const op2 = new Delta().retain(4, { color: "blue" });
    const op3 = new Delta().retain(8, { color: "green" });

    expect(isSameTextRange(op1, op2)).toBe(true); // 相同范围
    expect(isSameTextRange(op1, op3)).toBe(false); // 不同范围
  });

  it("should extract attributes correctly", () => {
    const op = new Delta().retain(4, { color: "red", bold: true });
    const attrs = extractAttributes(op);

    expect(attrs.color).toBe("red");
    expect(attrs.bold).toBe(true);
  });

  it("should merge non-conflicting attributes", () => {
    const currentAttrs = { color: "red", bold: true };
    const historyAttrs = { italic: true, underline: true };

    const merged = mergeAttributes(currentAttrs, historyAttrs);

    // 所有属性都应该保留
    expect(merged.color).toBe("red");
    expect(merged.bold).toBe(true);
    expect(merged.italic).toBe(true);
    expect(merged.underline).toBe(true);
  });

  it("should handle conflicting attributes with history priority", () => {
    const currentAttrs = { color: "red", bold: true };
    const historyAttrs = { color: "blue", italic: true };

    const merged = mergeAttributes(currentAttrs, historyAttrs);

    // 冲突的属性采用历史优先
    expect(merged.color).toBe("blue"); // 历史优先
    expect(merged.bold).toBe(true); // 不冲突，保留
    expect(merged.italic).toBe(true); // 不冲突，保留
  });

  it("should simulate the complete conflict resolution scenario", () => {
    console.log("=== 完整冲突解决场景模拟 ===");

    // 用户A先设置红色和粗体
    const opA = new Delta().retain(4, { color: "red", bold: true });
    console.log("用户A操作:", JSON.stringify(opA.ops));

    // 用户B后设置蓝色和斜体（颜色冲突，斜体不冲突）
    const opB = new Delta().retain(4, { color: "blue", italic: true });
    console.log("用户B操作:", JSON.stringify(opB.ops));

    // 检查是否都是属性操作且作用于相同范围
    expect(isAttributeConflict(opA)).toBe(true);
    expect(isAttributeConflict(opB)).toBe(true);
    expect(isSameTextRange(opA, opB)).toBe(true);

    // 提取属性
    const attrsA = extractAttributes(opA);
    const attrsB = extractAttributes(opB);
    console.log("用户A属性:", attrsA);
    console.log("用户B属性:", attrsB);

    // 合并属性（A先到，所以A的属性优先）
    const mergedAttrs = mergeAttributes(attrsB, attrsA); // B的属性被A的属性覆盖
    console.log("合并后属性:", mergedAttrs);

    // 验证合并结果
    expect(mergedAttrs.color).toBe("red"); // A先到，红色保留
    expect(mergedAttrs.bold).toBe(true); // A的粗体保留
    expect(mergedAttrs.italic).toBe(true); // B的斜体保留
    expect(mergedAttrs.color).not.toBe("blue"); // B的蓝色被A的红色覆盖

    // 构造合并后的操作
    const mergedOp = new Delta().retain(4, mergedAttrs);
    console.log("合并后操作:", JSON.stringify(mergedOp.ops));

    // 验证最终操作
    expect(mergedOp.ops.length).toBe(1);
    expect(mergedOp.ops[0].retain).toBe(4);
    expect(mergedOp.ops[0].attributes).toEqual(mergedAttrs);
  });

  it("should handle pure color conflicts", () => {
    console.log("=== 纯颜色冲突测试 ===");

    // 用户A设置红色
    const opA = new Delta().retain(4, { color: "red" });

    // 用户B设置蓝色
    const opB = new Delta().retain(4, { color: "blue" });

    // 合并属性（A先到，所以A的颜色保留）
    const attrsA = extractAttributes(opA);
    const attrsB = extractAttributes(opB);
    const mergedAttrs = mergeAttributes(attrsB, attrsA);

    console.log("用户A颜色:", attrsA.color);
    console.log("用户B颜色:", attrsB.color);
    console.log("合并后颜色:", mergedAttrs.color);

    expect(mergedAttrs.color).toBe("red"); // A先到，红色保留
    expect(mergedAttrs.color).not.toBe("blue"); // B的蓝色被覆盖
  });

  it("should handle non-conflicting attributes without conflicts", () => {
    console.log("=== 非冲突属性测试 ===");

    // 用户A设置粗体
    const opA = new Delta().retain(4, { bold: true });

    // 用户B设置斜体（不冲突）
    const opB = new Delta().retain(4, { italic: true });

    // 合并属性
    const attrsA = extractAttributes(opA);
    const attrsB = extractAttributes(opB);
    const mergedAttrs = mergeAttributes(attrsB, attrsA);

    console.log("用户A属性:", attrsA);
    console.log("用户B属性:", attrsB);
    console.log("合并后属性:", mergedAttrs);

    // 验证所有属性都保留
    expect(mergedAttrs.bold).toBe(true); // A的粗体保留
    expect(mergedAttrs.italic).toBe(true); // B的斜体保留
  });
});
