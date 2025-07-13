# cleanRetainZero 应用分析报告

## 问题背景

Quill 编辑器会产生 `retain(0)` 操作，这会导致 transform 结果错误。通过测试验证，当 A 操作包含 `retain(0)` 时，B 的 `retain(4)` 被错误地转换为 `retain(1)`。

## 解决方案

在构造 Delta 对象时清理 `retain(0)` 操作：

```typescript
function cleanRetainZero(delta: Delta): Delta {
  const cleanedOps = delta.ops.filter(op => !(op.retain === 0));
  return new Delta(cleanedOps);
}
```

## 需要应用 cleanRetainZero 的地方

### 1. ✅ 已修复：服务端 DocumentSession

**文件**: `packages/service/src/sessions/DocumentSession.ts`

**位置**:

- `applyClientOperation` 方法中处理客户端操作时
- 历史操作 transform 时

**状态**: ✅ 已修复

### 2. 🔴 需要修复：客户端 OTSession

**文件**: `packages/collaborate/src/session/OTSession.ts`

**位置**:

- `receiveRemote` 方法中处理远端操作时
- `commitLocal` 方法中处理本地操作时

**原因**: 客户端也会收到来自 Quill 编辑器的操作，可能包含 `retain(0)`

**修复建议**:

```typescript
// 在 receiveRemote 方法中
receiveRemote(remoteOp: Delta) {
  // 清理 retain(0) 操作
  const cleanedRemoteOp = this.cleanRetainZero(remoteOp);
  
  // 正确的 OT 逻辑：远端操作需要被所有本地未确认操作 transform
  let transformed = cleanedRemoteOp;
  for (const localMsg of this.unAckOps) {
    // 同样清理本地操作中的 retain(0)
    const cleanedLocalOp = this.cleanRetainZero(localMsg.data);
    transformed = OTEngine.transform(cleanedLocalOp, transformed);
  }
  
  // ... 其余逻辑
}

// 在 commitLocal 方法中
commitLocal(msg: ClientMessage<Delta>): void {
  // 清理 retain(0) 操作
  const cleanedOp = this.cleanRetainZero(msg.data as Delta);
  
  // 更新 unAckOps 中的操作
  const cleanedMsg = { ...msg, data: cleanedOp };
  this.unAckOps.push(cleanedMsg);
  this.document.apply(cleanedOp);
}
```

### 3. 🔴 需要修复：DocumentManager

**文件**: `packages/document/src/controllers/DocumentManager.ts`

**位置**:

- `handleKeyFrame` 方法中设置初始内容时

**原因**: 服务端发送的初始内容可能包含 `retain(0)`

**修复建议**:

```typescript
handleKeyFrame(data: KeyFramePayload): void {
  console.log("[DocumentManager] Applying KeyFrame", data);
  const docStore = useDocStore();
  const { sequence, content, userIds } = data;
  this.websocket.ws.sequence = sequence;
  
  // 清理 retain(0) 操作
  const cleanedContent = this.cleanRetainZero(new Delta(content));
  this.collaborate.otSession.setContents(cleanedContent);
  
  docStore.setUserIds(userIds);
}

private cleanRetainZero(delta: Delta): Delta {
  const cleanedOps = delta.ops.filter(op => !(op.retain === 0));
  return new Delta(cleanedOps);
}
```

### 4. 🔴 需要修复：OTEngine（可选）

**文件**: `packages/collaborate/src/engine/OTEngine.ts`

**位置**:

- `transform` 方法中

**原因**: 作为底层引擎，可以在这里统一处理

**修复建议**:

```typescript
static transform(op1: Delta, op2: Delta): Delta {
  console.log(
    "[OTEngine] transform: ",
    JSON.stringify(op1),
    JSON.stringify(op2)
  );
  
  // 清理 retain(0) 操作
  const cleanedOp1 = this.cleanRetainZero(op1);
  const cleanedOp2 = this.cleanRetainZero(op2);
  
  const transformed = cleanedOp1.transform(cleanedOp2, true);
  console.log(`[OTEngine] transform: ${JSON.stringify(transformed)}`);
  return transformed;
}

private static cleanRetainZero(delta: Delta): Delta {
  const cleanedOps = delta.ops.filter(op => !(op.retain === 0));
  return new Delta(cleanedOps);
}
```

### 5. 🔴 需要修复：DocumentModel

**文件**: `packages/collaborate/src/model/DocumentModel.ts`

**位置**:

- `apply` 方法中

**原因**: 应用操作时也应该清理 `retain(0)`

**修复建议**:

```typescript
apply(op: Delta): Delta {
  // 清理 retain(0) 操作
  const cleanedOp = this.cleanRetainZero(op);
  this.content = this.content.compose(cleanedOp);
  return this.content;
}

private cleanRetainZero(delta: Delta): Delta {
  const cleanedOps = delta.ops.filter(op => !(op.retain === 0));
  return new Delta(cleanedOps);
}
```

## 优先级建议

### 高优先级（必须修复）

1. **客户端 OTSession** - 直接影响协同编辑的正确性
2. **DocumentManager** - 影响初始内容设置

### 中优先级（建议修复）

3. **OTEngine** - 统一处理，但可能影响性能
4. **DocumentModel** - 确保所有操作都经过清理

## 测试验证

修复后应该验证以下场景：

1. Quill 编辑器产生的 `retain(0)` 操作被正确清理
2. Transform 结果正确（`retain(4)` → `retain(5)`）
3. 最终文档内容正确（`"1base4"` 而不是 `"14"`）
4. 多客户端协同编辑正常工作

## 总结

主要需要在 **客户端 OTSession** 和 **DocumentManager** 中应用 `cleanRetainZero`，这样可以确保：

- 客户端收到的远端操作被正确清理
- 客户端发送的本地操作被正确清理
- 初始内容设置时被正确清理

这将彻底解决 `retain(0)` 导致的 transform 问题。
