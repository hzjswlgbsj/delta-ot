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

✅ 在真实协同架构中，**应该上层根据谁先谁后决定是否 transform，而不是 transform 内部传入 true 或 false 来决定谁让步。**

因此，OTEngine.transform 应该写死成优先侧优先，调用者自己决定是否 transform 谁。

---

## 实际工程中怎么做？

实际协同文档系统（如 Google Docs、Notion、腾讯文档、你正在构建的系统）**都会有服务端统一排序和调度 transform 的机制**，这时候你不再依赖 OTSide 来判断优先权，而是依赖：

- 操作的版本号（version）
- 谁先到服务器，谁先 apply
- 服务器端统一进行 transform 并广播 transform 后的 op
- 客户端只负责 apply 自己版本之后的 op，不再做 transform

### 示例

```plaintext
Client A / B          →  Server          → All Clients
  op v=1  ---->         seq=1       ----> op v=1
  op v=1  ---->         transform   ----> op v=2 (transformed)
```

服务端统一使用 `transform(opEarlier, opLater)`，后者永远适配前者，客户端只接收最终 transform 后的结果。

---

## 🔚 总结

- OTSide 是「点对点」调试用的临时机制，不应出现在正式架构中。
- transform 函数只负责“后来的操作适配已有结果”，永远 `priority = true`
- 冲突优先级（谁先谁后）应由 OTSession / Server 决定是否 transform，而不是 transform 本身控制谁优先
- 正确的 OT 实现中 transform 是幂等、纯函数，无副作用，使用一致、稳定
- 后续设计中建议统一采用 `transform(opEarlier, opLater)` 接口定义，优先侧由调用者决定

这为未来加入 operation version、server ordering、client rollback 等机制打下了干净的基础。
