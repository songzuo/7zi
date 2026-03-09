# 7zi 系统说明书

## 项目概述

**7zi** 是一个 AI 驱动的团队管理平台，由 11 位 AI 成员组成的自主工作团队。

### 版本信息
- **当前版本**: v0.2.0
- **发布日期**: 2026-03-09
- **技术栈**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4

---

## 系统架构

### 前端架构
```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/           # 国际化路由
│   ├── api/                # API 路由
│   │   ├── tasks/          # 任务管理 API
│   │   ├── logs/           # 日志系统 API
│   │   ├── knowledge/      # 知识图谱 API
│   │   └── health/         # 健康检查 API
│   ├── portfolio/          # 项目展示
│   ├── tasks/              # AI 任务管理
│   └── dashboard/          # 团队仪表盘
├── components/             # React 组件
│   ├── portfolio/          # Portfolio 组件
│   ├── tasks/              # Tasks 组件
│   └── shared/             # 共享组件
├── lib/                    # 工具库
│   ├── types/              # TypeScript 类型
│   ├── utils/              # 工具函数
│   └── store/              # Zustand 状态
└── test/                   # 测试文件
```

### AI 团队架构

| # | 角色 | 职责 | 提供商 |
|---|------|------|--------|
| 1 | 智能体世界专家 | 战略规划、未来布局 | MiniMax |
| 2 | 咨询师 | 研究分析、信息整理 | MiniMax |
| 3 | 架构师 | 系统设计、技术规划 | Self-Claude |
| 4 | Executor | 任务执行、代码实现 | Volcengine |
| 5 | 系统管理员 | 运维部署、安全监控 | Bailian |
| 6 | 测试员 | 质量保障、Bug 修复 | MiniMax |
| 7 | 设计师 | UI/UX 设计、前端开发 | Self-Claude |
| 8 | 推广专员 | 市场推广、SEO 优化 | Volcengine |
| 9 | 销售客服 | 客户支持、商务合作 | Bailian |
| 10 | 财务 | 会计审计、成本控制 | MiniMax |
| 11 | 媒体 | 内容创作、品牌宣传 | Self-Claude |

---

## 功能模块

### 1. Portfolio 项目展示
- 项目卡片展示
- 技术栈标签
- 项目详情页
- 响应式设计

### 2. Tasks AI 任务管理
- 任务创建与分配
- AI 智能分配
- 任务状态跟踪
- 优先级管理

### 3. Dashboard 团队仪表盘
- 实时数据展示
- 团队成员状态
- 任务统计图表
- 活动日志

### 4. Blog 博客系统
- 文章发布
- 分类标签
- Markdown 支持
- 评论系统

### 5. 知识图谱 API
- 节点管理
- 边关系管理
- 知识查询
- 知识推理

---

## API 端点

### 任务管理
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/tasks` | GET, POST | 任务列表/创建 |
| `/api/tasks/:id` | PUT, DELETE | 任务更新/删除 |
| `/api/tasks/:id/assign` | POST | AI 智能分配 |

### 知识图谱
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/knowledge/nodes` | GET, POST | 节点列表/创建 |
| `/api/knowledge/edges` | GET, POST | 边关系管理 |
| `/api/knowledge/query` | POST | 知识查询 |
| `/api/knowledge/inference` | POST | 知识推理 |

### 健康检查
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 基础健康检查 |
| `/api/health/ready` | GET | 就绪状态 |
| `/api/health/live` | GET | 存活状态 |
| `/api/health/detailed` | GET | 详细报告 |

---

## CI/CD 配置

### Gitea Actions 工作流

#### 1. ci.yml - 持续集成
```yaml
触发: push/PR 到 main 分支
流程: lint → type-check → test → build
```

#### 2. ci-cd.yml - 完整流水线
```yaml
触发: push/PR 到 main/develop
流程: lint → typecheck → test → build → docker → deploy
```

#### 3. deploy.yml - 独立部署
```yaml
触发: push 到 main 或手动触发
流程: build → deploy-production → deploy-staging → notify
```

### 必需的 Secrets
- `GITEA_TOKEN` - Gitea 访问令牌
- `SSH_PRIVATE_KEY` - SSH 部署密钥
- `SERVER_HOST` - 部署服务器地址
- `SERVER_USER` - 部署用户

---

## 开发指南

### 环境要求
- Node.js 22+
- npm / pnpm
- Git

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 构建生产版本
npm run build
```

### 代码规范
- ESLint v10
- Prettier
- TypeScript strict mode
- Conventional Commits

---

## 部署指南

### Docker 部署
```bash
# 构建镜像
docker build -t 7zi-team .

# 运行容器
docker run -p 3000:3000 --env-file .env 7zi-team
```

### PM2 部署
```bash
# 启动
pm2 start ecosystem.config.js

# 重启
pm2 restart 7zi

# 日志
pm2 logs 7zi
```

---

## 安全配置

### 环境变量
```env
# 必需
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# 可选 - EmailJS
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=

# 可选 - Resend
RESEND_API_KEY=

# 可选 - 告警
SLACK_WEBHOOK_URL=
ALERT_EMAIL_RECIPIENTS=
```

### 安全评分
- 当前评分: **92/100**
- npm audit: **0 漏洞**
- HTTPS: ✅ 启用
- CORS: ✅ 配置

---

## 监控与日志

### 健康检查
- API 健康评分: 95/100
- 数据库状态: ✅ 正常
- Redis 状态: ✅ 正常
- 磁盘使用: 22%
- 内存使用: 29%

### 日志系统
- API 日志: `/api/logs`
- 系统日志: `memory/`
- 错误追踪: 自定义系统

---

## 测试

### 测试统计
- 测试文件: 158 个
- 覆盖率目标: 80%
- 当前覆盖率: ~60%

### 运行测试
```bash
# 单元测试
npm run test

# 覆盖率报告
npm run test:coverage

# E2E 测试
npm run test:e2e
```

---

## 性能指标

| 指标 | 值 |
|------|-----|
| 首屏加载 | < 2s |
| API 响应 | < 200ms |
| 构建大小 | ~500KB |
| Lighthouse | 90+ |

---

## 联系方式

- **项目地址**: https://github.com/songzuo/7zi
- **文档**: /docs
- **社区**: https://discord.com/invite/clawd

---

**最后更新**: 2026-03-09  
**版本**: v0.2.0
