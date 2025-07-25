# transport 模块说明

`transport` 模块负责处理客户端与服务端之间的通信，目前采用 WebSocket 实现，专注于传输层，与协同算法（如 OT）解耦。

---

## 模块定位

- 提供客户端 WebSocket 封装类 `WebSocketClient`
- 只负责消息发送与接收，不关心消息的语义
- 面向 `OTSession` 或外部业务提供简洁 API：`sendDelta` / `onRemoteOp`
- 后续可支持多种传输协议（如 WebRTC、BroadcastChannel 等）

---

## 设计思路

> 注意：关于 interface Message 属于 ws 信令设计了，这个可以好好想一下怎么设计比较合理，还有考虑加密什么的，这里我们就先这样

- WebSocketClient 实例由上层创建（如每个协同用户一个连接）
- 每条消息都包含：
  - `type`：标识消息类型，如 `op` 或 `join`
  - `senderId`：用于避免自己重复处理自己的操作
  - `op`：Delta 操作数据（基于 quill-delta）

```ts
interface Message {
  type: "op" | "join";
  senderId: string;
  op?: Delta["ops"];
}
```

## 后续计划

- 自动重连机制
- 心跳机制 +断线检测
- 加入 fileId 文档标识，支持多文档协同
- 支持更多消息类型：ack、cursor、presence
- 日志与调试信息输出支持
