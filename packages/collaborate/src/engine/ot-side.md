# OTSide

OTSide 是一种简化的「点对点冲突解决方案」，适合早期调试和单元测试；但在真正的多人在线协同系统中，应采用「服务端统一排序 + transform + 广播」的机制，彻底抛弃客户端对优先级的判断。

---

## 什么是 OTSide？

在 Quill 的 Delta 中，transform 方法是这样定义的：

```ts
// 先到的 delta.transform(后到的, priority)
deltaA.transform(deltaB, priority: boolean)
```

- 如果 `priority = true`，则 `deltaA` 优先（即 A 已经在文档中了，B 要避开）
- 如果 `priority = false`，则 `deltaB` 优先（即 B 要保留位置，A 要避开）

---

## OTEngine 的封装（历史版本）

之前我们曾经在 `OTEngine.transform(opA, opB)` 中默认使用：

```ts
return opA.transform(opB, false); // 后来的优先
```

这个做法是有问题的：**transform 本身就是冲突解决动作，优先级应该在上层决定是否需要调用 transform，而不是依赖传入 priority 参数来控制先后**。

**正确做法应是：**

```ts
// OTEngine 的最终设计版本
transform(opEarlier, opLater): Delta {
  return opEarlier.transform(opLater, true); // 后到的 opLater 要让位
}
```

这个函数表示：`opLater` 是后来到的，需要根据 `opEarlier` 的变更结果，调整位置。这是最标准的 OT transform 逻辑。

---

## 举个例子：冲突操作

假设一段文本是：

```bash
hello
```

然后：

- 用户 A 在位置 0 插入 "A"：opA = insert("A")
- 用户 B 在位置 0 插入 "B"：opB = insert("B")

它们插入的位置是相同的，如何决定谁在前？

### 如果 A 先到达（服务端先 apply A）

```ts
const B′ = OTEngine.transform(opA, opB); // A 先应用，transform B
```

此时，B 的插入位置会被后移，最终文档内容为：

```bash
ABhello
```

### 如果 B 先到达

```ts
const A′ = OTEngine.transform(opB, opA); // B 先应用，transform A
```

此时，A 的插入位置会被后移，最终文档内容为：

```bash
BAhello
```

---

## OTSide 参数的历史用途

我们曾封装过如下函数：

```ts
transform(opA, opB, side: 'left' | 'right')
```

这样你可以选择：

- `side = 'left'`：本地优先，保留本地 op 的位置（本端先提交）
- `side = 'right'`：远端优先，移动本地 op 的位置（对方先提交）

但我们后来发现：

在真实协同架构中，**应该上层根据谁先谁后决定是否 transform，而不是 transform 内部传入 true 或 false 来决定谁让步。**
