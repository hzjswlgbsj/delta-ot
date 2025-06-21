# OTEngine 架构设计文档

本文件记录协同编辑系统中核心模块 `OTEngine` 的职责、设计原则、方法定义以及未来扩展方向。

---

## 🧠 设计目标

- 提供标准、纯函数、幂等的 OT Transform 操作
- 解耦 transform 决策权：由上层控制谁 transform 谁
- 保证在任意客户端或服务端执行 transform，结果保持一致

---

## 🎯 模块职责

| 方法名      | 功能说明                                       |
| ----------- | ---------------------------------------------- |
| `transform` | 执行 OT 转换（opLater 被 opEarlier transform） |

```ts
transform(opEarlier: Delta, opLater: Delta): Delta
```

- `opEarlier`：已生效的操作（先到）
- `opLater`：后来的操作，需要 transform 调整其位置或行为
- ✅ 返回一个新的 Delta，表示适配后的 `opLater`

---

## ✨ transform 的行为规范

### 参数解释

在 `quill-delta` 中，transform 是这样定义的：

```ts
opA.transform(opB, priority: boolean): Delta
```

- 如果 `priority = true`，opA 优先，opB 必须让步（即被 transform）
- 如果 `priority = false`，opB 保留原位，opA 需要避开

但我们在 `OTEngine` 层 **固定使用 `priority = true`**，表示：

> transform(opEarlier, opLater) 的含义是：`opLater` 被调整以适配 `opEarlier` 所造成的文档变更。

### 例子

假设原始文档为：`hello`

#### A 先插入 "A"，B 后插入 "B"（相同位置）

```ts
opA = new Delta().retain(0).insert("A");
opB = new Delta().retain(0).insert("B");
```

在客户端 B 收到 opA 时，应当执行：

```ts
const opB′ = OTEngine.transform(opA, opB);
```

结果：opB′ = `.retain(1).insert("B")`

最终内容为：`A B hello`

### 为什么不能 priority = false？

因为在所有的协同场景中：

- transform 的本质含义是：**后来的操作必须考虑已有操作的变更结果**
- 也就是说，被 transform 的永远是后来者
- 如果允许 priority=false，那 transform 的语义就变成了双向不确定，会导致客户端内容发散（不可预测）

---

## 🔁 接口封装对比

### ❌ 错误方式（模糊不清）

```ts
transform(opA, opB); // 谁 transform 谁？优先级从何而来？
```

### ✅ 推荐方式

```ts
transform(opEarlier, opLater); // 明确语义：后来的适配前面的
```

---

## 🚧 扩展方向

### 1. 引入 `OTSide`（仅限测试）

我们曾在调试中封装：

```ts
transform(opA, opB, side: 'left' | 'right')
```

可读性提升，但不适合进入生产代码，因为：

- 工程中 transform 的调用应当由 `OTSession` 或 `Server` 决定顺序
- `OTEngine` 层应该只负责“transform 行为”，而非“判断谁先谁后”

### 2. 支持 `transformList`

```ts
transformList(base: Delta, ops: Delta[]): Delta
```

可用于将远端 op 链式 transform，适配本地未 ack 的多个操作。

---

## ✅ 总结

- `OTEngine` 是一个纯函数库，所有方法必须幂等、无副作用
- transform(opEarlier, opLater) 是唯一可信接口
- 决策权（谁先谁后）由上层 Session 或 Server 控制
- 所有客户端或服务端使用相同规则 transform，才能保持文档一致性

这是构建协同编辑系统一致性的关键一环。
