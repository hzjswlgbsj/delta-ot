import Delta from "quill-delta";

/**
 * 属性冲突解决工具类
 *
 * 用于检测和合并 Quill-delta 操作中的属性冲突，服务端和客户端都可复用。
 *
 * 为什么需要这个工具类？
 * Quill Delta 的 transform 方法在处理属性冲突时，如果遇到相同属性，
 * 会根据 transform 的参数决定优先级，但实际协同场景下，网络顺序不可控，
 * 不能简单依赖 transform 的参数来保证一致性。
 *
 * 典型场景：
 * 当前文档内容：[{"insert": "base"}]
 * 客户端A操作：[{"retain": 4, "attributes": {"bold": true, "color": "red"}}]
 * 客户端B操作：[{"retain": 4, "attributes": {"italic": true, "color": "blue"}}]
 *
 * 如果没有冲突解决：
 * - A先到，B后到：A最终内容 [{"retain": 4, "attributes": {"bold": true, "italic": true, "color": "red"}}]
 *   B最终内容 [{"retain": 4, "attributes": {"bold": true, "italic": true}}]（B的color丢失）
 * - B先到，A后到：同理，A会丢失部分属性
 * - 这样会导致不同客户端看到的内容不一致
 *
 * 解决方案：
 * 通过本工具类，服务端和客户端都可采用统一的冲突合并策略。
 * 策略可选：
 *   - preferCurrent=false（默认，先到优先）：谁先到保留谁
 *   - preferCurrent=true（后到优先）：谁后到保留谁
 * 推荐后到优先，更符合用户直觉。
 *
 * 使用后到优先策略：
 * - 无论A先到还是B先到，最终所有客户端内容都为：
 *   [{"retain": 4, "attributes": {"bold": true, "italic": true, "color": "blue"}}]（后到的color覆盖）
 *
 * 你可以通过 mergeAttributeConflicts 的 preferCurrent 参数切换策略。
 */
export class AttributeConflictResolver {
  /**
   * 检测操作是否包含属性冲突
   */
  static isAttributeConflict(delta: Delta): boolean {
    return delta.ops.some((op) => {
      return (
        op.retain && op.attributes && Object.keys(op.attributes).length > 0
      );
    });
  }

  /**
   * 检测原始操作和 transform 后的操作之间是否存在属性冲突
   */
  static hasAttributeConflict(
    originalOp: Delta,
    transformedOp: Delta
  ): boolean {
    const originalAttrs = this.extractAttributes(originalOp);
    const transformedAttrs = this.extractAttributes(transformedOp);

    if (Object.keys(originalAttrs).length === 0) {
      return false;
    }

    const hasConflict = Object.entries(originalAttrs).some(([key, value]) => {
      if (!(key in transformedAttrs) || transformedAttrs[key] !== value) {
        console.log(
          `[AttributeConflictResolver] 检测到属性冲突: ${key}=${value} 在 transform 后丢失或改变`
        );
        return true;
      }
      return false;
    });

    return hasConflict;
  }

  /**
   * 提取操作中的属性
   */
  static extractAttributes(delta: Delta): Record<string, any> {
    const retainOp = delta.ops.find((op) => op.retain && op.attributes);
    return retainOp?.attributes || {};
  }

  /**
   * 检查两个操作是否作用于相同的文本范围
   */
  static isSameTextRange(op1: Delta, op2: Delta): boolean {
    // 简化实现：检查是否都有相同长度的 retain 操作
    const retain1 = op1.ops.find((op) => op.retain);
    const retain2 = op2.ops.find((op) => op.retain);

    return !!(retain1 && retain2 && retain1.retain === retain2.retain);
  }

