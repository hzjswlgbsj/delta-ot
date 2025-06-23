# Delta OT

本文主要用于分析 Delta 实现的 transform 方法和 compose 方法

## transform

先来看看添加了注释的源码

```typescript
/**
 * Delta 类型表示一组操作，支持插入、删除、保留等。
 * 这里是 Delta 的 transform 方法，用于将当前 Delta 转换成基于另一个 Delta 的变换结果，
 * 以解决协同编辑中多个操作并发导致的冲突。
 */
transform(index: number, priority?: boolean): number;
transform(other: Delta, priority?: boolean): Delta;
transform(arg: number | Delta, priority = false): typeof arg {
  // 强制转换 priority 为布尔类型，保证后续逻辑一致性
  priority = !!priority;

  // 如果传入参数是数字，代表光标位置索引，调用 transformPosition 处理位置变换
  if (typeof arg === 'number') {
    return this.transformPosition(arg, priority);
  }

  // 如果传入参数是 Delta，下面是对两个 Delta 的 transform 实现
  const other: Delta = arg;

  // OpIterator 用于按操作长度顺序遍历操作数组，支持分段读取
  const thisIter = new OpIterator(this.ops);
  const otherIter = new OpIterator(other.ops);

  // 创建一个新的 Delta 来存放 transform 结果
  const delta = new Delta();

  // 只要两个操作序列任意一个未遍历完，就继续循环
  while (thisIter.hasNext() || otherIter.hasNext()) {

    /**
     * 处理 this Delta 的插入操作：
     * - 如果当前 this 操作是插入，
     * - 且（优先级为 true 或者 other 当前操作不是插入），
     * 表示 this 的插入应当“领先”，
     * other 的操作在 this 插入内容后面发生。
     */
    if (
      thisIter.peekType() === 'insert' &&
      (priority || otherIter.peekType() !== 'insert')
    ) {
      // 将 this 插入内容的长度加入 retain，表示跳过这段长度
      // 意味着 other 操作相对位置后移
      delta.retain(Op.length(thisIter.next()));
    }
    // 如果 other 当前操作是插入，且上面条件不满足
    else if (otherIter.peekType() === 'insert') {
      // 直接将 other 的插入操作加入结果
      delta.push(otherIter.next());
    }
    // 处理删除和保留的情况
    else {
      // 取两个操作当前片段的最小长度，避免越界
      const length = Math.min(thisIter.peekLength(), otherIter.peekLength());

      // 分别读取长度为 length 的操作片段
      const thisOp = thisIter.next(length);
      const otherOp = otherIter.next(length);

      // 如果 this 操作是删除，表示这部分内容已被删除，
      // other 操作对应位置的变换忽略（跳过）
      if (thisOp.delete) {
        continue;
      }
      // 如果 other 操作是删除，则将删除操作加入结果
      else if (otherOp.delete) {
        delta.push(otherOp);
      }
      // 两个操作都是保留类型，需要合并保留数据和属性
      else {
        // 获取两者的保留数据，可能是数字（长度）或嵌入对象
        const thisData = thisOp.retain;
        const otherData = otherOp.retain;

        // 默认将 other 的保留数据作为转化后的数据
        let transformedData: Op['retain'] =
          typeof otherData === 'object' && otherData !== null
            ? otherData
            : length;

        // 如果两边的保留数据都是对象（嵌入类型），尝试调用对应的 handler 做嵌入合并
        if (
          typeof thisData === 'object' &&
          thisData !== null &&
          typeof otherData === 'object' &&
          otherData !== null
        ) {
          // 获取嵌入对象的 key，即类型名
          const embedType = Object.keys(thisData)[0];

          // 如果两边嵌入类型相同，调用注册的 handler 的 transform 方法
          if (embedType === Object.keys(otherData)[0]) {
            const handler = Delta.getHandler(embedType);
            if (handler) {
              transformedData = {
                [embedType]: handler.transform(
                  thisData[embedType],
                  otherData[embedType],
                  priority,
                ),
              };
            }
          }
        }

        // 调用属性变换方法合并样式属性
        const transformedAttributes = AttributeMap.transform(
          thisOp.attributes,
          otherOp.attributes,
          priority,
        );

        // 将保留操作及合并后的属性加入结果 Delta
        delta.retain(transformedData, transformedAttributes);
      }
    }
  }

  // 剔除末尾多余的保留操作，返回最终结果 Delta
  return delta.chop();
}
```
