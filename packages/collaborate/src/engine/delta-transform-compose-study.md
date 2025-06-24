# Delta OT 协同算法原理解析

协同编辑的核心在于多个用户对文档同时操作时，如何将这些操作无冲突地合并成一致结果。Delta 是 Quill 编辑器底层采用的数据结构，它基于一组操作序列（ops）来描述文档变更，并提供 `transform` 和 `compose` 两大方法实现操作合并与冲突消解。

在这篇文档中，我们将从底层实现开始，逐步拆解 Delta 的设计与关键方法，并串联起协同编辑的完整思路。

## 操作迭代器：OpIterator 设计

在深入 `transform` 和 `compose` 实现前，我们先来看一个基础组件：`OpIterator`。

### 为什么需要 OpIterator？

你可能会疑惑，为什么 Delta 不直接用 `forEach` / `map` 来遍历操作数组，而是实现一个自定义迭代器？

答案是：**Delta 的变更过程不是顺序遍历，而是「按需裁切、对齐步进」的复杂处理过程。**

举个例子：

```ts
[{ retain: 10 }];
```

如果我们需要处理 `retain:10` 和另一个 `retain:4` 的并发情况，就必须将其裁切为：

```ts
retain:4 + retain:6
```

并在 transform 中逐步推进处理。而这显然不是 `forEach` 等高阶函数能够胜任的。于是，`OpIterator` 就成为了整个 Delta 机制的「操作切片器」。

### OpIterator 的设计目标

| 能力             | 举例                                  | forEach 是否能做到 |
| ---------------- | ------------------------------------- | ------------------ |
| **peekType**     | 查看下一个操作是 insert/retain/delete | ❌ 无法预读        |
| **peekLength**   | 获取下一个操作的剩余可用长度          | ❌ 无法知道        |
| **next(length)** | 取出指定长度的部分操作（可裁切）      | ❌ 无法部分消费    |
| **offset 跟踪**  | 操作未用完时继续留在当前位置处理      | ❌ 只能整条处理    |

接下来我们就来解析 OpIterator 的核心方法 `next()`。

## OpIterator.prototype.next 方法解析

> `next(length?: number): Op`：返回当前 op 的一部分，并推进游标状态。

这个方法的作用是：

> **从当前操作中「消费」一段 `length` 长度的内容，返回这段切片，并自动推进状态游标。**

它是 Delta transform 中对齐机制的核心。

### 核心特性

- 支持操作的 **部分裁切**
- 自动推进 **index / offset** 状态
- 支持多种类型：`insert`、`retain`、`delete`
- 返回值始终是标准化的 `Op` 对象

### 内部状态说明

| 属性          | 含义                                                        |
| ------------- | ----------------------------------------------------------- |
| `this.ops`    | 当前 Delta 的操作列表                                       |
| `this.index`  | 当前正在处理第几个操作（数组下标）                          |
| `this.offset` | 当前 op 已处理的偏移量（如 insert:"hello" 已处理前 2 个字） |

### 源码解析（带详细注释）

```ts
next(length?: number): Op {
  if (!length) length = Infinity; // 默认消费整段

  const nextOp = this.ops[this.index];
  if (nextOp) {
    const offset = this.offset;
    const opLength = Op.length(nextOp); // 当前 op 总长度

    // 如果 length 足够消耗剩下的整个 op，推进到下一个 op
    if (length >= opLength - offset) {
      length = opLength - offset;
      this.index += 1;
      this.offset = 0;
    } else {
      // 否则只是部分消费，offset 推进
      this.offset += length;
    }

    // === delete 类型 ===
    if (typeof nextOp.delete === 'number') {
      return { delete: length };
    }

    // === insert/retain 类型 ===
    const retOp: Op = {};
    if (nextOp.attributes) {
      retOp.attributes = nextOp.attributes;
    }

    if (typeof nextOp.retain === 'number') {
      retOp.retain = length; // 可切片 retain
    } else if (typeof nextOp.retain === 'object' && nextOp.retain !== null) {
      retOp.retain = nextOp.retain; // 不可切片 retain（如 embed）
    } else if (typeof nextOp.insert === 'string') {
      retOp.insert = nextOp.insert.substr(offset, length); // 字符串切片
    } else {
      retOp.insert = nextOp.insert; // insert object，不可切片
    }

    return retOp;
  }

  // 如果 ops 全部消费完，返回 retain: Infinity 表示“虚拟占位”
  return { retain: Infinity };
}
```

