# 🚀 7zi Studio - AI 驱动的团队管理平台

> **11 位 AI 成员 · 24/7 自主工作 · 实时协作**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/songzuo/7zi)
[![CI Status](https://github.com/songzuo/7zi/workflows/CI%20-%20Pull%20Request%20Checks/badge.svg)](https://github.com/songzuo/7zi/actions/workflows/ci-pr.yml)
[![Deploy Status](https://github.com/songzuo/7zi/workflows/Deploy%20-%20Main%20Branch/badge.svg)](https://github.com/songzuo/7zi/actions/workflows/deploy-main.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?logo=react)](https://react.dev/)

---

## 📖 项目简介

**7zi Studio** 是一个革命性的 AI 驱动团队管理平台，由 **11 位专业 AI 成员** 组成完整的组织架构。我们重新定义了团队协作的可能性 —— 不再是人类管理工具，而是 **AI 团队自主工作**，人类只需制定战略方向。

### 🌟 核心特性

- **🤖 AI 主管系统** - 智能任务分配与协调
- **⚡ 24/7 不间断工作** - 无需休息，持续产出
- **📊 实时 Dashboard** - 透明化所有工作进展
- **🔄 自主决策** - 在授权范围内独立完成任务
- **🎯 目标驱动** - 专注于结果而非过程

---

## 🔥 最新进展 (v1.1.0 - 2026-03-22)

### 新增功能

- **Global Loading System** - 全局加载状态管理系统
  - 统一的加载指示器管理
  - 支持多种动画变体（spin, pulse, bounce, dots, bars, wave）
  - 进度追踪支持（0-100%）
  - 防闪烁机制
  - 完整的 TypeScript 类型支持

- **A2A Agent Communication** - Agent 间通信系统
  - 完全兼容 A2A Protocol v0.3.0
  - JSON-RPC 2.0 标准协议
  - 支持同步和流式处理
  - 任务状态管理和追踪
  - 事件总线架构

### 代码质量

| 指标                | 状态      |
| ------------------- | --------- |
| **版本**            | v1.2.0    |
| **测试文件数**      | 490+ ✅   |
| **API 端点数**      | 65+ ✅    |
| **API 模块数**      | 26 ✅     |
| **TypeScript 编译** | 0 错误 ✅ |
| **ESLint**          | 0 警告 ✅ |
| **构建状态**        | 成功 ✅   |

---

## 🚀 快速开始

### 前置要求

- **Node.js** 22.x LTS 或更高版本
- **pnpm** 9.x 或更高版本
- **Git**

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/songzuo/7zi.git
cd 7zi

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local

# 4. 启动开发服务器
pnpm dev
```

访问 http://localhost:3000 查看应用。

### 环境变量配置

在 `.env.local` 中配置必要的环境变量：

```bash
# 应用配置
NODE_ENV=development
PORT=3000

# OpenClaw 配置
OPENCLAW_API_KEY=your_openclaw_api_key

# AI 模型提供商
MINIMAX_API_KEY=your_minimax_api_key
BAILIAN_API_KEY=your_bailian_api_key
VOLCENGINE_API_KEY=your_volcengine_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# 邮件服务（可选）
RESEND_API_KEY=re_xxxxxxxx
```

详细配置请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

---

## 📚 完整文档

### 📖 文档导航

- **[README.md](./README.md)** - 项目介绍和快速开始（本文档）
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 系统架构总览
- **[API.md](./API.md)** - API 完整文档
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 部署指南
- **[QUICKSTART.md](./QUICKSTART.md)** - 5 分钟快速部署
- **[CHANGELOG.md](./CHANGELOG.md)** - 版本变更日志

### 🏗️ 架构文档

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 系统架构总览 ⭐
  - 架构概览和分层设计
  - 核心组件说明
  - 数据流和通信模式
  - 安全架构和性能优化

- **[ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)** - 架构图解
- **[ARCHITECTURE_REVIEW.md](./ARCHITECTURE_REVIEW.md)** - 架构审查报告
- **[microservice-design.md](./microservice-design.md)** - 微服务设计

### 🔌 API 文档

- **[API.md](./API.md)** - API 完整文档 ⭐
  - 自定义 Hooks
  - 公开组件
  - API 端点列表

- **[API-REFERENCE.md](./API-REFERENCE.md)** - API 参考手册
- **[REST-API.md](./REST-API.md)** - REST API 规范
- **[API-ENDPOINTS.md](./API-ENDPOINTS.md)** - API 端点列表

### 🧩 组件文档

- **[COMPONENTS.md](./COMPONENTS.md)** - React 组件库
- **[HOOKS.md](./HOOKS.md)** - 自定义 Hooks
- **[PAGE-STRUCTURE.md](./PAGE-STRUCTURE.md)** - 页面结构说明

### 🎨 设计与优化

- **[DESIGN_OPTIMIZATION.md](./DESIGN_OPTIMIZATION.md)** - 设计优化指南
- **[PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md)** - 性能优化
- **[PERFORMANCE.md](./PERFORMANCE.md)** - 性能指标

### 🔄 通信与集成

- **[WEBSOCKET.md](./WEBSOCKET.md)** - WebSocket 实时通信 ⭐
- **[LOADING-SYSTEM.md](./LOADING-SYSTEM.md)** - 全局加载系统 ⭐ (v1.1.0 新增)
- **[GITHUB-INTEGRATION.md](./GITHUB-INTEGRATION.md)** - GitHub 集成

### 🧪 测试与开发

- **[TESTING.md](./TESTING.md)** - 测试策略和指南
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - 开发指南
- **[CODE_STYLE.md](./CODE_STYLE.md)** - 代码风格规范

### 🔒 安全与运维

- **[SECURITY-AUDIT-REPORT.md](./SECURITY-AUDIT-REPORT.md)** - 安全审计报告
- **[MONITORING.md](./MONITORING.md)** - 监控系统
- **[OPERATIONS_MANUAL.md](./OPERATIONS_MANUAL.md)** - 运维手册

---

## 👥 团队介绍

### 11 位 AI 成员

| 角色                  | 职责                 | 提供商      |
| --------------------- | -------------------- | ----------- |
| 🌟 **智能体世界专家** | 视角转换、未来布局   | MiniMax     |
| 📚 **咨询师**         | 研究分析、信息整理   | MiniMax     |
| 🏗️ **架构师**         | 系统设计、技术规划   | Self-Claude |
| ⚡ **Executor**       | 任务执行、代码实现   | Volcengine  |
| 🛡️ **系统管理员**     | 运维部署、安全监控   | Bailian     |
| 🧪 **测试员**         | 质量保障、Bug 修复   | MiniMax     |
| 🎨 **设计师**         | UI/UX 设计、前端开发 | Self-Claude |
| 📣 **推广专员**       | 市场推广、SEO 优化   | Volcengine  |
| 💼 **销售客服**       | 客户支持、商务合作   | Bailian     |
| 💰 **财务**           | 会计审计、成本控制   | MiniMax     |
| 📺 **媒体**           | 内容创作、品牌宣传   | Self-Claude |

---

## 🛠️ 技术栈

### 前端技术

| 技术                 | 版本    | 用途                        |
| -------------------- | ------- | --------------------------- |
| **Next.js**          | 16.2.1  | React 全栈框架 (App Router) |
| **React**            | 19.2.4  | UI 库                       |
| **TypeScript**       | 5.x     | 类型安全                    |
| **Tailwind CSS**     | 4.x     | 原子化 CSS                  |
| **Socket.IO Client** | 4.8.3   | WebSocket 通信              |
| **Zustand**          | 5.0.12  | 状态管理                    |
| **Lucide React**     | 0.577.0 | 图标库                      |

### 后端技术

| 技术               | 版本     | 用途        |
| ------------------ | -------- | ----------- |
| **Node.js**        | 22.x LTS | 运行时环境  |
| **OpenClaw**       | 最新     | AI 代理框架 |
| **Socket.IO**      | 4.8.3    | 实时通信    |
| **better-sqlite3** | 11.10.0  | 数据库      |

### AI 模型提供商

| 提供商          | 模型         | 用途                             |
| --------------- | ------------ | -------------------------------- |
| **MiniMax**     | MiniMax-M2.5 | 智能体专家、咨询师、测试员、财务 |
| **Bailian**     | Qwen3.5-Plus | 系统管理员、销售客服             |
| **Volcengine**  | 豆包         | Executor、推广专员               |
| **Self-Claude** | Claude 3.5   | 架构师、设计师、媒体             |

### 测试工具

| 工具                | 版本   | 用途           |
| ------------------- | ------ | -------------- |
| **Vitest**          | 4.1.0  | 单元测试框架   |
| **Testing Library** | 16.x   | 组件测试       |
| **JSDOM**           | 28.x   | 浏览器环境模拟 |
| **Playwright**      | 1.58.2 | E2E 测试       |

---

## 🧪 测试

### 运行测试

```bash
# 运行所有测试 (监视模式)
pnpm test

# 单次运行测试
pnpm run test:run

# 生成覆盖率报告
pnpm run test:coverage

# E2E 测试
pnpm run test:e2e
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

详细部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

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

详细贡献指南请参考 [CONTRIBUTING.md](./CONTRIBUTING.md)。

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
