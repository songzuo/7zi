# MEMORY.md - 长期记忆

**创建时间**: 2026-03-08  
**最后更新**: 2026-03-08 15:25 (Europe/Berlin)

---

## 项目概览

### 7zi - AI 驱动的团队管理平台

**核心特点**:
- 11 位 AI 成员组成的自主工作团队
- Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- 子代理系统支持并行任务执行

### 技术栈

| 技术 | 版本 |
|------|------|
| Next.js | 16.1.6 |
| React | 19.2.3 |
| TypeScript | ^5 |
| Tailwind CSS | ^4 |
| Vitest | ^4.0.18 |
| Playwright | ^1.58.2 |
| Node.js | 22+ |

---

## 重要里程碑

### 2026-03-08 (今天)

**子代理系统重构完成**:
- 支持 11 人 AI 团队架构
- 并行任务执行能力 (3-5 个同时)
- 任务分配与追踪系统

**代码优化完成**:
- UserSettingsPage 重构: 713行 → 160行
- Dashboard 模块化重构: 466行
- AboutContent 模块化重构: 584行
- Portfolio 模块开发完成
- Tasks AI 任务分配系统上线

**依赖升级**:
- eslint: v9 → v10.0.3
- web-vitals: v4 → v5.1.0
- @types/node: v20 → v25.3.5
- 移除 @sentry/nextjs (替换为自定义错误系统)

### 2026-03-05 至 2026-03-07

- 实时 Dashboard 上线
- OpenClaw 技能系统集成
- 国际化 (i18n) 支持
- 响应式设计优化

---

## AI 团队成员

| # | 角色 | 职责 | 提供商 |
|---|------|------|--------|
| 1 | 智能体世界专家 | 视角转换、未来布局 | MiniMax |
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

## 项目结构

```
/root/.openclaw/workspace/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # 国际化路由
│   │   ├── api/                # API 路由
│   │   ├── portfolio/          # 项目展示模块
│   │   ├── tasks/              # AI 任务管理
│   │   └── dashboard/          # 团队仪表盘
│   ├── components/             # React 组件
│   │   ├── portfolio/          # Portfolio 组件
│   │   ├── tasks/              # Tasks 组件
│   │   └── shared/             # 共享组件
│   ├── lib/                    # 工具库
│   │   ├── types/              # TypeScript 类型
│   │   ├── utils/              # 工具函数
│   │   └── store/              # Zustand 状态
│   └── test/                   # 测试文件
├── memory/                     # 每日工作日志
├── docs/                       # 详细文档
├── TECH_DEBT.md               # 技术债务清单
├── README.md                  # 项目说明
└── TOOLS.md                   # 工具配置笔记
```

---

## API 端点

### 任务管理
- `GET/POST /api/tasks` - 任务列表/创建
- `PUT/DELETE /api/tasks/:id` - 任务更新/删除
- `POST /api/tasks/:id/assign` - AI 智能分配

### 项目展示
- `GET /api/projects` - 项目列表
- `GET /api/projects/:id` - 项目详情

### 日志系统
- `GET /api/logs` - 日志列表
- `POST /api/logs` - 创建日志
- `GET /api/logs/export` - 导出日志

---

## 开发规范

### 提交信息格式
```
<type>(<scope>): <description>

# type: feat|fix|refactor|test|docs|chore
# 示例: refactor(UserSettingsPage): 模块化重构，713行→160行
```

### 分支策略
- `main` - 主分支
- `feature/*` - 功能分支
- `fix/*` - 修复分支

### 测试要求
- 单元测试: Vitest
- E2E 测试: Playwright
- 覆盖率目标: 80%+

---

## 环境配置

### 必需变量
```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### 可选变量
```bash
# EmailJS
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=

# Resend
RESEND_API_KEY=

# 告警
SLACK_WEBHOOK_URL=
ALERT_EMAIL_RECIPIENTS=
```

---

## 技术债务状态

| 优先级 | 项目 | 状态 |
|--------|------|------|
| P0 | Sentry 集成 | ✅ 已移除，使用自定义系统 |
| P1 | UserSettingsPage 重构 | ✅ 已完成 |
| P1 | Dashboard 重构 | ✅ 已完成 |
| P1 | AboutContent 重构 | ✅ 已完成 |
| P1 | eslint v10 升级 | ✅ 已完成 |
| P1 | 测试覆盖率提升 | 🔄 进行中 |
| P2 | console 清理 | 🔄 进行中 |
| P2 | any 类型减少 | 🔄 进行中 |

---

## 待办事项

### 高优先级
- [ ] 测试覆盖率提升至 80%
- [ ] E2E 测试完善

### 中优先级
- [ ] 多模态 AI 支持
- [ ] 语音会议系统
- [ ] 移动端适配

### 低优先级
- [ ] 多语言扩展
- [ ] 第三方应用集成

---

*此文件记录项目的重要信息和决策，随项目进展持续更新。*