### 不同类型操作的切片策略

| 类型                       | 是否可切片 | 切片方式说明                                            |
| -------------------------- | ---------- | ------------------------------------------------------- |
| `delete: 10`               | ✅         | → `{ delete: length }`                                  |
| `retain: 8`                | ✅         | → `{ retain: length }`                                  |
| `retain: {}`               | ❌         | → 只能完整返回对象，不可裁切                            |
| `insert: "abcde"`          | ✅         | → `{ insert: "ab" }` 由 offset 和 length 控制字符串截取 |
| `insert: { image: "..." }` | ❌         | → 必须整体返回，offset 必须为 0，length 必须为 1        |

### 示例解析

#### 示例 1：insert 字符串切片

```ts
this.ops = [{ insert: "hello" }];
this.offset = 2;
next(2) → { insert: "ll" }
```

#### 示例 2：delete 分段处理

```ts
this.ops = [{ delete: 10 }];
next(4) → { delete: 4 }
next(6) → { delete: 6 }
```

#### 示例 3：嵌入内容（embed）不可裁切

```ts
this.ops = [{ insert: { image: "url" } }];
next(1) → { insert: { image: "url" } }
next(2) → ❌ 错误！嵌入对象不允许裁切
```

### 裁切与游标推进逻辑总结

```ts
if (length >= opLength - offset) {
  // 当前这段被完整消费，进入下一个 op
  this.index += 1;
  this.offset = 0;
} else {
  // 只消耗一部分，下轮继续处理同一个 op
  this.offset += length;
}
```

### 总结

| 功能             | 是否支持 | 说明                                     |
| ---------------- | -------- | ---------------------------------------- | ------ | ---------------------- |
| 部分裁切操作     | ✅       | 支持 insert、retain、delete 的按需切片   |
| 嵌入操作不可拆分 | ✅       | insert/retain 的 object 类型要求整体返回 |
| 自动游标推进     | ✅       | `index` 和 `offset` 会被自动维护         |
| 标准化返回       | ✅       | 始终返回 `{ insert                       | retain | delete, attributes? }` |

### 本质一句话总结

> **OpIterator.next 就是 Delta 的“切片器”：你告诉它每次走多远，它就精确返回这一小段，并自动帮你记住下次从哪继续。**

### transform 不再是状态地狱

如果你用 `forEach` / `map` 来 transform 两个 Delta，你会写出这样的代码：

```ts
opsA.forEach((opA) => {
  opsB.forEach((opB) => {
    // opA 比 opB 长，怎么办？谁偏移了？要拆吗？退回吗？
  });
});
```

很快你会陷入各种 offsetA、offsetB、cursorA、remainingB 状态变量。

而 OpIterator + next(length) 则完全摆脱这些状态管理：

```ts
while (iterA.hasNext() || iterB.hasNext()) {
  const len = Math.min(iterA.peekLength(), iterB.peekLength());
  const a = iterA.next(len);
  const b = iterB.next(len);
  // 一轮对齐处理
}
```

> **结构清晰、无副作用、无需状态堆积，transform 实现逻辑简洁优雅。**

## Delta.prototype.transform 方法解析

在拥有了 `OpIterator` 的切片能力之后，我们就可以进入 Delta 最核心的算法逻辑：`transform`。

`transform` 的职责是：

> **将一个 Delta 调整为在另一个 Delta 变更后的文档上可以正确应用的版本。**

这在协同编辑中至关重要 —— 假设两个用户同时操作文档，它们各自的操作必须相互调整，以免内容错乱或丢失。

