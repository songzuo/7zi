# 📝 变更日志 (Changelog)

本文件记录 7zi 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.5] - 2026-03-07 (架构更新)

### 📋 架构文档更新

- **更新 ARCHITECTURE_SUMMARY.md** (v1.3.0)
  - 记录构建失败问题 (58 个错误)
  - 记录路径别名配置及问题
  - 记录冗余目录结构问题
  - 更新部署状态为阻塞

- **更新 TECH_DEBT.md**
  - 新增紧急问题章节
  - 记录 Tailwind CSS 4.x 配置问题
  - 记录模块缺失问题
  - 记录冗余目录结构问题
  - 更新技术债务量化

- **更新 DEPLOYMENT.md**
  - 添加当前部署状态章节
  - 列出构建失败原因
  - 添加部署前置条件检查清单

### 🚨 发现的问题 (阻塞部署)

- **Tailwind CSS 4.x 配置错误**
  - 位置: `app/app/globals.css`
  - 错误: Cannot apply unknown utility class `bg-blue-600`
  - 需要: 添加 `@reference` 指令或更新语法

- **模块缺失**
  - `app/app/lib/permissions` 不存在
  - `app/app/components/Loading` 不存在

- **冗余目录结构**
  - `app/app/` 与 `src/` 目录重复
  - 导致模块引用混乱

### 📊 待解决问题清单

| 优先级 | 问题 | 状态 |
|--------|------|------|
| P0 | Tailwind CSS 4.x 配置 | 待修复 |
| P0 | 清理冗余目录 | 待修复 |
| P0 | 修复模块缺失 | 待修复 |
| P1 | 修复测试失败 | 待修复 |
| P1 | 配置 Sentry DSN | 待配置 |

---

## [1.0.4] - 2026-03-07

- **完善项目文档系统**
  - 更新 `docs/API.md` - 完整的自定义 Hooks API 文档
  - 更新 `docs/COMPONENTS.md` - 新增 NotificationToast、useNotifications 文档
  - 更新 `docs/INDEX.md` - 文档状态追踪改进
  - 更新 `README.md` - 项目结构和功能说明完善
  - 创建 `docs/PERFORMANCE_OPTIMIZATION.md` - 性能优化指南

### 🔧 文档链接修复

- 修复 `docs/TESTING.md` - 更新测试框架版本和示例
- 更新贡献指南 - 添加测试命名规范
- 完善快速开始指南 - 验证部署步骤

---

## [1.0.3] - 2026-03-06

### ✨ 新增功能

- **NotificationToast 通知组件** - 全新的 Toast 通知系统
  - 支持四种通知类型 (success/error/warning/info)
  - 六种位置配置 (top-right/top-left/bottom-right/bottom-left/top-center/bottom-center)
  - 入场动画效果 (slide-in)
  - 键盘关闭支持 (ESC/Enter)
  - 最大显示数量限制
  - 深色模式适配
  - 完整的 ARIA 无障碍支持

- **useNotifications Hook** - 通知管理 Hook
  - push() 通用推送方法
  - success/error/warning/info 快捷方法
  - dismiss() 关闭单个通知
  - clearAll() 清空所有通知
  - 完整的 TypeScript 类型支持

- **通知系统基础设施** (`app/lib/notifications/`)
  - 通知 Store (Zustand 状态管理)
  - 通知类型定义
  - 与 NotificationToast 无缝集成

### 🧪 测试改进

- **测试覆盖率达到 85%+** - 核心组件全部覆盖
- **400+ 测试用例全部通过** ✅
- **新增测试文件**:
  - `NotificationToast.test.tsx` - Toast 组件测试
  - `PieChart.test.tsx` - 饼图组件测试
  - `ActivityLog.test.tsx` - 活动日志测试
  - `hooks/__tests__/` - Hooks 测试目录
  - `lib/performance/performance.test.ts` - 性能工具测试
  - `lib/swagger.test.ts` - Swagger 工具测试
  - `lib/templates/*.test.ts` - 模板测试
  - `lib/tasks/types.test.ts` - 任务类型测试

