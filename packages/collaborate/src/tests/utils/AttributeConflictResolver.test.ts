import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { AttributeConflictResolver } from "../../utils/AttributeConflictResolver";

describe("AttributeConflictResolver", () => {
  it("should detect attribute conflicts correctly", () => {
    console.log("=== 属性冲突检测测试 ===");

    const originalOp = new Delta().retain(4, { color: "blue", italic: true });
    const transformedOp = new Delta().retain(4, { italic: true }); // color 被丢弃

    const hasConflict = AttributeConflictResolver.hasAttributeConflict(
      originalOp,
      transformedOp
    );

    console.log("原始操作:", JSON.stringify(originalOp.ops));
    console.log("Transform后操作:", JSON.stringify(transformedOp.ops));
    console.log("是否检测到冲突:", hasConflict);

    expect(hasConflict).toBe(true);
  });

  it("should not detect conflicts when no attributes are lost", () => {
    console.log("=== 无冲突检测测试 ===");

    const originalOp = new Delta().retain(4, { bold: true });
    const transformedOp = new Delta().retain(4, { bold: true }); // 属性保留

    const hasConflict = AttributeConflictResolver.hasAttributeConflict(
      originalOp,
      transformedOp
    );

    console.log("原始操作:", JSON.stringify(originalOp.ops));
    console.log("Transform后操作:", JSON.stringify(transformedOp.ops));
    console.log("是否检测到冲突:", hasConflict);

    expect(hasConflict).toBe(false);
  });

  it("should merge attributes with history priority", () => {
    const currentAttrs = { color: "blue", bold: true };
    const historyAttrs = { color: "red", italic: true };
    // 历史优先：color 应该采用历史值 'red'，bold 和 italic 都保留
    const merged = AttributeConflictResolver.mergeAttributes(
      currentAttrs,
      historyAttrs,
      false
    );
    expect(merged).toEqual({ color: "red", bold: true, italic: true });
    // 后到优先：color 应该采用当前值 'blue'，bold 和 italic 都保留
    const mergedCurrent = AttributeConflictResolver.mergeAttributes(
      currentAttrs,
      historyAttrs,
      true
    );
    expect(mergedCurrent).toEqual({ color: "blue", bold: true, italic: true });
  });

  it("should merge attribute conflicts with history operations", () => {
    const currentOp = new Delta().retain(4, { color: "blue", italic: true });
    const transformedOp = new Delta().retain(4, { italic: true });
    const historyOps = [
      { data: new Delta().retain(4, { color: "red", bold: true }) },
    ];
    // 历史优先
    const mergedOp = AttributeConflictResolver.mergeAttributeConflicts(
      currentOp,
      transformedOp,
      historyOps,
      false
    );
    const expectedAttrs = { color: "red", italic: true, bold: true };
    const retainOp = mergedOp.ops.find((op) => op.retain && op.attributes);
    expect(retainOp?.attributes).toEqual(expectedAttrs);
    // 后到优先
    const mergedOpCurrent = AttributeConflictResolver.mergeAttributeConflicts(
      currentOp,
      transformedOp,
      historyOps,
      true
    );
    const expectedAttrsCurrent = { color: "blue", italic: true, bold: true };
    const retainOpCurrent = mergedOpCurrent.ops.find(
      (op) => op.retain && op.attributes
    );
    expect(retainOpCurrent?.attributes).toEqual(expectedAttrsCurrent);
  });

  it("should return original operation when no conflicts detected", () => {
    console.log("=== 无冲突时返回原始操作测试 ===");

    const originalOp = new Delta().retain(4, { bold: true });
    const transformedOp = new Delta().retain(4, { bold: true }); // 属性保留

    const mergedOp = AttributeConflictResolver.mergeAttributeConflicts(
      originalOp,
      transformedOp,
      []
    );

    console.log("原始操作:", JSON.stringify(originalOp.ops));
    console.log("Transform后操作:", JSON.stringify(transformedOp.ops));
    console.log("合并后操作:", JSON.stringify(mergedOp.ops));

    // 应该返回原始操作
    expect(mergedOp).toBe(originalOp);
  });

  it("should handle empty operations correctly", () => {
    console.log("=== 空操作处理测试 ===");

    const originalOp = new Delta();
    const transformedOp = new Delta();

    const hasConflict = AttributeConflictResolver.hasAttributeConflict(
      originalOp,
      transformedOp
    );
    const isAttributeConflict =
      AttributeConflictResolver.isAttributeConflict(originalOp);

    console.log("原始操作:", JSON.stringify(originalOp.ops));
    console.log("Transform后操作:", JSON.stringify(transformedOp.ops));
    console.log("是否包含属性冲突:", isAttributeConflict);
    console.log("是否检测到冲突:", hasConflict);

    expect(isAttributeConflict).toBe(false);
    expect(hasConflict).toBe(false);
  });

  it("should check same text range correctly", () => {
    console.log("=== 相同文本范围检测测试 ===");

    const op1 = new Delta().retain(4, { color: "red" });
    const op2 = new Delta().retain(4, { color: "blue" });
    const op3 = new Delta().retain(5, { color: "green" });

    const sameRange1 = AttributeConflictResolver.isSameTextRange(op1, op2);
    const sameRange2 = AttributeConflictResolver.isSameTextRange(op1, op3);

    console.log("操作1:", JSON.stringify(op1.ops));
    console.log("操作2:", JSON.stringify(op2.ops));
    console.log("操作3:", JSON.stringify(op3.ops));
    console.log("操作1和操作2相同范围:", sameRange1);
    console.log("操作1和操作3相同范围:", sameRange2);

    expect(sameRange1).toBe(true);
    expect(sameRange2).toBe(false);
  });
});
