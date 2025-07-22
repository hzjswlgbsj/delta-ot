import { describe, it, expect } from "vitest";
import Delta from "quill-delta";
import { OTEngine } from "../../engine/OTEngine";
import { getGlobalLogger } from "../../../../common/src/utils/Logger";

describe("User Analysis Verification", () => {
  it("should verify the user's analysis about retain(0) transform", () => {
    const logger = getGlobalLogger("test");

    // 基础内容："base"
    const base = new Delta().insert("base");

    // 客户端 A 的操作：在位置0插入"1"
    const opA = new Delta().retain(0).insert("1");

    // 客户端 B 的操作：在位置4插入"4"
    const opB = new Delta().retain(4).insert("4");

    logger.info("=== 验证用户分析 ===");
    logger.info("基础内容:", JSON.stringify(base.ops));
    logger.info("A的操作:", JSON.stringify(opA.ops));
    logger.info("B的操作:", JSON.stringify(opB.ops));

    // 1. A 先到达服务端，直接应用
    const afterA = base.compose(opA);
    logger.info("A到达后服务端内容:", JSON.stringify(afterA.ops));

    // 2. B 后到达服务端，需要transform
    const transformedB = OTEngine.transform(opA, opB);
    logger.info("服务端transform后的B:", JSON.stringify(transformedB.ops));

    // 3. 服务端最终内容
    const finalServer = afterA.compose(transformedB);
    logger.info("服务端最终内容:", JSON.stringify(finalServer.ops));

    // 4. 客户端B收到A的操作，需要transform
    const transformedA = OTEngine.transform(opB, opA);
    logger.info("B transform A后的结果:", JSON.stringify(transformedA.ops));

    // 验证用户的分析
    expect(finalServer.ops).toEqual([{ insert: "1base4" }]);
    expect(transformedA.ops).toEqual([{ retain: 1 }, { insert: "1" }]);

    logger.info("✅ 用户分析正确！");
  });
});