### 整体处理逻辑

在进入源码前，先明确一下 transform 的整体流程：

> 遍历 thisDelta 和 otherDelta 中的 op，逐个对齐处理，生成一个新的 Delta，它能「在 otherDelta 修改过的文档」上应用 thisDelta 的效果。

整个遍历逻辑可以拆分成三大分支：

1. **🟢 this 是 insert**

   - 如果当前 op 是 thisDelta 的 insert，并且具有优先权，则直接 retain（因为内容已经插入过，光标需要偏移）

2. **🔵 other 是 insert**

   - 如果对方插入内容，则将其加入结果中（插入内容不冲突，应该保留）

3. **🟡 双方都不是 insert**
   - 通常是 retain 或 delete，对齐处理每一小段，判断谁删除、谁保留、谁需要合并样式/嵌入

### 方法签名

```ts
transform(index: number, priority?: boolean): number;
transform(other: Delta, priority?: boolean): Delta;
```

支持传入数字（光标位置）或另一个 Delta，分别进行位置转换或操作转换。我们这里关注的是第二种：**Delta 对 Delta 的 transform**。

### 源码 + 注释

```ts
transform(arg: number | Delta, priority = false): typeof arg {
  priority = !!priority;

  // 如果传入的是数字，则走 transformPosition
  if (typeof arg === 'number') {
    return this.transformPosition(arg, priority);
  }

  const other: Delta = arg;

  const thisIter = new OpIterator(this.ops);   // 当前 Delta
  const otherIter = new OpIterator(other.ops); // 并发 Delta
  const delta = new Delta();                   // 最终结果

  while (thisIter.hasNext() || otherIter.hasNext()) {
    // 🟢 分支 1：this 是 insert
    if (
      thisIter.peekType() === 'insert' &&
      (priority || otherIter.peekType() !== 'insert')
    ) {
      // 当前拥有插入优先权，插入内容不直接应用，而是将其长度保留（retain），让位
      delta.retain(Op.length(thisIter.next()));
    }

    // 🔵 分支 2：other 是 insert
    else if (otherIter.peekType() === 'insert') {
      // 对方插入内容优先级更高，直接插入到结果中
      delta.push(otherIter.next());
    }

    // 🟡 分支 3：两边都不是 insert（可能是 retain / delete）
    else {
      const length = Math.min(thisIter.peekLength(), otherIter.peekLength());
      const thisOp = thisIter.next(length);
      const otherOp = otherIter.next(length);

      if (thisOp.delete) {
        // 当前是 delete，说明这段内容已经删掉，other 无论 retain 还是 delete 都跳过
        continue;
      }

      if (otherOp.delete) {
        // 对方是 delete，删除操作应该出现在结果中
        delta.push(otherOp);
      }

      // 双方都是 retain，合并嵌入对象、格式样式
      else {
        const thisData = thisOp.retain;
        const otherData = otherOp.retain;

        let transformedData: Op['retain'] =
          typeof otherData === 'object' && otherData !== null
            ? otherData
            : length;

        // 如果双方都是 embed 类型（对象 retain），则尝试合并（交给 handler）
        if (
          typeof thisData === 'object' &&
          thisData !== null &&
          typeof otherData === 'object' &&
          otherData !== null
        ) {
          const embedType = Object.keys(thisData)[0];
          if (embedType === Object.keys(otherData)[0]) {
            const handler = Delta.getHandler(embedType);
            if (handler) {
              transformedData = {
                [embedType]: handler.transform(
                  thisData[embedType],
                  otherData[embedType],
                  priority
                ),
              };
            }
          }
        }

        // 合并属性（格式，如 bold、italic）
        const transformedAttributes = AttributeMap.transform(
          thisOp.attributes,
          otherOp.attributes,
          priority
        );

        delta.retain(transformedData, transformedAttributes);
      }
    }
  }

  return delta.chop(); // 去除尾部多余 retain
}
```

### 逐段说明与背后设计意图

