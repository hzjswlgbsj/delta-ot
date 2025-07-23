import { TestCase } from "./testCases";

/**
 * 简单测试用例 - 用于验证基本功能
 */
export const simpleTest: TestCase[] = [
  {
    description: "用户 A 插入 'A'",
    ops: [{ retain: 0 }, { insert: "A" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 1000,
  },
];

/**
 * 双用户简单测试
 */
export const simpleTwoUserTest: TestCase[] = [
  {
    description: "用户 A 插入 'A'",
    ops: [{ retain: 0 }, { insert: "A" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 1000,
  },
  {
    description: "用户 B 插入 'B'",
    ops: [{ retain: 0 }, { insert: "B" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 1500,
  },
];
