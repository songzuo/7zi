# 技术栈报告 - 7zi-frontend

**分析时间**: 2026-05-02  
**版本**: 1.14.1  
**架构师**: 子代理 - tech-stack-analysis

---

## 1. 项目概览

| 项目属性 | 值 |
|---|---|
| **项目名称** | 7zi-frontend |
| **版本** | 1.14.1 |
| **类型** | 全栈 Web 应用（Next.js SSR + API） |
| **语言** | TypeScript 5 |
| **包管理器** | pnpm |
| **Node 版本** | 未指定 (建议 ≥20) |

---

## 2. 前端框架

| 库 | 版本 | 用途 |
|---|---|---|
| **Next.js** | 16.2.4 | SSR/SSG 框架 |
| **React** | 19.2.4 | UI 库 |
| **TypeScript** | ^5 | 类型系统 |

### 状态管理与样式
| 库 | 版本 | 用途 |
|---|---|---|
| **Zustand** | ^5.0.12 | 状态管理 |
| **Tailwind CSS** | ^4.2.2 | CSS 框架 |

### UI 组件库
| 库 | 版本 | 用途 |
|---|---|---|
| **Lucide React** | ^1.7.0 | 图标库 |
| **@xyflow/react** | ^12.10.2 | 工作流编辑器 |
| **Recharts** | ^3.8.0 | 图表库 |
| **@react-three/drei/fiber** | ^10.7.7 / ^9.5.0 | 3D 渲染 |
| **Three.js** | ^0.183.2 | WebGL/3D |

### 国际化
| 库 | 版本 | 用途 |
|---|---|---|
| **next-intl** | ^4.9.1 | i18n 框架 |

---

## 3. 后端/运行时

| 库 | 版本 | 用途 |
|---|---|---|
| **Hono** | ^4.12.14 | 轻量 API 框架 |
| **@hono/node-server** | ^1.19.14 | Node.js 适配器 |
| **better-sqlite3** | ^12.8.0 | SQLite 数据库 |
| **Bull** | ^1.1.3 | 任务队列（基于 Redis） |
| **ioredis** | ^5.10.1 | Redis 客户端 |

### 认证与安全
| 库 | 版本 | 用途 |
|---|---|---|
| **jose** | ^6.2.1 | JWT 处理 |
| **dompurify / isomorphic-dompurify** | ^3.4.0 / ^3.6.0 | XSS 防护 |

### 数据处理
| 库 | 版本 | 用途 |
|---|---|---|
| **ExcelJS** | ^3.4.0 | Excel 导入/导出 |
| **JSZip** | ^3.10.1 | ZIP 处理 |
| **jsPDF** | ^4.2.1 | PDF 生成 |
| **html2canvas** | ^1.4.1 | 截图 |

### 搜索与模糊匹配
| 库 | 版本 | 用途 |
|---|---|---|
| **Fuse.js** | ^7.1.0 | 模糊搜索 |

### 实时通信
| 库 | 版本 | 用途 |
|---|---|---|
| **socket.io-client** | ^4.8.3 | WebSocket 客户端 |
| **yjs** | ^13.6.30 | 实时协作 (CRDT) |

### 验证与工具
| 库 | 版本 | 用途 |
|---|---|---|
| **Zod** | ^4.3.6 | Schema 验证 |
| **Lodash / Lodash-es** | ^4.18.1 | 工具库 |
| **Handlebars** | ^4.7.9 | 模板引擎 |
| **sharp** | ^0.34.5 | 图片处理 |
| **Glob** | ^13.0.6 | 文件匹配 |
| **uuid** | ^14.0.0 | ID 生成 |

---

## 4. 开发工具

### 测试
| 库 | 版本 | 用途 |
|---|---|---|
| **Vitest** | ^4.1.2 | 单元测试 |
| **@vitest/coverage-v8** | ^4.1.2 | 覆盖率 |
| **Playwright** | ^1.58.2 | E2E 测试 |
| **@testing-library/react** | ^16.3.2 | React 测试 |
| **MSW** | ^2.12.14 | API Mock |
| **jsdom** | ^29.0.1 | DOM 模拟 |
| **Supertest** | ^7.2.2 | HTTP 测试 |

### 代码质量
| 库 | 版本 | 用途 |
|---|---|---|
| **ESLint** | ^9 | 代码检查 |
| **eslint-config-next** | ^16.2.1 | Next.js 规则 |
| **Prettier** | (通过 plugin) | 代码格式化 |
| **Madge** | ^8.0.0 | 循环依赖检测 |
| **@next/bundle-analyzer** | ^16.2.1 | Bundle 分析 |

### 构建与优化
| 库 | 版本 | 用途 |
|---|---|---|
| **Vite** | ^8.0.8 | 打包工具（测试用） |
| **@ducanh2912/next-pwa** | ^10.2.9 | PWA 支持 |
| **@rollup/plugin-terser** | 1.0.0 | 代码压缩 |
| **babel-plugin-react-compiler** | 1.0.0 | React Compiler |

