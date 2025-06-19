# OTSession 架构设计文档

本文件记录协同编辑中 OT（Operational Transformation）客户端核心类 OTSession 的设计思考、职责划分、状态管理与演进路径。

---

## 🧠 设计目标

- 构建具备完整状态管理的 OT 客户端模型
- 支持本地编辑、远端变更、ack 应答流程
- 代码具备可测试性、可维护性、方便未来扩展版本控制与服务端协同机制

---

## 🧩 状态组成

| 状态变量   | 含义                                                 |
| ---------- | ---------------------------------------------------- |
| `base`     | 当前 shadow 文档：与服务端同步的最后状态             |
| `pending`  | 本地已提交、尚未被服务器 ack 的 Delta 队列（按顺序） |
| `document` | 当前用户可见状态 = base + pending（合成后的状态）    |

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
- apply 到 document
- append 到 pending
- base 不变（等 ack）

### `receiveRemote(remoteOp: Delta)`

- remoteOp 是基于服务器状态（即 base）生成的
- transform 远端操作 through 所有 pending，得到 transformedRemote
- base = base.compose(transformedRemote)
- document = base + pending（重建）

### `ack()`

- 表示服务器已接受并广播了 pending[0] 操作
- base = base.compose(pending[0])
- pending.shift()
- document 重建

---

## 🚧 未来改进方向

- 加入版本号（shadowVersion, localVersion）
- transform with version 机制
- Server ack with op id
- WebSocket 双向 sync
- OT + CRDT 混合机制（用于脱机重连容错）

---

## ✅ 总结

当前 OTSession 是一个合理、结构清晰的简化实现，所有状态均由明确字段维护，为未来协同编辑功能扩展打下良好基础。

后续演进中我们将逐步加入版本、信令、服务端同步策略，并保持文档更新。