| 位置                           | 说明                                              |
| ------------------------------ | ------------------------------------------------- |
| `if (typeof arg === 'number')` | 支持 transformPosition 的重载形式（光标位置调整） |
| `OpIterator(this.ops)`         | 使用切片迭代器，逐段精细处理                      |
| `this 是 insert`               | 有优先权时插入的是“虚影”，只需要 retain 空间      |
| `other 是 insert`              | 没有优先权时对方插入的内容直接 push               |
| `双方都是 delete/retain`       | 逐段对齐：删除跳过，retain 合并数据/样式          |
| `handler.transform()`          | 可扩展处理富文本嵌入内容（如 mention、图片）      |
| `AttributeMap.transform`       | 样式合并器，支持 bold/italic 等富文本属性冲突合并 |

### 行为逻辑总结表

| 类型           | 行为说明                                                          |
| -------------- | ----------------------------------------------------------------- |
| Insert         | 谁有优先级谁插入，另一个通过 retain 向后偏移                      |
| Delete         | 删除者胜出，被删区域所有其他操作都跳过                            |
| Retain         | 保留基础文本，合并格式、样式或嵌入内容                            |
| 嵌入 transform | 支持自定义类型（如公式、@mention）通过 handler 进行个性化合并处理 |
| chop           | 清理结果末尾多余 retain，使 Delta 更精简                          |

### 使用场景举例

1. **两个用户同时在 index=5 插入文本**

   - 有优先权的人插入在前，另一个通过 `retain(length)` 向后偏移

2. **一个用户删除文本，另一个试图 retain 或修改其属性**

   - 删除者胜出，对方 retain 操作会被跳过

3. **嵌入内容冲突（如修改同一个公式）**
   - 注册 `Delta.getHandler(type)`，由 handler 负责 merge

### 小结

`transform` 是 Quill 协同算法的核心。它的职责就是：

> **将操作 A 重映射到 B 执行后的文档上，让 A 和 B 能“和平共处”。**

整个过程通过：

- 对齐裁切（OpIterator）
- 优先级判断（priority）
- 样式与嵌入合并（AttributeMap / handler）

实现了 OT 算法中「操作之间的相互转化」这一关键能力。

> 一句话总结：**transform 是“操作调解器”，确保多方修改可以在同一文档上无冲突地融合。**

## Delta.prototype.transformPosition 方法解析

在协同编辑中，除了调整操作本身（`transform`），还有一个非常重要的功能 —— **调整光标或位置索引的偏移量**。

这正是 `transformPosition` 方法的职责：

> **将原本位于某个位置的操作或光标，映射到另一组 Delta 操作应用后的新位置。**

### 背景场景说明

协同编辑中，多个用户可能同时操作文档。比如你准备在第 10 个字符插入文本，但在你操作之前，另一位协作者刚刚在前面插入了 3 个字符，那么你真正插入的应是位置 13，而不是 10。

这就要求我们：**根据已经执行过的操作序列，动态调整当前的位置索引。**

### 核心设计思想：三类操作如何影响位置

在 transformPosition 中，我们要重点思考：**每种操作会如何影响 index 的位置？**

| 操作类型         | 位置偏移        | 说明                                     |
| ---------------- | --------------- | ---------------------------------------- |
| `delete`         | 向前偏移（减）  | 删除前面的字符，当前位置需要往前推       |
| `insert`         | 向后偏移（加）  | 插入在 index 前的位置，index 被推后      |
| `insert`（相等） | 取决于 priority | 并发插入，谁拥有优先级，谁插入在前       |
| `retain`         | 不偏移          | 保留字符不影响 index，仅用于判断是否越界 |

### transformPosition 方法签名

```ts
transformPosition(index: number, priority?: boolean): number
```

| 参数       | 说明                                                         |
| ---------- | ------------------------------------------------------------ |
| `index`    | 当前待调整的位置（如光标或插入点）                           |
| `priority` | 是否拥有并发优先权，影响同时插入时位置是否偏移（默认 false） |
| 返回值     | 应用当前 Delta 后的实际新位置                                |

