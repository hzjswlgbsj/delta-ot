# OTSession 架构设计文档

本文件记录协同编辑中 OT（Operational Transformation）客户端核心类 OTSession 的设计思考、职责划分、状态管理与演进路径。

---

## 🧠 设计目标

- 构建具备完整状态管理的 OT 客户端模型
- 支持本地编辑、远端变更、ack 应答流程
- 代码具备可测试性、可维护性、方便未来扩展版本控制与服务端协同机制

---

## 🧩 状态组成

| 状态变量            | 含义                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| `base`              | 当前 shadow 文档：与服务端同步的最后状态                               |
| `unacknowledgedOps` | 本地已提交、尚未被服务器 ack 的 Delta 队列（按顺序）                   |
| `document`          | 当前用户可见状态，初始为 base + unacknowledgedOps，后续直接 apply 更新 |

> ✅ 注意：当前实现中 `base` 实际上扮演了 OT 理论中的 Shadow Document 角色

---

## 📚 关于 Shadow Document 的说明

### 什么是 Shadow？

Shadow Document（影子文档）是客户端保存的一份与服务器一致的文档副本，它是 transform 的基础基准点。通常 shadow 附带版本号等元信息。

### 当前实现中如何处理？

我们使用 `base: Delta` 作为 shadow，并未封装成独立类，也未引入版本控制字段，是简化设计的结果。

### 是否需要显式封装 Shadow？

暂时不需要：

- 当前 `base` 已承担全部 shadow 职责
- 逻辑清晰，测试易写
- 等加入服务端 / 多用户 / websocket / rollback / vector clock 时再考虑引入 `ShadowDocument` 类

---

## ⚙️ 方法说明（简化流程）

### `commitLocal(op: Delta)`

- 本地操作提交
- apply 到 document（立即反馈给用户）
- append 到 `unacknowledgedOps`
- base 不变（等 ack）

### `receiveRemote(remoteOp: Delta)`

- remoteOp 是基于服务器状态（即 base）生成的
- 使用 OT 将 remoteOp transform through 所有 `unacknowledgedOps`
- base = base.compose(transformedRemote)
- document 重建

### `apply(op: Delta)`

- 接收远端操作，已经完成 transform，可直接 base.compose 并更新文档
- 当前用于测试场景模拟「不需要转换的远端操作」

### `ack()`

- 表示服务器已接受并广播了所有本地操作（简化实现）
- 清空 `unacknowledgedOps`
- document 重建（= base）

> ✅ 当前实现直接清空队列，未来可精确处理 ack 某一部分操作（根据 hash、opId 等）

---

## 📁 延伸思考：localOps、remoteOps 与未来设计

在真实在线协同场景中，客户端可能会同时出现：

### `localOps`：未提交操作缓冲区（如 quill 的 changeBuffer）

- 表示用户刚输入但尚未合并并提交的操作
- 还未进入 OTSession
- 可能用于合并优化、延迟发包

### `unacknowledgedOps`（即当前实现中的状态）

- 已被提交并发送给服务端，尚未 ack 的操作
- 用于 transform remoteOp 保障 causality

### `remoteOps`

- 来自服务端广播的其他客户端操作
- 服务端已经 transform 后发送给客户端
- 到达客户端后仍需再次 transform（因为客户端可能有未 ack 本地操作）

---

## ✅ 当前简化假设与后续演进

当前实现仅保留 `unacknowledgedOps`，尚未引入：

- `localOps`：尚未 commit 的 pending 编辑缓冲
- `remoteOps`：按时间排队的远端广播消息
- `version`：服务端 / 本地同步版本号

未来可以考虑如下演进：

- 增加 precise ack（基于 op hash / id）
- 引入 version 管理
- 模拟或引入 `localOps` 与 `remoteOps` 管理机制
- 加入测试网络（SimulatedNetwork）模拟复杂并发冲突顺序

---

## ✅ 总结

当前 OTSession 是一个结构清晰的简化实现，使用 `base + unacknowledgedOps` 管理协同状态，具备良好扩展性。通过引入 transform、ack、apply 等概念可支撑真实协同编辑模型。

我们将在后续阶段通过 `SimulatedNetwork` 和服务端机制逐步提升其复杂度与健壮性。
