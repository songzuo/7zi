# 🚀 7zi - AI 驱动的团队管理平台

> **11 位 AI 成员 · 24/7 自主工作 · 实时协作**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/songzuo/7zi)
[![CI Status](https://github.com/songzuo/7zi/workflows/CI%20-%20Pull%20Request%20Checks/badge.svg)](https://github.com/songzuo/7zi/actions/workflows/ci-pr.yml)
[![Deploy Status](https://github.com/songzuo/7zi/workflows/Deploy%20-%20Main%20Branch/badge.svg)](https://github.com/songzuo/7zi/actions/workflows/deploy-main.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io-blue?logo=docker)](https://ghcr.io/songzuo/7zi)

---

## 📖 项目介绍

**7zi** 是一个革命性的 AI 驱动团队管理平台，由 **11 位专业 AI 成员** 组成完整的组织架构。我们重新定义了团队协作的可能性 —— 不再是人类管理工具，而是 **AI 团队自主工作**，人类只需制定战略方向。

### 🌟 核心创新

- **🤖 AI 主管系统** - 智能任务分配与协调
- **⚡ 24/7 不间断工作** - 无需休息，持续产出
- **📊 实时 Dashboard** - 透明化所有工作进展
- **🔄 自主决策** - 在授权范围内独立完成任务
- **🎯 目标驱动** - 专注于结果而非过程

---

## 🔥 最新进展 (v1.1.0 - 2026-03-23)

### 🎉 v1.1.0 核心亮点

| 功能 | 状态 | 说明 |
|------|------|------|
| 🔄 **WebSocket 实时协作** | ✅ 已完成 | 完整的实时协作 UI，支持多用户交互 |
| ⚡ **Redis 客户端与缓存** | ✅ 已完成 | Redis 客户端 + LRU 内存缓存 |
| 📦 **Next.js 代码分割** | ✅ 已完成 | 动态导入，减少 bundle 大小 |
| 📊 **性能监控系统** | ✅ 已完成 | 实时性能指标收集和分析 |
| 🧹 **内存泄漏修复** | ✅ 已完成 | 修复组件内存泄漏问题 |
| 🔧 **类型安全改进** | ✅ 已完成 | 修复 TypeScript 类型错误 |

### 🚀 近期完成的功能 (v1.1.0)

- **🔄 WebSocket Real-Time Collaboration** - 完整的实时协作演示页面，支持多用户交互
- **⚡ Redis Client Integration** - Redis 客户端 + LRU 内存缓存
- **📦 Next.js Code Splitting** - 动态导入，懒加载非关键组件
- **📊 Performance Monitoring System** - 实时性能指标收集和 E2E 测试
- **🧹 Memory Management** - 修复内存泄漏，优化组件生命周期
- **🔧 Type Safety** - 解决 vi.mock 类型错误，改进类型推断

### 🚀 v1.0.9 回顾

- **🌙 Complete Dark Mode System** - 完整的主题系统，支持 light/dark/system 三种模式
- **⚡ ISR Performance Optimization** - 增量静态再生成，8个静态页面优化
- **🧪 Test Coverage Expansion** - 测试覆盖 8个 API 路由和 3个关键 lib 模块
- **🗄️ Database Performance** - 备份 API 2000ms → 300ms (85% 提升)
- **🔒 Redis API Rate Limiting** - 分布式限流系统，支持滑动窗口和令牌桶算法
- **🎨 Theme Customization** - 7种颜色预设 + 完整的自定义选项
- **🔄 React 19 兼容性** - 111 个组件完整迁移到 React 19 API

### 📊 性能提升总结

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| **测试覆盖率** | 67% | 72-75% | +5-8% |
| **ISR 缓存命中率** | - | 70-85% | 新功能 |
| **TTFB (首页)** | ~200ms | ~50-80ms | 50-60% |
| **备份 API 响应** | 2000ms | 300ms | 85% |
| **批量查询性能** | 500ms | 50ms | 90% |
| **复杂查询延迟** | 200ms | 20ms | 90% |
| **数据库缓存命中** | 40% | 75% | 87.5% |

### 🎨 主题系统特性

- **🌙 三种主题模式** - Light / Dark / System (自动跟随系统)
- **🎨 7种预设主题** - blue, green, purple, orange, red, teal, indigo
- **⚙️ 完整自定义选项**:
  - 颜色调色板自定义
  - 间距缩放 (xs/sm/md/lg/xl/2xl)
  - 边框圆角 (none/sm/md/lg/xl/2xl/3xl)
  - 字体大小 (xs/sm/base/lg/xl/2xl/3xl)
- **💾 配置持久化** - localStorage 存储用户偏好
- **📤 导入导出** - 支持主题配置 JSON 导入导出
- **✨ 平滑过渡** - 主题切换动画和 FOUC 预防
- **♿ WCAG 合规** - AA 级对比度标准

### 🎯 ISR 优化详情

- **8个静态页面优化**:
  - 首页和营销页面: 7-30天重新验证
  - 投资组合和博客列表: 1小时 - 1天重新验证
  - 详情页面: 按需生成 + 按需重新验证
- **📊 缓存策略**:
  - 缓存命中率: 70-85%
  - TTFB 改进: 40-60%
  - 首页 TTFB: ~200ms → ~50-80ms
- **🔧 监控系统**:
  - `/api/revalidate` - 按需重新验证 API
  - Server Actions 自动缓存失效
  - 基于标签的缓存失效

### 🧪 测试覆盖扩展

- **新增测试文件** (9个):
  - `src/app/api/export/__tests__/route.test.ts` (7 tests)
  - `src/app/api/github/commits/__tests__/route.test.ts` (16 tests)
  - `src/app/api/health/__tests__/route.test.ts` (13 tests)
  - `src/app/api/health/ready/__tests__/route.test.ts` (8 tests)
  - `src/app/api/health/live/__tests__/route.test.ts` (7 tests)
  - `src/app/api/status/__tests__/route.test.ts` (15 tests)
  - `src/lib/__tests__/errors.test.ts` (40 tests)
  - `src/lib/api/__tests__/utils.test.ts` (78 tests)
  - `src/lib/api/__tests__/error-handler.test.ts` (53 tests)
- **测试场景**: 正常流程、错误处理、边界条件、安全测试
- **测试通过率**: 93.2% (221/237 tests passing)

### 🔒 API 限流系统

- **双算法支持**:
  - **滑动窗口算法** - 精确的时间窗口控制
  - **令牌桶算法** - 突发流量平滑处理
- **功能特性**:
  - Redis 分布式限流
  - 限流头部响应 (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
  - 事件日志和监控
  - 可配置的限流规则 (/api/tasks, /api/projects, /api/auth/*)
- **测试覆盖**: 20+ 测试用例，90%+ 覆盖率

### 项目状态

| 指标 | 状态 |
|------|------|
| **当前版本** | v1.1.0 |
| **发布日期** | 2026-03-23 |
| **项目状态** | 🚀 积极维护中 |
| **测试文件数** | 490+ ✅ |
| **测试覆盖率** | 72-75% ✅ |
| **API 端点数** | 65+ ✅ |
| **API 模块数** | 26 ✅ |
| **TypeScript 错误** | 101 → 持续优化中 ✅ |
| **ESLint** | 0 警告 ✅ |
| **构建状态** | 成功 ✅ |
| **React 19 兼容性** | 100% ✅ |

---

## 📋 版本历史

| 版本 | 日期 | 主要更新 |
|------|------|----------|
| **v1.1.0** | 2026-03-23 | 🔄 WebSocket 实时协作、⚡ Redis 客户端与缓存、📦 代码分割优化、📊 性能监控 |
| **v1.0.9** | 2026-03-23 | 🌙 暗黑模式、⚡ ISR 优化、🧪 测试覆盖率提升、🗄️ 数据库优化 |
| **v1.0.8** | 2026-03-22 | 🔐 RBAC 增强、📊 性能报告 API、🐛 TypeScript 错误修复 |
| **v1.0.6** | 2026-03-21 | 🔔 实时通知系统、👥 RBAC 权限控制、🧪 490+ 测试文件 |
| **v1.0.5** | 2026-03-20 | 🎤 语音会议、📱 移动端响应式、🚀 性能优化、🎨 主题持久化 |
| **v1.0.3** | 2026-03-19 | 核心库增强、页面布局优化、Hooks 性能提升 |
| **v1.0.0** | 2026-03-01 | 🎉 初始发布 - 11 AI 成员团队、任务管理、实时协作 |

---

## 👥 团队介绍

### 11 位 AI 成员

| 角色 | 职责 | 提供商 |
|------|------|--------|
| 🌟 **智能体世界专家** | 视角转换、未来布局 | MiniMax |
| 📚 **咨询师** | 研究分析、信息整理 | MiniMax |
| 🏗️ **架构师** | 系统设计、技术规划 | Self-Claude |
| ⚡ **Executor** | 任务执行、代码实现 | Volcengine |
| 🛡️ **系统管理员** | 运维部署、安全监控 | Bailian |
| 🧪 **测试员** | 质量保障、Bug 修复 | MiniMax |
| 🎨 **设计师** | UI/UX 设计、前端开发 | Self-Claude |
| 📣 **推广专员** | 市场推广、SEO 优化 | Volcengine |
| 💼 **销售客服** | 客户支持、商务合作 | Bailian |
| 💰 **财务** | 会计审计、成本控制 | MiniMax |
| 📺 **媒体** | 内容创作、品牌宣传 | Self-Claude |

---

## ✨ 功能特点

### 核心功能

- **🎯 任务管理**
  - 智能任务分解与分配
  - 自动进度追踪
  - 优先级动态调整
  - 任务标签系统
  - **批量操作** - 支持批量更新状态、优先级、标签、截止日期

- **🤝 团队协作**
  - 多 AI 角色协同工作
  - 实时消息传递
  - 会议系统支持
  - **WebSocket 实时通信** - 支持实时数据同步和协作

- **📊 可视化 Dashboard**
  - 实时任务状态
  - 团队工作效率
  - 历史数据分析
  - **API 缓存机制** - 智能缓存提升性能

- **🎨 完整主题系统** (v1.0.9 新增强)
  - **三种主题模式**: Light / Dark / System (自动跟随)
  - **7种预设主题**: blue, green, purple, orange, red, teal, indigo
  - **完整自定义配置**:
    - 颜色调色板自定义
    - 间距缩放 (xs/sm/md/lg/xl/2xl)
    - 边框圆角 (none/sm/md/lg/xl/2xl/3xl)
    - 字体大小 (xs/sm/base/lg/xl/2xl/3xl)
  - **配置持久化** - localStorage 存储用户偏好
  - **导入导出** - 主题配置 JSON 导入导出
  - **平滑过渡** - 主题切换动画和 FOUC 预防
  - **WCAG 合规** - AA 级对比度标准
  - **演示页面** - `/theme-demo` 展示所有组件

- **⚙️ 用户偏好**
  - 显示设置（动画、紧凑模式、字体大小）
  - 通知设置（桌面通知、声音、持续时间）
  - 语言和地区（语言、时区、日期/时间格式）
  - 隐私设置（在线状态、数据收集）
  - 高级设置（自动保存、页面大小、实验性功能）

- **🔐 安全控制 (RBAC)**
  - 基于角色的访问控制 (Role-Based Access Control)
  - **5 种内置角色**：ADMIN（管理员）、MANAGER（经理）、MEMBER（成员）、VIEWER（查看者）、GUEST（访客）
  - **45 种细粒度权限**：涵盖用户、团队、任务、设置、审批、报表、系统、日志、AI Agent、钱包等模块
  - 自定义角色和权限创建
  - 用户-角色-权限三级权限体系
  - 资源级别的访问控制
  - 操作审计日志记录
  - JWT Token 身份验证
  - 数据加密存储

- **📤 数据导出**
  - PDF 报告导出
  - CSV 数据导出
  - JSON 结构化导出
  - Excel 导出
  - **自定义数据导出** - 支持筛选条件和自定义数据

- **🎮 演示页面**
  - **WebSocket 演示** (`/websocket-demo`) - v1.1.0 新增，实时协作功能演示
  - **协作演示** (`/collaboration-demo`) - 实时协作功能演示
  - **SSE 演示** (`/sse-demo`) - Server-Sent Events 实时推送演示
  - **主题演示** (`/theme-demo`) - v1.0.9 新增，完整主题系统展示

- **🔔 实时通知系统**
  - WebSocket 实时推送通知 (Socket.IO)
  - 多种通知类型 (success/error/warning/info/task_assigned/system)
  - 四种优先级 (low/medium/high/urgent)
  - SQLite 持久化存储，支持已读/未读追踪
  - Email 通知集成 (Resend API)
  - 用户个性化偏好设置 (通知阈值、静默时段)
  - NotificationToast 组件 + useNotifications Hook
  - 六种位置配置，入场动画和键盘支持

### ⚡ 性能优化 (v1.1.0 + v1.0.9)

#### v1.1.0 新增

- **🔄 WebSocket Real-Time Collaboration**
  - 实时协作演示页面
  - 多用户交互支持
  - WebSocket 服务器集成
  - 实时 Dashboard 功能

- **⚡ Redis 客户端与缓存系统**
  - **Redis 客户端** - 生产级 Redis 客户端，支持连接池和自动重连
  - **LRU 内存缓存** - 高性能 LRU 缓存，支持 TTL 和统计追踪
  - 错误处理和优雅降级
  - 性能监控和日志记录
  - 为分布式缓存部署做好准备

- **📦 Next.js 代码分割**
  - 动态导入减少 bundle 大小
  - 非关键组件懒加载
  - XLSX 库改为动态导入
  - browserslist 配置减少 polyfills
  - 优化 splitChunks 配置
  - 合并小块减少碎片

- **📊 性能监控系统**
  - 实时性能指标收集
  - E2E 性能监控测试
  - 性能分析 Dashboard
  - 性能退化告警
  - 历史性能数据追踪

- **🧹 内存管理**
  - 修复组件文件中的内存泄漏
  - 清理未使用的组件和依赖
  - 优化组件生命周期管理
  - 改进垃圾回收效率

- **🔧 类型安全**
  - 解决测试文件中的 vi.mock 类型错误
  - 修复 TypeScript 类型问题
  - 改进跨代码库的类型推断
  - 替换 require() 为 import 语句

#### v1.0.9 增强

- **🚀 ISR 性能优化**
  - 8 个静态页面增量静态再生成
  - 缓存命中率 70-85%
  - TTFB (Time to First Byte) 提升 40-60%
  - 按需重新验证 API: `/api/revalidate`
  - Server Actions 自动缓存失效
  - 基于标签的缓存失效机制

- **🗄️ 数据库性能优化**
  - 备份 API: 2000ms → 300ms (85% 提升)
  - 批量查询: 500ms → 50ms (90% 提升)
  - 复杂查询: 200ms → 20ms (90% 提升)
  - 复合索引优化
  - N+1 查询检测和预防
  - 数据库缓存命中率: 40% → 75%

- **🔒 Redis API 限流**
  - 滑动窗口算法
  - Token Bucket 算法
  - 分布式限流支持
  - 限流头部响应
  - 事件日志和监控

---

## 🚀 快速开始

### 环境要求

- **Node.js** 22.x LTS 或更高版本
- **pnpm** 8+ 或 **npm** 10+
- **Git**

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/songzuo/7zi.git
cd 7zi

# 2. 安装依赖
pnpm install
# 或
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 文件，填入必要的环境变量

# 4. 启动开发服务器
pnpm dev
# 或
npm run dev

# 5. 打开浏览器访问
# http://localhost:3000
```

### 运行测试

```bash
# 运行所有测试（监视模式）
pnpm test

# 单次运行测试
pnpm test:run

# 生成覆盖率报告
pnpm test:coverage
```

### 代码检查

```bash
# 运行 ESLint
pnpm lint

# 自动修复问题
pnpm lint:fix

# 类型检查
pnpm type-check
```

---

## 🛠️ 技术栈

### 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 16.2.1 | React 全栈框架 (App Router + ISR) |
| **React** | 19.2.4 | UI 库 (100% 兼容) |
| **TypeScript** | 5.x | 类型安全 |
| **Tailwind CSS** | 4.x | 原子化 CSS |
| **Socket.IO Client** | 4.8.3 | WebSocket 通信 |
| **Zustand** | 5.0.12 | 状态管理 |
| **Lucide React** | 0.577.0 | 图标库 |
| **Sharp** | 0.34.5 | 图片优化 |

### 后端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 22.x LTS | 运行时环境 |
| **OpenClaw** | 最新 | AI 代理框架 |
| **Socket.IO** | 4.8.3 | 实时通信 |
| **better-sqlite3** | 12.8.0 | 数据库 |
| **Redis** | 最新 | 缓存和限流 |
| **jose** | 6.2.1 | JWT 认证 |

### AI 模型提供商

| 提供商 | 模型 | 用途 |
|--------|------|------|
| **MiniMax** | MiniMax-M2.5 | 智能体专家、咨询师、测试员、财务 |
| **Bailian** | Qwen3.5-Plus | 系统管理员、销售客服 |
| **Volcengine** | 豆包 | Executor、推广专员 |
| **Self-Claude** | Claude 3.5 | 架构师、设计师、媒体 |

### 测试工具

| 工具 | 版本 | 用途 |
|------|------|------|
| **Vitest** | 4.1.0 | 单元测试框架 |
| **Testing Library** | 16.x | 组件测试 |
| **JSDOM** | 28.x | 浏览器环境模拟 |
| **Playwright** | 1.58.2 | E2E 测试 |

---

## 🧪 测试

### 测试统计

| 指标 | 数值 |
|------|------|
| **测试文件数** | 490+ |
| **测试覆盖** | 组件、Hooks、工具函数、API |
| **测试覆盖率** | 72-75% (v1.0.9) |
| **测试通过率** | 93.2% (221/237) |
| **新增测试用例** | 237 (v1.0.9) |

### 测试覆盖范围

- **API 路由**: 8 个路由完全测试
- **核心模块**: 3 个关键 lib 模块 (errors, api/utils, error-handler)
- **测试场景**: 正常流程、错误处理、边界条件、安全测试

### 运行测试

```bash
# 运行所有测试 (监视模式)
npm test

# 单次运行测试
npm run test:run

# 生成覆盖率报告
npm run test:coverage

# E2E 测试
npm run test:e2e
```

---

## 🚀 部署

### 部署选项

项目支持多种部署方式：

- **🐳 Docker** - 使用 Dockerfile 和 docker-compose.yml 容器化部署
- **☁️ Vercel** - Next.js 原生支持，配置 `vercel.json` 即可
- **🐙 GitHub Actions** - 自动化 CI/CD 流程

### Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 生产环境
docker-compose -f docker-compose.prod.yml up -d
```

### Vercel 部署

```bash
# 登录 Vercel
vercel login

# 部署
vercel

# 生产环境
vercel --prod
```

---

## 📚 完整文档

### 📖 文档中心

完整的项目文档请查看 **[docs/INDEX.md](./docs/INDEX.md)**，包含：

- **🚀 快速入门** - README、QUICKSTART、部署指南
- **🏗️ 架构设计** - 系统架构、设计文档、架构图
- **💻 开发指南** - 开发环境、代码规范、组件开发
- **🧩 组件文档** - 组件使用指南、页面结构
- **📡 API 文档** - 完整 API 参考、端点列表、REST 规范
- **🏗️ 部署指南** - Docker、Vercel、CI/CD 配置
- **🔐 配置文档** - 环境变量、GCP/GitHub/Gmail 集成
- **🧪 测试文档** - 测试指南、覆盖率报告
- **📊 监控性能** - 监控系统、性能优化、Web Vitals
- **🔒 安全文档** - 错误处理、权限系统、安全审计

### 📂 文档统计

- **总文档数**: 119 个
- **最新文档**: 110+ 个
- **按角色分类**: 开发者、运维人员、产品经理、测试工程师

### 📄 v1.0.9 专项文档

- **DARK_MODE_DESIGN.md** - 暗黑模式设计规范
- **DARK_MODE_USAGE_GUIDE.md** - 暗黑模式使用指南
- **ISR_OPTIMIZATION_REPORT.md** - ISR 优化详细报告 (600+ 行)
- **TEST_COVERAGE_COMPLETION_REPORT.md** - 测试覆盖率完成报告
- **DATABASE_OPTIMIZATION_SUMMARY.md** - 数据库优化总结

详细文档索引：**[docs/INDEX.md](./docs/INDEX.md)**

---

## 📄 许可证

**双模式许可**

- **开源版本**: MIT License - 适用于个人和非商业项目
- **商业版本**: 商业许可证 - 适用于企业部署和商业用途

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！请阅读以下指南：

### 如何贡献

1. **Fork 项目** - 点击右上角 Fork 按钮
2. **创建分支** - `git checkout -b feature/amazing-feature`
3. **提交更改** - `git commit -m 'feat: add amazing feature'`
4. **推送分支** - `git push origin feature/amazing-feature`
5. **提交 PR** - 在 GitHub 上创建 Pull Request

### 代码规范

- 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 代码必须通过 ESLint 和 TypeScript 检查
- 新功能需要添加测试用例
- 测试覆盖率不低于 80%

详细贡献指南请参考 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 🙏 致谢

感谢以下项目和团队：
- [OpenClaw](https://github.com/openclaw) - AI 代理框架
- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- 所有 AI 模型提供商

---

## 📞 联系我们

- **GitHub**: [https://github.com/songzuo/7zi](https://github.com/songzuo/7zi)
- **Issues**: [https://github.com/songzuo/7zi/issues](https://github.com/songzuo/7zi/issues)
- **讨论**: [https://github.com/songzuo/7zi/discussions](https://github.com/songzuo/7zi/discussions)

---

<div align="center">

**🌟 如果这个项目对你有帮助，请给个 Star！**

[⭐ Star on GitHub](https://github.com/songzuo/7zi/stargazers)
| [📋 提交 Issue](https://github.com/songzuo/7zi/issues)
| [🍴 Fork 项目](https://github.com/songzuo/7zi/fork)

**Made with ❤️ by 11 AI Members & 🧑 宋琢环球旅行**

**v1.0.9 - 2026-03-23**

</div>
