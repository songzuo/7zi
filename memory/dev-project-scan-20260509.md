# 项目结构扫描报告

**扫描时间**: 2026-05-09 01:44 GMT+2  
**扫描路径**: `/root/.openclaw/workspace/`

---

## 📦 项目概述

| 属性 | 值 |
|------|-----|
| **项目名称** | 7zi - AI 驱动团队管理平台 |
| **当前版本** | v1.14.2 |
| **最新发布** | 2026-05-07 |
| **代码总量** | Next.js 16.2.1 + React 19.2.4 + TypeScript 5 |
| **部署方式** | Docker + PM2 + Nginx |
| **开发语言** | TypeScript (主), JavaScript |

---

## 📁 核心目录结构

```
/root/.openclaw/workspace/
├── 7zi-frontend/          # 🚀 主应用 (Next.js 16, React 19)
│   ├── src/
│   │   ├── app/           # App Router 页面
│   │   ├── components/    # React 组件 (27个)
│   │   ├── lib/           # 核心库 (43个模块)
│   │   ├── features/      # 功能模块
│   │   ├── stores/        # Zustand 状态管理
│   │   ├── hooks/         # React Hooks
│   │   └── types/         # TypeScript 类型定义
│   └── ...
│
├── src/                   # 🏗️ 工作区核心代码
│   ├── app/               # API 路由
│   ├── components/        # 共享组件
│   ├── lib/              # 核心库 (73个)
│   ├── features/         # 功能模块
│   ├── stores/           # 状态管理
│   ├── hooks/            # Hooks
│   ├── middleware/       # 中间件
│   ├── workflows/        # 工作流引擎
│   └── types/            # 类型定义
│
├── botmem/               # 🤖 Bot 记忆/部署目录
├── workflow-engine/     # ⚡ 工作流引擎独立模块
├── tests/               # 🧪 Vitest 测试套件 (27个分类)
├── e2e/                 # 🔄 E2E 测试
├── deploy/              # 🚀 部署脚本和配置
├── docs/                # 📚 完整文档目录
├── memory/              # 🧠 AI 记忆/日志文件
├── cron/                # ⏰ 定时任务
├── monitoring/          # 📊 监控配置 (Prometheus/Grafana)
├── agent-results/       # 📋 Agent 执行结果
├── coverage/           # 📈 测试覆盖率报告
└── exports/            # 📤 数据导出 (1185个子目录，大量导出记录)
```

---

## 🔑 关键文件

| 文件 | 说明 |
|------|------|
| `README.md` | 项目主文档 (70KB+，详细完整) |
| `CHANGELOG.md` | 版本变更日志 (93KB+) |
| `AGENTS.md` | AI 主管 + 11 子代理团队系统定义 |
| `MEMORY.md` | AI 长期记忆 (28KB) |
| `DEPLOYMENT.md` | 部署指南 |
| `API.md` | API 文档 (151KB) |
| `package.json` | 前端依赖配置 |
| `vitest.config.ts` | Vitest 测试配置 |
| `next.config.ts` | Next.js 配置 |
| `eslint.config.mjs` | ESLint 配置 |
| `turbo.json` | Turborepo 构建配置 |

---

## 📊 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| **框架** | Next.js | 16.2.1 |
| **UI** | React | 19.2.4 |
| **语言** | TypeScript | 5.x |
| **样式** | Tailwind CSS | 4.x |
| **状态** | Zustand | 5.0.12 |
| **国际化** | next-intl | 4.9.1 |
| **实时协作** | Socket.IO + Yjs | - |
| **数据库** | better-sqlite3 + Redis | - |
| **任务队列** | Bull | - |
| **搜索** | Fuse.js | - |
| **3D/图形** | Three.js + React Three Fiber | - |
| **测试** | Vitest + Playwright | - |
| **监控** | Prometheus + Grafana | - |

---

## 🚀 部署架构

- **主服务器**: 7zi.com (172.67.184.212 / 104.21.59.229)
- **测试服务器**: bot5.szspd.cn (182.43.36.134)
- **本地机器**: bot6 (当前运行环境)
- **容器化**: Docker + Cloudflare CDN
- **进程管理**: PM2

---

## 📝 文档丰富度

项目拥有大量文档和报告：
- **MD 文档**: 1000+ 个
- **报告文件**: 600+ 个 (REPORT_*.md)
- **开发报告**: 200+ 个 (DEV_TASK_*.md)
- **日常报告**: 50+ 个 (DAILY-DEVELOPMENT-REPORT*.md)
- **文档目录**: docs/ (含 api/, components/, developer/, releases/ 等)

---

## 🔧 Git 状态

**最近提交**: `a2d87c875b docs: 更新记忆文件`

**当前有修改的文件** (23个):
```
7zi-frontend/src/lib/agents/learning/learning-data.ts
7zi-frontend/src/lib/db/query-optimizer.ts
7zi-frontend/src/lib/evomap/gateway.ts
7zi-frontend/src/lib/evomap/index.ts
7zi-frontend/src/lib/services/notification.ts
7zi-frontend/src/lib/utils/image.ts (已删除)
HEARTBEAT.md, MEMORY.md, memory/claw-mesh-state.json
next.config.ts, package.json, package-lock.json
... 等
```

---

## ⚠️ 观察与建议

1. **大量积压文档**: workspace 根目录有 1000+ 个 MD 文件，建议归档
2. **exports 目录膨胀**: exports/ 包含 1185 个导出子目录，可能需要清理
3. **多版本并行**: 同时存在 v1.13, v1.14 版本规划和报告，建议统一
4. **依赖活跃**: package.json 有近期更新，git 工作区有未提交改动

---

*报告生成时间: 2026-05-09 01:44 GMT+2*
