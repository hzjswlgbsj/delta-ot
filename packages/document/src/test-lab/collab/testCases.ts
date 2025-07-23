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
  clientId: "1", // 第一个客户端使用蓝色
}).toString();

export const query2 = new URLSearchParams({
  loginName: "wangwu",
  pwd: "000000",
  docId: docId,
  clientId: "2", // 第二个客户端使用绿色
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

/**
 * Case 5: deleteConflict
 * 描述：两个用户同时删除不同位置的字符，测试删除冲突处理
 */
export const deleteConflict: TestCase[] = [
  {
    description: "用户 A 删除第 0 个字符",
    ops: [{ retain: 0 }, { delete: 1 }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 删除第 1 个字符",
    ops: [{ retain: 1 }, { delete: 1 }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 5.1: samePositionDeleteConflict
 * 描述：两个用户同时删除相同位置的字符，测试相同位置删除冲突
 * 预期：基础文档 "base"，用户A删除位置1的'a'，用户B删除位置1的'a'
 * 结果：应该是 "bse"（只删除一个'a'）
 */
export const samePositionDeleteConflict: TestCase[] = [
  {
    description: "用户 A 删除第 1 个字符 'a'",
    ops: [{ retain: 1 }, { delete: 1 }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 删除第 1 个字符 'a'",
    ops: [{ retain: 1 }, { delete: 1 }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 6: complexInsertConflict
 * 描述：两个用户在相邻位置插入文本，测试复杂插入冲突
 */
export const complexInsertConflict: TestCase[] = [
  {
    description: "用户 A 在位置 1 插入 'Hello'",
    ops: [{ retain: 1 }, { insert: "Hello" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在位置 2 插入 'World'",
    ops: [{ retain: 2 }, { insert: "World" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 7: insertAndDeleteOverlap
 * 描述：一个用户插入文本，另一个用户删除重叠区域，测试插入删除重叠冲突
 */
export const insertAndDeleteOverlap: TestCase[] = [
  {
    description: "用户 A 在位置 1 插入 'Test'",
    ops: [{ retain: 1 }, { insert: "Test" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 删除位置 0-3 的字符",
    ops: [{ retain: 0 }, { delete: 3 }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 8: formatAndContentConflict
 * 描述：一个用户设置格式，另一个用户修改内容，测试格式与内容混合冲突
 */
export const formatAndContentConflict: TestCase[] = [
  {
    description: "用户 A 设置第 0-4 字符为 bold",
    ops: [{ retain: 0 }, { retain: 4, attributes: { bold: true } }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在位置 2 插入 'New'",
    ops: [{ retain: 2 }, { insert: "New" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 9: multipleFormatConflict
 * 描述：两个用户对相同文本设置不同格式属性，测试多属性格式冲突
 * 注意：color 属性会冲突，通常后到达的操作会覆盖先到达的操作
 * 预期结果：bold + italic + 后到达的颜色（取决于网络延迟）
 */
export const multipleFormatConflict: TestCase[] = [
  {
    description: "用户 A 设置第 0-4 字符为 bold 和 red",
    ops: [
      { retain: 0 },
      { retain: 4, attributes: { bold: true, color: "red" } },
    ],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 设置第 0-4 字符为 italic 和 blue",
    ops: [
      { retain: 0 },
      { retain: 4, attributes: { italic: true, color: "blue" } },
    ],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 9.1: attributeConflictStrategy
 * 描述：专门测试属性冲突解决策略
 * 用户 A 先设置红色，用户 B 后设置蓝色，测试颜色属性的冲突解决
 * 预期：最终颜色应该是蓝色（后到达的操作覆盖先到达的）
 */
export const attributeConflictStrategy: TestCase[] = [
  {
    description: "用户 A 先设置红色（延迟较小）",
    ops: [{ retain: 0 }, { retain: 4, attributes: { color: "red" } }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 100,
  },
  {
    description: "用户 B 后设置蓝色（延迟较大）",
    ops: [{ retain: 0 }, { retain: 4, attributes: { color: "blue" } }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 600,
  },
];

/**
 * Case 10: sequentialOperations
 * 描述：两个用户进行连续操作，测试操作序列的正确性
 */
export const sequentialOperations: TestCase[] = [
  {
    description: "用户 A 在位置 0 插入 'First'",
    ops: [{ retain: 0 }, { insert: "First" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 100,
  },
  {
    description: "用户 A 在位置 5 插入 'Second'",
    ops: [{ retain: 5 }, { insert: "Second" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 200,
  },
  {
    description: "用户 B 在位置 0 插入 'Third'",
    ops: [{ retain: 0 }, { insert: "Third" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 150,
  },
];

/**
 * Case 11: boundaryOperations
 * 描述：测试边界情况，如空文档、单字符文档的操作
 */
export const boundaryOperations: TestCase[] = [
  {
    description: "用户 A 在空文档插入 'A'",
    ops: [{ insert: "A" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在空文档插入 'B'",
    ops: [{ insert: "B" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 12: largeTextOperations
 * 描述：测试大文本操作的性能和处理
 */
export const largeTextOperations: TestCase[] = [
  {
    description: "用户 A 插入大段文本",
    ops: [
      { retain: 0 },
      {
        insert:
          "This is a very long text that tests the system's ability to handle large operations. ",
      },
    ],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在大文本中间插入内容",
    ops: [{ retain: 25 }, { insert: "INSERTED " }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 13: formatRemovalConflict
 * 描述：测试格式移除与格式设置的冲突
 */
export const formatRemovalConflict: TestCase[] = [
  {
    description: "用户 A 移除第 0-4 字符的 bold 格式",
    ops: [{ retain: 0 }, { retain: 4, attributes: { bold: null } }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 设置第 0-4 字符为 bold",
    ops: [{ retain: 0 }, { retain: 4, attributes: { bold: true } }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 14: mixedOperations
 * 描述：混合操作测试，包含插入、删除、格式设置
 */
export const mixedOperations: TestCase[] = [
  {
    description: "用户 A 插入文本并设置格式",
    ops: [{ retain: 0 }, { insert: "Mixed", attributes: { bold: true } }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 删除部分内容并插入新内容",
    ops: [{ retain: 1 }, { delete: 2 }, { insert: "New" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 15: networkLatencySimulation
 * 描述：模拟网络延迟场景，测试不同延迟下的冲突解决
 * 场景：用户A操作延迟100ms，用户B操作延迟800ms，测试后到操作优先级
 */
export const networkLatencySimulation: TestCase[] = [
  {
    description: "用户 A 在位置 0 插入 'A'（延迟100ms）",
    ops: [{ retain: 0 }, { insert: "A" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 100,
  },
  {
    description: "用户 B 在位置 0 插入 'B'（延迟800ms，后到但优先级高）",
    ops: [{ retain: 0 }, { insert: "B" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 800,
  },
];

/**
 * Case 16: multipleUserConflict
 * 描述：三个用户同时操作，测试多用户冲突解决
 */
export const multipleUserConflict: TestCase[] = [
  {
    description: "用户 A 在位置 0 插入 'A'",
    ops: [{ retain: 0 }, { insert: "A" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在位置 0 插入 'B'",
    ops: [{ retain: 0 }, { insert: "B" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
  {
    description: "用户 C 在位置 0 插入 'C'",
    ops: [{ retain: 0 }, { insert: "C" }],
    userId: "9c8b7a6d-5e4f-3g2h-1i0j-k1l2m3n4o5p6",
    delay: 500,
  },
];

/**
 * Case 17: rapidSuccessiveOperations
 * 描述：快速连续操作，测试系统在高频操作下的稳定性
 */
export const rapidSuccessiveOperations: TestCase[] = [
  {
    description: "用户 A 快速插入 'A'",
    ops: [{ retain: 0 }, { insert: "A" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 50,
  },
  {
    description: "用户 A 快速插入 'B'",
    ops: [{ retain: 1 }, { insert: "B" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 100,
  },
  {
    description: "用户 A 快速插入 'C'",
    ops: [{ retain: 2 }, { insert: "C" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 150,
  },
  {
    description: "用户 B 在中间插入 'X'",
    ops: [{ retain: 1 }, { insert: "X" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 200,
  },
];

/**
 * Case 18: complexFormatMerging
 * 描述：复杂的格式合并场景，测试多个格式属性的正确合并
 */
export const complexFormatMerging: TestCase[] = [
  {
    description: "用户 A 设置复杂格式：bold + red + size",
    ops: [
      { retain: 0 },
      {
        retain: 4,
        attributes: { bold: true, color: "red", size: "large" },
      },
    ],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 设置复杂格式：italic + blue + underline",
    ops: [
      { retain: 0 },
      {
        retain: 4,
        attributes: { italic: true, color: "blue", underline: true },
      },
    ],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 19: partialFormatConflict
 * 描述：部分格式冲突，测试重叠但不完全相同的格式范围
 */
export const partialFormatConflict: TestCase[] = [
  {
    description: "用户 A 设置位置 0-6 为 bold",
    ops: [{ retain: 0 }, { retain: 6, attributes: { bold: true } }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 设置位置 2-8 为 italic",
    ops: [{ retain: 2 }, { retain: 6, attributes: { italic: true } }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 20: insertWithFormatConflict
 * 描述：插入带格式的文本与格式设置的冲突
 */
export const insertWithFormatConflict: TestCase[] = [
  {
    description: "用户 A 插入带格式的文本",
    ops: [
      { retain: 0 },
      { insert: "Formatted", attributes: { bold: true, color: "red" } },
    ],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在相同位置插入不同格式的文本",
    ops: [
      { retain: 0 },
      { insert: "Styled", attributes: { italic: true, color: "blue" } },
    ],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 21: deleteAcrossFormattedText
 * 描述：删除跨越格式文本的操作
 */
export const deleteAcrossFormattedText: TestCase[] = [
  {
    description: "用户 A 设置格式文本",
    ops: [
      { retain: 0 },
      { insert: "Hello", attributes: { bold: true } },
      { insert: "World" },
    ],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 100,
  },
  {
    description: "用户 B 删除跨越格式边界的文本",
    ops: [{ retain: 2 }, { delete: 6 }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 22: retainZeroEdgeCases
 * 描述：测试 retain(0) 的各种边界情况
 */
export const retainZeroEdgeCases: TestCase[] = [
  {
    description: "用户 A 在位置 0 插入内容",
    ops: [{ retain: 0 }, { insert: "A" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 使用 retain(0) 插入内容",
    ops: [{ retain: 0 }, { insert: "B" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 23: emptyDocumentOperations
 * 描述：空文档上的各种操作测试
 */
export const emptyDocumentOperations: TestCase[] = [
  {
    description: "用户 A 在空文档插入内容",
    ops: [{ insert: "First" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在空文档插入内容",
    ops: [{ insert: "Second" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 24: longTextWithFormatting
 * 描述：长文本与格式的混合操作
 */
export const longTextWithFormatting: TestCase[] = [
  {
    description: "用户 A 插入长文本并设置格式",
    ops: [
      { retain: 0 },
      {
        insert:
          "This is a very long paragraph that contains multiple sentences. ",
        attributes: { bold: true },
      },
    ],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在长文本中间插入内容",
    ops: [{ retain: 25 }, { insert: "INSERTED CONTENT " }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 25: formatRemovalAndAddition
 * 描述：格式移除与添加的冲突测试
 */
export const formatRemovalAndAddition: TestCase[] = [
  {
    description: "用户 A 移除所有格式",
    ops: [
      { retain: 0 },
      { retain: 4, attributes: { bold: null, italic: null } },
    ],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 添加新格式",
    ops: [{ retain: 0 }, { retain: 4, attributes: { underline: true } }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 26: stressTest
 * 描述：压力测试，大量并发操作
 */
export const stressTest: TestCase[] = [
  {
    description: "用户 A 压力测试操作 1",
    ops: [{ retain: 0 }, { insert: "Stress1" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 100,
  },
  {
    description: "用户 B 压力测试操作 1",
    ops: [{ retain: 0 }, { insert: "Stress2" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 150,
  },
  {
    description: "用户 A 压力测试操作 2",
    ops: [{ retain: 7 }, { insert: "Test1" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 200,
  },
  {
    description: "用户 B 压力测试操作 2",
    ops: [{ retain: 7 }, { insert: "Test2" }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 250,
  },
  {
    description: "用户 A 压力测试操作 3",
    ops: [{ retain: 1 }, { delete: 3 }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 300,
  },
  {
    description: "用户 B 压力测试操作 3",
    ops: [{ retain: 1 }, { delete: 3 }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 350,
  },
];

/**
 * Case 27: realWorldScenario
 * 描述：模拟真实世界的编辑场景
 */
export const realWorldScenario: TestCase[] = [
  {
    description: "用户 A 开始编写文档标题",
    ops: [
      { retain: 0 },
      { insert: "项目计划书", attributes: { bold: true, size: "large" } },
    ],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 100,
  },
  {
    description: "用户 B 添加副标题",
    ops: [
      { retain: 5 },
      { insert: "\n副标题：技术方案", attributes: { italic: true } },
    ],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 200,
  },
  {
    description: "用户 A 修改标题内容",
    ops: [{ retain: 0 }, { delete: 5 }, { insert: "技术方案书" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 300,
  },
  {
    description: "用户 B 添加正文内容",
    ops: [
      { retain: 12 },
      { insert: "\n\n1. 项目背景\n这是一个重要的技术项目..." },
    ],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 400,
  },
];

/**
 * Case 28: edgeCaseOperations
 * 描述：各种边界情况的测试
 */
export const edgeCaseOperations: TestCase[] = [
  {
    description: "用户 A 在文档末尾插入",
    ops: [{ retain: 4 }, { insert: "End" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 删除整个文档",
    ops: [{ retain: 0 }, { delete: 7 }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
  {
    description: "用户 A 在空文档中插入",
    ops: [{ insert: "Restart" }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 600,
  },
];

/**
 * Case 29: formatInheritanceTest
 * 描述：测试格式继承和传播
 */
export const formatInheritanceTest: TestCase[] = [
  {
    description: "用户 A 设置段落格式",
    ops: [{ retain: 0 }, { retain: 4, attributes: { align: "center" } }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 在格式范围内插入内容",
    ops: [{ retain: 2 }, { insert: "New", attributes: { bold: true } }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];

/**
 * Case 30: concurrentFormatRemoval
 * 描述：并发格式移除测试
 */
export const concurrentFormatRemoval: TestCase[] = [
  {
    description: "用户 A 移除 bold 格式",
    ops: [{ retain: 0 }, { retain: 4, attributes: { bold: null } }],
    userId: "3bb53883-ef30-4dff-8d18-ff9208e82d26",
    delay: 500,
  },
  {
    description: "用户 B 移除 italic 格式",
    ops: [{ retain: 0 }, { retain: 4, attributes: { italic: null } }],
    userId: "7a7f4597-d8ca-4954-a38d-a978190bf8fa",
    delay: 500,
  },
];
