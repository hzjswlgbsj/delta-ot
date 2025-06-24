# delta-ot

## 关于

这是一个基于 quill delta 的 OT 方案的完整的协同编辑系统，包括协同编辑协议、OT 引擎、文档模型、操作控制器等模块，用于实现实时协同编辑的功能，如果你对 CRDT 的方案感兴趣可以看我的另一个仓库 [butterfly](https://github.com/hzjswlgbsj/butterfly) 也是完整版的实现初级版本供你继续开发。

通过这个项目你可以快速基于 [Quill](https://quilljs.com/) 编辑器实现一个在线协同文档的 **初级** 版本，包括文档的增删改查、协同编辑等功能，你可以基于这个版本继续开发。

但是本仓库更重要的目标是，理清楚协同文档的基本流程和实现原理，在每个模块中都有 `.md` 文档来描述每个模块的主要职责，帮助你理解每个模块的作用和实现逻辑。并且代码中也有十分详细的注释，
以及很多地方为啥要那么设计。

在 `collaborate` 包中的 OT 算法相关，我增加了十几个测试文件做 OT 算法的单元测试，一共包含近 50 条用例，基本覆盖了所有常见的操作转换场景，我建议你最好就是从测试用例开始了解，每个测试用例都有详细注释，
你可以通过 [用例文档](https://github.com/hzjswlgbsj/delta-ot/blob/master/packages/collaborate/src/tests/engine/transform-cases.md) 直接查看。

## 前端

这个项目的前端代码非常简单就是一个 html 初始化了一个 Quill 编辑器，未来可能会在 `document` 引入 react 或者 vue，可能增加 `editor` 包用于岁编辑器进行封装和美化主题

### 结构

目前主要实现了几个包

```bash
├─collaborate           // 为 OT 引擎模块，封装操作转换、操作合并、应用操作到目标文档的逻辑
├─document              // 文档的入口，是外层 UI 部分，比如编辑器主题定制，Toolbar 定制等等
├─editor                // 对 quill 编辑器进行扩展
├─service               // 为协同编辑协议，封装协同编辑的通信逻辑，包括 websocket、http 通信等。
```

其中 `collaborate` 的 src 结构

```bash
├─engine                // OT 引擎模块，封装操作转换相关逻辑。
├─model                 // 文档模型模块，负责管理文档的当前状态（基于 Quill 的 Delta 结构）。
├─session               // 协同会话模拟模块，提供操作流转机制（如 A → server → B）。
├─tests                 // 基于 vitest 的协同算法单元测试
├─transport             // 负责处理客户端与服务端之间的通信，目前采用 WebSocket 实现，专注于传输层，与协同算法（如 OT）解耦。
├─utils                 // 通用工具函数
└─store                 // redux 相关文件
  index.js              // 入口文件，导出资源配置
```

### 开发

每个包都有自动命令，详情查看每个包的 `package.json`

```bash
npm run dev
```

## 服务端

服务端的代码也在本仓库，可以直接使用 pm2 来管理启动

## Todo

- 数据持久化
- 定制 Toolbar
- 增加协同的集成测试

## 最后

这是一个探索性的项目，你可以基于这个项目继续开发以达到商用的水平，请不要直接用于生产环境，在线文档项目要做好不仅仅是跑通一个 Demo 就可以的。本项目首先是给有相同需求的朋友提供一些资料和 demo 以减少你们调研和项目初始化所花费的时间；其次，大家可以一起交流在线办公领域的解决方案。

这里也有一些资料，可以供你参考: [在线文档](https://www.sixtyden.com/#/README?id=%f0%9f%8c%bf-%e5%9c%a8%e7%ba%bf%e6%96%87%e6%a1%a3)

**如果该项目有帮助到你，请给个 Star 鼓励一下！**
