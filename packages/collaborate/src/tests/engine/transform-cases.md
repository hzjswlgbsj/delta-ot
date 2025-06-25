# transform-cases.md

本文件记录 OT transform 的核心测试场景矩阵，每一行代表一种 opA 与 opB 的组合变换关系，用于引导 engine 层的 transform 测试用例设计。

## 基本定义

- opA：先应用的操作（已在文档上）
- opB：后到的操作（需 transform）
- transform(opA, opB) 表示：**让 opB 适应 opA 已应用后的文档状态**

## 测试矩阵

| 编号 | opA 类型 | opB 类型 | 示例简述                                                | 预期行为                                            | 应用场景       |
| ---- | -------- | -------- | ------------------------------------------------------- | --------------------------------------------------- | -------------- |
| 1    | insert   | insert   | A: insert("A", 0) / B: insert("B", 0)                   | B 被右移，结果应为 "AB..." 或 "BA..."（由先后决定） | 光标位置冲突   |
| 2    | insert   | delete   | A: insert("A", 0) / B: delete(0,1)                      | 删除位置被右移                                      | 插入后再删     |
| 3    | delete   | insert   | A: delete(0,1) / B: insert("B", 0)                      | 插入位置被左移                                      | 删除空隙插入   |
| 4    | delete   | delete   | A: delete(0,2) / B: delete(1,2)                         | 范围合并或部分裁剪                                  | 连续删/重叠删  |
| 5    | retain   | insert   | A: retain(1) / B: insert("B", 1)                        | insert 位置被正确偏移                               | 光标间插入     |
| 6    | retain   | delete   | A: retain(2) / B: delete(2,1)                           | delete 位置偏移                                     | 滚动删除       |
| 7    | insert   | retain   | A: insert("A", 0) / B: retain(1)                        | retain 偏移                                         | 文本同步       |
| 8    | delete   | retain   | A: delete(0,1) / B: retain(1)                           | retain 缩短                                         | 同步跟随       |
| 9    | retain   | retain   | A: retain(2) / B: retain(2)                             | 不变                                                | 常规同步       |
| 10   | noop     | insert   | A: ∅ / B: insert("B", 0)                                | 保持 insert 不变                                    | 初始插入       |
| 11   | noop     | delete   | A: ∅ / B: delete(0,1)                                   | 保持 delete 不变                                    | 初始清空       |
| 12   | delete   | noop     | A: delete(0,2) / B: ∅                                   | 不影响 noop                                         | 不操作无效化   |
| 13   | insert   | noop     | A: insert("A", 0) / B: ∅                                | 不影响 noop                                         | 不操作无效化   |
| 14   | retain   | retain   | A: retain(2, {bold:true}) / B: retain(2, {italic:true}) | 属性合并或覆盖                                      | 富文本样式变更 |

## 说明

- 以上测试应逐条在 engine 层以 Vitest 编写独立用例
- 每种组合应测试光标不同位置、边界情况（0、末尾）、重叠范围等边缘情况
- 用例应覆盖 insert/retain/delete 组合的所有可能变换路径
- 对于每个测试结果，应 assert 最终 compose(base + opA + opB′) 的 Delta 正确性

## 版本号和序列号提示

- 当前测试集中未涉及版本号（version）和序列号（seq）概念，所有操作视为无版本。
- 在实际协同系统中，服务端会根据版本号顺序执行 transform，确保操作的有序性。
- 版本控制应在 OTSession 层管理，Engine 层保持纯粹的 transform 功能。

## 推荐测试文件命名和对应关系

| 测试文件                        | 主要测试内容     |
| ------------------------------- | ---------------- |
| simple-transform.test.ts        | 基础插入场景     |
| insert-insert-transform.test.ts | 插入-插入冲突    |
| insert-delete-transform.test.ts | 插入-删除交互    |
| delete-delete-transform.test.ts | 删除-删除冲突    |
| retain-insert-transform.test.ts | retain 与 insert |
| retain-delete-transform.test.ts | retain 与 delete |
| retain-retain-transform.test.ts | retain 属性变更  |
| multi-op-transform.test.ts      | 复杂组合多操作   |
| noop-transform.test.ts          | 空操作（noop）   |

## 推荐测试文件执行顺序

1. insert-insert-transform.test.ts（已完成）。- 基础的插入冲突，验证 transform 核心行为。
2. insert-insert-priority-transform.test.ts （已完成）。- 优先级测试，验证 insert-insert 冲突的优先级。
3. insert-delete-transform.test.ts（已完成）。- 插入与删除混合，位置调整较复杂，紧接着插入测试，保证删除在插入后正确偏移。
4. delete-insert-transform.test.ts（已完成）。- 删除与插入顺序调换，进一步验证插入如何适应已删文本。
5. delete-delete-transform.test.ts（已完成）。- 删除-删除冲突，覆盖重叠删除和范围合并，难度较高。
6. retain-insert-transform.test.ts（已完成）。- 光标保留与插入，主要考察 retain 影响。
7. retain-delete-transform.test.ts（已完成）。- 光标保留与删除，考察 retain 对删除的偏移。
8. insert-retain-transform.test.ts（已完成）。- 插入操作对 retain 的影响，主要是属性和光标的调整。
9. retain-retain-transform.test.ts（已完成）。- 两个 retain 操作，针对属性变更和无位置变更的情况。
10. multi-op-transform.test.ts（已完成）。- 综合多个操作组合，复杂场景，验证整体稳定性。
