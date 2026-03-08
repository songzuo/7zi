# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## 项目: 7zi - AI 驱动团队管理平台

### 开发环境

- **工作目录**: `/root/.openclaw/workspace`
- **Node.js**: v22.22.0
- **包管理器**: npm / pnpm
- **主要分支**: main

### 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器 (localhost:3000)
npm run build            # 生产构建
npm run start            # 启动生产服务器

# 代码质量
npm run lint             # ESLint 检查
npm run lint:fix         # 自动修复 lint 问题
npm run type-check       # TypeScript 类型检查
npm run format           # Prettier 格式化

# 测试
npm run test             # Vitest 单元测试 (watch)
npm run test:run         # 单元测试 (单次)
npm run test:coverage    # 测试覆盖率报告
npm run test:e2e         # Playwright E2E 测试
npm run test:all         # 运行所有测试

# 其他
npm run build:analyze    # 构建分析
```

---

## API 配置

### 内部 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/tasks` | GET, POST | 任务列表/创建 |
| `/api/tasks/:id` | PUT, DELETE | 任务更新/删除 |
| `/api/tasks/:id/assign` | POST | AI 智能分配 |
| `/api/projects` | GET, POST | 项目列表/创建 |
| `/api/projects/:id` | GET | 项目详情 |
| `/api/logs` | GET, POST | 日志列表/创建 |
| `/api/logs/export` | GET | 导出日志 |

### 外部服务配置

#### EmailJS (联系表单)
```env
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
```

#### Resend (邮件通知)
```env
RESEND_API_KEY=re_xxx
```

#### 告警通知
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
ALERT_EMAIL_RECIPIENTS=admin@example.com
```

---

## 子代理配置

### 并行任务限制
- **最大并行数**: 5
- **推荐范围**: 3-5
- **任务超时**: 30分钟

### AI 模型分配

| 角色 | 模型 | 用途 |
|------|------|------|
| 智能体世界专家 | MiniMax-M2.5 | 战略规划 |
| 咨询师 | MiniMax-M2.5 | 研究分析 |
| 架构师 | Self-Claude | 系统设计 |
| Executor | Volcengine | 代码执行 |
| 系统管理员 | Bailian | 运维部署 |
| 测试员 | MiniMax-M2.5 | 测试编写 |
| 设计师 | Self-Claude | UI/UX |
| 推广专员 | Volcengine | SEO/营销 |
| 销售客服 | Bailian | 客户支持 |
| 财务 | MiniMax-M2.5 | 财务管理 |
| 媒体 | Self-Claude | 内容创作 |

---

## 项目模块

### 已完成模块

| 模块 | 路径 | 状态 |
|------|------|------|
| Portfolio | `/portfolio` | ✅ 完成 |
| Tasks | `/tasks` | ✅ 完成 |
| Dashboard | `/dashboard` | ✅ 完成 |
| Blog | `/blog` | ✅ 完成 |
| About | `/about` | ✅ 完成 |
| Contact | `/contact` | ✅ 完成 |
| Settings | `/settings` | ✅ 完成 |

### 重构状态

| 组件 | 原行数 | 新行数 | 状态 |
|------|--------|--------|------|
| UserSettingsPage | 713 | 160 | ✅ 完成 |
| Dashboard | 466 | - | ✅ 完成 |
| AboutContent | 584 | - | ✅ 完成 |

---

## 测试配置

### Vitest (单元测试)
- **配置文件**: `vitest.config.ts`
- **测试目录**: `src/test/`
- **覆盖率工具**: v8

### Playwright (E2E 测试)
- **配置文件**: `playwright.config.ts`
- **测试目录**: `e2e/`
- **浏览器**: Chromium, Firefox, WebKit

---

## 部署配置

### Docker
```bash
# 构建镜像
docker build -t 7zi-team .

# 运行容器
docker run -p 3000:3000 --env-file .env 7zi-team
```

### PM2
```bash
# 启动
pm2 start ecosystem.config.js

# 重启
pm2 restart 7zi

# 日志
pm2 logs 7zi
```

---

## 文档资源

| 文档 | 说明 |
|------|------|
| `MEMORY.md` | 长期记忆与项目概览 |
| `TECH_DEBT.md` | 技术债务清单 |
| `README.md` | 项目说明文档 |
| `ARCHITECTURE.md` | 技术架构说明 |
| `DOCS_INDEX.md` | 完整文档索引 |
| `memory/` | 每日工作日志 |

---

## 常见问题

### Q: 如何添加新的 AI 任务？
```bash
POST /api/tasks
{
  "title": "任务标题",
  "description": "任务描述",
  "priority": "high|medium|low",
  "type": "feature|bug|refactor|test"
}
```

### Q: 如何运行单个测试文件？
```bash
npm run test -- path/to/test.test.ts
```

### Q: 如何查看构建分析？
```bash
npm run build:analyze
# 打开 .next/analyze/ 目录查看报告
```

---

*此文件记录开发环境的具体配置，保持更新。*