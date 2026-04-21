# 7zi-frontend

<div align="center">

**下一代智能前端应用框架**

[![Version](https://img.shields.io/badge/version-1.14.0-blue.svg)](https://github.com/7zi/7zi-frontend)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2.5-blue.svg)](https://react.dev/)
[![Test Coverage](https://img.shields.io/badge/coverage-98%25-green.svg)](#测试)

</div>

---

## 📖 目录

- [简介](#简介)
- [特性](#特性)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [开发指南](#开发指南)
- [API 文档](#api-文档)
- [测试](#测试)
- [部署](#部署)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 简介

7zi-frontend 是一个基于 Next.js 16 构建的现代化前端应用框架，集成了 AI Agent 智能调度、WebSocket 实时协作、多语言国际化等企业级功能。

### 核心能力

- 🤖 **AI Agent 智能调度** - 自动化任务分配，效率提升 70-80%
- 🔄 **WebSocket 实时协作** - 完整的房间系统、权限控制、消息持久化
- 🌐 **国际化支持** - 内置 i18n，支持中英文切换
- 📊 **性能监控** - Web Vitals 监控、异常检测、智能告警
- 🎨 **设计系统** - 完整的组件库和主题系统
- 🔒 **安全加固** - JWT 认证、权限控制、输入验证
- 📱 **PWA 支持** - 离线访问、推送通知、安装到主屏
- 🌙 **暗色模式** - 主题切换、系统偏好检测
- 🤝 **协作系统 v2** - A2A V2 协议支持，Multi-Agent 协作
- ⚡ **WebSocket 压缩** - permessage-deflate 压缩，减少带宽

---

## 特性

### ✅ 已完成功能

| 功能模块            | 状态    | 说明                             |
| ------------------- | ------- | -------------------------------- |
| WebSocket 高级功能  | ✅ 完成 | 房间系统、权限控制、消息持久化   |
| AI Agent 智能调度   | ✅ 完成 | 任务匹配、负载均衡、Dashboard UI |
| 协作系统 v2 (A2A V2) | ✅ 完成 | Agent-to-Agent V2 协议支持       |
| WebSocket 压缩      | ✅ 完成 | permessage-deflate 压缩           |
| 监控告警系统        | ✅ 完成 | Web Vitals、异常检测、告警       |
| 性能监控升级        | ✅ 完成 | 实时监控 Dashboard               |
| React Compiler 可选 | ✅ 完成 | 环境变量控制，兼容性检测         |
| 国际化 (i18n)       | ✅ 完成 | 中英文支持，500+ 翻译键          |
| 图片优化            | ✅ 完成 | AVIF/WebP，6 种预设尺寸          |
| 安全加固            | ✅ 完成 | JWT 认证、权限控制、速率限制     |
| E2E 测试            | ✅ 完成 | Playwright 框架，完整覆盖        |
| 深色模式            | ✅ 完成 | 主题切换、系统偏好检测           |
| PWA 支持            | ✅ 完成 | 离线存储、Service Worker         |

---

## 快速开始

### 环境要求

- Node.js >= 20.9.0
- npm >= 9.0.0 或 pnpm >= 8.0.0
- Git

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/7zi/7zi-frontend.git
cd 7zi-frontend

# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

### 预期行为

运行 `npm run dev` 后：

1. **启动信息**

   ```
   ▲ Next.js 16.2.4
   - Local:        http://localhost:3000
   - Turbopack:    enabled
   ```

2. **首次启动**
   - Turbopack 编译约需 5-10 秒
   - 自动打开浏览器 (如果配置了)

3. **热更新**
   - 修改文件后自动刷新
   - Turbopack HMR 响应时间 < 100ms

4. **访问地址**
   - 开发服务器：http://localhost:3000
   - API 端点：http://localhost:3000/api/\*
   - WebSocket：ws://localhost:3000/ws

### 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器 (Turbopack)
npm run dev:webpack      # 启动开发服务器 (Webpack)

# 构建
npm run build            # 生产构建 (Webpack)
npm run build:turbopack  # 生产构建 (Turbopack)

# 测试
npm run test             # 运行单元测试
npm run test:watch       # 监视模式
npm run test:coverage    # 测试覆盖率报告
npm run test:e2e         # E2E 测试

# 代码质量
npm run lint             # ESLint 检查

# Storybook
npm run storybook        # 启动组件文档
```

---

## 项目结构

```
7zi-frontend/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── api/                # API 路由
│   │   │   ├── a2a/            # Agent-to-Agent 协议
│   │   │   ├── auth/           # 认证接口
│   │   │   ├── search/         # 搜索接口
│   │   │   └── ...
│   │   ├── (dashboard)/        # Dashboard 页面组
│   │   └── layout.tsx          # 根布局
│   │
│   ├── components/             # React 组件
│   │   ├── ui/                 # 基础 UI 组件
│   │   ├── dashboard/          # Dashboard 组件
│   │   └── ...
│   │
│   ├── lib/                    # 核心库 (分层架构)
│   │   ├── agents/             # AI Agent 相关
│   │   │   └── scheduler/      # 智能调度器
│   │   ├── api/                # API 工具
│   │   ├── auth.ts             # 认证逻辑
│   │   ├── db/                 # 数据库
│   │   ├── i18n/               # 国际化
│   │   ├── mcp/                # Model Context Protocol
│   │   ├── monitoring/         # 监控
│   │   ├── performance/        # 性能优化
│   │   ├── performance/anomaly-detection/  # 性能监控
│   │   ├── rate-limit/         # 速率限制
│   │   ├── security/           # 安全工具
│   │   ├── services/           # 业务服务
│   │   ├── utils/              # 工具函数
│   │   ├── websocket-manager.ts # WebSocket 管理
│   │   └── ...
│   │
│   ├── middleware/             # 中间件
│   │   └── auth.middleware.ts  # 认证中间件
│   │
│   ├── stores/                 # Zustand 状态管理
│   │
│   └── types/                  # TypeScript 类型定义
│
├── tests/                      # 测试文件
│   ├── api/                    # API 测试
│   ├── api-integration/        # 集成测试
│   └── websocket/              # WebSocket 测试
│
├── e2e/                        # E2E 测试
│
├── docs/                       # 文档
│
├── public/                     # 静态资源
│
└── scripts/                    # 脚本工具
```

### lib/ 层架构说明

`src/lib/` 采用分层架构设计：

| 目录           | 职责          | 说明                        |
| -------------- | ------------- | --------------------------- |
| `agents/`      | AI Agent 核心 | 智能调度、任务匹配          |
| `api/`         | API 工具层    | 请求处理、响应格式化        |
| `auth.ts`      | 认证逻辑      | JWT 验证、会话管理          |
| `db/`          | 数据访问层    | 数据库连接、查询封装        |
| `i18n/`        | 国际化        | 翻译资源、语言检测          |
| `mcp/`         | 协议层        | Model Context Protocol 实现 |
| `performance/` | 性能优化      | 缓存、懒加载                |
| `security/`    | 安全层        | XSS 防护、输入验证          |
| `services/`    | 业务服务      | 领域逻辑封装                |
| `utils/`       | 工具函数      | 通用工具、格式化            |

---

## 技术栈

### 核心框架

- **Next.js 16.2.4** - React 全栈框架
- **React 19.2.5** - UI 库
- **TypeScript 5.9.3** - 类型安全（严格模式已启用）

### 状态管理

- **Zustand 4.5** - 轻量级状态管理

### UI & 样式

- **Tailwind CSS 4** - 原子化 CSS
- **Lucide React** - 图标库
- **clsx + tailwind-merge** - 类名处理

### 数据处理

- **Zod 4.3** - 运行时类型验证
- **date-fns** - 日期处理

### 认证 & 安全

- **jose** - JWT 处理

### 国际化

- **i18next** - 国际化框架
- **react-i18next** - React 集成

### 实时通信

- **Socket.io Client** - WebSocket 客户端

### 测试

- **Vitest** - 单元测试
- **Playwright** - E2E 测试
- **Testing Library** - React 测试工具

---

## 开发指南

### 环境变量

参考 `.env.example` 配置环境变量：

```bash
# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 认证
JWT_SECRET=your-jwt-secret

# React Compiler (可选)
ENABLE_REACT_COMPILER=false
REACT_COMPILER_MODE=optimize
```

### 开发流程

1. **创建功能分支**

   ```bash
   git checkout -b feature/your-feature
   ```

2. **开发与测试**

   ```bash
   npm run dev       # 启动开发服务器
   npm run test      # 运行测试
   ```

3. **提交代码**

   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```

4. **创建 Pull Request**

### 代码规范

- 使用 TypeScript 编写所有代码
- 组件使用 `export default`
- 工具函数使用命名导出
- 测试文件放在 `__tests__/` 或 `tests/` 目录

---

## API 文档

### 认证中间件 (auth.middleware)

位置：`src/middleware/auth.middleware.ts`

认证中间件提供 API 路由的认证和授权功能。

#### 主要功能

- **路径保护** - 自动保护敏感 API 端点
- **用户信息提取** - 从请求头提取用户 ID、邮箱、角色
- **权限检查** - 基于角色的访问控制

#### 使用示例

```typescript
import { authMiddleware, checkPermissions, getUserId } from '@/middleware/auth.middleware'

// 基础认证
export async function GET(request: NextRequest) {
  const authResponse = authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse // 返回 401 Unauthorized
  }

  const userId = getUserId(request)
  // 处理认证后的请求
}

// 角色权限检查
const adminOnly = checkPermissions(['admin', 'superadmin'])
```

#### 保护路径

默认保护以下路径：

- `/api/search`
- `/api/data/import`
- `/api/data/export`

#### 导出函数

| 函数                      | 说明                 |
| ------------------------- | -------------------- |
| `authMiddleware(request)` | 基础认证中间件       |
| `checkPermissions(roles)` | 创建角色检查中间件   |
| `requireAuth(request)`    | 严格认证（所有路径） |
| `getUserId(request)`      | 获取用户 ID          |
| `getUserRole(request)`    | 获取用户角色         |

### API 端点

| 端点                 | 方法 | 认证 | 说明                |
| -------------------- | ---- | ---- | ------------------- |
| `/api/auth/login`    | POST | ❌   | 用户登录            |
| `/api/auth/register` | POST | ❌   | 用户注册            |
| `/api/search`        | GET  | ✅   | 搜索接口            |
| `/api/data/import`   | POST | ✅   | 数据导入            |
| `/api/data/export`   | GET  | ✅   | 数据导出            |
| `/api/a2a/*`         | \*   | ❌   | Agent-to-Agent V2 协议 |

---

## 测试

### 运行测试

```bash
# 单元测试
npm run test              # 运行所有测试
npm run test:watch        # 监视模式
npm run test:coverage     # 生成覆盖率报告

# E2E 测试
npm run test:e2e          # 运行 E2E 测试
npm run test:e2e:ui       # Playwright UI 模式
npm run test:e2e:debug    # 调试模式

# 全部测试
npm run test:all          # 单元测试 + E2E 测试
```

### 测试覆盖率

当前覆盖率：**~98%**

| 模块                | 覆盖率 |
| ------------------- | ------ |
| Agent Scheduler     | 100%   |
| WebSocket           | 100%   |
| Performance Monitor | 98.91% |
| 整体                | ~98%   |

### 测试文件位置

```
tests/
├── api/                # API 单元测试
├── api-integration/    # 集成测试
└── websocket/          # WebSocket 测试

src/**/__tests__/       # 组件测试
e2e/                    # E2E 测试
```

---

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t 7zi-frontend .

# 运行容器
docker run -p 3000:3000 7zi-frontend
```

### Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 生产构建

```bash
# 构建
npm run build

# 启动
npm run start
```

---

## 贡献指南

我们欢迎所有形式的贡献！

### 贡献步骤

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: 添加某个功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 提交规范

使用约定式提交：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

### 开发流程

1. **拉取最新代码**

   ```bash
   git pull origin main
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **创建分支并开发**

   ```bash
   git checkout -b feature/your-feature
   npm run dev
   ```

4. **运行测试确保通过**

   ```bash
   npm run test
   npm run lint
   ```

5. **提交并推送**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature
   ```

6. **创建 Pull Request**

---

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

## 联系方式

- **项目主页**: https://github.com/7zi/7zi-frontend
- **问题反馈**: https://github.com/7zi/7zi-frontend/issues

---

<div align="center">

**Made with ❤️ by 7zi Team**

</div>
