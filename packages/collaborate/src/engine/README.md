# engine/

OT 引擎模块，封装操作转换相关逻辑。

## 主要职责

- 操作转换（transform）
- 操作合并（compose）
- 应用操作到目标文档（apply）

## 实现基础

- 基于 `quill-delta` 提供的 Delta 对象进行操作
- 可扩展为支持更多 OT/CRDT 策略
