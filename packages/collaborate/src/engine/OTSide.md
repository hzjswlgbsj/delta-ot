# OTSide

OTSide 是一种简化的「点对点冲突解决方案」，适合早期调试和单元测试；但在真正的多人在线协同系统中，应采用「服务端统一排序 + transform + 广播」的机制，彻底抛弃客户端对优先级的判断。

## 什么是 OTSide？

在 Quill 的 Delta 中，transform 方法是这样定义的：

```ts
deltaA.transform(deltaB, priority: boolean)
```

- 如果 priority = true，则表示：deltaA 优先（即 left 优先）
- 如果 priority = false，则表示：deltaB 优先（即 right 优先）

在 OTEngine 中我们封装成：

```ts
transform(opA, opB, side: 'left' | 'right')
```

就可以通过 side === 'left' 来决定传入的 priority。

## 举个例子：冲突操作

假设一段文本是：

```bash
hello
```

然后：

- 用户 A 在位置 0 插入 "A"：opA = insert("A")
- 用户 B 在位置 0 插入 "B"：opB = insert("B")

它们插入的位置是相同的，如何决定谁在前？

➤ 如果 side = 'left'：

- 意味着：opA 的插入位置保留优先
- transform 后的结果：B 的插入位置会被往后挪
- 文本结果可能是："ABhello"

➤ 如果 side = 'right'：

- 意味着：opB 的插入位置保留优先
- transform 后的结果：A 的插入位置会被往后挪
- 文本结果可能是："BAhello"

## OTSide 是干什么的？

它的目的就是：**为了解决“两个操作都在同一位置操作”时，如何分配它们的位置冲突**

- 'left'：本地优先（本端先提交）
- 'right'：远端优先（对方先提交）

**通常实践中：**

- 客户端之间：每个客户端都默认自己是 'left'
- 服务端进行广播时：可以选定顺序，但需一致（确保所有客户端转义时采用相同顺序）

它本质是一个 **冲突解决策略偏向位**，没有对错之分，但一旦选定，**必须全局一致**，否则文档会发散。

## 实际工程中怎么做？

实际协同文档系统（如 Google Docs、Notion、腾讯文档、你正在构建的系统）**都会有服务端统一排序和调度 transform 的机制**，这时候你不再依赖 OTSide 来判断优先权，而是依赖：

- 操作的版本号（版本控制）
- 谁先到服务器，谁先 apply
- 服务器端统一进行 transform 并广播 transform 后的 op
- 客户端只负责 apply 自己版本后的 op，不再做 transform

**举个例子：你自己实现的设计逻辑:**

```plaintext
Client A / B          →  Server          → All Clients
  op v=1  ---->         seq=1       ----> op v=1
  op v=1  ---->         transform   ----> op v=2 (transformed)
```

服务端统一使用 transform(opLater, opEarlier, false)，后者永远优先，无需客户端传 OTSide，客户端也不用自行决定。
