import Delta from "quill-delta";

/**
 * OTSide（操作方，"left" / "right"）在 Operational Transformation（OT） 中是一个非常关键的概念，
 * 它直接关系到冲突操作的优先级选择，用于解决 同一位置的操作冲突时，谁先保留、谁让步。
 */
export type OTSide = "left" | "right";

export class OTEngine {
  /**
   * Transform op2 against op1，得到 op2 在 op1 已应用之后的版本。
   * 默认后来的操作优先：若有冲突，op2 的效果会保留。
   *
   * @param op1 先到达并已应用的操作
   * @param op2 后到达、需要被 transform 的操作
   * @param priority 优先级控制，true 表示 op1 优先（默认），false 表示 op2 优先
   * @returns Delta 表示被转换后的 op2
   *
   * @example
   * const base = new Delta().insert("hello");
   * const opA = new Delta().retain(0).insert("A");
   * const opB = new Delta().retain(0).insert("B");
   * const B′ = OTEngine.transform(opA, opB, false); // B 后到，优先级更高
   * const final = base.compose(opA).compose(B′); // => "BAhello"
   */
  static transform(op1: Delta, op2: Delta, priority: boolean = true): Delta {
    console.log(
      "[OTEngine] transform: ",
      JSON.stringify(op1),
      JSON.stringify(op2),
      `priority: ${priority}`
    );
    const transformed = op1.transform(op2, priority); // 使用传入的优先级参数
    console.log(`[OTEngine] transformed: ${JSON.stringify(transformed)}`);
    return transformed;
  }
  /**
   * compose：将两个操作合并为一个（顺序执行）
   */
  static compose(op1: Delta, op2: Delta): Delta {
    return op1.compose(op2);
  }

  /**
   * apply：将操作应用到当前内容，得到新内容
   */
  static apply(base: Delta, op: Delta): Delta {
    return base.compose(op);
  }
}
