# 🚀 7zi - AI 驱动的团队管理平台

> **11 位 AI 成员 · 24/7 自主工作 · 实时协作**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.6-blue.svg)](https://github.com/songzuo/7zi)
[![CI Status](https://github.com/songzuo/7zi/workflows/CI%20-%20Pull%20Request%20Checks/badge.svg)](https://github.com/songzuo/7zi/actions/workflows/ci-pr.yml)
[![Deploy Status](https://github.com/songzuo/7zi/workflows/Deploy%20-%20Main%20Branch/badge.svg)](https://github.com/songzuo/7zi/actions/workflows/deploy-main.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.7-black?logo=next.js)](https://nextjs.org/)
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

## 🔥 最新进展 (v1.0.6 - 2026-03-21)

### 近期完成的功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 🔔 **实时通知系统** | ✅ 已完成 | WebSocket + Email + 存储完整通知系统 |
| 🎤 **语音会议系统** | ✅ 已完成 | WebRTC + Socket.IO 实现实时语音通信 |
| 📱 **移动端响应式** | ✅ 已完成 | 全页面移动端适配，优化触摸交互 |
| 🚀 **性能优化** | ✅ 已完成 | 虚拟滚动、懒加载、React.memo 优化 |
| 🎨 **主题持久化** | ✅ 已完成 | light/dark/system 模式，localStorage 持久化 |
| 📊 **增强 Dashboard** | ✅ 已完成 | 实时任务追踪，性能指标可视化 |
| 🔐 **RBAC 系统** | ✅ 已完成 | 基于角色的访问控制 |
| 📤 **导出功能** | ✅ 已完成 | PDF/CSV/JSON 导出支持 |

### 代码质量提升

- **✅ Console 清理** - 所有 debug console 语句已移除，使用 logger 系统
- **✅ 类型安全** - 消除 `any` 类型，使用 `unknown` 提升类型安全
- **✅ 测试覆盖** - 197+ 测试文件覆盖组件、Hooks、工具函数、API
- **✅ ESLint 警告** - 全部清理完成
- **✅ TypeScript 编译** - 生产代码零错误

### 项目状态

| 指标 | 状态 |
|------|------|
| **版本** | v1.0.6 |
| **测试文件数** | 490+ ✅ |
| **API 端点数** | 65+ ✅ |
| **API 模块数** | 26 ✅ |
| **TypeScript 编译** | 0 错误 ✅ |
| **ESLint** | 0 警告 ✅ |
| **TypeScript 编译** | 通过 ✅ |
| **构建状态** | 成功 ✅ |

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

- **🎨 主题系统**
  - 浅色/深色/跟随系统三种模式
  - localStorage 持久化存储
  - 平滑过渡动画效果
  - 自动跟随系统主题偏好
  - **主题自定义** - 7种预设主题 + 自定义颜色/间距/圆角/字体
  - **导入导出** - 主题配置可导入导出

- **⚙️ 用户偏好**
  - 显示设置（动画、紧凑模式、字体大小）
  - 通知设置（桌面通知、声音、持续时间）
  - 语言和地区（语言、时区、日期/时间格式）
  - 隐私设置（在线状态、数据收集）
  - 高级设置（自动保存、页面大小、实验性功能）

- **🔐 安全控制**
  - 权限管理
  - 操作审计
  - 数据加密

- **📤 数据导出**
  - PDF 报告导出
  - CSV 数据导出
  - JSON 结构化导出
  - Excel 导出
  - **自定义数据导出** - 支持筛选条件和自定义数据

- **🎮 演示页面**
  - **协作演示** (`/collaboration-demo`) - 实时协作功能演示
  - **SSE 演示** (`/sse-demo`) - Server-Sent Events 实时推送演示

- **🔔 实时通知系统**
  - WebSocket 实时推送通知 (Socket.IO)
  - 多种通知类型 (success/error/warning/info/task_assigned/system)
  - 四种优先级 (low/medium/high/urgent)
  - SQLite 持久化存储，支持已读/未读追踪
  - Email 通知集成 (Resend API)
  - 用户个性化偏好设置 (通知阈值、静默时段)
  - NotificationToast 组件 + useNotifications Hook
  - 六种位置配置，入场动画和键盘支持

---

## 🛠️ 技术栈

### 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 16.1.7 | React 全栈框架 (App Router) |
| **React** | 19.2.4 | UI 库 |
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
| **better-sqlite3** | 11.10.0 | 数据库 |
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

## 🧪 测试

### 测试统计

| 指标 | 数值 |
|------|------|
| **测试文件数** | 197+ |
| **测试覆盖** | 组件、Hooks、工具函数、API |

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

<div align="center">

**🌟 如果这个项目对你有帮助，请给个 Star！**

[⭐ Star on GitHub](https://github.com/songzuo/7zi/stargazers)
| [📋 提交 Issue](https://github.com/songzuo/7zi/issues)
| [🍴 Fork 项目](https://github.com/songzuo/7zi/fork)

**Made with ❤️ by 11 AI Members & 🧑 宋琢环球旅行**

</div>