### 带详细注释的源码解析

```ts
transformPosition(index: number, priority = false): number {
  priority = !!priority;

  const thisIter = new OpIterator(this.ops);
  let offset = 0;

  while (thisIter.hasNext() && offset <= index) {
    const length = thisIter.peekLength();  // 当前 op 的剩余长度
    const nextType = thisIter.peekType();  // 当前 op 的类型：insert/retain/delete

    thisIter.next(); // 消费当前 op（只用于推进 offset）

    if (nextType === 'delete') {
      // 删除使 index 前移：如果被删除区域在 index 前面或覆盖了 index
      index -= Math.min(length, index - offset);
    }
    else if (nextType === 'insert') {
      // 插入使 index 后移：如果插入发生在 index 前面，或同时发生但我无优先权
      if (offset < index || !priority) {
        index += length;
      }
    }

    offset += length;
  }

  return index;
}
```

### 三大操作对比职责回顾

| 操作类型 | 是否影响 index | 如何影响                                |
| -------- | -------------- | --------------------------------------- |
| delete   | ✅ 向前偏移    | 删除的是 index 之前或包含 index 的内容  |
| insert   | ✅ 向后偏移    | 插入在 index 之前（或同位但我没优先权） |
| retain   | ❌ 不偏移      | 只是跳过已有字符，不影响 index          |

### 示例解析

#### 示例 1：删除使光标前移

```text
原文：A B C D E
操作：delete(2) -> 删除 A B
原 index: 3（指向 D）
新 index: 1（向前推 2 位）
```

#### 示例 2：并发插入的优先级影响

```text
场景：用户 A 和用户 B 同时在 index = 5 插入文本（长度为 3）

A 的调用：
  transformPosition(5, true) → 5（有优先权，不偏移）

B 的调用：
  transformPosition(5, false) → 8（被 A 插入内容推后）
```

### 常见应用场景

| 场景             | 使用 transformPosition 的目的                    |
| ---------------- | ------------------------------------------------ |
| 光标同步         | 用户 A 插入内容后，用户 B 的光标应自动跟随偏移   |
| 位置定位修复     | 插入某段文本后重新计算下一个插入点               |
| 串行 Delta 合并  | 连续多次 transform 后保持正确位置                |
| undo / redo 操作 | 撤销或重做前后还原精确位置（特别是插入冲突场景） |

### 小结

- `transformPosition` 是协同编辑中光标跟踪与位置校准的基石；
- 三类操作（insert/delete/retain）各有不同偏移策略；
- `priority` 机制解决并发插入的顺序冲突；
- 和 `OpIterator` 一样，这是 Delta 模型下非常经典且高复用的工具方法。

> 一句话总结：**transformPosition 就是「根据变更后文档，重新计算你该待在哪」。**

## Delta.prototype.compose 方法解析（待补充）

我们已经了解了 transform 的流程，下一步将继续解析 compose，它用于将两个操作「合并为一个整体操作」，以减少操作数量并提升性能。

## 总结：Delta 协同模型的核心设计哲学

> **Delta transform/compose 的本质并不是单向遍历，而是字符级对齐处理。**

因此它引入了 `OpIterator`，用来支持：

- 操作的部分切割
- 操作之间的同步推进
- 嵌入内容的自定义处理
- 样式的合并与消解

这样的设计既抽象又优雅，让 Delta 成为协同编辑领域非常成熟且实用的数据模型。

```ts
// 伪代码：transform 核心循环逻辑
while (iterA.hasNext() || iterB.hasNext()) {
  const len = Math.min(iterA.peekLength(), iterB.peekLength());
  const opA = iterA.next(len);
  const opB = iterB.next(len);
  // 对 opA 和 opB 做差异处理，推入结果 Delta
}
```

最终一切归结为一句话：

> **Delta transform 是一种字符粒度的冲突裁切器，优雅、通用、对齐友好。**