  /**
   * 合并两个属性对象
   *
   * @param currentAttrs 当前属性
   * @param historyAttrs 历史属性
   * @param preferCurrent 是否后到优先，true 表示后到优先，false 表示先到优先
   * @returns 合并后的属性
   */
  static mergeAttributes(
    currentAttrs: Record<string, any>,
    historyAttrs: Record<string, any>,
    preferCurrent: boolean = false
  ): Record<string, any> | null {
    const merged = { ...currentAttrs };

    if (!preferCurrent) {
      // 先到优先（历史优先）
      Object.entries(historyAttrs).forEach(([key, value]) => {
        if (key in merged) {
          console.log(
            `[AttributeConflictResolver] 属性冲突 ${key}: 历史值=${value}, 当前值=${merged[key]}, 采用历史值`
          );
        }
        merged[key] = value; // 历史优先
      });
    } else {
      // 后到优先（当前优先）
      Object.entries(historyAttrs).forEach(([key, value]) => {
        if (!(key in merged)) {
          merged[key] = value; // 只添加不冲突的属性
        } else {
          console.log(
            `[AttributeConflictResolver] 属性冲突 ${key}: 历史值=${value}, 当前值=${merged[key]}, 采用当前值`
          );
        }
      });
    }

    return merged;
  }

  /**
   * 构造合并后的操作
   */
  static constructMergedOperation(
    originalOp: Delta,
    mergedAttributes: Record<string, any>
  ): Delta {
    const newOps = originalOp.ops.map((op) => {
      if (op.retain && op.attributes) {
        return { ...op, attributes: mergedAttributes };
      }
      return op;
    });

    return new Delta(newOps);
  }

  /**
   * 合并属性冲突
   *
   * @param originalOp 原始操作
   * @param transformedOp transform 后的操作
   * @param historyOps 历史操作列表（用于查找相同范围的操作）
   * @param preferCurrent 是否后到优先，true 表示后到优先，false 表示先到优先
   * @returns 处理后的操作（合并后的操作或原始操作）
   */
  static mergeAttributeConflicts(
    originalOp: Delta,
    transformedOp: Delta,
    historyOps: Array<{ data: Delta }> = [],
    preferCurrent: boolean = false
  ): Delta {
    // 检查是否检测到属性冲突
    if (
      this.isAttributeConflict(originalOp) &&
      this.hasAttributeConflict(originalOp, transformedOp)
    ) {
      console.log("[AttributeConflictResolver] 检测到属性冲突，尝试智能合并");
      console.log("原始操作:", JSON.stringify(originalOp.ops));
      console.log("Transform后操作:", JSON.stringify(transformedOp.ops));

      // 尝试与历史操作合并属性
      const mergedOp = this.mergeAttributeConflictsWithHistory(
        originalOp,
        historyOps,
        preferCurrent
      );

      if (mergedOp) {
        console.log(
          "[AttributeConflictResolver] 智能合并成功，返回合并后的操作"
        );
        console.log("合并后操作:", JSON.stringify(mergedOp.ops));
        return mergedOp;
      } else {
        console.log("[AttributeConflictResolver] 智能合并失败，返回原始操作");
        return originalOp;
      }
    }

    // 没有检测到属性冲突，返回原始操作
    return originalOp;
  }

  /**
   * 与历史操作合并属性冲突
   */
  private static mergeAttributeConflictsWithHistory(
    currentOp: Delta,
    historyOps: Array<{ data: Delta }>,
    preferCurrent: boolean = false
  ): Delta | null {
    // 从最新到最旧遍历历史操作
    const reversedHistoryOps = [...historyOps].reverse();

    const mergedOp = reversedHistoryOps.reduce<Delta | null>(
      (result, historyOp) => {
        if (result) return result; // 如果已经找到结果，直接返回

        const historyDelta = new Delta(historyOp.data);

        // 检查是否作用于相同文本范围
        if (this.isSameTextRange(currentOp, historyDelta)) {
          // 检查是否都是属性操作
          if (this.isAttributeConflict(historyDelta)) {
            console.log(
              "[AttributeConflictResolver] 找到相同范围的属性操作，尝试合并"
            );

            // 合并属性
            const mergedAttributes = this.mergeAttributes(
              this.extractAttributes(currentOp),
              this.extractAttributes(historyDelta),
              preferCurrent
            );

            if (mergedAttributes) {
              // 构造合并后的操作
              const mergedOp = this.constructMergedOperation(
                currentOp,
                mergedAttributes
              );
              console.log(
                "[AttributeConflictResolver] 合并结果:",
                JSON.stringify(mergedOp.ops)
              );
              return mergedOp;
            }
          }
        }

        return null;
      },
      null
    );

    return mergedOp;
  }
}
