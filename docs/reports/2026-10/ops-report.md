# 运维检查报告 (Ops Report)

**检查时间**: 2026-10-18 19:04 GMT+2  
**检查人员**: 系统管理员子代理  
**项目名称**: 7zi-frontend  
**当前版本**: v1.14.2  
**部署版本目标**: v1.14.3  

---

## 一、项目技术栈

### 1.1 核心框架

| 组件 | 版本 | 说明 |
|------|------|------|
| **Next.js** | 16.2.4 | App Router, Turbopack 生产构建支持 |
| **React** | 19.2.6 | 最新稳定版 |
| **TypeScript** | 5.x | 严格类型检查 |
| **Node.js** | 22.x | 运行时要求 |
| **pnpm** | 9.x | 包管理器（workspace 配置） |

### 1.2 关键依赖

| 类别 | 依赖 | 版本 | 用途 |
|------|------|------|------|
| 状态管理 | `zustand` | 5.0.13 | 前端状态管理 |
| 状态管理 | `jose` | 6.2.3 | JWT 认证 |
| 数据库 | `better-sqlite3` | 12.10.0 | 本地 SQLite 数据库 |
| 缓存/队列 | `ioredis` / `redis` | 5.10.1 / 4.7.1 | Redis 连接 |
| 队列 | `bull` | 4.16.5 | 任务队列 |
| AI SDK | `@modelcontextprotocol/sdk` | 1.29.0 | MCP 协议 |
| 可视化 | `@xyflow/react` | 12.10.2 | 工作流可视化 |
| 3D | `@react-three/fiber` + `@react-three/drei` | 9.6.1 / 10.7.7 | 3D 渲染 |
| 图表 | `recharts` | 3.8.1 | 数据可视化 |
| 邮件 | `nodemailer` | 8.0.7 | 邮件发送 |
| 国际化 | `next-intl` | 4.11.1 | 多语言支持 |
| PWA | `@ducanh2912/next-pwa` | 10.2.9 | PWA 离线能力 |
| 错误监控 | `@sentry/nextjs` | 10.53.1 | 错误追踪 |
| WebSocket | `socket.io-client` | 4.8.3 | 实时通信 |
| 协同编辑 | `yjs` | 13.6.30 | 多人协作 |

### 1.3 开发工具

| 工具 | 版本 | 用途 |
|------|------|------|
| Vitest | 4.1.6 | 单元/集成测试 |
| Playwright | 1.60.0 | E2E 测试 |
| ESLint | 9.x | 代码检查 |
| Prettier | - | 代码格式化 |
| madge | 8.0.0 | 循环依赖检测 |
| @next/bundle-analyzer | 16.2.6 | Bundle 分析 |

### 1.4 构建脚本

```bash
# 开发
pnpm dev              # Next.js 开发服务器
pnpm dev:turbo        # Turbopack 开发模式
pnpm dev:webpack      # Webpack 开发模式

# 构建
pnpm build            # 生产构建 (Turbopack)
pnpm build:turbo      # Turbopack 生产构建
pnpm build:webpack    # Webpack 生产构建
pnpm build:analyze    # 构建并分析 Bundle

# 测试
pnpm test             # Vitest (watch)
pnpm test:run         # Vitest (单次)
pnpm test:coverage    # 带覆盖率报告
pnpm test:e2e         # Playwright E2E
pnpm test:all         # 所有测试

# 代码质量
pnpm lint             # ESLint
pnpm type-check       # TSC --noEmit
pnpm dep:check        # 循环依赖检测
```

---

## 二、部署文档

**文件**: `docs/DEPLOYMENT.md`  
**状态**: ✅ 存在  
**最后更新**: 2026-05-10 (v1.14.3 版本文档)

### 2.1 部署架构

```
7zi.com (Cloudflare CDN)
    ├── 172.67.184.212 / 104.21.59.229
    │
    ├── Next.js 16.2 (Port 3000) — PM2 集群模式 (2 instances)
    ├── API Gateway v3.0 (Port 2000)
    └── Evomap Gateway (GEP-A2A, Port 8080)
```

### 2.2 PM2 配置

- **主应用**: `7zi-frontend` — cluster 模式，2 instances，max_memory 1G
- **Evomap Gateway**: fork 模式，1 instance
- 日志路径: `/opt/7zi-frontend/logs/`

### 2.3 关键部署参数

| 参数 | 值 |
|------|---|
| 应用目录 | `/opt/7zi-frontend` |
| 构建工具 | Turbopack (Next.js 16+ 内置) |
| React Compiler | 已配置 (Babel 模式) |
| 输出模式 | `standalone` |
| SSL | Cloudflare CDN 代理 |

---

## 三、项目目录结构

### 3.1 顶级结构

