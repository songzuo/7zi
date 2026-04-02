# 开发者快速入门指南

**版本**: v1.4.0  
**最后更新**: 2026-03-29  
**适用对象**: 新加入项目的开发者

---

## 📋 目录

1. [快速开始](#快速开始)
2. [环境准备](#环境准备)
3. [项目结构](#项目结构)
4. [开发流程](#开发流程)
5. [技术栈](#技术栈)
6. [开发工具](#开发工具)
7. [调试技巧](#调试技巧)
8. [常见问题](#常见问题)

---

## 快速开始

### ⏱️ 5 分钟克隆并安装

```bash
# 1. 克隆仓库
git clone https://github.com/songzuo/7zi.git
cd 7zi

# 2. 安装依赖
npm install

# 3. 复制环境变量
cp .env.example .env.local

# 4. 启动开发服务器
npm run dev
```

**访问**: http://localhost:3000

### ⏱️ 10 分钟运行并验证

```bash
# 1. 运行类型检查
npm run type-check

# 2. 运行代码检查
npm run lint

# 3. 运行单元测试
npm run test:run

# 4. 构建生产版本
npm run build

# 5. 启动生产服务器
npm run start
```

**验证清单**:

- ✅ 开发服务器启动成功 (http://localhost:3000)
- ✅ 类型检查通过
- ✅ Lint 检查通过
- ✅ 所有测试通过
- ✅ 生产构建成功

---

## 环境准备

### 必需软件

| 软件           | 版本要求 | 说明                   |
| -------------- | -------- | ---------------------- |
| **Node.js**    | ≥ 20.0.0 | 推荐 22.x LTS          |
| **npm**        | ≥ 10.0.0 | 包管理器               |
| **Git**        | ≥ 2.40   | 版本控制               |
| **PostgreSQL** | ≥ 15     | 数据库（生产环境）     |
| **Redis**      | ≥ 7.0    | 缓存和会话存储（可选） |

### 推荐工具

| 工具        | 用途       | 安装命令                       |
| ----------- | ---------- | ------------------------------ |
| **VS Code** | 代码编辑器 | https://code.visualstudio.com/ |
| **Docker**  | 容器化部署 | https://www.docker.com/        |
| **Postman** | API 测试   | https://www.postman.com/       |

### 环境变量配置

创建 `.env.local` 文件：

```bash
# 数据库配置
DATABASE_URL="postgresql://user:password@localhost:5432/7zi"

# 认证密钥
JWT_SECRET="your-jwt-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret"

# Redis 配置（可选）
REDIS_URL="redis://localhost:6379"

# GitHub API
GITHUB_TOKEN="your-github-token"

# Sentry 错误追踪（可选）
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"

# 功能开关
ENABLE_REACT_COMPILER="false"
ENABLE_TURBOPACK="true"
```

---

## 项目结构

### 📁 目录结构概览

```
7zi/
├── src/                     # 源代码目录
│   ├── app/                 # Next.js App Router 页面
│   │   ├── (auth)/          # 认证相关页面（登录、注册）
│   │   ├── (dashboard)/     # Dashboard 页面
│   │   ├── api/             # API 路由
│   │   └── layout.tsx       # 根布局
│   ├── components/          # React 组件
│   │   ├── ui/              # 基础 UI 组件
│   │   ├── features/        # 功能组件
│   │   └── layouts/         # 布局组件
│   ├── lib/                 # 核心库和工具
│   │   ├── agent-scheduler/ # v1.4.0 AI Agent 调度系统
│   │   ├── performance-monitoring/ # v1.4.0 性能监控
│   │   ├── websocket/       # WebSocket 功能
│   │   ├── auth/            # 认证逻辑
│   │   ├── db/              # 数据库操作
│   │   └── ...              # 其他模块
│   ├── hooks/               # 自定义 React Hooks
│   ├── stores/              # Zustand 状态管理
│   ├── types/               # TypeScript 类型定义
│   ├── i18n/                # 国际化翻译文件
│   └── styles/              # 全局样式
├── docs/                    # 文档目录
├── tests/                   # 测试文件
│   ├── api-integration/     # API 集成测试
│   └── e2e/                 # E2E 测试
├── public/                  # 静态资源
├── scripts/                 # 构建和部署脚本
└── .github/                 # GitHub Actions CI/CD
```

### 📂 核心目录详解

#### `src/app/` - Next.js App Router

```
src/app/
├── (auth)/                  # 认证路由组
│   ├── login/               # 登录页面
│   ├── register/            # 注册页面
│   └── layout.tsx           # 认证布局
├── (dashboard)/             # Dashboard 路由组
│   ├── tasks/               # 任务管理
│   ├── projects/            # 项目管理
│   └── settings/            # 设置页面
├── api/                     # API 路由
│   ├── auth/                # 认证 API
│   ├── tasks/               # 任务 API
│   └── webhooks/            # Webhook 端点
└── layout.tsx               # 根布局
```

#### `src/lib/` - 核心库（46 个模块）

**v1.4.0 新增模块**:

| 模块                       | 路径                          | 功能                  |
| -------------------------- | ----------------------------- | --------------------- |
| **agent-scheduler**        | `lib/agent-scheduler/`        | AI Agent 智能调度系统 |
| **performance-monitoring** | `lib/performance-monitoring/` | 性能监控和告警        |
| **rate-limit**             | `lib/rate-limit/`             | API 速率限制          |
| **prefetch**               | `lib/prefetch/`               | 智能预加载            |
| **keyboard-shortcuts**     | `lib/keyboard-shortcuts/`     | 键盘快捷键            |

**核心模块**:

| 模块          | 功能           | 关键文件                    |
| ------------- | -------------- | --------------------------- |
| **auth**      | 认证授权       | `auth.ts`, `session.ts`     |
| **db**        | 数据库操作     | `index.ts`, `connection.ts` |
| **websocket** | WebSocket 通信 | `client.ts`, `rooms.ts`     |
| **api**       | API 工具       | `fetch.ts`, `cache.ts`      |
| **logger**    | 日志系统       | `logger.ts`                 |
| **cache**     | 缓存管理       | `redis-cache.ts`            |

#### `src/components/` - 组件库（31 个分类）

```
src/components/
├── ui/                      # 基础 UI 组件
│   ├── Button.tsx           # 按钮
│   ├── Input.tsx            # 输入框
│   ├── Modal.tsx            # 模态框
│   └── ...
├── features/                # 功能组件
│   ├── TaskCard/            # 任务卡片
│   ├── ProjectList/         # 项目列表
│   └── ...
└── layouts/                 # 布局组件
    ├── Header.tsx           # 头部
    ├── Sidebar.tsx          # 侧边栏
    └── Footer.tsx           # 底部
```

---

## 开发流程

### 🌿 Git 工作流

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 开发和提交
git add .
git commit -m "feat: add your feature"

# 3. 推送分支
git push origin feature/your-feature-name

# 4. 创建 Pull Request
# 在 GitHub 上创建 PR，等待 CI 检查和代码审查

# 5. 合并到主分支
# 审查通过后，Squash and merge
```

### 📝 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型**:

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具

**示例**:

```bash
feat(agent-scheduler): add intelligent task matching algorithm

- Implement capability-based matching
- Add load balancing support
- Add priority scheduling

Closes #123
```

### 🧪 测试流程

```bash
# 单元测试
npm run test:run

# 监听模式
npm run test

# 测试覆盖率
npm run test:coverage

# E2E 测试
npm run test:e2e

# API 集成测试
npm run test:api
```

**测试文件命名**:

- 单元测试: `*.test.ts` 或 `*.test.tsx`
- 集成测试: `tests/api-integration/*.test.ts`
- E2E 测试: `tests/e2e/*.spec.ts`

### ✅ 代码检查

```bash
# TypeScript 类型检查
npm run type-check

# ESLint 检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化检查
npm run format:check

# 自动格式化
npm run format
```

---

## 技术栈

### 核心框架

| 技术             | 版本   | 用途            |
| ---------------- | ------ | --------------- |
| **Next.js**      | 16.2.1 | 全栈 React 框架 |
| **React**        | 19.2.4 | UI 库           |
| **TypeScript**   | 5.x    | 类型安全        |
| **Tailwind CSS** | 4.x    | 样式框架        |

### 状态管理

| 技术              | 版本   | 用途         |
| ----------------- | ------ | ------------ |
| **Zustand**       | 5.0.12 | 全局状态管理 |
| **React Context** | 内置   | 局部状态共享 |

### 数据处理

| 技术           | 版本  | 用途           |
| -------------- | ----- | -------------- |
| **PostgreSQL** | ≥ 15  | 主数据库       |
| **Redis**      | ≥ 7.0 | 缓存、会话     |
| **Socket.IO**  | 4.8.3 | WebSocket 通信 |

### 工具库

| 技术             | 用途       |
| ---------------- | ---------- |
| **Zod**          | 数据验证   |
| **date-fns**     | 日期处理   |
| **Recharts**     | 图表可视化 |
| **Lucide React** | 图标库     |

### 测试工具

| 技术                | 版本   | 用途       |
| ------------------- | ------ | ---------- |
| **Vitest**          | -      | 单元测试   |
| **Playwright**      | 1.58.2 | E2E 测试   |
| **Testing Library** | -      | React 测试 |

---

## 开发工具

### VS Code 推荐扩展

创建 `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "orta.vscode-jest",
    "formulahendry.auto-rename-tag",
    "naumovs.color-highlight",
    "dsznajder.es7-react-js-snippets"
  ]
}
```

### VS Code 配置

创建 `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]]
}
```

### Chrome 开发工具

**React DevTools**:

- 安装: Chrome Web Store
- 用途: React 组件树、Props、State 查看

**React Compiler DevTools** (v1.4.0+):

- 用途: 查看编译器优化效果
- 功能: 组件重新渲染次数、性能分析

---

## 调试技巧

### 🔍 日志调试

```typescript
// 使用统一的 logger
import { logger } from '@/lib/logger'

logger.info('Task created', { taskId: '123' })
logger.warn('Rate limit approaching', { remaining: 10 })
logger.error('Database connection failed', { error: err })
```

### 🐛 断点调试

**VS Code 配置** (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug full stack",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Debug Client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### 📊 性能调试

**React Profiler**:

```tsx
import { Profiler } from 'react'
;<Profiler
  id="TaskList"
  onRender={(id, phase, actualDuration) => {
    console.log(`${id} ${phase} took ${actualDuration}ms`)
  }}
>
  <TaskList />
</Profiler>
```

**性能监控** (v1.4.0):

```typescript
import { anomalyDetector } from '@/lib/performance-monitoring'

// 检测异常
const result = anomalyDetector.detectAnomaly('LCP', 3000)
if (result.isAnomaly) {
  console.warn('Performance anomaly detected:', result)
}
```

### 🌐 网络调试

**API 请求追踪**:

```typescript
// 使用 fetch wrapper
import { fetchWithCache } from '@/lib/api'

const data = await fetchWithCache('/api/tasks', {
  cacheTags: ['tasks'],
  cacheProfile: 'minutes',
})
```

**WebSocket 调试**:

```typescript
import { wsClient } from '@/lib/websocket'

// 查看连接状态
console.log('WebSocket state:', wsClient.getStatus())

// 监听事件
wsClient.on('connect', () => console.log('Connected'))
wsClient.on('disconnect', reason => console.log('Disconnected:', reason))
```

---

## 常见问题

### ❓ 安装问题

**Q: `npm install` 失败**

```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

**Q: `sharp` 模块安装失败**

```bash
# 使用预编译版本
npm install --platform=linux --arch=x64 sharp
```

### ❓ 构建问题

**Q: 构建内存溢出**

```bash
# 增加 Node.js 内存限制
NODE_OPTIONS='--max-old-space-size=4096' npm run build
```

**Q: TypeScript 类型错误**

```bash
# 重新生成类型
npm run type-check

# 重启 TypeScript 服务器（VS Code）
Cmd+Shift+P -> TypeScript: Restart TS Server
```

### ❓ 运行问题

**Q: 开发服务器启动慢**

```bash
# 使用 Turbopack（默认启用）
npm run dev:turbo

# 或禁用 Turbopack
npm run dev:webpack
```

**Q: 热更新不工作**

```bash
# 清除 .next 缓存
rm -rf .next

# 重启开发服务器
npm run dev
```

### ❓ 测试问题

**Q: 测试超时**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 30000, // 30 秒
    hookTimeout: 30000,
  },
})
```

**Q: E2E 测试失败**

```bash
# 安装浏览器
npx playwright install

# 查看测试报告
npm run test:e2e:report

# 调试模式
npm run test:e2e:debug
```

### ❓ 国际化问题

**Q: 翻译键缺失**

```bash
# 检查翻译完整性
npm run i18n:check

# 自动翻译缺失键
python scripts/translate-i18n.py
```

**Q: 语言切换不生效**

```typescript
// 检查 Cookie 设置
import { setLanguage } from '@/lib/i18n'

await setLanguage('zh') // 设置中文
```

### ❓ WebSocket 问题

**Q: WebSocket 连接失败**

```typescript
// 检查连接配置
import { wsClient } from '@/lib/websocket'

console.log('Config:', wsClient.getConfig())
console.log('Status:', wsClient.getStatus())

// 手动重连
wsClient.reconnect()
```

**Q: 房间加入失败**

```typescript
// 检查权限
import { roomManager } from '@/lib/websocket/rooms'

const canJoin = await roomManager.checkPermission(roomId, userId, 'join')
console.log('Can join:', canJoin)
```

### ❓ 性能问题

**Q: 页面加载慢**

```bash
# 分析 Bundle 大小
npm run build:analyze

# 查看 Bundle 报告
# 打开 .next/analyze/client.html
```

**Q: 内存泄漏**

```typescript
// 使用 React DevTools Profiler
// 或使用性能监控工具

import { performanceMonitor } from '@/lib/performance-monitoring'

performanceMonitor.startTracking('memory')
// ... 你的代码
performanceMonitor.stopTracking('memory')
```

---

## 📚 进一步学习

### 官方文档

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### 项目文档

- [API 文档](./API.md) - 完整的 API 参考
- [组件指南](./COMPONENT_GUIDE.md) - 组件开发规范
- [架构决策记录](./adr/) - 重要架构决策
- [部署指南](../DEPLOYMENT.md) - 生产环境部署

### 视频教程

- [Next.js 16 新特性](https://nextjs.org/blog)
- [React 19 入门](https://react.dev/blog)
- [v1.4.0 功能演示](https://7zi.com/docs/videos)

---

## 🤝 获取帮助

### 社区支持

- **GitHub Issues**: [https://github.com/songzuo/7zi/issues](https://github.com/songzuo/7zi/issues)
- **Discord**: [加入开发者社区](https://discord.gg/7zi)
- **文档**: [https://7zi.com/docs](https://7zi.com/docs)

### 联系团队

- **技术问题**: 创建 GitHub Issue
- **功能建议**: GitHub Discussions
- **紧急问题**: 发送邮件至 support@7zi.com

---

**欢迎加入 7zi 开发团队！** 🚀

如有任何问题，请随时在 GitHub Issues 中提问，或加入我们的 Discord 社区。