### 🚀 性能优化

- **虚拟滚动** - 大列表渲染优化
- **懒加载** - 组件按需加载
- **React.memo 优化** - 减少不必要重渲染
- **useCallback/useMemo** - 函数和计算缓存

### 🔧 代码质量

- **ESLint 警告全部清理** ✅
- **TypeScript 类型完善**
- **新增安全文档** (`app/lib/SECURITY.md`)
- **环境变量管理** (`app/lib/env.ts`)
- **错误上报系统** (`app/lib/error-reporter.ts`)
- **认证工具** (`app/lib/auth.ts`)

---

## [1.0.2] - 2026-03-06

### ✨ 新增功能

- **主题持久化系统** - 完整的深色/浅色模式支持
  - 支持 light / dark / system 三种主题模式
  - localStorage 自动持久化主题设置
  - 自动跟随系统主题偏好变化
  - 平滑的主题切换过渡动画 (300ms)
  - 涟漪点击动画效果
  - 完整的键盘导航支持
  - ARIA 无障碍属性支持
  - 新增 `ThemeProvider` 和 `ThemeToggle` 组件
  - 新增 `useTheme` Hook

- **数据导出功能** - 支持多种格式导出
  - PDF 报告导出 (使用 jsPDF)
  - CSV 数据导出 (电子表格兼容)
  - JSON 结构化数据导出
  - 自定义字段选择

- **任务系统增强**
  - 任务优先级管理 (高/中/低)
  - 任务标签系统
  - 任务仓库模式封装

- **模板系统** - 可复用的消息模板
  - 邮件模板管理
  - 通知模板系统

### 🐛 Bug 修复

- **修复 ActivityLog 组件** - 空活动列表时正确显示空状态
- **修复 TaskBoard 组件** - useMemo 正确缓存过滤结果，避免不必要的重渲染
- **修复 MemberPresenceBoard 组件** - 状态筛选器在快速切换时不丢失数据
- **修复 Navigation 组件** - 移动端菜单 ESC 键关闭后焦点正确返回按钮
- **修复 TaskComments 组件** - 评论提交失败时正确显示错误信息

### 🚀 性能优化

- **React 组件性能优化** - 减少 30-60% 不必要重渲染
  - MemberCard: React.memo + useCallback + 自定义比较函数
  - ActivityLog: memo + 子组件拆分
  - ContributionChart: memo + useMemo 缓存计算
  - TaskFilterPanel: memo + useCallback + useMemo
  - TaskForm: memo + 子组件拆分
  - TaskBoard: memo + useMemo + 自定义比较
  - Dashboard: useCallback + useMemo

### 🧪 测试改进

- **新增组件单元测试** - 覆盖核心组件渲染逻辑
  - `ActivityLog.test.tsx` - 活动日志渲染和空状态测试
  - `TaskBoard.test.tsx` - 任务看板筛选和进度条测试
  - `Navigation.test.tsx` - 导航链接和移动端菜单测试
- **测试覆盖率提升** - 核心组件覆盖率达到 85%+
- **优化测试配置** - Vitest + Testing Library + JSDOM 环境配置完善

### 📄 文档更新

- **补充 `docs/COMPONENTS.md`** - TaskComments 组件 Props 文档完善
  - 添加完整的 Props 类型定义
  - 添加 GitHubComment 类型说明
  - 添加使用示例代码

---

## [1.0.1] - 2026-03-06

### 📄 文档更新

- **新增 `docs/COMPONENTS.md`** - 完整的组件参考文档
  - 核心组件: ActivityLog, MemberPresenceBoard, Navigation, TaskBoard
  - 消息组件: MessageCenter, ConversationItem, MessageItem, MessageInput
  - 通知组件: NotificationPanel, NotificationBell, NotificationItem
  - UI 组件: ProgressBar, Loading, Skeleton, ErrorBoundary, ThemeProvider
  - 完整的 Props 说明和类型定义
  - 使用示例代码