```
src/
├── app/              # Next.js App Router
├── components/       # React 组件 (88 个子目录)
├── lib/              # 核心库 (106 个子目录)
├── hooks/            # React Hooks
├── stores/           # Zustand 状态存储
├── middleware/       # Next.js 中间件
├── types/            # TypeScript 类型定义
├── config/           # 配置
├── contexts/         # React Context
├── data/             # 数据层
├── features/         # 功能模块
├── i18n/             # 国际化
├── styles/           # 样式
├── test/             # 测试工具
├── tools/            # 工具脚本
├── workflows/        # 工作流节点定义
└── middleware/       # 中间件
```

### 3.2 app/ 结构

```
app/
├── [locale]/         # 国际化路由
├── actions/          # Server Actions
├── api/              # API 路由 (35+ 个子目录)
│   ├── __tests__/
│   ├── a2a/          # A2A 协议 API
│   ├── admin/        # 管理后台 API
│   ├── analytics/    # 分析 API
│   ├── auth/         # 认证 API
│   ├── health/       # 健康检查
│   ├── projects/     # 项目 API
│   ├── rate-limit/   # 限流 API
│   ├── reports/      # 报表 API
│   ├── websocket/    # WebSocket API
│   └── ...
├── demo/             # Demo 页面
├── examples/         # 示例页面
└── offline/          # 离线页面
```

### 3.3 lib/ 核心库 (106 个模块)

**AI 相关**: `agents/`, `ai/`, `learning/`, `mcp/`, `multimodal/`  
**认证/安全**: `auth/`, `security/`, `crypto/`, `permissions/`, `rate-limit/`  
**数据层**: `db/`, `cache/`, `redis/`, `storage/`, `backup/`  
**实时通信**: `websocket/`, `realtime/`, `sse/`, `collab/`, `collaboration/`  
**工作流**: `workflow/`, `plugins/`, `approval/`  
**可观测性**: `monitoring/`, `alerting/`, `health-monitor/`, `tracing/`, `trace/`, `observability/`  
**企业功能**: `billing/`, `tenant/`, `audit/`, `audit-log/`, `feedback/`  
**工具类**: `api/`, `utils/`, `types/`, `validation/`, `error/`  

### 3.4 components/ 结构 (88 个子目录)

主要组件: `admin/`, `agent-dashboard/`, `ai-report/`, `analytics/`, `chat/`, `collaboration/`, `dashboard/`, `form/`, `meeting/`, `mobile/`, `monitoring/`, `notifications/`, `room/`, `search/`, `settings/`, `shared/`, `team/`, `ui/`, `websocket/`, `workflow/` 等

---

## 四、环境变量配置

**文件**: `.env.example`  
**状态**: ✅ 存在  
**总行数**: 121 行

### 4.1 环境变量分类

| 类别 | 变量 | 默认值 | 说明 |
|------|------|--------|------|
| **React Compiler** | `ENABLE_REACT_COMPILER` | `false` | 构建时启用优化 |
| | `NEXT_PUBLIC_REACT_COMPILER_ENABLED` | `false` | 客户端可见标志 |
| | `REACT_COMPILER_MODE` | `opt-out` | 编译模式 |
| | `REACT_COMPILER_EXCLUDE_PATTERNS` | 空 | 排除文件模式 |
| **Redis** | `REDIS_HOST` | `localhost` | Redis 主机 |
| | `REDIS_PORT` | `6379` | Redis 端口 |
| | `REDIS_PASSWORD` | 空 | Redis 密码 |
| | `RATE_LIMIT_REDIS_ENABLED` | `false` | Redis 限流开关 |
| **Slack 告警** | `SLACK_WEBHOOK_URL` | 空 | Slack Webhook |
| | `SLACK_ALERTING_ENABLED` | `true` | 告警开关 |
| | `SLACK_ALERT_MIN_LEVEL` | `warning` | 最低告警级别 |
| **AI API Keys** | `MINIMAX_API_KEY` | 空 | **主力模型** |
| | `VOLCENGINE_API_KEY` | 空 | 多模态 (有 401 问题) |
| | `SILICONFLOW_API_KEY` | 空 | 聚合 API |
| | `DASHSCOPE_API_KEY` | 空 | 阿里云百炼 |
| | `OPENAI_API_KEY` | 空 | OpenAI |
| | `ANTHROPIC_API_KEY` | 空 | Anthropic |
| | `GOOGLE_API_KEY` | 空 | Google Gemini |
| | `DEEPSEEK_API_KEY` | 空 | DeepSeek |
| | `ZHIPU_API_KEY` | 空 | 智谱 GLM |

### 4.2 缺失的关键生产环境变量

> ⚠️ 以下变量在 `.env.example` 中**不存在**，需要确认是否已在生产环境配置：

- `JWT_SECRET` — JWT 签名密钥
- `NEXT_PUBLIC_API_URL` — API 地址
- `NEXT_PUBLIC_WS_URL` — WebSocket 地址
- `DATABASE_URL` — 数据库连接字符串 (如使用外部 DB)
- `EVOMAP_HUB_URL` — Evomap Hub 地址
- `SENTRY_*` — Sentry DSN 配置

