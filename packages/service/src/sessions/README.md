# sessions 模块

用于管理服务端正在协同的所有文档会话。

## 目标

1. 支持多个文档同时协同（每个 documentId 对应一个 session）
2. 每个 session 内部维护：
   - 当前文档内容（Delta）
   - 当前服务端全局序号 sequence
   - 所有连接的客户端信息
   - 缓存的 ops（待持久化）
3. 提供基础 API：
   - `getOrCreateSession(documentId)`
   - `applyOp(...)`
   - `getKeyFrame(...)`
   - `broadcastOp(...)`
