# Common 包

这个包包含了项目中通用的工具类，主要提供全局日志系统。

## Logger 系统

### 特性

- **全局单例**: 挂载到 `window` 对象上，避免复杂的引用和打包问题
- **多客户端支持**: 支持不同用户名的颜色区分
- **层级结构**: 支持 namespace、username、docId 等层级信息
- **缓存功能**: 支持日志缓存和导出
- **颜色支持**: 支持自定义颜色和自动颜色分配
- **多级别**: 支持 error、warn、info、debug 四个级别

### 使用方法

#### 1. 初始化（在客户端登录成功后调用）

```typescript
import { initGlobalLogger } from '../common/src/utils/Logger';

// 在用户登录成功后初始化
initGlobalLogger({
  username: userInfo.userName,
  // 其他配置...
});
```

#### 2. 在代码中使用

```typescript
// 方式1: 直接使用全局对象
window.logger.collaborate.info('协同操作日志');
window.logger.document.info('文档操作日志');

// 方式2: 使用便捷函数
import { getGlobalLogger } from '../common/src/utils/Logger';

const logger = getGlobalLogger('collaborate');
logger.info('这是一条信息日志');
logger.warn('这是一条警告日志');
logger.error('这是一条错误日志');
logger.debug('这是一条调试日志');
```

#### 3. 日志格式

日志输出格式为：
```
[时间][级别][namespace][username][docId]: 消息内容
```

例如：
```
[10:45:21.498][INFO][collaborate][Alice][doc123]: 用户开始编辑文档
```

#### 4. 配置选项

```typescript
interface LoggerConfig {
  namespace?: string;        // 命名空间
  username?: string;         // 用户名
  docId?: string;           // 文档ID
  color?: string;           // 自定义颜色
  enableCache?: boolean;    // 是否启用缓存
  maxCacheSize?: number;    // 最大缓存大小
  enableConsole?: boolean;  // 是否输出到控制台
}
```

### 优势

1. **简化引用**: 不需要复杂的包引用，直接通过路径引用
2. **全局管理**: 挂载到 window 对象，避免状态管理问题
3. **单例模式**: 确保整个应用使用同一个日志实例
4. **自动打包**: 打包时会自动包含 common 包的内容
5. **易于维护**: 统一的日志系统，便于维护和扩展

### 注意事项

- 初始化应该在用户登录成功后进行
- 服务端环境会自动使用简单的格式化输出
- 支持从 URL 参数自动获取 docId
- 用户名颜色会根据用户名自动分配 