### 4.3 安全建议

- [ ] `JWT_SECRET` 未在 `.env.example` 中列出，需确认生产是否已配置
- [ ] AI API Keys 均为空值，需确认生产环境已通过其他方式注入
- [ ] 建议将所有**必须**的生产变量添加到 `.env.example` 并标注为 `REQUIRED`

---

## 五、Docker 部署配置

### 5.1 Dockerfile

**文件**: `Dockerfile`  
**状态**: ✅ 存在  
**优化特性**:
- 多阶段构建 (deps → builder → runner)
- Alpine Linux 最小化镜像
- 非 root 用户运行 (`nextjs`)
- 构建缓存优化 (分离 package.json 复制)
- standalone 模式输出
- 健康检查配置

**Dockerfile 阶段**:
```
Stage 1 (deps):     node:22-alpine → 安装生产依赖
Stage 2 (builder):  node:22-alpine → 构建应用 (npm run build)
Stage 3 (runner):   node:22-alpine → 最小运行镜像 (非 root)
```

### 5.2 docker-compose.yml

**文件**: `docker-compose.yml`  
**状态**: ✅ 存在  
**服务**:
- `7zi-frontend` — Next.js 应用 (Port 3000)
- `nginx` — 反向代理 (Port 80/443，可选)

**资源限制**:
- CPU: max 1, reservation 0.25
- Memory: max 512M, reservation 128M

**日志**: json-file, max-size 10m, max-file 3

### 5.3 Docker 相关问题

> ⚠️ 注意: `docker-compose.yml` 中未配置 Redis 服务，生产环境如需 Redis 限流需单独部署。

---

## 六、Next.js 配置摘要

**文件**: `next.config.ts`  
**关键配置**:

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `output` | `standalone` | 独立部署模式 |
| `reactStrictMode` | `true` | React 严格模式 |
| `typescript.ignoreBuildErrors` | `false` | 严格类型检查 |
| `images.formats` | `avif`, `webp` | 图片格式优化 |
| `i18n` | via `next-intl` | 国际化插件 |
| 安全头 | HSTS, X-Frame-Options, CSP 等 | P1 安全增强 |

---

## 七、运维健康检查项

### 7.1 生产服务状态 (需验证)

- [ ] PM2 进程运行状态
- [ ] Next.js 健康端点 `/api/health`
- [ ] Evomap Gateway 健康端点 `http://localhost:8080/health`
- [ ] Redis 连接状态
- [ ] 日志文件无 ERROR
- [ ] 磁盘空间充足
- [ ] 内存使用 < 1GB per instance

### 7.2 依赖健康

- [ ] `pnpm audit` 无高危漏洞
- [ ] 循环依赖检测无新增
- [ ] TypeScript 编译无错误

### 7.3 部署验证清单

- [ ] 首页 `/` 可访问
- [ ] API 文档 `/api/docs` 可访问
- [ ] 用户登录正常
- [ ] WebSocket 连接正常
- [ ] Dark Mode 切换正常
- [ ] PWA 离线功能正常
- [ ] Evomap Gateway 已注册到 Hub

---

## 八、已知风险与建议

### 8.1 高优先级

| # | 风险 | 建议 |
|---|------|------|
| 1 | AI API Keys 均为空，需确认生产已配置 | 确认生产 `JWT_SECRET` 和各 AI Key 已注入 |
| 2 | `RATE_LIMIT_REDIS_ENABLED=false`，生产使用内存限流 | 如多实例部署需启用 Redis 限流 |
| 3 | `VOLCENGINE_API_KEY` 有 401 问题记录 | 确认该 Key 状态或切换到 SiliconFlow |

### 8.2 中优先级

| # | 建议 |
|---|------|
| 1 | `.env.example` 缺少 `JWT_SECRET`、`NEXT_PUBLIC_API_URL` 等关键变量 |
| 2 | `docker-compose.yml` 未包含 Redis 服务 |
| 3 | 88 个组件目录、106 个 lib 目录，项目较大，建议定期做 dead code 清理 |

### 8.3 低优先级

| # | 建议 |
|---|------|
| 1 | 建议将 Sentry 配置 (`.env.example` 中缺失 DSN) 添加到环境变量模板 |
| 2 | `SLACK_WEBHOOK_URL` 为空，Slack 告警可能未启用 |

---

## 九、快速命令参考

```bash
# 服务状态
pm2 status
pm2 logs 7zi-frontend --lines 50

# 构建
pnpm build
pnpm build:turbo

# 测试
pnpm test:run
pnpm test:e2e

# 代码质量
pnpm lint
pnpm type-check
pnpm dep:check

# Docker
docker build -t 7zi-frontend:latest .
docker-compose up -d

# 健康检查
curl http://localhost:3000/api/health
curl http://localhost:8080/health
```

---

*报告生成时间: 2026-10-18 19:04 GMT+2*
