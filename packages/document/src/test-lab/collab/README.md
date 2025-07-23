# 协同编辑测试用例使用说明

## 概述

本测试框架用于验证协同编辑系统的各种场景，包括冲突解决、多用户协作、格式处理等功能。

## 测试用例分类

### 基础测试用例（1-16）

- **basicInsertConflict**: 基础插入冲突
- **insertAtDifferentPositions**: 不同位置插入
- **concurrentDeleteAndInsert**: 并发删除和插入
- **formatConflict**: 格式冲突
- **deleteConflict**: 删除冲突
- **samePositionDeleteConflict**: 相同位置删除冲突
- **complexInsertConflict**: 复杂插入冲突
- **insertAndDeleteOverlap**: 插入删除重叠
- **formatAndContentConflict**: 格式内容混合冲突
- **multipleFormatConflict**: 多属性格式冲突
- **attributeConflictStrategy**: 属性冲突策略
- **sequentialOperations**: 连续操作
- **boundaryOperations**: 边界操作
- **largeTextOperations**: 大文本操作
- **formatRemovalConflict**: 格式移除冲突
- **mixedOperations**: 混合操作

### 高级测试用例（17-32）

- **networkLatencySimulation**: 网络延迟模拟
- **multipleUserConflict**: 多用户冲突（3个用户）
- **rapidSuccessiveOperations**: 快速连续操作
- **complexFormatMerging**: 复杂格式合并
- **partialFormatConflict**: 部分格式冲突
- **insertWithFormatConflict**: 插入带格式冲突
- **deleteAcrossFormattedText**: 删除跨越格式文本
- **retainZeroEdgeCases**: retain(0)边界情况
- **emptyDocumentOperations**: 空文档操作
- **longTextWithFormatting**: 长文本格式操作
- **formatRemovalAndAddition**: 格式移除与添加
- **stressTest**: 压力测试
- **realWorldScenario**: 真实世界场景
- **edgeCaseOperations**: 边界情况操作
- **formatInheritanceTest**: 格式继承测试
- **concurrentFormatRemoval**: 并发格式移除

## 使用方法

### 1. 启动测试页面

访问 `/test-lab` 页面，选择要执行的测试用例。

### 2. 选择测试用例

在控制面板的下拉菜单中选择要执行的测试用例。

### 3. 执行测试

点击"运行测试"按钮开始执行测试用例。

### 4. 观察结果

- 实时查看执行进度
- 观察各个客户端的文档状态变化
- 检查最终的一致性结果

## 客户端配置

### 客户端1（蓝色）

- 用户ID: `3bb53883-ef30-4dff-8d18-ff9208e82d26`
- 登录名: `sixty`
- 颜色: 蓝色

### 客户端2（绿色）

- 用户ID: `7a7f4597-d8ca-4954-a38d-a978190bf8fa`
- 登录名: `wangwu`
- 颜色: 绿色

### 客户端3（红色）

- 用户ID: `9c8b7a6d-5e4f-3g2h-1i0j-k1l2m3n4o5p6`
- 登录名: `zhangsan`
- 颜色: 红色

## 测试用例设计原则

### 1. 冲突场景

- 相同位置的操作冲突
- 不同位置的非冲突操作
- 混合操作（插入+删除+格式）

### 2. 时序控制

- 使用 `delay` 参数控制操作执行时间
- 模拟网络延迟和操作优先级
- 测试后到操作优先级策略

### 3. 格式处理

- 属性冲突和合并
- 格式继承和传播
- 格式移除与添加

### 4. 边界情况

- 空文档操作
- retain(0) 特殊情况
- 大文本处理

## 预期结果验证

### 一致性检查

所有客户端最终应该达到相同的文档状态。

### 冲突解决验证

- 插入冲突：后到操作优先级
- 格式冲突：属性正确合并
- 删除冲突：正确处理重叠删除

### 性能验证

- 快速操作不丢失
- 大文本操作正常
- 多用户同时编辑稳定

## 故障排除

### 常见问题

1. **iframe加载失败**: 检查网络连接和服务器状态
2. **操作未执行**: 检查用户ID配置是否正确
3. **结果不一致**: 检查OT算法实现和冲突解决策略

### 调试技巧

1. 查看浏览器控制台的日志输出
2. 观察进度消息了解执行状态
3. 使用开发者工具检查iframe内容

## 扩展测试用例

### 添加新测试用例

1. 在 `testCases.ts` 中定义新的测试用例
2. 在 `TestPage.tsx` 中导入并添加到 `testCases` 对象
3. 在 `currentCases` 中添加描述信息

### 测试用例格式

```typescript
export const newTestCase: TestCase[] = [
  {
    description: "操作描述",
    ops: [{ retain: 0 }, { insert: "A" }],
    userId: "用户ID",
    delay: 500, // 延迟时间（毫秒）
  },
];
```

## 性能基准

### 测试指标

- 操作响应时间
- 冲突解决速度
- 内存使用情况
- 网络传输效率

### 基准值

- 单操作响应时间: < 100ms
- 冲突解决时间: < 200ms
- 内存增长: < 10MB/小时
- 网络延迟容忍: < 1000ms

## 总结

本测试框架提供了全面的协同编辑功能验证，涵盖了从基础操作到复杂场景的各种测试用例。通过系统性的测试，可以确保协同编辑系统的稳定性、一致性和性能。
