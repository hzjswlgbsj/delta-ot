# Test Lab 重构说明

## 目录结构

```
test-lab/
├── components/                   # 测试组件目录（独立于正式业务）
│   ├── FloatingTestPanel/        # 悬浮测试面板组件
│   │   ├── index.tsx            # 组件主文件
│   │   └── style.module.less    # 组件样式文件
│   ├── ClientEditorBox/          # 客户端编辑器组件
│   │   ├── index.tsx            # 组件主文件
│   │   └── style.module.less    # 组件样式文件
│   ├── ControlPanel/             # 控制面板组件
│   │   ├── index.tsx            # 组件主文件
│   │   └── style.module.less    # 组件样式文件
│   ├── TestPage/                 # 测试页面组件
│   │   ├── index.tsx            # 组件主文件
│   │   └── style.module.less    # 组件样式文件
│   └── index.ts                  # 组件统一导出
├── constants/                    # 常量目录
│   ├── testCases.ts             # 测试用例列表
│   ├── testCaseConfig.ts        # 测试用例配置
│   └── index.ts                 # 常量统一导出
├── collab/                      # 原有文件（保留兼容性）
│   ├── ClientEditorBox.tsx      # 原有文件
│   ├── ControlPanel.tsx         # 原有文件
│   ├── TestPage.tsx             # 原有文件
│   ├── TestExecutor.ts          # 测试执行器
│   └── testCases.ts             # 测试用例实现（包含simpleTest）
├── utils/                       # 工具函数
│   ├── IframeMessageManager.ts  # iframe消息管理器
│   └── DeltaDiff.ts             # Delta差异比较
└── README.md                    # 本文件
```

## 重构内容

### 1. 组件重构
- **FloatingTestPanel**: 悬浮测试面板，支持拖拽、收起、localStorage缓存
- **ClientEditorBox**: 客户端编辑器包装组件
- **ControlPanel**: 控制面板组件
- **TestPage**: 测试页面主组件

### 2. 样式重构
- 所有组件使用 `style.module.less` 命名规范
- 采用Less预处理器，支持嵌套和变量
- 使用CSS Modules避免样式冲突

### 3. 常量提取和程序化构造
- **testCases.ts**: 通过程序分析testCases.ts中的导出函数自动生成测试用例列表
- **testCaseConfig.ts**: 测试用例配置对象
- **simpleTest合并**: 将simpleTest.ts的内容合并到testCases.ts中
- 统一导出便于管理

### 4. 兼容性保持
- 原有文件保留，通过重定向保持向后兼容
- 新组件通过统一导出文件管理

### 5. 目录分离
- 测试组件独立于正式业务组件
- 避免与正式业务代码混淆

## 使用方式

### 导入新组件
```typescript
import { FloatingTestPanel, ClientEditorBox, ControlPanel, TestPage } from './components';
```

### 导入常量
```typescript
import { testCases, testCaseConfig } from './constants';
```

### 导入原有组件（兼容性）
```typescript
import FloatingTestPanel from './collab/FloatingTestPanel';
```

## 开发规范

1. **组件命名**: 使用PascalCase，每个组件一个文件夹
2. **样式文件**: 统一使用 `style.module.less` 命名
3. **导出方式**: 通过index.ts统一导出
4. **类型定义**: 在constants文件中定义接口和类型
5. **注释规范**: 使用中文注释，说明组件功能
6. **目录分离**: 测试组件独立于正式业务组件

## 迁移指南

### 从旧组件迁移到新组件

1. **FloatingTestPanel**:
   ```typescript
   // 旧方式
   import FloatingTestPanel from './collab/FloatingTestPanel';
   
   // 新方式
   import { FloatingTestPanel } from './components';
   ```

2. **样式引用**:
   ```typescript
   // 旧方式
   import './FloatingTestPanel.css';
   
   // 新方式
   import styles from './components/FloatingTestPanel/style.module.less';
   ```

3. **测试用例引用**:
   ```typescript
   // 旧方式
   import { testCases } from './collab/testCases';
   
   // 新方式
   import { testCases } from './constants';
   ```

## 注意事项

1. 新组件使用CSS Modules，样式类名会自动生成唯一标识
2. 原有文件仍然可用，但建议逐步迁移到新组件
3. 测试用例配置已提取到constants目录，便于统一管理
4. 所有组件都支持TypeScript类型检查
5. 测试组件独立于正式业务，不会影响生产环境 