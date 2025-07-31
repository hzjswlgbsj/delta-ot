// 测试用例列表 - 通过程序构造
import * as testCaseImpls from "../collab/testCases";

// 测试用例类型定义
export interface TestCase {
  name: string;
  description: string;
}

// 通过程序构造测试用例列表
const generateTestCases = (): TestCase[] => {
  const testCases: TestCase[] = [];

  // 添加简单测试用例
  testCases.push(
    { name: "simpleTest", description: "简单测试 - 单用户插入操作" },
    {
      name: "simpleTwoUserTest",
      description: "简单双用户测试 - 两个用户插入操作",
    }
  );

  // 通过分析testCaseImpls中的导出函数来生成测试用例
  const testCaseNames = Object.keys(testCaseImpls).filter(
    (key) =>
      key !== "TestCase" &&
      key !== "docId" &&
      key !== "query1" &&
      key !== "query2" &&
      key !== "query3" &&
      typeof testCaseImpls[key as keyof typeof testCaseImpls] === "object"
  );

  // 为每个测试用例生成描述
  const descriptions: Record<string, string> = {
    basicInsertConflict:
      "Case 1: 基础插入冲突 - 两个用户在相同位置插入不同字符",
    insertAtDifferentPositions: "Case 2: 不同位置插入 - 测试非冲突情况",
    concurrentDeleteAndInsert: "Case 3: 并发删除和插入 - 测试删除/插入冲突",
    formatConflict: "Case 4: 格式冲突 - 测试属性合并冲突",
    deleteConflict: "Case 5: 删除冲突 - 测试删除冲突处理",
    samePositionDeleteConflict: "Case 5.1: 相同位置删除冲突 - 测试相同位置删除",
    complexInsertConflict: "Case 6: 复杂插入冲突 - 测试复杂插入冲突",
    insertAndDeleteOverlap: "Case 7: 插入删除重叠 - 测试插入删除重叠冲突",
    formatAndContentConflict:
      "Case 8: 格式内容混合冲突 - 测试格式与内容混合冲突",
    multipleFormatConflict: "Case 9: 多属性格式冲突 - 测试多属性格式冲突",
    attributeConflictStrategy: "Case 9.1: 属性冲突策略 - 测试颜色属性冲突解决",
    sequentialOperations: "Case 10: 连续操作 - 测试操作序列的正确性",
    boundaryOperations: "Case 11: 边界操作 - 测试边界情况",
    largeTextOperations: "Case 12: 大文本操作 - 测试大文本操作的性能",
    formatRemovalConflict:
      "Case 13: 格式移除冲突 - 测试格式移除与格式设置的冲突",
    mixedOperations: "Case 14: 混合操作 - 包含插入、删除、格式设置的混合操作",
    networkLatencySimulation:
      "Case 15: 网络延迟模拟 - 测试不同延迟下的冲突解决",
    multipleUserConflict: "Case 16: 多用户冲突 - 三个用户同时操作",
    rapidSuccessiveOperations:
      "Case 17: 快速连续操作 - 测试系统在高频操作下的稳定性 (修复版)",
    rapidSuccessiveOperationsAdvanced:
      "Case 17.5: 高级快速连续操作 - 更复杂的OT算法稳定性测试",
    extremeRapidSuccessiveOperations:
      "Case 17.6: 极端快速连续操作 - 强制制造相同位置冲突测试",
    complexFormatMerging: "Case 18: 复杂格式合并 - 测试多个格式属性的正确合并",
    partialFormatConflict:
      "Case 19: 部分格式冲突 - 测试重叠但不完全相同的格式范围",
    insertWithFormatConflict:
      "Case 20: 插入带格式冲突 - 插入带格式的文本与格式设置的冲突",
    deleteAcrossFormattedText:
      "Case 21: 删除跨越格式文本 - 删除跨越格式文本的操作",
    retainZeroEdgeCases:
      "Case 22: retain(0)边界情况 - 测试retain(0)的各种边界情况",
    emptyDocumentOperations: "Case 23: 空文档操作 - 空文档上的各种操作测试",
    longTextWithFormatting: "Case 24: 长文本格式操作 - 长文本与格式的混合操作",
    formatRemovalAndAddition:
      "Case 25: 格式移除与添加 - 格式移除与添加的冲突测试",
    stressTest: "Case 26: 压力测试 - 大量并发操作",
    realWorldScenario: "Case 27: 真实世界场景 - 模拟真实世界的编辑场景",
    edgeCaseOperations: "Case 28: 边界情况操作 - 各种边界情况的测试",
    formatInheritanceTest: "Case 29: 格式继承测试 - 测试格式继承和传播",
    concurrentFormatRemoval: "Case 30: 并发格式移除 - 并发格式移除测试",
  };

  // 添加所有测试用例
  testCaseNames.forEach((name) => {
    const description = descriptions[name] || `Case ${name}: 测试用例`;
    testCases.push({ name, description });
  });

  return testCases;
};

// 导出生成的测试用例列表
export const testCases = generateTestCases();

// 导出默认测试用例
export default testCases;
