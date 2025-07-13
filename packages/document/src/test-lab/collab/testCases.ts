import { Op } from "quill-delta";

export interface TestCase {
  /**
   * 要注入的操作（quill-delta 的 Op 格式）
   */
  ops: Op[];

  /**
   * 模拟的用户 ID（应与登录用户一致）
   */
  userId: string;

  /**
   * 操作延迟触发时间（用于同时发起以制造冲突）
   */
  delay: number;

  /**
   * 用例描述，便于界面上展示和调试时识别
   */
  description?: string;
}

/**
 * 测试用的文档 ID
 */
export const docId = "9089d075-6604-41f6-a4fa-4d466c60f4c4";

export const query1 = new URLSearchParams({
  loginName: "sixty",
  pwd: "000000",
  docId: docId,
}).toString();

export const query2 = new URLSearchParams({
  loginName: "wangwu",
  pwd: "000000",
  docId: docId,
}).toString();

/**
 * Case 1: basicInsertConflict
 * 描述：两个用户在第 0 个位置同时插入不同字符，测试插入顺序与冲突解决
 */
export const basicInsertConflict: TestCase[] = [
  {
    description: "用户 A 在位置 0 插入 A",
    ops: [{ retain: 0 }, { insert: "A" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在位置 0 插入 B",
    ops: [{ retain: 0 }, { insert: "B" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 2: insertAtDifferentPositions
 * 描述：两个用户分别在文档不同位置插入字符，测试非冲突情况是否正常合并
 */
export const insertAtDifferentPositions: TestCase[] = [
  {
    description: "用户 A 在文档开始插入 '1'",
    ops: [{ retain: 0 }, { insert: "1" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在文档末尾插入 '4'",
    ops: [{ retain: 4 }, { insert: "4" }], // retain 设置为大于当前长度，测试尾部追加
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 3: concurrentDeleteAndInsert
 * 描述：一个用户在位置 1 插入字符，另一个用户在该位置删除字符，测试删除/插入冲突
 */
export const concurrentDeleteAndInsert: TestCase[] = [
  {
    description: "用户 A 删除第 1 个字符",
    ops: [{ retain: 1 }, { delete: 1 }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在第 1 个字符前插入 'X'",
    ops: [{ retain: 1 }, { insert: "X" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 4: formatConflict
 * 描述：两个用户对相同文本范围设置不同格式，测试属性合并冲突（如 bold vs italic）
 */
export const formatConflict: TestCase[] = [
  {
    description: "用户 A 设置第 0-5 字符为 bold",
    ops: [{ retain: 0 }, { retain: 5, attributes: { bold: true } }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 设置第 0-5 字符为 italic",
    ops: [{ retain: 0 }, { retain: 5, attributes: { italic: true } }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];
