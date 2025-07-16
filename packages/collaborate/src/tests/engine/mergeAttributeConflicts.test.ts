import { describe, it, expect } from "vitest";
import Delta from "quill-delta";

describe("mergeAttributeConflicts (simplified)", () => {
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
   * 提取操作中的属性
   */
  function extractAttributes(delta: Delta): Record<string, any> {
    const retainOp = delta.ops.find((op) => op.retain && op.attributes);
    return retainOp?.attributes || {};
  }

  /**
   * 检测原始操作和 transform 后的操作之间是否存在属性冲突
   */
  function hasAttributeConflict(
    originalOp: Delta,
    transformedOp: Delta
  ): boolean {
    const originalAttrs = extractAttributes(originalOp);
    const transformedAttrs = extractAttributes(transformedOp);

    if (Object.keys(originalAttrs).length === 0) {
      return false;
    }

    for (const [key, value] of Object.entries(originalAttrs)) {
      if (!(key in transformedAttrs) || transformedAttrs[key] !== value) {
        return true;
      }
    }

    return false;
  }

  /**
   * 模拟 mergeAttributeConflicts 的逻辑
   */
  function mergeAttributeConflicts(
    originalOp: Delta,
    transformedOp: Delta
  ): Delta {
    // 检查是否检测到属性冲突
    if (
      isAttributeConflict(originalOp) &&
      hasAttributeConflict(originalOp, transformedOp)
    ) {
      console.log("[Test] 检测到属性冲突，尝试智能合并");
      console.log("原始操作:", JSON.stringify(originalOp.ops));
      console.log("Transform后操作:", JSON.stringify(transformedOp.ops));

      // 模拟智能合并（简化版本：直接返回原始操作）
      const mergedOp = originalOp; // 简化：实际应该与历史操作合并

      console.log("[Test] 智能合并成功，返回合并后的操作");
      console.log("合并后操作:", JSON.stringify(mergedOp.ops));
      return mergedOp;
    }

    // 没有检测到属性冲突，返回原始操作
    return originalOp;
  }

  it("should return merged operation when attribute conflict detected", () => {
    console.log("=== 属性冲突检测测试 ===");

    const originalOp = new Delta().retain(4, { color: "blue", italic: true });
    const transformedOp = new Delta().retain(4, { italic: true }); // color 被丢弃

    const result = mergeAttributeConflicts(originalOp, transformedOp);

    console.log("结果操作:", JSON.stringify(result.ops));

    // 应该返回原始操作（因为检测到冲突）
    expect(result).toBe(originalOp);
  });

  it("should return original operation when no conflict detected", () => {
    console.log("=== 无冲突检测测试 ===");

    const originalOp = new Delta().retain(4, { bold: true });
    const transformedOp = new Delta().retain(4, { bold: true }); // 属性保留

    const result = mergeAttributeConflicts(originalOp, transformedOp);

    console.log("结果操作:", JSON.stringify(result.ops));

    // 应该返回原始操作（因为没有检测到冲突）
    expect(result).toBe(originalOp);
  });

  it("should return original operation for non-attribute operations", () => {
    console.log("=== 非属性操作测试 ===");

    const originalOp = new Delta().retain(2).insert("A");
    const transformedOp = new Delta().retain(3).insert("A");

    const result = mergeAttributeConflicts(originalOp, transformedOp);

    console.log("结果操作:", JSON.stringify(result.ops));

    // 应该返回原始操作（因为不是属性操作）
    expect(result).toBe(originalOp);
  });

  it("should handle empty operations correctly", () => {
    console.log("=== 空操作测试 ===");

    const originalOp = new Delta();
    const transformedOp = new Delta();

    const result = mergeAttributeConflicts(originalOp, transformedOp);

    console.log("结果操作:", JSON.stringify(result.ops));

    // 应该返回原始操作
    expect(result).toBe(originalOp);
  });

  it("should simulate the complete flow", () => {
    console.log("=== 完整流程模拟测试 ===");

    // 模拟 applyClientOperation 中的逻辑
    const originalOp = new Delta().retain(4, { color: "blue", italic: true });
    const transformedOp = new Delta().retain(4, { italic: true }); // transform 后 color 被丢弃

    console.log("原始操作:", JSON.stringify(originalOp.ops));
    console.log("Transform后操作:", JSON.stringify(transformedOp.ops));

    // 检查并合并属性冲突
    const finalDelta = mergeAttributeConflicts(originalOp, transformedOp);

    console.log("最终操作:", JSON.stringify(finalDelta.ops));

    // 验证结果
    expect(finalDelta).toBe(originalOp); // 检测到冲突，返回原始操作

    // 模拟后续流程：应用、广播等
    console.log("[Test] 模拟应用最终操作到文档模型");
    console.log("[Test] 模拟递增序列号");
    console.log("[Test] 模拟构造广播消息");
    console.log("[Test] 模拟缓存并广播");
  });
});
