# 协同编辑日志系统

一个专为协同编辑项目设计的日志系统，支持多客户端区分、层级结构、颜色显示和缓存功能。

## 特性

- ✅ **多客户端区分**：通过用户名和命名空间区分不同客户端的日志
- ✅ **层级结构**：`[时间][级别][命名空间][用户名]：内容` 的格式
- ✅ **颜色支持**：标题部分支持颜色区分，不同用户自动分配不同颜色
- ✅ **多参数支持**：像原生 console 一样支持多个参数
- ✅ **缓存功能**：日志可以缓存在浏览器中，支持导出
- ✅ **预留上报**：为后续服务器上报预留接口
- ✅ **全局管理**：支持全局日志管理器，统一管理多个日志器

## 快速开始

### 基本用法

```typescript
import { Logger } from '../../../common/src/utils/Logger';

// 创建日志器
const logger = new Logger({
  namespace: 'OTSession',
  username: 'Alice',
  color: '#ff4444'
});

// 记录日志
logger.info('用户登录成功');
logger.warn('网络连接不稳定');
logger.error('操作失败', { error: 'timeout' });
logger.debug('调试信息', { data: 'test' });
```

### 多客户端场景

```typescript
// 客户端A
const clientA = new Logger({
  namespace: 'Client',
  username: 'Alice',
  color: '#44ff44'
});

// 客户端B
const clientB = new Logger({
  namespace: 'Client',
  username: 'Bob',
  color: '#4444ff'
});

// 不同客户端的日志会显示不同颜色
clientA.info('Alice开始编辑');
clientB.info('Bob加入编辑');
```

### 使用全局日志管理器

```typescript
import { GlobalLoggerManager } from '../../../common/src/utils/Logger';

const manager = GlobalLoggerManager.getInstance();

// 获取或创建日志器
const sessionLogger = manager.getLogger('session', { username: 'user1' });
const engineLogger = manager.getLogger('engine', { username: 'user1' });

// 记录不同模块的日志
sessionLogger.info('会话初始化');
engineLogger.info('OT引擎启动');

// 导出所有日志
const allLogs = manager.exportAllLogs();
```

### 便捷函数

```typescript
import { createLogger, getLogger } from '../../../common/src/utils/Logger';

// 创建日志器
const logger1 = createLogger({ username: 'user1' });

// 获取全局日志器
const logger2 = getLogger('test', { username: 'user2' });
```

## 配置选项

### LoggerConfig

```typescript
interface LoggerConfig {
  namespace?: string;        // 命名空间
  username?: string;         // 用户名
  docId?: string;           // 文档ID
  color?: string;           // 自定义颜色
  clientId?: string;        // 客户端标识，用于确定颜色
  enableCache?: boolean;    // 是否启用缓存（默认true）
  maxCacheSize?: number;    // 最大缓存大小（默认1000）
  enableConsole?: boolean;  // 是否输出到控制台（默认true）
}
```

## API 参考

### Logger 类

#### 构造函数

```typescript
new Logger(config?: LoggerConfig)
```

#### 日志方法

```typescript
logger.error(message: string, ...args: any[]): void
logger.warn(message: string, ...args: any[]): void
logger.info(message: string, ...args: any[]): void
logger.debug(message: string, ...args: any[]): void
```

#### 缓存方法

```typescript
logger.getCachedLogs(): LogEntry[]           // 获取缓存的日志
logger.clearCache(): void                    // 清空缓存
logger.getCacheSize(): number                // 获取缓存大小
logger.exportLogs(): string                  // 导出为JSON字符串
```

#### 配置方法

```typescript
logger.setConfig(config: Partial<LoggerConfig>): void
logger.createChild(config: Partial<LoggerConfig>): Logger
```

### GlobalLoggerManager 类

#### 单例获取

```typescript
GlobalLoggerManager.getInstance(): GlobalLoggerManager
```

#### 管理方法

```typescript
manager.getLogger(name: string, config?: LoggerConfig): Logger
manager.setDefaultConfig(config: LoggerConfig): void
manager.getAllLoggers(): Map<string, Logger>
manager.clearAllLoggers(): void
manager.exportAllLogs(): Record<string, LogEntry[]>
```

## 日志格式

日志输出格式为：

```
[时间][级别][命名空间][用户名]：消息内容
```

例如：

```
[14:30:25.123][INFO][OTSession][Alice]：用户登录成功
[14:30:26.456][WARN][OTEngine][Bob]：网络连接不稳定
[14:30:27.789][ERROR][ConflictResolver][Alice]：操作失败 { error: 'timeout' }
```

## 颜色系统

### 自动颜色分配

- 不同用户名会自动分配不同颜色
- 使用哈希算法确保相同用户名总是获得相同颜色
- 支持12种预定义颜色

### 自定义颜色

```typescript
const logger = new Logger({
  username: 'user1',
  color: '#ff0000'  // 自定义红色
});
```

### 级别颜色

- ERROR: 红色 (#ff4444)
- WARN: 橙色 (#ff8800)
- INFO: 蓝色 (#0088ff)
- DEBUG: 灰色 (#888888)

## 在协同编辑项目中的应用

### 1. 替换现有的 console.log

```typescript
// 替换前
console.log('[OTSession] commitLocal:', JSON.stringify(msg.data));

// 替换后
const logger = new Logger({ namespace: 'OTSession', username: 'Alice' });
logger.info('commitLocal', JSON.stringify(msg.data));
```

### 2. 多模块日志管理

```typescript
// 在 OTSession 中
const sessionLogger = new Logger({ namespace: 'OTSession', username: userId });

// 在 OTEngine 中
const engineLogger = new Logger({ namespace: 'OTEngine', username: userId });

// 在 AttributeConflictResolver 中
const conflictLogger = new Logger({ namespace: 'ConflictResolver', username: userId });
```

### 3. 调试和问题排查

```typescript
// 启用缓存
const logger = new Logger({
  username: 'user1',
  enableCache: true,
  maxCacheSize: 2000
});

// 在问题发生时导出日志
const logs = logger.exportLogs();
console.log('问题日志:', logs);
```

## 最佳实践

### 1. 命名空间使用

- 使用有意义的命名空间区分不同模块
- 建议：`OTSession`、`OTEngine`、`ConflictResolver`、`Transport` 等

### 2. 用户名管理

- 在用户登录后设置用户名
- 使用真实的用户标识符

### 3. 日志级别

- ERROR: 错误和异常
- WARN: 警告和潜在问题
- INFO: 重要操作和状态变化
- DEBUG: 调试信息

### 4. 缓存管理

- 根据内存限制设置合适的缓存大小
- 定期清理不需要的日志
- 在关键操作时导出日志用于分析

### 5. 性能考虑

- 在生产环境中可以禁用缓存
- 可以禁用控制台输出来提高性能
- 使用子日志器来避免重复配置

## 扩展功能

### 预留的服务器上报接口

```typescript
// 在 Logger 类中的预留方法
private reportToServer(entry: LogEntry): void {
  // TODO: 实现日志上报到服务器的逻辑
  // 可以在这里添加批量上报、错误上报等功能
}
```

### 自定义扩展

```typescript
// 扩展日志级别
enum CustomLogLevel {
  TRACE = 'trace',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// 扩展配置
interface CustomLoggerConfig extends LoggerConfig {
  customField?: string;
}
```

## 示例

查看 `Logger.example.ts` 文件获取完整的使用示例。 