### 监控
| 库 | 版本 | 用途 |
|---|---|---|
| **@sentry/nextjs** | ^10.44.0 | 错误追踪 |
| **Web Vitals** | ^5.1.0 | 性能指标 |

### 其他
| 库 | 版本 | 用途 |
|---|---|---|
| **Commander** | ^14.0.3 | CLI 工具 |
| **@modelcontextprotocol/sdk** | ^1.27.1 | MCP 集成 |

---

## 5. 目录结构

```
src/
├── app/           # Next.js App Router 页面
├── components/    # React 组件 (38个子目录)
├── config/        # 配置文件
├── contexts/      # React Context
├── data/         # 数据层
├── features/     # 特性模块
├── hooks/        # 自定义 Hooks
├── i18n/         # 国际化配置
├── lib/          # 核心库 (72个子目录, 105个条目)
│   ├── agents/   # AI Agent 逻辑
│   ├── ai/       # AI 相关
│   ├── alerting/ # 告警系统
│   ├── api/      # API 封装
│   ├── auth/     # 认证
│   ├── collab/   # 协作功能
│   ├── db/       # 数据库
│   ├── error/    # 错误处理
│   ├── learning/ # 学习引擎
│   ├── monitoring/ # 监控
│   ├── notifications/ # 通知
│   ├── rate-limit/  # 限流
│   ├── realtime/    # 实时通信
│   ├── redis/       # Redis
│   ├── search/      # 搜索
│   ├── websocket/   # WebSocket
│   └── workflow/    # 工作流
├── middleware/   # 中间件
├── stores/      # Zustand stores
├── styles/      # 全局样式
├── test/        # 测试工具
├── types/       # TypeScript 类型
└── workflows/    # 工作流引擎
```

---

## 6. 技术债务评估

### 🔴 高优先级

1. **React 19 迁移未完成**
   - React 19.2.4 已采用，但部分优化（如 React Compiler）尚未完全启用
   - 建议: 完成 React Compiler 验证并逐步启用

2. **TypeScript `any` 类型清理**
   - 项目有大量 `any` 类型需迁移到具体类型
   - 已有多轮清理，但仍存在技术债务

3. **循环依赖风险**
   - 使用 Madge 检测，存在潜在循环依赖
   - 建议: 持续重构 lib 内部模块边界

4. **包体积优化**
   - node_modules 891 个依赖，bundle 较大
   - 已有 Turbopack/Webpack 双构建支持

### 🟡 中优先级

1. **依赖版本滞后**
   - 部分库（如 bull ^1.1.3）版本较旧
   - `undici` 安全问题需关注

2. **测试覆盖率**
   - 已建立 Vitest/Playwright 体系，但仍有覆盖率提升空间
   - E2E 测试配置复杂（多种配置文件）

3. **PWA 与离线**
   - 已实现但需持续优化（如离线支持）

### 🟢 建议改进

1. **Next.js 16 新特性利用**
   - 持续利用 Next.js 16 的 Turbopack 等新特性

2. **状态管理现代化**
   - Zustand 已用，应评估是否有 Hooks + Context 替代方案

3. **错误处理统一**
   - 已有 `lib/error/` 和 `lib/errors/`，可能存在冗余

---

## 7. 现代化改进机会

| 领域 | 当前 | 建议 | 优先级 |
|---|---|---|---|
| **框架** | Next.js 16.2.4 | 已是最新，保持跟进 | 🟢 |
| **React** | 19.2.4 | 启用 React Compiler | 🟡 |
| **状态** | Zustand 5 | 考虑 Zustand Selectors 优化 | 🟢 |
| **包管理** | pnpm | 已是最佳实践 | 🟢 |
| **构建** | Webpack + Turbopack | Turbopack 稳定后迁移 | 🟡 |
| **CSS** | Tailwind 4 | 已是最新 | 🟢 |
| **测试** | Vitest + Playwright | 建立测试金字塔 | 🟡 |
| **监控** | Sentry + Web Vitals | 扩展 APM | 🟡 |

---

## 8. 依赖统计

| 类别 | 数量 |
|---|---|
| 生产依赖 | 46 |
| 开发依赖 | 29 |
| **总计** | **75** |

### 主要依赖分类
- **UI/组件**: Lucide, Recharts, Three.js, XYFlow
- **数据处理**: ExcelJS, JSZip, jsPDF, Fuse.js
- **后端/存储**: Hono, Bull, Redis, SQLite
- **实时**: Socket.io, Yjs
- **安全**: jose, DOMPurify, Sentry
- **验证**: Zod, TypeScript

---

## 9. 总结

**7zi-frontend** 是一个功能完备的**全栈 Next.js 应用**，技术栈现代且全面：

✅ **优势**:
- React 19 + Next.js 16 最新技术栈
- 完善的状态管理、实时协作、3D 可视化能力
- 丰富的测试体系 (Vitest + Playwright)
- PWA、国际化、性能监控等企业级功能

⚠️ **需关注**:
- React Compiler 的逐步采用
- TypeScript strict 模式完善
- 依赖体积优化
- 模块边界清晰化（减少循环依赖）

---

*报告生成于 2026-05-02 由架构房子代理完成*