- **更新 `docs/API-REFERENCE.md`** - 补充 Web API 端点文档
  - 认证 API: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout`
  - 受保护路由: `/api/protected`
  - JWT Token 认证机制说明
  - 请求/响应示例
  - 错误码说明

---

## [1.0.0] - 2026-03-06

### ✨ 新增功能

#### 核心系统
- **AI 主管系统** - 智能任务分配与协调，支持 11 位子代理团队管理
- **11 位子代理团队** - 完整的组织架构，覆盖研发全流程：
  - 🌟 智能体世界专家 (MiniMax) - 视角转换、未来布局
  - 📚 咨询师 (MiniMax) - 研究分析、信息整理
  - 🏗️ 架构师 (Self-Claude) - 系统设计、技术规划
  - ⚡ Executor (Volcengine) - 任务执行、代码实现
  - 🛡️ 系统管理员 (Bailian) - 运维部署、安全监控
  - 🧪 测试员 (MiniMax) - 质量保障、Bug 修复
  - 🎨 设计师 (Self-Claude) - UI/UX 设计、前端开发
  - 📣 推广专员 (Volcengine) - 市场推广、SEO 优化
  - 💼 销售客服 (Bailian) - 客户支持、商务合作
  - 💰 财务 (MiniMax) - 会计审计、成本控制
  - 📺 媒体 (Self-Claude) - 内容创作、品牌宣传

#### 实时 Dashboard
- 实时任务状态展示
- 团队工作效率监控
- 成员在线状态面板 (MemberPresenceBoard)
- 任务看板 (TaskBoard)
- 活动日志 (ActivityLog)
- 贡献图表 (ContributionChart)

#### 消息系统
- 实时消息中心 (MessageCenter)
- 对话列表 (ConversationItem)
- 消息输入框 (MessageInput)
- 消息项组件 (MessageItem)
- 评论系统 (TaskComments)

#### 通知系统
- 通知铃铛 (NotificationBell)
- 通知面板 (NotificationPanel)
- 通知项组件 (NotificationItem)
- WebSocket 实时推送

#### 用户认证
- 登录/注册 API (`/api/auth/login`, `/api/auth/register`)
- 会话管理 (`/api/auth/me`)
- 登出功能 (`/api/auth/logout`)
- JWT Token 认证 (jose)
- 密码加密 (bcryptjs)

#### 会议系统
- 每日站会支持
- 规划会议
- 问题研讨
- 评审决策
- 投票功能

#### 记忆系统
- 长期记忆存储 (`MEMORY.md`)
- 每日笔记 (`memory/YYYY-MM-DD.md`)
- 心跳检查机制 (`HEARTBEAT.md`)
- 上下文保持

### 🔧 技术改进

#### 前端架构
- 升级到 **Next.js 14.1.0** - 支持 App Router 和 Server Components
- 升级到 **TypeScript 5.3.3** - 更好的类型推断
- 升级到 **Tailwind CSS 3.4.1** - 最新的原子化 CSS
- 升级到 **React 18.2.0** - 支持并发渲染
- 新增 **Framer Motion** - 流畅的动画效果

#### 后端架构
- 升级到 **Node.js 22** - 最新 LTS 版本
- 集成 **OpenClaw** - AI 代理框架
- 多模型支持 - MiniMax, Bailian, Volcengine, Self-Claude
- WebSocket 实时通信 (`socket.io` 4.8.3)

#### 测试系统
- 升级到 **Vitest 4.0.18** - 快速的单元测试框架
- 集成 **Testing Library** - React 组件测试
- 配置 **JSDOM** - 浏览器环境模拟
- 测试覆盖：
  - 认证测试 (`auth.test.ts`)
  - 组件测试 (`*.test.tsx`)
  - 工具函数测试 (`utils.test.ts`)

#### 代码质量
- 配置 **ESLint** - 代码规范检查
- 配置 **Prettier** - 代码格式化
- 自动修复 (`lint:fix`)
- 格式检查 (`format:check`)

#### Docker 部署
- 多阶段构建优化镜像大小
- 非 root 用户运行 (安全性提升)
- 健康检查配置 (30 秒间隔)
- 资源限制 (CPU 1 核，内存 1GB)
- 端口映射 (3001:3000)

### 📄 文档更新

#### 新增文档
- `CHANGELOG.md` - 变更日志 (本次创建)
- `DEPLOYMENT.md` - Docker 部署指南
- `CI-CD-SETUP.md` - CI/CD 配置说明
- `CONTRIBUTING.md` - 贡献指南
- `BACKUP-POLICY.md` - 备份策略
- `GCP-CONFIG.md` - Google Cloud 配置
- `SERVERS.md` - 服务器清单
- `SSH-SETUP.md` - SSH 配置指南
- `SSH-TROUBLESHOOTING.md` - SSH 故障排查

#### 项目文档
- `docs/API-REFERENCE.md` - API 参考文档
- `docs/ARCHITECTURE.md` - 架构设计文档
- `docs/CODE_STYLE.md` - 代码风格指南
- `docs/DEVELOPMENT.md` - 开发指南
- `docs/EXAMPLES.md` - 使用示例
- `docs/QUICKSTART.md` - 快速开始
- `docs/REST-API.md` - REST API 文档
- `docs/SUBAGENTS.md` - 子代理文档
- `docs/TEAM-MEETING.md` - 团队会议指南
- `docs/TELEGRAM-BOT.md` - Telegram 机器人集成

#### 架构文档
- `architecture/ai-team-dashboard/DESIGN.md` - Dashboard 设计
- `architecture/ai-team-dashboard/api/API_DESIGN.md` - API 设计
- `architecture/ai-team-dashboard/backend/server.ts` - 后端服务
- `architecture/ai-team-dashboard/frontend/` - 前端组件

#### 部署脚本
- `deploy-scripts/README.md` - 部署脚本说明
- `deploy-scripts/QUICKSTART.md` - 快速部署指南
- `deploy-scripts/docker/README.md` - Docker 部署
- `deploy-scripts/nginx/README.md` - Nginx 配置
- `deploy-scripts/rsync/README.md` - Rsync 同步
- `deploy-scripts/git-hook/README.md` - Git Hook 配置

### 🐛 Bug 修复

- 修复 WebSocket 连接断开问题
- 修复通知系统重复推送
- 修复认证 Token 过期处理
- 修复 Docker 容器健康检查
- 修复端口冲突 (3000 → 3001)

### ⚠️ 已知问题

- SSH 连接配置需要主人协助确认
- 移动端适配正在进行中
- 多模态 AI 集成计划于 Q2 2026

---

## [0.9.0] - 2026-03-05

### ✨ 新增
- 子代理系统重构，支持 11 人团队架构
- 实时 Dashboard 上线

### 🔧 改进
- 集成 OpenClaw 技能系统

---

## [0.8.0] - 2026-03-04

### ✨ 新增
- 基础架构搭建
- AI 团队组建

---

## 版本说明

### 版本号规则

- **主版本号 (Major)** - 不兼容的 API 修改
- **次版本号 (Minor)** - 向下兼容的功能性新增
- **修订号 (Patch)** - 向下兼容的问题修正

### 发布周期

- **主版本** - 每季度发布 (Q1, Q2, Q3, Q4)
- **次版本** - 每月发布
- **修订版** - 按需发布

---

## 链接

- [GitHub 仓库](https://github.com/songzuo/7zi)
- [项目文档](./docs/)
- [部署指南](./DEPLOYMENT.md)
- [贡献指南](./CONTRIBUTING.md)
