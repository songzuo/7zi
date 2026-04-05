# API 完整文档

**最后更新**: 2026-04-05
**版本**: v1.12.2
**API 端点总数**: 130+

---

## 📋 目录

1. [API 概览](#api-概览)
2. [AI 代码智能 API](#ai-代码智能-api) *(v1.12.0 新增)*
3. [多模型路由 API](#多模型路由-api) *(v1.12.0 新增)*
4. [多租户 API](#多租户-api) *(v1.12.0 新增)*
5. [认证与授权 API](#认证与授权-api)
6. [任务管理 API](#任务管理-api)
7. [项目管理 API](#项目管理-api)
8. [性能监控 API](#性能监控-api)
9. [分析 API](#分析-api)
10. [搜索 API](#搜索-api)
11. [RBAC 权限 API](#rbac-权限-api)
12. [多模态 API](#多模态-api)
13. [A2A 通信 API](#a2a-通信-api)
14. [评分 API](#评分-api)
15. [反馈 API](#反馈-api)
16. [用户偏好设置 API](#用户偏好设置-api)
17. [Web Vitals API](#web-vitals-api)
18. [GitHub 集成 API](#github-集成-api)
19. [健康检查 API](#健康检查-api)
20. [工作流编排 API](#工作流编排-api)
21. [告警系统 API](#告警系统-api)
22. [工作流版本历史管理 API](#工作流版本历史管理-api-v191) *(v1.9.1 新增)*
23. [RCA 根因分析 API](#rca-根因分析-api-v190) *(v1.9.0 新增)*
24. [数据模型](#数据模型)
25. [错误处理](#错误处理)

### 📚 专项 API 文档

- **[WebSocket API](./api/websocket.md)** - 房间系统、权限控制、消息持久化
- **[Agent Scheduler API](./api/agent-scheduler.md)** - AI Agent 调度系统、任务队列
- **[Dashboard 组件](./lib/agent-scheduler/dashboard/README.md)** - 可视化 Dashboard 组件文档

---

## API 概览

### v1.12.1 新增功能 (2026-04-04)

v1.12.1 版本专注于错误处理增强和监控系统完善：

#### 🎯 统一错误处理系统

**位置**: `src/lib/errors.ts`

**核心功能**:
- 14 种统一错误类型 (VALIDATION, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, RATE_LIMIT, INTERNAL, SERVICE_UNAVAILABLE, NETWORK, TIMEOUT, REGISTRATION_FAILED, WEAK_PASSWORD, MISSING_TOKEN, CONFLICT)
- 统一错误类 `UnifiedAppError` - 支持工厂方法和自动状态码映射
- 14 个统一响应处理函数 (`createValidationErrorResponse`, `createNotFoundErrorResponse` 等)
- `withUnifiedErrorHandling` 错误处理包装器
- 完整的向后兼容性支持

**使用示例**:

```typescript
import { UnifiedAppError, createValidationErrorResponse } from '@/lib/errors'

// 创建统一错误
const error = UnifiedAppError.validation('Invalid email format')
error.data = { field: 'email', provided: 'user@' }

// 创建错误响应
const response = createValidationErrorResponse(error)
// HTTP 400, { success: false, error: { code: 'VALIDATION_ERROR', message: '...', details: {...} } }

// 使用包装器
export const POST = withUnifiedErrorHandling(async (request) => {
  // 业务逻辑，错误自动捕获和转换
})
```

---

#### 📊 监控聚合器优化

**位置**: `src/lib/monitoring/optimized-metrics-aggregator.ts`

**核心优化**:
- Web Worker 后台计算
- 增量更新算法
- 数据采样策略 (random/time-based/adaptive)
- LRU 缓存聚合结果
- QuickSelect 百分位计算 (p50, p90, p95, p99)
- 单次扫描方差计算

**API 端点**:

| 端点 | 说明 |
|------|------|
| `GET /api/monitoring/apm` | APM 状态和指标 |

---

#### 🚨 告警通道增强

**位置**: `src/lib/monitoring/alert/channels/`, `src/app/api/performance/alerts/`

**新增功能**:
- Slack 告警通道 (`slack.ts`)
- Email 告警通道增强重试逻辑
- 统一通道管理器 (`channels.ts`)

**API 端点**:

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/performance/alerts` | GET | 获取告警规则列表 |
| `/api/performance/alerts` | POST | 创建告警规则 |
| `/api/performance/alerts/[id]` | GET | 获取单个告警规则 |
| `/api/performance/alerts/[id]` | PUT | 更新告警规则 |
| `/api/performance/alerts/[id]` | DELETE | 删除告警规则 |

---

### v1.12.0 新增功能 (2026-04-03)

v1.12.0 版本专注于 AI 代码智能、多模型路由和多租户架构：

#### 🤖 AI 代码智能系统

**位置**: `src/lib/ai/code/`

**核心功能**:

| 组件 | 功能 | 支持语言 |
|------|------|----------|
| 代码分析器 | 静态分析、复杂度计算、依赖提取 | TypeScript, JavaScript, Python, Go, Rust |
| 代码补全器 | 智能补全、关键词、代码片段 | - |
| 代码审查器 | 自动审查、30+ 规则、评分系统 | - |
| Bug 检测器 | 识别 20+ Bug 模式、空引用、异步错误 | - |
| 修复建议器 | 生成修复代码、解释原因、评估风险 | - |
| 代码解释器 | 自然语言解释、关键概念提取 | - |

**代码统计**: 2,500+ 行核心实现 + 800+ 行测试代码

---

#### 🔀 多模型智能路由系统

**位置**: `src/lib/ai/router.ts`, `src/lib/ai/routing/`

**核心功能**:
- 智能路由 - 根据任务类型、复杂度、成本预算选择最优模型
- 语义缓存 - 相似度阈值 0.95，减少重复调用
- 速率限制 - 按模型的 RPM/TPM 限制
- 成本追踪 - 实时成本监控和预算控制
- 回退链 - 自动 fallback 到备选模型

**支持模型**:
- OpenAI: GPT-4o, GPT-4.5
- Anthropic: Claude-4-Opus, Claude-4-Sonnet
- Google: Gemini-2-Flash
- DeepSeek: deepseek-chat

**默认回退链**: GPT-4o → Claude-4-Sonnet → Gemini-2-Flash → deepseek-chat

---

#### 🏢 多租户架构

**位置**: `src/app/api/v1/tenants/`, `src/lib/tenant/`

**核心功能**:
- 租户隔离模式: shared, isolated
- 租户计划: free, starter, pro, enterprise
- 完整的审计日志集成
- 租户配额管理
- 成员邀请和转让

**API 端点**:

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/v1/tenants` | GET | 列出租户（管理员） |
| `/api/v1/tenants` | POST | 创建租户 |
| `/api/v1/tenants/[id]` | GET | 获取租户信息 |
| `/api/v1/tenants/[id]` | PUT | 更新租户 |
| `/api/v1/tenants/[id]` | DELETE | 删除租户 |
| `/api/v1/tenants/[id]/stats` | GET | 获取租户统计 |
| `/api/v1/tenants/[id]/quota` | GET | 获取租户配额 |
| `/api/v1/tenants/login` | POST | 租户登录 |
| `/api/v1/tenants/switch` | POST | 切换租户 |
| `/api/v1/tenants/invite` | POST | 邀请成员 |
| `/api/v1/tenants/accept` | POST | 接受邀请 |
| `/api/v1/tenants/transfer` | POST | 转让租户 |

---

#### 📦 WebSocket 压缩优化

**位置**: `src/lib/websocket/compression/`

**核心组件**:

| 组件 | 功能 |
|------|------|
| 压缩管理器 | 消息压缩/解压缩 |
| 增量更新 | 增量数据同步 |
| 消息缓存 | LRU 消息缓存 |
| 批处理 | 消息批处理优化 |
| 集成层 | WebSocket 集成接口 |

**优化效果**:
- 带宽减少: 40-60%
- 延迟降低: 30-50%
- 内存优化: 25%

---

### v1.10.0 新增功能 (2026-04-03)

v1.10.0 版本引入了 AI 代码智能系统：

#### 🤖 AI 代码智能系统 (100% 完成)

**核心功能** (`src/lib/ai/code/`)

- **📊 代码分析器** - 静态分析代码结构、计算复杂度、提取依赖
- **⌨️ 代码补全器** - 智能代码补全、关键词、代码片段、模式匹配
- **🔍 代码审查器** - 自动代码审查、30+ 规则、评分系统
- **🐛 Bug 检测器** - 识别 20+ Bug 模式、空引用、异步错误
- **🔧 修复建议器** - 生成修复代码、解释原因、评估风险
- **📖 代码解释器** - 自然语言解释、关键概念提取

**支持的语言**: TypeScript, JavaScript, Python, Go, Rust

**代码统计**: 2,500+ 行核心实现 + 800+ 行测试代码

**文档**: [v1.10.0 实现报告](../V110_CODE_GENERATION_IMPLEMENTATION_REPORT.md)

---

### v1.9.1 新增功能 (2026-04-03)

v1.9.1 版本引入了工作流版本历史管理功能：

#### 📜 工作流版本历史管理 (100% 完成)

**核心功能** (`src/lib/workflow/version-service.ts`)

- 版本快照 - 保存完整的工作流状态（节点、边、配置）
- 版本对比 - 计算节点、边、配置的差异
- 版本回滚 - 创建新版本恢复到历史状态
- 自动清理 - 根据设置自动删除旧版本

**数据库表**:
| 表名 | 用途 |
|------|------|
| `workflow_versions` | 存储工作流版本快照 |
| `workflow_version_diffs` | 存储版本对比结果 |
| `workflow_version_settings` | 存储版本设置 |

**API 端点**:

| 端点 | 说明 |
|------|------|
| `GET /api/workflow/:id/versions` | 获取版本列表 |
| `POST /api/workflow/:id/versions` | 创建新版本 |
| `GET /api/workflow/:id/versions/:versionId` | 获取特定版本 |
| `DELETE /api/workflow/:id/versions/:versionId` | 删除版本（受限） |
| `GET /api/workflow/:id/versions/compare` | 对比两个版本 |
| `POST /api/workflow/:id/versions/:versionId/rollback` | 回滚到指定版本 |
| `GET /api/workflow/:id/versions/settings` | 获取版本设置 |
| `PUT /api/workflow/:id/versions/settings` | 更新版本设置 |

---

### v1.9.0 新增功能 (2026-04-03)

v1.9.0 版本引入了 AI 对话式任务创建功能：

#### 🤖 AI 对话式任务创建 (100% 完成)

**核心组件** (`src/components/workflow/`)

- TaskCreationChat - 对话式任务创建界面
- TaskPreviewPanel - 任务预览面板
- QuickTaskModal - 快速创建模态框

**自然语言解析器** (`src/lib/workflow/TaskParser.ts`)

- 意图识别 - 8 种任务类型（automation, notification, data_processing, monitoring, integration, scheduled, webhook, human_approval）
- 实体提取 - 时间表达式、接收者、条件表达式、动作、目标
- 自动生成节点和边
- 改进建议生成

**解析算法**:

| 算法 | 说明 |
|------|------|
| 关键词匹配 | 基于关键词权重识别意图 |
| 正则提取 | 提取时间、接收者等实体 |
| 节点生成 | 根据意图自动生成工作流节点 |
| 边连接 | 自动生成节点间连接 |

---

### v1.8.0 新增功能 (2026-04-02)

v1.8.0 版本引入了可视化工作流编排和 Email 告警系统：

#### 🎨 Visual Workflow Orchestrator (100% 完成)

**核心功能** (`src/lib/workflow/VisualWorkflowOrchestrator.ts`)

- 工作流执行引擎 - async/await 支持，事件驱动架构
- 6 种节点类型 - start, end, task (agent), condition, parallel, wait
- 状态管理 - pending, running, completed, failed, skipped
- 自定义执行器 API - 可注册自定义节点执行逻辑
- 工作流定义验证 - 自动验证工作流结构
- 实例生命周期管理 - create, execute, cancel, pause, resume

**Workflow Canvas 组件** (`src/components/workflow/WorkflowCanvas.tsx`)

- 节点拖拽放置
- 边/连接线绘制 (Bezier 曲线)
- 缩放控制 (放大、缩小、适应内容、重置)
- 网格对齐 (可切换)
- 键盘快捷键 (Delete/Backspace 删除节点)
- 状态指示器 (pending, running, completed, failed)
- 只读模式支持

| 节点类型         | 颜色    | 用途         |
| ---------------- | ------- | ------------ |
| `start`          | 🟢 绿色 | 工作流入口   |
| `end`            | 🔴 红色 | 工作流终止   |
| `task` / `agent` | 🔵 蓝色 | 任务执行节点 |
| `condition`      | 🟡 黄色 | 条件分支     |
| `parallel`       | 🟣 紫色 | 并行执行     |
| `wait`           | ⚪ 灰色 | 等待/延迟    |

#### 📧 Email Alerting 基础设施 (100% 完成)

**Email 配置** (`src/config/email.ts`)

- SMTP 配置接口 - host, port, auth
- TLS/SSL 支持
- 环境变量解析和验证

**Email 服务** (`src/lib/alerting/EmailAlertService.ts`)

- 使用 nodemailer 发送邮件
- 连接池管理
- 错误处理和重试机制

**告警模板** (`src/lib/alerting/templates/alert-template.ts`)

- HTML 邮件模板
- 告警级别颜色和图标
- 指标数据展示

**环境变量配置**:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_SECURE=false
EMAIL_SENDER_NAME=7zi System
EMAIL_SENDER_EMAIL=noreply@example.com
EMAIL_RECIPIENTS=admin@example.com
EMAIL_ALERTING_ENABLED=true
```

---

### v1.7.0 新增功能 (2026-04-02)

v1.7.0 专注于类型安全强化和可观测性增强：

#### 🌟 TypeScript 严格模式 P0-P2 (100% 完成)

- 编译 **0 错误**
- 持续提升类型覆盖率

#### 📊 UI 一致性 (100% 完成)

- 发布完整的 UI 一致性设计规范 (`UI_CONSISTENCY_GUIDE.md`)
- 建立 23 项 UI 检查规则
- 修复暗色模式颜色问题

#### 📈 Performance Monitoring 增强 (80% 完成)

- MonitoringProvider - 全局监控初始化
- Web Vitals 监控 - LCP, FID, CLS, TTFB 自动追踪
- Sentry API 现代化 - 迁移到 Sentry v10+ API

---

### v1.6.0 新增功能 (2026-04-01)

v1.6.0 专注于 **Agent Registry 核心功能**、**A2A Protocol v2.1** 和 **API 性能优化**：

#### 🤖 Agent Registry 核心功能 (100% 完成)

**HeartbeatMonitor** (`src/lib/agents/registry/heartbeat-monitor.ts`)

- 心跳监控 - 30 秒超时检测机制
- 自动下线处理 - 超时 Agent 自动标记为离线
- 统计信息追踪 - 实时统计在线/离线 Agent 数量

**核心特性**:
| 功能 | 说明 |
|------|------|
| 超时检测 | 30 秒无心跳自动标记离线 |
| 自动恢复 | Agent 重连后自动恢复在线状态 |
| 统计追踪 | 在线/离线/总数实时统计 |

**API 端点**:

```
POST   /api/agents/register   - 注册智能体
GET    /api/agents/:id        - 获取智能体信息
DELETE /api/agents/:id        - 注销智能体
GET    /api/agents/discover   - 发现智能体
POST   /api/agents/heartbeat  - 发送心跳
```

#### 🔗 A2A Protocol v2.1 (100% 完成)

**协作消息格式** (`src/lib/agents/a2a/protocol-v2.1.ts`)

- 标准化消息格式 - JSON-RPC 2.0 兼容
- 消息验证 - Zod schema 运行时验证

**任务委派机制** (`src/lib/agents/a2a/delegation.ts`)

- 任务委派 - 跨 Agent 任务分配
- 依赖管理 - 任务依赖关系处理
- 优先级队列 - 基于优先级的任务调度

**结果聚合** (`src/lib/agents/a2a/aggregation.ts`)

- 8 种聚合策略: first, last, all, majority, best, average, merge, custom
- 错误处理 - 部分失败容错机制

#### 🚀 API 性能优化 (100% 完成)

**MultiLevelCacheManager** (`src/lib/cache/MultiLevelCacheManager.ts`)

- 三层缓存架构 - L1(内存) + L2(Redis) + L3(数据库)
- 自动降级机制 - Redis 不可用时降级到内存缓存
- 请求去重 - 100ms 去重窗口

**性能提升**:
| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| L2 Cache Hit | ~200ms | <15ms | 92% ↓ |
| P95 响应时间 | ~200ms | <100ms | 50% ↓ |

---

### v1.5.0 新增功能 (2026-03-30)

v1.5.0 专注于 **认证中间件模块化** 和 **架构优化**：

#### 🔐 auth.middleware 模块 (100% 完成)

- 路径保护 - 自动保护敏感 API 端点
- 用户信息提取 - 从请求头提取用户 ID、邮箱、角色
- 权限检查 - 基于角色的访问控制 (RBAC)

---

### v1.4.0 新增功能 (2026-03-29)

v1.4.0 版本引入了三大核心功能：

#### 🔄 WebSocket 高级功能 (100% 完成)

**房间系统** (`src/lib/websocket/rooms.ts`)

- 多房间支持 - 动态房间创建和管理，支持 task/project/chat/document/voice/video 类型
- 房间可见性 - 公开(public)、私有(private)、仅邀请(invite-only) 三种模式
- 参与者管理 - 加入/离开、踢出/封禁、角色变更
- 状态追踪 - 光标位置、输入状态、在线/离线、最后活动时间

**权限控制系统** (`src/lib/websocket/permissions.ts`)

- 5 种角色 - owner/admin/moderator/member/guest
- 16 种权限 - 房间权限 7 种 + 消息权限 6 种 + 管理权限 3 种
- RBAC 集成 - 角色层级强制、权限授予/撤销/过期

**消息持久化** (`src/lib/websocket/message-store.ts`)

- 内存存储 - 每房间最多 10,000 条消息
- 离线消息队列 - TTL 7 天、每用户 100 条
- 消息操作 - 存储、编辑、软删除、永久删除

**详见**: [WebSocket API 文档](./api/websocket.md)

#### 🤖 AI Agent 智能调度系统 (100% 完成)

**核心组件** (`src/lib/agent-scheduler/`)

- 调度器核心 - 多维度评分算法 (能力 40% + 负载 30% + 性能 20% + 响应 10%)
- 负载均衡 - 保留 10% 缓冲，避免单 Agent 过载
- Dashboard UI - AgentStatusPanel、TaskQueueView、ScheduleHistory、ManualOverride

**详见**: [Agent 调度 API 文档](./api/agent-scheduler.md)

#### ⚡ React Compiler 可选功能 (100% 完成)

**配置文件**

- 环境变量控制系统
- 兼容性检测工具
- 回滚机制

**详见**: [React Compiler 实施报告](../../REACT_COMPILER_OPTIONAL_IMPLEMENTATION.md)

### API 分类统计

| 分类           | 端点数量 | 说明                           | 文档                                           |
| -------------- | -------- | ------------------------------ | ---------------------------------------------- |
| **AI 代码智能** | 6        | 代码分析、补全、审查、Bug检测   | 见本文档 (v1.12.0 新增)                        |
| **多模型路由** | 3        | 智能路由、成本追踪、模型状态    | 见本文档 (v1.12.0 新增)                        |
| **多租户**     | 12       | 租户管理、成员邀请、配额        | 见本文档 (v1.12.0 新增)                        |
| **认证与授权** | 5        | 登录、注册、刷新 Token         | 见本文档                                       |
| **任务管理**   | 1        | 任务增删改查、批量操作         | 见本文档                                       |
| **项目管理**   | 1        | 项目管理                       | 见本文档                                       |
| **性能监控**   | 7        | 性能指标、告警、Web Vitals     | 见本文档                                       |
| **分析**       | 2        | 数据分析、导出                 | 见本文档                                       |
| **搜索**       | 3        | 搜索、自动完成、历史           | 见本文档                                       |
| **RBAC**       | 8        | 角色、权限、用户权限管理       | 见本文档                                       |
| **多模态**     | 2        | 图像、音频处理                 | 见本文档                                       |
| **A2A 通信**   | 5        | Agent 间通信、任务队列         | [agent-scheduler.md](./api/agent-scheduler.md) |
| **评分**       | 4        | 评分 CRUD、投票                | [ratings.md](./api/ratings.md)                 |
| **反馈**       | 4        | 反馈管理                       | 见本文档                                       |
| **用户偏好**   | 3        | 用户设置管理                   | 见本文档                                       |
| **GitHub**     | 2        | Issues、Commits                | 见本文档                                       |
| **健康检查**   | 6        | 系统、数据库健康               | 见本文档                                       |
| **工作流版本** | 8        | 版本管理、对比、回滚           | 见本文档 (v1.9.1 新增)                         |
| **RCA 分析**   | 3        | 根因分析、知识库、传播链       | 见本文档 (v1.9.0 新增)                         |
| **WebSocket**  | -        | 房间系统、权限控制、消息持久化 | [websocket.md](./api/websocket.md)             |
| **其他**       | 5        | 跨域、状态、导出等             | 见本文档                                       |

> **注意**: v1.12.x 新增了 21 个 API 端点，包括多租户、监控、告警等模块。

### 基础信息

- **基础 URL**: `https://7zi.com/api` 或 `http://localhost:3000/api`
- **认证方式**: JWT Bearer Token
- **响应格式**: JSON
- **请求格式**: JSON / Form Data

### 认证方式

```bash
# 在请求头中添加 Authorization
Authorization: Bearer <your-jwt-token>
```

---

## AI 代码智能 API (v1.12.0 新增)

### 代码分析

```
POST /api/ai/code/analyze
```

**请求体:**

```json
{
  "code": "function hello() { console.log('world'); }",
  "language": "typescript",
  "options": {
    "calculateComplexity": true,
    "extractDependencies": true
  }
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "complexity": {
      "cyclomatic": 1,
      "cognitive": 1,
      "maintainability": 85
    },
    "dependencies": [],
    "imports": [],
    "exports": []
  }
}
```

---

### 代码补全

```
POST /api/ai/code/complete
```

**请求体:**

```json
{
  "code": "const arr = [1, 2, 3];",
  "cursor": 24,
  "language": "typescript",
  "context": {
    "file": "index.ts",
    "imports": ["fs", "path"]
  }
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "text": "arr.map(x => x * 2)",
        "type": "snippet",
        "confidence": 0.95
      }
    ]
  }
}
```

---

### 代码审查

```
POST /api/ai/code/review
```

**请求体:**

```json
{
  "code": "function test() { var x = 1; }",
  "language": "typescript",
  "rules": ["security", "performance", "style"]
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "severity": "warning",
        "category": "style",
        "message": "Use 'const' or 'let' instead of 'var'",
        "line": 1,
        "suggestion": "let x = 1;"
      }
    ],
    "score": 85
  }
}
```

---

### Bug 检测

```
POST /api/ai/code/detect-bugs
```

**请求体:**

```json
{
  "code": "const data = JSON.parse(undefined);",
  "language": "typescript"
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "bugs": [
      {
        "type": "null_reference",
        "severity": "error",
        "line": 1,
        "message": "Potential null reference error",
        "fix": "const data = JSON.parse(input || '{}');"
      }
    ]
  }
}
```

---

### 修复建议

```
POST /api/ai/code/suggest-fixes
```

**请求体:**

```json
{
  "code": "function add(a, b) { return a + b; }",
  "issues": [
    {
      "type": "typescript",
      "message": "Parameter 'a' implicitly has an 'any' type"
    }
  ]
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "fixes": [
      {
        "original": "function add(a, b) { return a + b; }",
        "fixed": "function add(a: number, b: number): number { return a + b; }",
        "explanation": "Added type annotations for better type safety"
      }
    ]
  }
}
```

---

### 代码解释

```
POST /api/ai/code/explain
```

**请求体:**

```json
{
  "code": "const memoize = fn => { const cache = new Map(); return (...args) => { const key = JSON.stringify(args); if (!cache.has(key)) { cache.set(key, fn(...args)); } return cache.get(key); }; };",
  "language": "javascript"
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "explanation": "This is a memoization function that caches function results based on their arguments. It uses a Map to store cached values and JSON.stringify to create unique keys.",
    "concepts": ["memoization", "caching", "closure", "Map"],
    "complexity": "medium"
  }
}
```

---

## 多模型路由 API (v1.12.0 新增)

### 智能路由

```
POST /api/ai/route
```

**请求体:**

```json
{
  "task": {
    "type": "code_review",
    "prompt": "Review this code for security issues",
    "complexity": "high"
  },
  "options": {
    "budgetLimit": 10,
    "enableCache": true
  }
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "selectedModel": "gpt-4o",
    "reason": "High complexity task requires most capable model",
    "costEstimate": 0.05,
    "cached": false
  }
}
```

---

### 成本追踪

```
GET /api/ai/cost-tracking
```

**Query 参数:**

- `startDate`: 开始日期 (ISO 8601)
- `endDate`: 结束日期 (ISO 8601)

**响应:**

```json
{
  "success": true,
  "data": {
    "totalCost": 45.67,
    "dailyBreakdown": [
      {
        "date": "2026-04-01",
        "cost": 12.34,
        "requests": 150
      }
    ],
    "byModel": {
      "gpt-4o": 30.50,
      "claude-4-sonnet": 15.17
    }
  }
}
```

---

### 模型状态

```
GET /api/ai/models/status
```

**响应:**

```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "gpt-4o",
        "provider": "openai",
        "status": "available",
        "rateLimit": {
          "requestsPerMinute": 100,
          "tokensPerMinute": 200000
        },
        "currentUsage": {
          "requests": 45,
          "tokens": 50000
        }
      }
    ]
  }
}
```

---

## 多租户 API (v1.12.0 新增)

### 列出租户

```
GET /api/v1/tenants
```

**Query 参数:**

- `userId`: 用户 ID (必须)

**响应:**

```json
{
  "success": true,
  "data": [
    {
      "id": "tenant-001",
      "name": "My Organization",
      "slug": "my-org",
      "plan": "pro",
      "isolationMode": "shared",
      "memberCount": 5,
      "createdAt": "2026-04-01T00:00:00Z"
    }
  ]
}
```

---

### 创建租户

```
POST /api/v1/tenants
```

**请求体:**

```json
{
  "name": "New Organization",
  "slug": "new-org",
  "plan": "starter",
  "isolationMode": "shared",
  "settings": {
    "timezone": "UTC",
    "language": "en"
  }
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "id": "tenant-002",
    "name": "New Organization",
    "slug": "new-org",
    "plan": "starter",
    "isolationMode": "shared",
    "createdAt": "2026-04-04T00:00:00Z"
  }
}
```

---

### 获取租户信息

```
GET /api/v1/tenants/[id]
```

**响应:**

```json
{
  "success": true,
  "data": {
    "id": "tenant-001",
    "name": "My Organization",
    "slug": "my-org",
    "plan": "pro",
    "isolationMode": "shared",
    "settings": {
      "timezone": "UTC",
      "language": "en"
    },
    "quota": {
      "users": 100,
      "storageGB": 100,
      "apiCalls": 100000
    }
  }
}
```

---

### 更新租户

```
PUT /api/v1/tenants/[id]
```

**请求体:**

```json
{
  "name": "Updated Name",
  "settings": {
    "timezone": "America/New_York"
  }
}
```

---

### 删除租户

```
DELETE /api/v1/tenants/[id]
```

**响应:**

```json
{
  "success": true,
  "data": {
    "id": "tenant-001",
    "deleted": true
  }
}
```

---

### 租户统计

```
GET /api/v1/tenants/[id]/stats
```

**响应:**

```json
{
  "success": true,
  "data": {
    "tenantId": "tenant-001",
    "memberCount": 5,
    "projectCount": 12,
    "taskCount": 150,
    "apiCalls": 45000,
    "storageUsed": 23.5
  }
}
```

---

### 租户配额

```
GET /api/v1/tenants/[id]/quota
```

**响应:**

```json
{
  "success": true,
  "data": {
    "plan": "pro",
    "limits": {
      "users": 100,
      "storageGB": 100,
      "apiCalls": 100000
    },
    "usage": {
      "users": 5,
      "storageGB": 23.5,
      "apiCalls": 45000
    },
    "remaining": {
      "users": 95,
      "storageGB": 76.5,
      "apiCalls": 55000
    }
  }
}
```

---

### 租户登录

```
POST /api/v1/tenants/login
```

**请求体:**

```json
{
  "tenantSlug": "my-org",
  "email": "user@example.com",
  "password": "secure-password"
}
```

---

### 切换租户

```
POST /api/v1/tenants/switch
```

**请求体:**

```json
{
  "tenantId": "tenant-002"
}
```

---

### 邀请成员

```
POST /api/v1/tenants/invite
```

**请求体:**

```json
{
  "tenantId": "tenant-001",
  "email": "newuser@example.com",
  "role": "member"
}
```

---

### 接受邀请

```
POST /api/v1/tenants/accept
```

**请求体:**

```json
{
  "inviteToken": "abc123xyz"
}
```

---

### 转让租户

```
POST /api/v1/tenants/transfer
```

**请求体:**

```json
{
  "tenantId": "tenant-001",
  "newOwnerId": "user-002"
}
```

---

## 认证与授权 API

### 登录

```
POST /api/auth/login
```

**请求体:**

```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-001",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

---

### 注册

```
POST /api/auth/register
```

**请求体:**

```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "John Doe"
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "id": "user-001",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

### 获取当前用户

```
GET /api/auth/me
```

**响应:**

```json
{
  "success": true,
  "data": {
    "id": "user-001",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "member"
  }
}
```

---

### 刷新 Token

```
POST /api/auth/refresh
```

**请求体:**

```json
{
  "refreshToken": "your-refresh-token"
}
```

---

### 登出

```
POST /api/auth/logout
```

---

## 任务管理 API

### 获取任务列表

```
GET /api/tasks
```

**Query 参数:**

- `status`: 过滤状态 (pending, in_progress, completed, failed)
- `priority`: 过滤优先级 (low, medium, high, urgent)
- `assignee`: 过滤负责人
- `tags`: 过滤标签（逗号分隔）
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20）

**响应:**

```json
{
  "tasks": [
    {
      "id": "123",
      "title": "Task title",
      "description": "Task description",
      "status": "in_progress",
      "priority": "high",
      "assignee": "agent-001",
      "tags": ["urgent", "review"],
      "dueDate": "2026-03-30T00:00:00Z",
      "createdAt": "2026-03-22T10:00:00Z",
      "updatedAt": "2026-03-22T11:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### 创建任务

```
POST /api/tasks
```

**请求体:**

```json
{
  "title": "Task title",
  "description": "Task description",
  "priority": "high",
  "assignee": "agent-001",
  "tags": ["urgent", "review"],
  "dueDate": "2026-03-30T00:00:00Z"
}
```

---

### 更新任务

```
PUT /api/tasks/:id
```

---

### 删除任务

```
DELETE /api/tasks/:id
```

---

## 项目管理 API

### 获取项目列表

```
GET /api/projects
```

---

### 创建项目

```
POST /api/projects
```

---

---

## 性能监控 API

### 性能指标

```
GET /api/performance/metrics
```

---

### 性能报告

```
GET /api/performance/report
```

---

### 性能告警

```
GET /api/performance/alerts
```

---

### 清除性能数据

```
POST /api/performance/clear
```

---

### Web Vitals

```
POST /api/vitals
```

```
GET /api/vitals
```

---

### APM 监控状态 (v1.12.2 新增)

```
GET /api/monitoring/apm
```

获取 APM 状态和指标，包括 Sentry 配置、分布式追踪、性能指标和 Agent 任务统计。

**响应**:

```json
{
  "success": true,
  "data": {
    "apm": {
      "status": "enabled",
      "sentry": {
        "initialized": true,
        "dsn": true,
        "environment": "production",
        "release": "v1.12.2",
        "tracesSampleRate": 0.1,
        "profilesSampleRate": 0.05,
        "debug": false
      },
      "tracing": {
        "traceId": "abc123",
        "spanId": "def456",
        "activeSpans": 2
      }
    },
    "performance": {
      "memory": { "used": 128, "limit": 512, "percentage": 25 },
      "uptime": 3600,
      "responseTime": 15
    },
    "agentTasks": {
      "totalAgents": 5,
      "totalTasks": 150,
      "completedTasks": 145,
      "failedTasks": 3,
      "activeTasks": 2,
      "avgTaskDuration": 2500,
      "totalTokens": 50000
    }
  },
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

**响应头**:
- `X-Response-Time`: 响应时间 (毫秒)
- `sentry-trace`: Sentry 追踪头

**版本**: v1.12.2

---

### 性能指标（Prometheus 格式）

```
GET /api/metrics/performance
```

```
GET /api/metrics/prometheus
```

---

## 分析 API

### 分析指标

```
GET /api/analytics/metrics
```

---

### 导出分析

```
POST /api/analytics/export
```

---

### 实时分析流

```
GET /api/stream/analytics
```

---

## 搜索 API

### 搜索

```
GET /api/search
```

**Query 参数:**

- `q`: 搜索查询
- `type`: 搜索类型（tasks, users, projects）
- `page`: 页码
- `limit`: 每页数量

---

### 自动完成

```
GET /api/search/autocomplete
```

---

### 搜索历史

```
GET /api/search/history
```

---

## RBAC 权限 API

### 系统状态

```
GET /api/rbac/system
```

---

### 角色管理

```
GET /api/rbac/roles
```

```
POST /api/rbac/roles
```

```
GET /api/rbac/roles/[roleId]
```

```
PUT /api/rbac/roles/[roleId]
```

```
DELETE /api/rbac/roles/[roleId]
```

```
GET /api/rbac/roles/[roleId]/permissions
```

```
PUT /api/rbac/roles/[roleId]/permissions
```

---

### 权限管理

```
GET /api/rbac/permissions
```

---

### 用户角色管理

#### 获取用户角色

```
GET /api/rbac/users/[userId]/roles
```

**Query 参数:**

- `includePermissions`: 是否包含权限列表 (`true` | `false`)

**响应:**

```json
{
  "success": true,
  "data": {
    "userId": "user-001",
    "roles": ["admin", "manager"],
    "permissions": ["users:read", "users:write", "tasks:read"],
    "count": 2
  }
}
```

---

#### 添加用户角色

```
POST /api/rbac/users/[userId]/roles
```

**权限**: 需要 manager 或 admin 权限

**请求体:**

```json
{
  "roles": ["admin", "viewer"]
}
```

**可用角色**: `admin` | `manager` | `member` | `viewer` | `guest`

**响应:**

```json
{
  "success": true,
  "data": {
    "userId": "user-001",
    "addedRoles": ["admin", "viewer"],
    "count": 2
  },
  "message": "Roles added successfully"
}
```

---

#### 移除用户角色

```
DELETE /api/rbac/users/[userId]/roles
```

**权限**: 需要 manager 或 admin 权限

**请求体:**

```json
{
  "roles": ["viewer"]
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "userId": "user-001",
    "removedRoles": ["viewer"],
    "count": 1
  },
  "message": "Roles removed successfully"
}
```

---

### 用户权限查询

```
GET /api/rbac/users/[userId]/permissions
```

获取用户通过角色继承的所有权限。

**响应:**

```json
{
  "success": true,
  "data": {
    "userId": "user-001",
    "permissions": ["users:read", "users:write", "tasks:read", "tasks:write", "projects:read"],
    "count": 5
  }
}
```

---

## 多模态 API

### 图像处理

```
POST /api/multimodal/image
```

**请求体:**

```json
{
  "operation": "resize",
  "width": 800,
  "height": 600,
  "format": "webp"
}
```

---

### 音频处理

```
POST /api/multimodal/audio
```

---

## A2A 通信 API

### JSON-RPC 调用

```
POST /api/a2a/jsonrpc
```

**请求体:**

```json
{
  "jsonrpc": "2.0",
  "method": "tool_name",
  "params": { "param": "value" },
  "id": 1
}
```

---

### Agent 注册表

```
GET /api/a2a/registry
```

```
POST /api/a2a/registry
```

```
GET /api/a2a/registry/[id]
```

```
PUT /api/a2a/registry/[id]
```

```
DELETE /api/a2a/registry/[id]
```

---

### 心跳检测

```
POST /api/a2a/registry/[id]/heartbeat
```

---

### 任务队列

```
GET /api/a2a/queue
```

获取队列状态和统计信息。

**响应:**

```json
{
  "status": "ok",
  "stats": {
    "total": 42,
    "byPriority": {
      "urgent": 5,
      "high": 10,
      "normal": 20,
      "low": 7
    },
    "byAgent": {
      "agent-001": 15,
      "agent-002": 12,
      "agent-003": 15
    }
  },
  "nextMessage": {
    "id": "msg-001",
    "taskId": "task-001",
    "agentId": "agent-001",
    "priority": "urgent"
  },
  "config": {
    "maxSize": 1000,
    "maxAttempts": 3
  }
}
```

---

### 入队消息

```
POST /api/a2a/queue
```

将消息加入队列。

**请求体:**

```json
{
  "id": "msg-001",
  "taskId": "task-001",
  "agentId": "agent-001",
  "priority": "high",
  "payload": {
    "data": "example"
  },
  "maxAttempts": 3
}
```

**参数说明**:

- `taskId`: 任务 ID (必需)
- `agentId`: Agent ID (必需)
- `priority`: 优先级 (`urgent` | `high` | `normal` | `low`)
- `payload`: 消息载荷
- `maxAttempts`: 最大重试次数 (默认 3)

---

### 清空队列

```
DELETE /api/a2a/queue
```

清空队列或特定条件下的消息。

**Query 参数**:

- `agentId`: 仅清空特定 Agent 的消息 (可选)
- `priority`: 仅清空特定优先级的消息 (可选)

**示例**:

- `DELETE /api/a2a/queue` - 清空全部队列
- `DELETE /api/a2a/queue?agentId=agent-001` - 清空 agent-001 的消息
- `DELETE /api/a2a/queue?priority=high` - 清空高优先级消息

---

## 反馈 API

### 提交反馈

```
POST /api/feedback
```

**请求体:**

```json
{
  "type": "bug",
  "title": "反馈标题",
  "description": "反馈描述",
  "rating": 5,
  "email": "user@example.com",
  "images": [
    {
      "name": "screenshot.jpg",
      "size": 12345,
      "type": "image/jpeg"
    }
  ],
  "metadata": {}
}
```

**参数说明**:

- `type`: 反馈类型 (`bug` | `feature` | `improvement` | `other`)
- `title`: 反馈标题 (最多 100 字符)
- `description`: 反馈描述 (最多 1000 字符)
- `rating`: 评分 (1-5，必需)
- `email`: 邮箱地址 (可选)
- `images`: 图片附件数组 (可选)
- `metadata`: 额外元数据 (可选)

**反垃圾检测**:

- 标题和描述会经过反垃圾检测
- 如果被判定为垃圾，返回 401 Unauthorized

---

### 获取反馈列表

```
GET /api/feedback
```

**Query 参数:**

- `user_id`: 用户 ID
- `type`: 反馈类型过滤
- `status`: 状态过滤 (`pending` | `reviewed` | `resolved`)
- `priority`: 优先级过滤 (`low` | `medium` | `high` | `urgent`)
- `rating_min`: 最小评分
- `rating_max`: 最大评分
- `start_date`: 开始日期 (ISO 格式)
- `end_date`: 结束日期 (ISO 格式)
- `search`: 搜索关键词 (搜索标题和描述)
- `sort_by`: 排序字段 (`created_at` | `rating`)
- `sort_order`: 排序方向 (`asc` | `desc`)
- `page`: 页码 (默认 1)
- `per_page`: 每页数量 (默认 20, 最大 100)

**响应:**

```json
{
  "feedbacks": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  },
  "stats": {
    "total": 100,
    "average": 4.2,
    "byType": { "bug": 30, "feature": 40, "improvement": 20, "other": 10 },
    "byStatus": { "pending": 50, "reviewed": 30, "resolved": 20 },
    "byPriority": { "high": 20, "medium": 50, "low": 30 }
  }
}
```

---

### 获取单个反馈

```
GET /api/feedback/[id]
```

---

### 更新反馈 (管理员)

```
PATCH /api/feedback/[id]
```

**权限**: 需要管理员权限

**请求体:**

```json
{
  "status": "reviewed",
  "priority": "high",
  "admin_notes": "已处理，计划在下个版本修复",
  "metadata": {}
}
```

**参数说明**:

- `status`: 反馈状态 (可选)
- `priority`: 优先级 (可选)
- `admin_notes`: 管理员备注 (可选)
- `metadata`: 额外元数据 (可选)

**自动时间戳**:

- 设置 `status` 为 `reviewed` 时，自动更新 `reviewed_at`
- 设置 `status` 为 `resolved` 时，自动更新 `resolved_at`

---

### 删除反馈 (管理员)

```
DELETE /api/feedback/[id]
```

**权限**: 需要管理员权限

---

## 评分 API

### 获取评分列表

```
GET /api/ratings
```

**Query 参数:**

- `user_id`: 用户 ID
- `target_type`: 目标类型 (`agent` | `task` | `feature` | `project` | `overall`)
- `target_id`: 目标 ID
- `rating_min`: 最小评分
- `rating_max`: 最大评分
- `status`: 状态过滤
- `start_date`: 开始日期
- `end_date`: 结束日期
- `sort_by`: 排序字段
- `sort_order`: 排序方向
- `page`: 页码
- `per_page`: 每页数量

**响应:**

```json
{
  "ratings": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  },
  "stats": {
    "average": 4.2,
    "total": 100,
    "byRating": { "1": 5, "2": 8, "3": 12, "4": 30, "5": 45 }
  }
}
```

---

### 创建评分

```
POST /api/ratings
```

**请求体:**

```json
{
  "user_id": "user-001",
  "target_type": "agent",
  "target_id": "agent-001",
  "rating": 5,
  "title": "非常高效！",
  "description": "这个助手很好地完成了任务",
  "verified": false,
  "metadata": {}
}
```

**参数说明**:

- `target_type`: 目标类型 (必需)
  - `agent`: 评分 AI 助手
  - `task`: 评分任务
  - `feature`: 评分功能特性
  - `project`: 评分项目
  - `overall`: 整体评分
- `target_id`: 目标 ID (必需)
- `rating`: 评分 1-5 (必需)
- `title`: 标题 (可选，最多 100 字符)
- `description`: 描述 (可选，最多 1000 字符)
- `verified`: 是否已验证 (可选)
- `metadata`: 额外元数据 (可选)

**反垃圾检测**:

- 标题和描述会经过反垃圾检测
- 如果被判定为垃圾，返回 401 Unauthorized

**重复提交**:

- 同一用户对同一目标只能有一个评分
- 重复提交会更新现有评分

---

### 获取单个评分

```
GET /api/ratings/[id]
```

---

### 删除评分

```
DELETE /api/ratings/[id]
```

**权限**: 只能删除自己的评分，或管理员可删除所有

---

### 标记评分是否有帮助

```
POST /api/ratings/[id]/helpful
```

**请求体:**

```json
{
  "is_helpful": true
}
```

**说明**:

- 每个用户对每个评分只能投票一次
- 重复提交会更新投票
- 更新评分的 `helpful_count` 和 `not_helpful_count`

**响应:**

```json
{
  "id": "rating-001",
  "rating": 5,
  "helpful_count": 42,
  "not_helpful_count": 3,
  "user_vote": true
}
```

---

## 用户偏好设置 API

### 获取用户偏好

```
GET /api/user/preferences?user_id=xxx
```

**Query 参数:**

- `user_id`: 用户 ID (必需)

**响应:**

```json
{
  "success": true,
  "data": {
    "user_id": "user-001",
    "locale": "zh",
    "theme": "dark",
    "timezone": "Asia/Shanghai",
    "notifications_enabled": true,
    "email_notifications": true,
    "sound_enabled": true,
    "created_at": "2026-03-01T00:00:00Z",
    "updated_at": "2026-03-29T00:00:00Z"
  }
}
```

---

### 创建用户偏好

```
POST /api/user/preferences
```

**请求体:**

```json
{
  "user_id": "user-001",
  "locale": "zh",
  "theme": "dark",
  "timezone": "Asia/Shanghai",
  "notifications_enabled": true,
  "email_notifications": true,
  "sound_enabled": true
}
```

**参数说明**:

- `user_id`: 用户 ID (必需)
- `locale`: 语言代码 (如 `zh`, `en`)
- `theme`: 主题 (`light` | `dark` | `system`)
- `timezone`: 时区 (如 `Asia/Shanghai`)
- `notifications_enabled`: 启用通知 (布尔值)
- `email_notifications`: 启用邮件通知 (布尔值)
- `sound_enabled`: 启用声音 (布尔值)

**注意**: 如果偏好已存在，返回 409 Conflict，需要使用 PUT 更新。

---

### 更新用户偏好

```
PUT /api/user/preferences
```

**请求体:** 所有字段可选

```json
{
  "user_id": "user-001",
  "theme": "light",
  "notifications_enabled": false
}
```

**说明**: 只更新提供的字段。如果偏好不存在，会自动创建。

---

## Web Vitals API

### 上报 Web Vitals

```
POST /api/web-vitals
```

**请求体:**

```json
{
  "metrics": [
    {
      "id": "v1",
      "name": "LCP",
      "value": 2500,
      "rating": "good",
      "delta": 100,
      "navigationType": "navigate",
      "timestamp": 1647984000000,
      "route": "/dashboard",
      "sessionId": "session-001"
    }
  ],
  "metadata": {
    "url": "https://7zi.com/dashboard",
    "referrer": "https://7zi.com",
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "deviceType": "desktop"
  }
}
```

**支持的指标**:

- `LCP`: Largest Contentful Paint (最大内容绘制)
- `FID`: First Input Delay (首次输入延迟)
- `CLS`: Cumulative Layout Shift (累积布局偏移)
- `TTFB`: Time to First Byte (首字节时间)
- `FCP`: First Contentful Paint (首次内容绘制)
- `INP`: Interaction to Next Paint (交互到下次绘制)

**参数说明**:

- `id`: 指标唯一标识
- `name`: 指标名称
- `value`: 指标值 (毫秒或分数)
- `rating`: 评级 (`good` | `needs-improvement` | `poor`)
- `delta`: 变化值
- `route`: 页面路由
- `sessionId`: 会话 ID (可选)

**功能**:

- 验证数据格式
- 发送到 Sentry 用于监控
- 计算性能评分 (0-100)
- 存储到数据库

**响应:**

```json
{
  "success": true,
  "data": {
    "received": 5,
    "score": 85,
    "timestamp": 1647984000000
  }
}
```

---

### 获取 Web Vitals 统计

```
GET /api/web-vitals
```

**Query 参数:**

- `route`: 路由过滤 (可选)
- `hours`: 时间范围 (小时，默认 24)

**响应:**

```json
{
  "success": true,
  "data": {
    "route": "/dashboard",
    "hours": 24,
    "metrics": {
      "LCP": { "avg": 2500, "count": 100 },
      "CLS": { "avg": 0.1, "count": 100 },
      "INP": { "avg": 150, "count": 100 }
    },
    "score": 85,
    "total": 300
  }
}
```

---

## GitHub 集成 API

### 获取 Issues

```
GET /api/github/issues
```

---

### 获取 Commits

```
GET /api/github/commits
```

---

## 健康检查 API

### 系统健康

```
GET /api/health
```

基础健康检查，用于 Kubernetes/Docker 探针。检查内存使用和 Node.js 运行时状态。

**响应**:

```json
{
  "status": "healthy",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.4.0",
  "checks": {
    "memory": {
      "status": "ok",
      "used": 128,
      "limit": 512
    },
    "node": {
      "status": "ok",
      "version": "v22.22.1"
    }
  }
}
```

**状态码**:

- `200 OK` - 健康状态为 `"healthy"`（内存使用 < 90%）
- `503 Service Unavailable` - 健康状态为 `"unhealthy"`（内存使用 >= 90%）

**状态值**:

- `status`: `"healthy"` | `"unhealthy"`
- `checks.memory.status`: `"ok"` | `"warning"`（> 90% 使用时为 warning）
- `checks.node.status`: 始终为 `"ok"`

---

### 详细健康

```
GET /api/health/detailed
```

详细健康检查，包含外部服务状态。**需要 JWT 认证**。

**认证**: 需要 Bearer token

```
Authorization: Bearer <your-jwt-token>
```

**响应**:

```json
{
  "status": "ok",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "version": "1.4.0",
  "uptime": 3600,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "ok",
      "latency": 150
    },
    "emailService": {
      "status": "ok",
      "latency": 80
    }
  }
}
```

**状态码**:

- `200 OK` - 已认证且健康状态为 `"ok"` 或 `"degraded"`
- `401 Unauthorized` - 缺少或无效的认证令牌
- `503 Service Unavailable` - 健康状态为 `"error"`

---

### 存活检查

```
GET /api/health/live
```

Kubernetes 存活探针。如果进程运行则始终返回 200。

**响应**:

```json
{
  "success": true,
  "status": "alive"
}
```

**状态码**: `200 OK`（始终返回，如果进程运行）

---

### 就绪检查

```
GET /api/health/ready
```

Kubernetes 就绪探针。仅当所有关键依赖可用时返回 200。

**响应**:

```json
{
  "ready": true,
  "status": "ok",
  "timestamp": "2026-03-30T12:00:00.000Z",
  "version": "1.4.0",
  "uptime": 3600,
  "environment": "production",
  "checks": {
    "githubApi": {
      "status": "ok",
      "latency": 150
    },
    "emailService": {
      "status": "ok",
      "latency": 80
    }
  }
}
```

**状态码**:

- `200 OK` - 状态为 `"ok"` 或 `"degraded"`
- `503 Service Unavailable` - 状态为 `"error"`

**外部服务检查**:

- `githubApi`: 检查 GitHub API 可达性（5秒超时）
- `emailService`: 检查 Resend API（如已配置）

---

## 其他 API

### 系统状态

```
GET /api/status
```

---

### 数据导出

```
POST /api/data/export
```

---

### 数据导入

```
POST /api/data/import
```

---

### 跨域 Token

```
GET /api/csrf-token
```

---

### CSP 违规报告

```
POST /api/csp-violation
```

---

### ISR 重新验证

```
POST /api/revalidate
```

---

## 数据模型

### Task

```typescript
interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: string
  tags: string[]
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
}
```

---

### User

```typescript
interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'member' | 'viewer' | 'guest'
  status: 'active' | 'inactive' | 'suspended'
  avatar?: string
  createdAt: Date
  updatedAt: Date
}
```

---

### Notification

```typescript
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'task_assigned' | 'system'
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  read: boolean
  createdAt: Date
  expiresAt?: Date
}
```

---

### Backup

```typescript
interface Backup {
  id: string
  name: string
  size: number
  status: 'pending' | 'completed' | 'failed'
  createdAt: Date
  expiresAt?: Date
}
```

---

### PerformanceMetric

```typescript
interface PerformanceMetric {
  id: string
  metricType: 'lcp' | 'fid' | 'cls' | 'fcp' | 'ttfb'
  value: number
  url: string
  timestamp: Date
}
```

---

### Rating

```typescript
interface Rating {
  id: string
  user_id: string
  target_type: 'agent' | 'task' | 'feature' | 'project' | 'overall'
  target_id: string
  rating: number // 1-5
  title?: string
  description?: string
  verified: boolean
  helpful_count: number
  not_helpful_count: number
  created_at: Date
  updated_at: Date
  metadata?: object
}
```

---

### UserPreferences

```typescript
interface UserPreferences {
  user_id: string
  locale: string // 'zh', 'en', etc.
  theme: 'light' | 'dark' | 'system'
  timezone?: string
  notifications_enabled: boolean
  email_notifications: boolean
  sound_enabled: boolean
  created_at: Date
  updated_at: Date
}
```

---

### WebVitalMetric

```typescript
interface WebVitalMetric {
  id: string
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  route: string
  deviceType: 'mobile' | 'tablet' | 'desktop'
  timestamp: number
  sessionId?: string
}
```

---

## 错误处理

### 统一错误处理系统 (v1.12.1 新增)

v1.12.1 引入了完整的统一错误处理系统，提供标准化的错误类型、响应格式和处理工具。

#### 统一错误类型

```typescript
enum UnifiedErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL = 'INTERNAL',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  MISSING_TOKEN = 'MISSING_TOKEN',
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST'
}
```

#### 统一错误类

```typescript
import { UnifiedAppError } from '@/lib/errors'

// 创建验证错误
const error = UnifiedAppError.validation('Invalid email format', {
  field: 'email',
  provided: 'user@'
})

// 创建未授权错误
const error = UnifiedAppError.unauthorized('Invalid token')

// 创建资源未找到错误
const error = UnifiedAppError.notFound('User not found', { userId: '123' })

// 创建限流错误
const error = UnifiedAppError.rateLimit('Too many requests', {
  limit: 100,
  window: '1 minute'
})
```

#### 统一响应函数

```typescript
import {
  createValidationErrorResponse,
  createNotFoundErrorResponse,
  createUnauthorizedErrorResponse,
  createForbiddenErrorResponse,
  createRateLimitErrorResponse,
  createInternalErrorResponse
} from '@/lib/errors'

// 创建验证错误响应 (HTTP 400)
const response = createValidationErrorResponse(error)
// {
//   success: false,
//   error: {
//     code: 'VALIDATION_ERROR',
//     message: 'Invalid email format',
//     details: { field: 'email', provided: 'user@' }
//   }
// }

// 创建未找到错误响应 (HTTP 404)
const response = createNotFoundErrorResponse(error)

// 创建未授权错误响应 (HTTP 401)
const response = createUnauthorizedErrorResponse(error)

// 创建禁止访问错误响应 (HTTP 403)
const response = createForbiddenErrorResponse(error)

// 创建限流错误响应 (HTTP 429)
const response = createRateLimitErrorResponse(error, {
  limit: 100,
  remaining: 0,
  resetAt: Date.now() + 60000
})

// 创建内部错误响应 (HTTP 500)
const response = createInternalErrorResponse(error)
```

#### 错误处理包装器

```typescript
import { withUnifiedErrorHandling } from '@/lib/errors'

// 使用包装器自动处理错误
export const POST = withUnifiedErrorHandling(async (request: NextRequest) => {
  const body = await request.json()

  // 业务逻辑，错误自动捕获和转换为统一响应
  const user = await createUser(body)

  return NextResponse.json({
    success: true,
    data: user
  })
})

// 带参数的包装器
export const GET = withUnifiedErrorHandling({
  logErrors: true,
  includeStackTrace: process.env.NODE_ENV === 'development'
}, async (request: NextRequest) => {
  // 业务逻辑
})
```

#### 完整的错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "type": "VALIDATION",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "provided": "user@"
    },
    "stackTrace": "..."  // 仅在开发环境
  },
  "timestamp": "2026-04-04T12:00:00Z"
}
```

#### 错误码映射

| 错误类型 | HTTP 状态 | 错误码 | 说明 |
|---------|---------|--------|------|
| VALIDATION | 400 | VALIDATION_ERROR | 参数验证失败 |
| BAD_REQUEST | 400 | BAD_REQUEST | 错误的请求 |
| UNAUTHORIZED | 401 | UNAUTHORIZED | 未授权 |
| FORBIDDEN | 403 | FORBIDDEN | 无权限 |
| NOT_FOUND | 404 | NOT_FOUND | 资源不存在 |
| CONFLICT | 409 | CONFLICT | 资源冲突 |
| RATE_LIMIT | 429 | RATE_LIMIT_EXCEEDED | 请求超过限制 |
| INTERNAL | 500 | INTERNAL_ERROR | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | SERVICE_UNAVAILABLE | 服务不可用 |
| NETWORK | 502 | NETWORK_ERROR | 网络错误 |
| TIMEOUT | 504 | TIMEOUT_ERROR | 请求超时 |
| WEAK_PASSWORD | 400 | WEAK_PASSWORD | 密码强度不足 |
| MISSING_TOKEN | 401 | MISSING_TOKEN | 缺少认证令牌 |
| REGISTRATION_FAILED | 400 | REGISTRATION_FAILED | 注册失败 |

---

### 传统错误处理 (向后兼容)

以下错误码仍保持向后兼容：

#### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  }
}
```

#### 常见错误码（传统）

| 错误码                | HTTP 状态 | 说明           |
| --------------------- | --------- | -------------- |
| `UNAUTHORIZED`        | 401       | 未授权         |
| `FORBIDDEN`           | 403       | 无权限         |
| `NOT_FOUND`           | 404       | 资源不存在     |
| `VALIDATION_ERROR`    | 400       | 参数验证失败   |
| `INTERNAL_ERROR`      | 500       | 服务器内部错误 |
| `RATE_LIMIT_EXCEEDED` | 429       | 请求超过限制   |
| `DATABASE_ERROR`      | 500       | 数据库错误     |

---

## 限流策略

API 实现了多级限流策略，基于 Redis 的分布式限流和内存限流：

- **默认限制**: 100 请求/分钟/IP
- **认证用户**: 200 请求/分钟/用户
- **API 路由**: 根据端点类型有不同限制

限流响应头：

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1647984000
```

---

## 缓存策略

- **API 响应缓存**: 默认 5 分钟
- **静态资源**: 1 年（带版本控制）
- **ISR 缓存**: 根据页面类型（1 小时 - 30 天）

### Server Actions 缓存 API (v1.3.0 新增)

#### updateTag() - Read-Your-Writes 语义

确保用户立即看到自己的更新，提供强一致性保证。

```typescript
import { updateTag } from 'next/cache'

// 用户提交更新后立即失效缓存
await updateUser(userId, data)
updateTag('user-data') // 立即生效，用户看到最新数据
```

**适用场景**:

- 用户创建/更新内容后需要立即看到变化
- 关键业务操作需要强一致性

#### refresh() - 仅刷新未缓存数据

选择性刷新，仅对未缓存的数据发起请求，提高效率。

```typescript
import { refresh } from 'next/cache'

// 仅刷新未缓存的数据
await refresh('user-posts') // 跳过已缓存的数据
```

**适用场景**:

- 定期同步数据
- 低优先级数据更新
- 减少 API 调用压力

#### revalidateTag() - 新 cacheLife profile 参数

使用 `cacheLife` profile 进行细粒度的缓存控制。

```typescript
import { unstable_cacheLife as cacheLife } from 'next/cache'
import { revalidateTag } from 'next/cache'

// 定义缓存生命周期配置
const getUserData = unstable_cache(
  async (userId: string) => {
    return await db.query('SELECT * FROM users WHERE id = ?', [userId])
  },
  ['user-data'],
  {
    tags: ['user-data'],
    revalidate: cacheLife({
      stale: 3600, // 1 小时后数据过期
      revalidate: 1800, // 30 分钟后后台重新验证
    }),
  }
)

// 手动触发重新验证
revalidateTag('user-data')
```

**cacheLife 参数说明**:

- `stale` (秒): 数据被视为过期的时长
- `revalidate` (秒): 后台重新验证的间隔

### middleware.ts → proxy.ts 迁移 (v1.3.0)

**变更说明**:

- `src/middleware.ts` 重命名为 `src/proxy.ts`
- 导出函数从 `middleware` 改为 `proxy`
- 功能保持不变，仅名称变更以更好地反映实际用途

```typescript
// 新的 proxy.ts
export function proxy(request: NextRequest) {
  // 请求拦截和代理逻辑
  // ...
}
```

---

## 🔗 相关文档

- [README.md](./README.md) - 项目介绍
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南

---

**文档维护**: 📚 咨询师 (AI 团队)
**最后更新**: 2026-04-02
**版本**: v1.8.0

---

## 📊 v1.8.0 API 更新 (2026-04-02)

### 🎨 Visual Workflow Orchestrator API

v1.8.0 引入了完整的可视化工作流编排 API，支持多 Agent 协作、条件分支、并行执行等功能。

#### 工作流管理 API

##### 创建工作流

```
POST /api/workflow
```

创建一个新的工作流定义。

**请求体**:

```json
{
  "name": "My Workflow",
  "description": "工作流描述",
  "nodes": [
    {
      "id": "node_1",
      "type": "start",
      "name": "开始",
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "node_2",
      "type": "agent",
      "name": "执行任务",
      "position": { "x": 300, "y": 100 },
      "agentConfig": {
        "agentId": "agent_1",
        "agentType": "assistant",
        "prompt": "执行任务描述"
      }
    },
    {
      "id": "node_3",
      "type": "end",
      "name": "结束",
      "position": { "x": 500, "y": 100 }
    }
  ],
  "edges": [
    { "id": "edge_1", "source": "node_1", "target": "node_2", "type": "sequence" },
    { "id": "edge_2", "source": "node_2", "target": "node_3", "type": "sequence" }
  ],
  "config": {
    "timeout": 3600,
    "retryPolicy": {
      "maxRetries": 3,
      "backoff": "exponential",
      "interval": 5
    }
  },
  "userId": "user_1"
}
```

**参数说明**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 工作流名称 |
| `description` | string | ❌ | 工作流描述 |
| `nodes` | WorkflowNode[] | ❌ | 节点列表 |
| `edges` | WorkflowEdge[] | ❌ | 边/连接列表 |
| `config.timeout` | number | ❌ | 超时时间（秒），默认 3600 |
| `config.retryPolicy` | object | ❌ | 重试策略 |
| `userId` | string | ❌ | 创建者 ID |

**节点类型**:
| 类型 | 说明 | 颜色 |
|------|------|------|
| `start` | 工作流入口 | 🟢 绿色 |
| `end` | 工作流终止 | 🔴 红色 |
| `agent` | Agent 任务执行 | 🔵 蓝色 |
| `condition` | 条件分支 | 🟡 黄色 |
| `parallel` | 并行执行 | 🟣 紫色 |
| `wait` | 等待/延迟 | ⚪ 灰色 |

**响应**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "workflow_1712345678901_abc123",
    "name": "My Workflow",
    "version": 1,
    "status": "draft",
    "nodes": [...],
    "edges": [...],
    "config": {...},
    "metadata": {
      "createdAt": "2026-04-02T12:00:00.000Z",
      "updatedAt": "2026-04-02T12:00:00.000Z",
      "createdBy": "user_1"
    }
  }
}
```

**错误响应**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | `VALIDATION_ERROR` | 工作流验证失败 |
| 400 | `VALIDATION_ERROR` | 工作流名称不能为空 |

---

##### 获取工作流列表

```
GET /api/workflow
```

获取所有工作流列表。

**Query 参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `status` | string | - | 过滤状态 (draft, active, paused, archived) |
| `limit` | number | 50 | 每页数量 |
| `offset` | number | 0 | 偏移量 |

**响应**:

```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "workflow_1",
        "name": "示例工作流",
        "version": 1,
        "status": "active",
        "nodes": [...],
        "edges": [...],
        "metadata": {...}
      }
    ],
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

---

##### 获取工作流详情

```
GET /api/workflow/:id
```

获取指定工作流的详细信息。

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 工作流 ID |

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "workflow_1",
    "name": "示例工作流",
    "description": "工作流描述",
    "version": 1,
    "status": "active",
    "nodes": [
      {
        "id": "node_1",
        "type": "start",
        "name": "开始",
        "position": { "x": 100, "y": 100 }
      },
      {
        "id": "node_2",
        "type": "agent",
        "name": "执行 Agent",
        "position": { "x": 350, "y": 100 },
        "agentConfig": {
          "agentId": "agent_1",
          "agentType": "assistant",
          "prompt": "执行任务"
        }
      },
      {
        "id": "node_3",
        "type": "condition",
        "name": "判断结果",
        "position": { "x": 600, "y": 100 },
        "conditionConfig": {
          "expression": "{{result.success}} === true"
        }
      },
      {
        "id": "node_4",
        "type": "end",
        "name": "结束",
        "position": { "x": 1100, "y": 100 }
      }
    ],
    "edges": [...],
    "config": {
      "timeout": 3600,
      "retryPolicy": {
        "maxRetries": 3,
        "backoff": "exponential",
        "interval": 5
      }
    },
    "metadata": {
      "createdAt": "2026-04-02T10:00:00Z",
      "updatedAt": "2026-04-02T11:00:00Z",
      "createdBy": "user_1",
      "updatedBy": "user_1"
    }
  }
}
```

---

##### 更新工作流

```
PUT /api/workflow/:id
```

更新指定工作流的配置。

**请求体**: 所有字段可选

```json
{
  "name": "更新后的名称",
  "description": "更新后的描述",
  "nodes": [...],
  "edges": [...],
  "config": {...}
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "workflow_1",
    "name": "更新后的名称",
    "updatedAt": "2026-04-02T12:00:00Z",
    ...
  }
}
```

---

##### 删除工作流

```
DELETE /api/workflow/:id
```

删除指定工作流及其所有运行实例。

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "workflow_1",
    "message": "工作流已删除"
  }
}
```

---

#### 工作流执行 API

##### 运行工作流

```
POST /api/workflow/:id/run
```

启动工作流执行，创建新的运行实例。

**请求体**:

```json
{
  "inputs": {
    "query": "Hello World",
    "param1": "value1"
  },
  "userId": "user_1",
  "triggerType": "manual"
}
```

**参数说明**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `inputs` | object | ❌ | 工作流输入参数 |
| `userId` | string | ❌ | 触发者 ID |
| `triggerType` | string | ❌ | 触发类型 (manual, api, schedule, webhook) |

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "instanceId": "instance_1712345678901_xyz789",
    "workflowId": "workflow_1",
    "status": "running",
    "message": "工作流已开始运行",
    "metadata": {
      "startedAt": "2026-04-02T12:00:00.000Z",
      "triggeredBy": "user_1",
      "triggerType": "manual"
    }
  }
}
```

---

##### 获取运行历史

```
GET /api/workflow/:id/run
```

获取工作流的运行实例列表。

**Query 参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `status` | string | - | 过滤状态 (pending, running, completed, failed, cancelled) |
| `limit` | number | 50 | 每页数量 |
| `offset` | number | 0 | 偏移量 |

**响应**:

```json
{
  "success": true,
  "data": {
    "instances": [
      {
        "id": "instance_1",
        "workflowId": "workflow_1",
        "workflowVersion": 1,
        "status": "completed",
        "progress": {
          "total": 3,
          "completed": 3,
          "failed": 0,
          "percentage": 100
        },
        "nodeResults": {
          "node_1": {
            "nodeId": "node_1",
            "status": "success",
            "startTime": "2026-04-02T11:59:55Z",
            "endTime": "2026-04-02T11:59:55.010Z",
            "duration": 10
          },
          "node_2": {
            "nodeId": "node_2",
            "status": "success",
            "startTime": "2026-04-02T11:59:55.010Z",
            "endTime": "2026-04-02T11:59:58Z",
            "duration": 2990,
            "output": {
              "agentId": "agent_1",
              "result": "任务执行成功"
            }
          }
        },
        "data": {
          "inputs": { "query": "Hello World" },
          "outputs": { "result": "任务执行成功" }
        },
        "metadata": {
          "startedAt": "2026-04-02T11:59:55Z",
          "endedAt": "2026-04-02T11:59:58Z",
          "duration": 3010,
          "triggeredBy": "user_1",
          "triggerType": "manual"
        }
      }
    ],
    "stats": {
      "total": 10,
      "success": 8,
      "failed": 1,
      "running": 1
    },
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

---

### 📧 Email Alerting API

v1.8.0 新增 Email 告警系统，支持通过 SMTP 发送性能告警邮件。

#### 告警规则管理 API

##### 获取告警规则和活动告警

```
GET /api/performance/alerts
```

获取所有告警规则和活动告警列表。

**Query 参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `showAcknowledged` | boolean | false | 是否显示已确认的告警 |
| `severity` | string | - | 过滤严重级别 (low, medium, high, critical) |
| `metric` | string | - | 过滤指标类型 (LCP, FID, CLS, INP, TTFB) |
| `limit` | number | 50 | 返回数量限制 |

**响应**:

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert-1712345678901-abc123",
        "ruleId": "lcp-poor",
        "metric": "LCP",
        "severity": "critical",
        "message": "LCP exceeded threshold: 4500ms > 4000ms",
        "value": 4500,
        "threshold": 4000,
        "timestamp": 1712345678901,
        "acknowledged": false,
        "route": "/dashboard",
        "metadata": {
          "url": "https://7zi.com/dashboard",
          "deviceType": "desktop"
        }
      }
    ],
    "rules": [
      {
        "id": "lcp-poor",
        "name": "LCP > 4000ms (Poor)",
        "metric": "LCP",
        "condition": "gt",
        "threshold": 4000,
        "enabled": true,
        "severity": "critical",
        "notificationChannels": ["console", "email"]
      },
      {
        "id": "lcp-needs-improvement",
        "name": "LCP > 2500ms (Needs Improvement)",
        "metric": "LCP",
        "condition": "gt",
        "threshold": 2500,
        "enabled": true,
        "severity": "medium",
        "notificationChannels": ["console"]
      }
    ],
    "summary": {
      "total": 5,
      "unacknowledged": 3,
      "bySeverity": {
        "low": 0,
        "medium": 1,
        "high": 1,
        "critical": 1
      },
      "byMetric": {
        "LCP": 1,
        "FID": 0,
        "CLS": 1,
        "INP": 0,
        "TTFB": 0
      }
    }
  }
}
```

---

##### 创建告警规则

```
POST /api/performance/alerts
```

创建新的告警规则或确认告警。

**创建规则请求体**:

```json
{
  "action": "create-rule",
  "rule": {
    "name": "自定义 LCP 告警",
    "metric": "LCP",
    "condition": "gt",
    "threshold": 3000,
    "severity": "high",
    "enabled": true,
    "notificationChannels": ["console", "email"]
  }
}
```

**参数说明**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `action` | string | ✅ | 操作类型: `create-rule` 或 `acknowledge` |
| `rule.name` | string | ✅ | 规则名称 |
| `rule.metric` | string | ✅ | 指标类型 (LCP, FID, CLS, INP, TTFB) |
| `rule.condition` | string | ✅ | 条件 (gt, lt, gte, lte, eq) |
| `rule.threshold` | number | ✅ | 阈值 |
| `rule.severity` | string | ❌ | 严重级别 (low, medium, high, critical)，默认 medium |
| `rule.enabled` | boolean | ❌ | 是否启用，默认 true |
| `rule.notificationChannels` | string[] | ❌ | 通知渠道，默认 ["console"] |

**确认告警请求体**:

```json
{
  "action": "acknowledge",
  "alertId": "alert-1712345678901-abc123"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "rule": {
      "id": "rule-1712345678901-xyz789",
      "name": "自定义 LCP 告警",
      "metric": "LCP",
      "condition": "gt",
      "threshold": 3000,
      "severity": "high",
      "enabled": true,
      "notificationChannels": ["console", "email"]
    }
  }
}
```

---

##### 更新告警规则

```
PUT /api/performance/alerts
```

更新现有告警规则。

**请求体**:

```json
{
  "ruleId": "lcp-poor",
  "updates": {
    "threshold": 5000,
    "severity": "medium",
    "enabled": true,
    "notificationChannels": ["console", "email"]
  }
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "rule": {
      "id": "lcp-poor",
      "name": "LCP > 4000ms (Poor)",
      "threshold": 5000,
      "severity": "medium",
      ...
    }
  }
}
```

---

##### 删除告警规则

```
DELETE /api/performance/alerts?ruleId=lcp-poor
```

删除指定的告警规则。

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `ruleId` | string | 要删除的规则 ID |
| `clearAcknowledged` | boolean | 清除已确认的告警 |

**响应**:

```json
{
  "success": true,
  "data": {
    "deleted": {
      "id": "lcp-poor",
      "name": "LCP > 4000ms (Poor)"
    }
  }
}
```

---

#### Email 告警配置

##### 环境变量配置

Email 告警服务通过环境变量进行配置：

```bash
# SMTP 配置
SMTP_HOST=smtp.example.com      # SMTP 服务器地址
SMTP_PORT=587                   # SMTP 端口 (587 for TLS, 465 for SSL)
SMTP_USER=your-username         # SMTP 用户名
SMTP_PASS=your-password         # SMTP 密码或 API Key
SMTP_SECURE=false               # 是否使用 SSL (port 465 时为 true)

# TLS 配置
SMTP_REJECT_UNAUTHORIZED=true   # 是否验证证书

# 发送者配置
EMAIL_SENDER_NAME=7zi System    # 发送者名称
EMAIL_SENDER_EMAIL=noreply@example.com  # 发送者邮箱

# 接收者配置 (逗号分隔)
EMAIL_RECIPIENTS=admin@example.com,ops@example.com

# 邮件配置
EMAIL_SUBJECT_PREFIX=[7zi Alert]  # 邮件主题前缀
EMAIL_ALERTING_ENABLED=true       # 是否启用邮件告警

# 重试配置
EMAIL_RETRY_MAX_ATTEMPTS=3        # 最大重试次数
EMAIL_RETRY_DELAY_MS=1000         # 重试延迟（毫秒）
EMAIL_RETRY_BACKOFF_MULTIPLIER=2  # 退避乘数
```

##### EmailAlertService API

Email 告警服务提供了以下方法：

```typescript
import { EmailAlertService, createEmailAlertService } from '@/lib/alerting/EmailAlertService'

// 从环境变量创建服务
const emailService = createEmailAlertService()

// 连接 SMTP 服务器
await emailService.connect()

// 发送告警邮件
const result = await emailService.sendAlertEmail(alert, {
  recipients: [{ email: 'admin@example.com', name: 'Admin' }],
  subject: 'Custom Subject',
  priority: 'high',
})

// 检查结果
if (result.success) {
  console.log('Email sent:', result.messageId)
} else {
  console.error('Failed:', result.error)
}

// 获取服务状态
const status = emailService.getStatus()
console.log(status.connected, status.totalSent, status.totalFailed)

// 测试连接
const isConnected = await emailService.test()
```

##### 告警邮件模板

告警邮件支持以下特性：

- **HTML 邮件**: 响应式设计，支持移动端
- **纯文本备选**: 兼容不支持 HTML 的邮件客户端
- **告警级别颜色**: info(蓝), warning(橙), error(红), critical(深红)
- **指标数据展示**: 显示当前值和阈值
- **元数据显示**: 自定义附加信息
- **标签系统**: 告警分类标签

**邮件预览**:

```
┌─────────────────────────────────────┐
│  🚨 Alert Notification              │
│           CRITICAL                  │
├─────────────────────────────────────┤
│  LCP exceeded threshold             │
│                                     │
│  Current: 4500ms / Threshold: 4000ms│
│                                     │
│  Category: Performance              │
│  Source: Web Vitals                 │
│  Time: Apr 2, 2026 12:00:00 PM CET  │
└─────────────────────────────────────┘
```

---

### 📊 预置告警规则

v1.8.0 预置了以下 Web Vitals 告警规则：

| 规则 ID                  | 名称                 | 指标 | 条件 | 阈值 | 严重级别 |
| ------------------------ | -------------------- | ---- | ---- | ---- | -------- |
| `lcp-poor`               | LCP > 4000ms (Poor)  | LCP  | gt   | 4000 | critical |
| `lcp-needs-improvement`  | LCP > 2500ms         | LCP  | gt   | 2500 | medium   |
| `fid-poor`               | FID > 300ms (Poor)   | FID  | gt   | 300  | critical |
| `fid-needs-improvement`  | FID > 100ms          | FID  | gt   | 100  | medium   |
| `cls-poor`               | CLS > 0.25 (Poor)    | CLS  | gt   | 0.25 | high     |
| `cls-needs-improvement`  | CLS > 0.1            | CLS  | gt   | 0.1  | medium   |
| `inp-poor`               | INP > 500ms (Poor)   | INP  | gt   | 500  | critical |
| `inp-needs-improvement`  | INP > 200ms          | INP  | gt   | 200  | medium   |
| `ttfb-poor`              | TTFB > 1800ms (Poor) | TTFB | gt   | 1800 | high     |
| `ttfb-needs-improvement` | TTFB > 800ms         | TTFB | gt   | 800  | medium   |

---

### 🔗 相关类型定义

#### WorkflowDefinition

```typescript
interface WorkflowDefinition {
  id: string // 工作流 ID
  name: string // 工作流名称
  description?: string // 描述
  version: number // 版本号
  status: WorkflowStatus // 状态
  nodes: WorkflowNode[] // 节点列表
  edges: WorkflowEdge[] // 边列表
  config: {
    timeout?: number // 超时时间（秒）
    retryPolicy?: {
      maxRetries: number
      backoff: 'fixed' | 'exponential'
      interval: number
    }
    variables?: Record<string, unknown>
  }
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string
    updatedBy: string
  }
}
```

#### WorkflowNode

```typescript
interface WorkflowNode {
  id: string // 节点 ID
  type: NodeType // 节点类型
  name: string // 节点名称
  description?: string // 描述
  position: { x: number; y: number } // 可视化位置
  agentConfig?: {
    // Agent 节点配置
    agentId: string
    agentType: string
    prompt?: string
    model?: string
    timeout?: number
    retryCount?: number
  }
  conditionConfig?: {
    // 条件节点配置
    expression: string
    trueLabel?: string
    falseLabel?: string
  }
  waitConfig?: {
    // 等待节点配置
    duration?: number
    waitForEvent?: string
  }
}
```

#### AlertRule

```typescript
interface AlertRule {
  id: string // 规则 ID
  name: string // 规则名称
  metric: 'LCP' | 'FID' | 'CLS' | 'INP' | 'TTFB' // 指标类型
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' // 条件
  threshold: number // 阈值
  enabled: boolean // 是否启用
  severity: 'low' | 'medium' | 'high' | 'critical' // 严重级别
  notificationChannels: string[] // 通知渠道
}
```

#### PerformanceAlert

```typescript
interface PerformanceAlert {
  id: string // 告警 ID
  ruleId: string // 规则 ID
  metric: string // 指标类型
  severity: string // 严重级别
  message: string // 告警消息
  value: number // 当前值
  threshold: number // 阈值
  timestamp: number // 时间戳
  acknowledged: boolean // 是否已确认
  route?: string // 页面路由
  metadata?: Record<string, unknown> // 附加元数据
}
```

---

### ℹ️ 注意

v1.9.1 主要新增功能为工作流版本历史管理。完整实现细节请参考：

- `src/lib/workflow/version-service.ts` - 版本服务
- `src/lib/db/migrations/v191_workflow_versions.ts` - 数据库迁移

v1.9.0 主要新增功能为 AI 对话式任务创建。完整实现细节请参考：

- `src/lib/workflow/TaskParser.ts` - 自然语言解析器
- `src/components/workflow/TaskCreationChat.tsx` - 对话式创建组件
- `src/components/workflow/TaskPreviewPanel.tsx` - 预览面板
- `src/components/workflow/QuickTaskModal.tsx` - 快速创建模态框

v1.8.0 主要新增功能为可视化工作流编排和 Email 告警系统。完整实现细节请参考：

- `src/lib/workflow/VisualWorkflowOrchestrator.ts` - 工作流引擎
- `src/lib/alerting/EmailAlertService.ts` - Email 告警服务
- `src/config/email.ts` - Email 配置
- `src/lib/alerting/templates/alert-template.ts` - 邮件模板

**版本**: v1.9.1
**更新日期**: 2026-04-03

---

## 📜 工作流版本历史管理 API (v1.9.1)

v1.9.1 引入了完整的工作流版本历史管理功能，支持版本快照、版本对比、版本回滚等操作。

### 版本管理 API

#### 获取版本列表

```
GET /api/workflow/:id/versions
```

获取指定工作流的所有版本列表。

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 工作流 ID |

**Query 参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `limit` | number | 50 | 每页数量 |
| `offset` | number | 0 | 偏移量 |

**响应**:

```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "id": "version_1712345678901_abc123",
        "workflowId": "workflow_1",
        "versionNumber": 3,
        "changeSummary": "添加新的条件分支",
        "changeType": "update",
        "nodes": [...],
        "edges": [...],
        "config": {...},
        "createdBy": "user_1",
        "createdAt": "2026-04-03T12:00:00.000Z",
        "parentVersionId": "version_1712345678900_xyz789"
      }
    ],
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### 创建新版本

```
POST /api/workflow/:id/versions
```

创建工作流的版本快照。

**请求体**:

```json
{
  "name": "工作流名称",
  "description": "工作流描述",
  "version": 1,
  "status": "active",
  "nodes": [...],
  "edges": [...],
  "config": {...},
  "changeSummary": "初始版本",
  "changeType": "create",
  "userId": "user_1"
}
```

**参数说明**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 工作流名称 |
| `nodes` | array | ✅ | 节点列表 |
| `edges` | array | ✅ | 边列表 |
| `changeSummary` | string | ❌ | 变更摘要 |
| `changeType` | string | ❌ | 变更类型 (create, update, rollback) |
| `parentVersionId` | string | ❌ | 父版本 ID |

**响应**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "version_1712345678901_abc123",
    "workflowId": "workflow_1",
    "versionNumber": 1,
    "changeSummary": "初始版本",
    "changeType": "create",
    "createdAt": "2026-04-03T12:00:00.000Z"
  }
}
```

---

### 版本详情 API

#### 获取特定版本

```
GET /api/workflow/:id/versions/:versionId
```

获取指定版本的详细信息。

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 工作流 ID |
| `versionId` | string | 版本 ID |

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "version_1712345678901_abc123",
    "workflowId": "workflow_1",
    "versionNumber": 3,
    "changeSummary": "添加新的条件分支",
    "changeType": "update",
    "nodes": [...],
    "edges": [...],
    "config": {...},
    "createdBy": "user_1",
    "createdAt": "2026-04-03T12:00:00.000Z",
    "parentVersionId": "version_1712345678900_xyz789"
  }
}
```

---

#### 删除版本（受限）

```
DELETE /api/workflow/:id/versions/:versionId
```

> **注意**: 直接删除版本不被推荐，建议使用回滚功能。此端点需要管理员权限。

**响应**:

```json
{
  "success": false,
  "error": {
    "message": "Direct version deletion is not allowed. Use rollback instead."
  }
}
```

---

### 版本对比 API

#### 对比两个版本

```
GET /api/workflow/:id/versions/compare
```

对比两个版本并返回差异。

**Query 参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `fromVersionId` | string | ✅ | 源版本 ID |
| `toVersionId` | string | ✅ | 目标版本 ID |

**响应**:

```json
{
  "success": true,
  "data": {
    "workflowId": "workflow_1",
    "fromVersion": {
      "id": "version_1",
      "versionNumber": 1
    },
    "toVersion": {
      "id": "version_2",
      "versionNumber": 2
    },
    "diff": {
      "nodesAdded": [
        {
          "id": "node_3",
          "type": "condition",
          "name": "判断结果"
        }
      ],
      "nodesRemoved": [],
      "nodesModified": [
        {
          "id": "node_2",
          "changes": {
            "name": { "from": "执行任务", "to": "执行 Agent 任务" }
          }
        }
      ],
      "edgesAdded": [
        { "id": "edge_3", "source": "node_2", "target": "node_3" }
      ],
      "edgesRemoved": [],
      "configChanges": {
        "timeout": { "from": 3600, "to": 7200 }
      }
    }
  }
}
```

---

### 版本回滚 API

#### 回滚到指定版本

```
POST /api/workflow/:id/versions/:versionId/rollback
```

将工作流回滚到指定版本。

**请求体**:

```json
{
  "userId": "user_1"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "message": "Successfully rolled back to version 2",
    "rollbackFromVersion": 5,
    "newVersion": 6,
    "newVersionId": "version_1712345678902_def456",
    "restoredData": {
      "nodes": [...],
      "edges": [...],
      "config": {...}
    }
  }
}
```

---

### 版本设置 API

#### 获取版本设置

```
GET /api/workflow/:id/versions/settings
```

获取工作流的版本设置。

**响应**:

```json
{
  "success": true,
  "data": {
    "workflowId": "workflow_1",
    "maxVersions": 50,
    "autoVersionOnUpdate": true,
    "retentionDays": 90,
    "createdAt": "2026-04-03T10:00:00Z",
    "updatedAt": "2026-04-03T12:00:00Z"
  }
}
```

---

#### 更新版本设置

```
PUT /api/workflow/:id/versions/settings
```

更新工作流的版本设置。

**请求体**:

```json
{
  "maxVersions": 100,
  "autoVersionOnUpdate": true,
  "retentionDays": 180
}
```

**参数说明**:
| 参数 | 类型 | 范围 | 说明 |
|------|------|------|------|
| `maxVersions` | number | 1-1000 | 最大版本数 |
| `autoVersionOnUpdate` | boolean | - | 更新时自动创建版本 |
| `retentionDays` | number | 1-365 | 版本保留天数 |

**响应**:

```json
{
  "success": true,
  "data": {
    "workflowId": "workflow_1",
    "maxVersions": 100,
    "autoVersionOnUpdate": true,
    "retentionDays": 180,
    "updatedAt": "2026-04-03T12:30:00Z"
  }
}
```

---

## 🔍 RCA 根因分析 API (v1.9.0)

v1.9.0 引入了智能根因分析 (Root Cause Analysis) 功能，支持故障诊断、知识库管理和传播链分析。

### 事件分析 API

#### 分析事件

```
GET /api/rca/analyze/:incidentId
```

分析指定事件的根因。

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `incidentId` | string | 事件 ID |

**响应**:

```json
{
  "success": true,
  "report": {
    "incidentId": "incident_1",
    "title": "Database Performance Degradation",
    "severity": "high",
    "rootCauses": [
      {
        "id": "rc_1",
        "type": "database",
        "description": "Connection pool exhaustion due to slow queries",
        "confidence": 0.92,
        "evidence": [
          "High DB query time: 1800ms (threshold: 200ms)",
          "Connection pool usage: 92%"
        ],
        "suggestions": [
          "Add database indexes for slow queries",
          "Increase connection pool size",
          "Implement query timeout"
        ]
      }
    ],
    "propagationChain": [
      { "service": "database", "symptom": "high_latency" },
      { "service": "api-gateway", "symptom": "slow_response" },
      { "service": "user-service", "symptom": "error_spike" }
    ],
    "relatedIncidents": ["incident_2", "incident_3"],
    "recommendations": [
      "Add indexes for user-queries",
      "Optimize slow queries",
      "Monitor connection pool usage"
    ]
  }
}
```

---

#### 提交事件分析

```
POST /api/rca/analyze/:incidentId
```

提交自定义事件数据进行分析。

**请求体**:

```json
{
  "id": "incident_custom",
  "title": "API 响应时间异常",
  "description": "用户服务 API 响应时间超过阈值",
  "severity": "high",
  "timestamp": 1712345678901,
  "affectedServices": ["api-gateway", "user-service", "database"],
  "symptoms": [
    {
      "id": "symptom_1",
      "type": "latency",
      "name": "api_response_time",
      "description": "API 响应时间过高",
      "value": 2500,
      "threshold": 500,
      "unit": "ms",
      "service": "api-gateway"
    }
  ],
  "metrics": [
    {
      "id": "metric_1",
      "name": "cpu_usage",
      "value": 85,
      "unit": "%",
      "service": "database"
    }
  ]
}
```

---

### 知识库 API

#### 查询知识库

```
GET /api/rca/knowledge
```

查询已知故障知识库。

**Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 搜索关键词 |
| `tags` | string | 标签过滤（逗号分隔） |
| `service` | string | 服务过滤 |

**响应**:

```json
{
  "success": true,
  "count": 3,
  "issues": [
    {
      "id": "known_1",
      "title": "Database Connection Pool Exhaustion",
      "description": "连接池耗尽，慢查询占用连接时间过长",
      "rootCause": "缺少数据库索引导致全表扫描",
      "symptoms": ["high_latency", "connection_timeout", "error_rate_spike"],
      "resolution": "添加适当的索引并优化慢查询",
      "occurrences": 5,
      "lastOccurred": 1712345678901,
      "tags": ["database", "performance", "connection"],
      "affectedServices": ["database", "api-gateway"],
      "fixVerified": true
    }
  ]
}
```

---

#### 添加知识

```
POST /api/rca/knowledge
```

向知识库添加新的已知问题。

**请求体**:

```json
{
  "title": "Memory Leak in Node.js Process",
  "description": "Node.js 进程内存逐渐增加",
  "rootCause": "事件监听器未正确移除",
  "symptoms": ["memory_increase", "slow_response", "gc_pressure"],
  "resolution": "在组件卸载时修复事件监听器清理",
  "tags": ["memory", "nodejs", "performance"],
  "affectedServices": ["api-gateway", "user-service"]
}
```

---

#### 从事件学习

```
PUT /api/rca/knowledge
```

从已解决的事件中学习，自动更新知识库。

**请求体**:

```json
{
  "incident": {
    "id": "incident_1",
    "title": "API Timeout",
    "symptoms": [...]
  },
  "resolution": {
    "solution": "增加数据库连接池大小",
    "resolvedBy": "admin",
    "verificationSteps": ["检查连接池使用率", "验证响应时间"],
    "outcome": "success"
  }
}
```

---

### 传播链分析 API

#### 分析故障传播链

```
GET /api/rca/propagation/:incidentId
```

分析故障如何在不同服务间传播。

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `incidentId` | string | 事件 ID |

**响应**:

```json
{
  "success": true,
  "incidentId": "incident_1",
  "propagationChain": {
    "rootNode": {
      "service": "database",
      "symptom": "high_latency",
      "timestamp": 1712345678901,
      "metadata": {
        "queryTime": "1800ms",
        "threshold": "200ms"
      }
    },
    "propagationPath": [
      {
        "from": "database",
        "to": "api-gateway",
        "type": "dependency",
        "latency": 500
      },
      {
        "from": "api-gateway",
        "to": "user-service",
        "type": "dependency",
        "latency": 300
      }
    ],
    "affectedNodes": [
      {
        "service": "database",
        "impact": "critical",
        "symptoms": ["high_latency", "connection_pool_exhaustion"]
      },
      {
        "service": "api-gateway",
        "impact": "high",
        "symptoms": ["slow_response", "timeout_errors"]
      },
      {
        "service": "user-service",
        "impact": "medium",
        "symptoms": ["error_spike"]
      }
    ],
    "timeline": [
      { "timestamp": 1712345678000, "event": "database_latency_spike" },
      { "timestamp": 1712345678500, "event": "api_gateway_slow_response" },
      { "timestamp": 1712345679000, "event": "user_service_error_spike" }
    ]
  }
}
```

---

#### 提交症状分析

```
POST /api/rca/propagation/:incidentId
```

提交症状数据进行传播链分析。

**请求体**:

```json
{
  "symptoms": [
    {
      "id": "symptom_1",
      "type": "latency",
      "name": "api_response_time",
      "value": 2500,
      "threshold": 500,
      "unit": "ms",
      "service": "api-gateway",
      "timestamp": 1712345678901
    },
    {
      "id": "symptom_2",
      "type": "error",
      "name": "error_rate",
      "value": 15,
      "threshold": 5,
      "unit": "%",
      "service": "user-service",
      "timestamp": 1712345679401
    }
  ]
}
```

---

### RCA 数据类型

#### Incident

```typescript
interface Incident {
  id: string
  title: string
  description?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
  affectedServices: string[]
  symptoms: Symptom[]
  metrics: Metric[]
  status: 'active' | 'investigating' | 'resolved'
}
```

#### Symptom

```typescript
interface Symptom {
  id: string
  type: 'latency' | 'error' | 'resource' | 'availability' | 'custom'
  name: string
  description?: string
  value: number
  threshold: number
  unit: string
  service: string
  component?: string
  timestamp: number
  metadata?: Record<string, unknown>
}
```

#### KnownIssue

```typescript
interface KnownIssue {
  id: string
  title: string
  description: string
  rootCause: string
  symptoms: string[]
  resolution: string
  occurrences: number
  lastOccurred: number
  firstOccurred: number
  tags: string[]
  affectedServices: string[]
  fixVerified: boolean
}
```

#### WorkflowVersion

```typescript
interface WorkflowVersion {
  id: string
  workflowId: string
  versionNumber: number
  changeSummary?: string
  changeType: 'create' | 'update' | 'rollback'
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  config: Record<string, unknown>
  createdBy: string
  createdAt: string
  parentVersionId?: string
}
```

#### VersionSettings

```typescript
interface VersionSettings {
  workflowId: string
  maxVersions: number // 1-1000
  autoVersionOnUpdate: boolean
  retentionDays: number // 1-365
  createdAt: string
  updatedAt: string
}
```

---

## 🤖 AI 代码智能系统 API (v1.10.0)

v1.10.0 引入了完整的 AI 代码智能系统，支持代码分析、补全、审查、Bug 检测、修复建议和代码解释。

### 概览

**核心组件** (`src/lib/ai/code/`):

| 组件 | 文件 | 功能 |
|------|------|------|
| **📊 代码分析器** | `code-analyzer.ts` | 静态分析代码结构、复杂度计算、依赖提取 |
| **⌨️ 代码补全器** | `code-completer.ts` | 智能代码补全、关键词、代码片段、模式匹配 |
| **🔍 代码审查器** | `code-reviewer.ts` | 自动代码审查、安全检测、性能检测、30+ 规则 |
| **🐛 Bug 检测器** | `bug-detector.ts` | 识别常见错误模式、20+ Bug 模式 |
| **🔧 修复建议器** | `fix-suggester.ts` | 生成修复代码、解释原因、评估风险 |
| **📖 代码解释器** | `code-explainer.ts` | 自然语言解释、关键概念提取 |

### 使用方式

```typescript
import { codeEnhancer } from '@/lib/ai/code'

// 一站式代码分析
const analysis = await codeEnhancer.fullAnalysis(code, 'typescript')

console.log(analysis.summary)
// {
//   totalIssues: 5,
//   criticalIssues: 1,
//   highIssues: 2,
//   mediumIssues: 1,
//   lowIssues: 1
// }
```

### 代码分析 API

#### 分析代码结构

```typescript
// 分析代码结构
const result = await codeEnhancer.analyzeCode(code, 'typescript')

// 返回结果
{
  language: 'typescript',
  linesOfCode: 150,
  functions: [
    { name: 'getUserData', params: ['userId'], returnType: 'Promise<User>' }
  ],
  classes: [
    { name: 'UserService', methods: ['getUser', 'updateUser'] }
  ],
  imports: ['react', 'lodash'],
  exports: ['UserService', 'getUserData'],
  complexity: {
    cyclomatic: 12,
    cognitive: 8,
    maintainabilityIndex: 72
  }
}
```

**支持的语言**: TypeScript, JavaScript, Python, Go, Rust

### 代码补全 API

#### 获取补全建议

```typescript
// 获取代码补全建议
const completions = await codeEnhancer.getCompletions(
  'function getUser(id: string) {',
  'typescript',
  { line: 1, column: 30 }
)

// 返回结果
{
  completions: [
    { text: 'return fetch(`/api/users/${id}`)', kind: 'snippet', score: 0.95 },
    { text: 'const user = await db.users.find(id)', kind: 'snippet', score: 0.88 },
    { text: 'console.log(id)', kind: 'text', score: 0.65 }
  ]
}
```

**补全类型**:
- `keyword` - 关键字补全
- `snippet` - 代码片段
- `function` - 函数建议
- `variable` - 变量建议
- `pattern` - 模式匹配

### 代码审查 API

#### 审查代码质量

```typescript
// 审查代码
const review = await codeEnhancer.reviewCode(code, 'typescript')

// 返回结果
{
  score: {
    overall: 78,
    readability: 85,
    maintainability: 72,
    security: 65,
    performance: 88
  },
  issues: [
    {
      ruleId: 'security/eval',
      severity: 'critical',
      message: 'Avoid using eval() - security risk',
      line: 42,
      column: 10,
      suggestion: 'Use JSON.parse() instead'
    },
    {
      ruleId: 'performance/dom-query',
      severity: 'medium',
      message: 'DOM query inside loop - performance issue',
      line: 55,
      column: 5,
      suggestion: 'Cache DOM reference outside loop'
    }
  ],
  summary: {
    totalIssues: 5,
    criticalIssues: 1,
    highIssues: 2,
    mediumIssues: 1,
    lowIssues: 1
  }
}
```

**审查规则** (30+):

| 类别 | 规则数 | 示例 |
|------|--------|------|
| **安全** | 8+ | eval, innerHTML, 硬编码密钥 |
| **性能** | 6+ | DOM 循环查询, 同步 XHR |
| **代码质量** | 10+ | 变量遮蔽, 空 catch 块 |
| **最佳实践** | 6+ | any 类型, == vs === |

### Bug 检测 API

#### 检测代码 Bug

```typescript
// 检测 Bug
const bugs = await codeEnhancer.detectBugs(code, 'typescript')

// 返回结果
{
  bugs: [
    {
      type: 'null-reference',
      severity: 'high',
      message: 'Potential null reference: user.profile.name',
      line: 28,
      column: 15,
      confidence: 0.92,
      fix: 'Add null check: user?.profile?.name'
    },
    {
      type: 'async-missing-await',
      severity: 'medium',
      message: 'Missing await for async function',
      line: 35,
      column: 10,
      confidence: 0.88,
      fix: 'Add await before the async call'
    }
  ],
  summary: {
    totalBugs: 3,
    highSeverity: 1,
    mediumSeverity: 1,
    lowSeverity: 1
  }
}
```

**Bug 模式** (20+):

| 类型 | 说明 |
|------|------|
| `null-reference` | 空引用检测 |
| `type-mismatch` | 类型不匹配 |
| `array-out-of-bounds` | 数组越界 |
| `async-missing-await` | 缺失 await |
| `unhandled-promise` | 未处理 Promise |
| `memory-leak` | 内存泄漏 (事件监听器、定时器) |
| `infinite-loop` | 无限循环风险 |
| `assignment-comparison` | 赋值与比较混淆 |

### 修复建议 API

#### 生成修复建议

```typescript
// 生成修复建议
const fixes = await codeEnhancer.suggestFixes(code, 'typescript', issues)

// 返回结果
{
  fixes: [
    {
      issueId: 'bug-001',
      title: 'Add null check for user.profile',
      description: 'Prevent potential null reference error',
      riskLevel: 'low',
      successRate: 0.95,
      code: `if (user?.profile) {
  return user.profile.name
}`,
      diff: `@@ -28,7 +28,9 @@
-  return user.profile.name
+  if (user?.profile) {
+    return user.profile.name
+  }`
    }
  ]
}
```

### 代码解释 API

#### 解释代码逻辑

```typescript
// 解释代码
const explanation = await codeEnhancer.explainCode(code, 'typescript')

// 返回结果
{
  summary: 'This function fetches user data from the API and handles caching',
  concepts: [
    { name: 'Async/Await', description: 'Handles asynchronous API calls' },
    { name: 'Error Handling', description: 'Try-catch for API errors' },
    { name: 'Caching', description: 'Uses localStorage for caching' }
  ],
  steps: [
    'Check cache for existing data',
    'If not cached, fetch from API',
    'Parse and validate response',
    'Store in cache',
    'Return user data'
  ],
  complexity: {
    time: 'O(1) for cache, O(n) for API call',
    space: 'O(n) where n is user data size'
  }
}
```

### 一站式完整分析 API

#### 完整代码分析

```typescript
// 一站式完整分析
const analysis = await codeEnhancer.fullAnalysis(code, 'typescript')

// 返回结果
{
  language: 'typescript',
  analysis: { /* 代码结构分析 */ },
  review: { /* 代码审查结果 */ },
  bugs: { /* Bug 检测结果 */ },
  fixes: { /* 修复建议 */ },
  explanation: { /* 代码解释 */ },
  summary: {
    totalIssues: 5,
    criticalIssues: 1,
    highIssues: 2,
    mediumIssues: 1,
    lowIssues: 1,
    score: 78
  }
}
```

### TaskParser 集成

v1.10.0 新增 TaskParser 集成，支持工作流节点代码生成：

```typescript
import { TaskParserIntegration } from '@/lib/ai/code/task-parser-integration'

// 解析任务并生成工作流
const result = await TaskParserIntegration.parseAndGenerateCode(
  '每天早上9点发送日报邮件给团队',
  'zh'
)

// 返回结果
{
  intent: 'scheduled',
  confidence: 0.92,
  nodes: [
    { id: 'start', type: 'start', name: '开始' },
    { id: 'schedule', type: 'scheduled', config: { cron: '0 9 * * *' } },
    { id: 'email', type: 'notification', config: { type: 'email', recipients: 'team' } },
    { id: 'end', type: 'end', name: '结束' }
  ],
  edges: [ /* 连接关系 */ ]
}
```

### 类型定义

#### CodeAnalysis

```typescript
interface CodeAnalysis {
  language: string
  linesOfCode: number
  functions: FunctionInfo[]
  classes: ClassInfo[]
  imports: string[]
  exports: string[]
  complexity: ComplexityMetrics
}

interface ComplexityMetrics {
  cyclomatic: number       // 圈复杂度
  cognitive: number        // 认知复杂度
  maintainabilityIndex: number  // 可维护性指数 (0-100)
}
```

#### CodeReview

```typescript
interface CodeReview {
  score: {
    overall: number        // 总体评分 (0-100)
    readability: number    // 可读性
    maintainability: number // 可维护性
    security: number       // 安全性
    performance: number    // 性能
  }
  issues: ReviewIssue[]
  summary: IssueSummary
}

interface ReviewIssue {
  ruleId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  line: number
  column: number
  suggestion?: string
}
```

#### BugDetection

```typescript
interface BugDetection {
  bugs: BugInfo[]
  summary: {
    totalBugs: number
    highSeverity: number
    mediumSeverity: number
    lowSeverity: number
  }
}

interface BugInfo {
  type: string
  severity: 'high' | 'medium' | 'low'
  message: string
  line: number
  column: number
  confidence: number    // 置信度 (0-1)
  fix?: string          // 修复建议
}
```

#### FixSuggestion

```typescript
interface FixSuggestion {
  issueId: string
  title: string
  description: string
  riskLevel: 'low' | 'medium' | 'high'
  successRate: number   // 成功率预估 (0-1)
  code: string          // 修复后代码
  diff: string          // Diff 格式
}
```

#### CodeExplanation

```typescript
interface CodeExplanation {
  summary: string
  concepts: Concept[]
  steps: string[]
  complexity: {
    time: string
    space: string
  }
}

interface Concept {
  name: string
  description: string
}
```

---

## APM 监控 API (v1.12.2 新增)

v1.12.2 引入了 APM (Application Performance Monitoring) 监控 API，提供全面的系统状态监控和性能追踪。

### 核心功能

**位置**: `src/app/api/monitoring/apm/route.ts`

**特性**:
- ✅ Sentry 配置和状态检查
- ✅ 分布式追踪 (W3C Trace Context)
- ✅ 性能指标 (内存、正常运行时间、响应时间)
- ✅ Agent 任务统计
- ✅ 主动追踪传播

### API 端点

#### 获取 APM 状态

```
GET /api/monitoring/apm
```

获取 APM 状态和指标。

**响应**:

```json
{
  "success": true,
  "data": {
    "apm": {
      "status": "enabled",
      "sentry": {
        "initialized": true,
        "dsn": true,
        "environment": "production",
        "release": "v1.12.2",
        "tracesSampleRate": 0.1,
        "profilesSampleRate": 0.05,
        "debug": false
      },
      "tracing": {
        "traceId": "abc123",
        "spanId": "def456",
        "activeSpans": 2
      }
    },
    "performance": {
      "memory": {
        "used": 128,
        "limit": 512,
        "percentage": 25
      },
      "uptime": 3600,
      "responseTime": 15
    },
    "agentTasks": {
      "totalAgents": 5,
      "totalTasks": 150,
      "completedTasks": 145,
      "failedTasks": 3,
      "activeTasks": 2,
      "avgTaskDuration": 2500,
      "totalTokens": 50000
    }
  },
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

**响应头**:
- `X-Response-Time`: 响应时间 (毫秒)
- `sentry-trace`: Sentry 追踪头 (格式: `{traceId}-{spanId}-{sampled}`)
- `traceparent`: W3C Trace Context (格式: `00-{traceId}-{spanId}-{sampled}`)

---

#### APM 健康检查

```
HEAD /api/monitoring/apm
```

轻量级检查 APM 端点可用性。

**响应**: `200 OK`

---

### 类型定义

```typescript
interface APMStatusResponse {
  apm: {
    status: 'enabled' | 'disabled'
    sentry: {
      initialized: boolean
      dsn: boolean
      environment: string
      release?: string
      tracesSampleRate: number
      profilesSampleRate: number
      debug: boolean
    }
    tracing: {
      traceId?: string
      spanId?: string
      activeSpans?: number
    }
  }
  performance: {
    memory: {
      used: number        // MB
      limit: number        // MB
      percentage: number   // 0-100
    }
    uptime: number         // seconds
    responseTime?: number  // milliseconds
  }
  agentTasks: {
    totalAgents: number
    totalTasks: number
    completedTasks: number
    failedTasks: number
    activeTasks: number
    avgTaskDuration: number  // milliseconds
    totalTokens: number
  }
}
```

---

## 速率限制管理 API (v1.12.2 新增)

v1.12.2 引入了速率限制管理 API，提供全面的速率限制监控和控制功能。

### 核心功能

**位置**: `src/app/api/rate-limit/route.ts`

**特性**:
- ✅ 速率限制健康检查
- ✅ 速率限制统计信息
- ✅ 速率限制 keys 查询
- ✅ 特定 key 状态查询
- ✅ 速率限制调整
- ✅ 速率限制重置

### API 端点

#### 获取速率限制健康状态

```
GET /api/rate-limit/health
```

检查速率限制系统的健康状态。

**响应**:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "storage": {
      "type": "redis",
      "connected": true
    },
    "timestamp": "2026-04-05T12:00:00.000Z"
  }
}
```

---

#### 获取速率限制统计

```
GET /api/rate-limit/stats
```

获取速率限制统计信息。

**响应**:

```json
{
  "success": true,
  "data": {
    "totalRequests": 50000,
    "allowedRequests": 48500,
    "rejectedRequests": 1500,
    "rejectionRate": 0.03,
    "byLayer": {
      "global": { "allowed": 50000, "rejected": 0 },
      "ip": { "allowed": 30000, "rejected": 500 },
      "api-key": { "allowed": 15000, "rejected": 800 },
      "user": { "allowed": 3500, "rejected": 200 }
    },
    "byAlgorithm": {
      "token-bucket": { "allowed": 40000, "rejected": 1200 },
      "sliding-window": { "allowed": 8500, "rejected": 300 }
    },
    "avgLatencyMs": 0.5,
    "p99LatencyMs": 2.1,
    "storage": {
      "type": "redis",
      "connected": true
    }
  }
}
```

---

#### 获取速率限制 keys

```
GET /api/rate-limit/keys
```

获取速率限制存储中的 keys 列表。

**Query 参数**:
- `pattern`: 搜索模式 (默认: `*`)
- `count`: 返回数量 (默认: 100)

**响应**:

```json
{
  "success": true,
  "data": {
    "keys": [
      "ip:192.168.1.100",
      "ip:10.0.0.50",
      "api-key:sk_test_123",
      "api-key:sk_live_456",
      "user:user_123",
      "user:user_456"
    ],
    "count": 6,
    "cursor": 6
  }
}
```

---

#### 获取特定 key 状态

```
GET /api/rate-limit/status/:layer/:identifier
```

获取特定 key 的当前速率限制状态。

**路径参数**:
- `layer`: 限流层 (`ip`, `user`, `api-key`, `global`)
- `identifier`: 标识符 (IP 地址、用户 ID、API Key 等)

**响应**:

```json
{
  "success": true,
  "data": {
    "key": "ip:192.168.1.100",
    "layer": "ip",
    "currentCount": 45,
    "limit": 100,
    "remaining": 55,
    "resetTime": 1712345660000,
    "algorithm": "sliding-window",
    "storage": "redis"
  }
}
```

---

#### 调整速率限制

```
POST /api/rate-limit/adjust
```

调整特定 key 的速率限制（需要管理员权限）。

**请求体**:

```json
{
  "key": "api-key:sk_test_123",
  "layer": "api-key",
  "newLimit": 200,
  "resetCount": false,
  "addTokens": 50
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "message": "Rate limit adjusted successfully"
  }
}
```

---

#### 重置速率限制

```
POST /api/rate-limit/reset/:layer/:identifier
```

重置特定 key 的速率限制（需要管理员权限）。

**路径参数**:
- `layer`: 限流层 (`ip`, `user`, `api-key`, `global`)
- `identifier`: 标识符

**响应**:

```json
{
  "success": true,
  "data": {
    "message": "Rate limit reset successfully",
    "data": {
      "key": "ip:192.168.1.100",
      "deleted": true
    }
  }
}
```

---

### 类型定义

```typescript
interface RateLimitStats {
  totalRequests: number
  allowedRequests: number
  rejectedRequests: number
  rejectionRate: number
  byLayer: {
    global: { allowed: number; rejected: number }
    ip: { allowed: number; rejected: number }
    'api-key': { allowed: number; rejected: number }
    user: { allowed: number; rejected: number }
  }
  byAlgorithm: {
    'token-bucket': { allowed: number; rejected: number }
    'sliding-window': { allowed: number; rejected: number }
    'fixed-window': { allowed: number; rejected: number }
    'leaky-bucket': { allowed: number; rejected: number }
  }
  avgLatencyMs: number
  p99LatencyMs: number
}

interface RateLimitKeyStatus {
  key: string
  layer: string
  currentCount: number
  limit: number
  remaining: number
  resetTime: number    // Unix timestamp
  algorithm: string
  storage: string
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  storage: {
    type: string
    connected: boolean
  }
  timestamp: string
}
```

---

## 审计日志 API (v1.12.2 新增)

v1.12.2 引入了完整的审计日志系统 API。

### 核心功能

**位置**: `src/app/api/audit/`

**特性**:
- ✅ 查询审计日志（支持多种过滤条件）
- ✅ 获取审计日志详情
- ✅ 导出审计日志（JSON、CSV）
- ✅ 时间范围限制（最多 90 天）

### API 端点

#### 查询审计日志

```
GET /api/audit/logs
```

查询审计日志列表。

**Query 参数**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `userId` | string | - | 用户 ID |
| `username` | string | - | 用户名 |
| `action` | string | - | 操作类型 (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, ADMIN) |
| `resource` | string | - | 资源类型 |
| `resourceId` | string | - | 资源 ID |
| `status` | string | - | 状态 (success, failure) |
| `startTime` | string | - | 开始时间 (ISO 格式) |
| `endTime` | string | - | 结束时间 (ISO 格式) |
| `ipAddress` | string | - | IP 地址 |
| `search` | string | - | 搜索关键词 |
| `sortBy` | string | timestamp | 排序字段 (timestamp, userId, action) |
| `sortOrder` | string | desc | 排序方向 (asc, desc) |
| `offset` | number | 0 | 偏移量 |
| `limit` | number | 100 | 每页数量 (最大 1000) |

**响应**:

```json
{
  "logs": [
    {
      "id": "audit-001",
      "userId": "user-001",
      "username": "john",
      "action": "LOGIN",
      "resource": "auth",
      "resourceId": null,
      "status": "success",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2026-04-05T12:00:00.000Z",
      "details": {
        "loginMethod": "password",
        "mfaEnabled": true
      }
    }
  ],
  "total": 100,
  "offset": 0,
  "limit": 100
}
```

---

#### 获取审计日志详情

```
GET /api/audit/logs/:id
```

获取指定审计日志的详细信息。

**路径参数**:
- `id`: 日志 ID

**响应**:

```json
{
  "id": "audit-001",
  "userId": "user-001",
  "username": "john",
  "action": "UPDATE",
  "resource": "workflow",
  "resourceId": "workflow-001",
  "status": "success",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-04-05T11:30:00.000Z",
  "details": {
    "changes": {
      "before": {
        "timeout": 3600,
        "retryPolicy": {
          "maxRetries": 3
        }
      },
      "after": {
        "timeout": 7200,
        "retryPolicy": {
          "maxRetries": 5
        }
      },
      "changedFields": ["timeout", "retryPolicy.maxRetries"]
    }
  }
}
```

---

#### 导出审计日志

```
GET /api/audit/export
```

导出审计日志为 JSON 或 CSV 格式。

**Query 参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `format` | string | ✅ | 导出格式 (json, csv) |
| `startTime` | string | ✅ | 开始时间 (ISO 格式) |
| `endTime` | string | ✅ | 结束时间 (ISO 格式) |
| `userId` | string | ❌ | 用户 ID |
| `action` | string | ❌ | 操作类型 |
| `resource` | string | ❌ | 资源类型 |
| `resourceId` | string | ❌ | 资源 ID |
| `status` | string | ❌ | 状态 |
| `ipAddress` | string | ❌ | IP 地址 |
| `maxRecords` | number | ❌ | 最大记录数 (默认 10000, 最大 100000) |

**限制**:
- 时间范围不能超过 90 天
- maxRecords 不能超过 100000

**响应**:
- Content-Type: `application/json` 或 `text/csv`
- Content-Disposition: `attachment; filename="audit-logs-YYYY-MM-DD.{format}"`

---

### 类型定义

```typescript
interface AuditLogEntry {
  id: string
  userId?: string
  username?: string
  action: AuditAction
  resource?: string
  resourceId?: string
  status: AuditStatus
  ipAddress: string
  userAgent?: string
  timestamp: string
  details?: Record<string, unknown>
}

type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'ADMIN'
type AuditStatus = 'success' | 'failure'

interface AuditLogQueryOptions {
  userId?: string
  username?: string
  action?: AuditAction
  resource?: string
  resourceId?: string
  status?: AuditStatus
  startTime?: Date
  endTime?: Date
  ipAddress?: string
  search?: string
  sortBy?: 'timestamp' | 'userId' | 'action'
  sortOrder?: 'asc' | 'desc'
  offset?: number
  limit?: number
}

interface AuditLogExportOptions {
  format: 'json' | 'csv'
  startTime: Date
  endTime: Date
  userId?: string
  action?: AuditAction
  resource?: string
  resourceId?: string
  status?: AuditStatus
  ipAddress?: string
  maxRecords?: number
}
```

---

## 实时监控 API (v1.12.2 新增)

### 核心功能

**位置**: `src/app/api/monitoring/realtime/route.ts`

**特性**:
- ✅ 实时性能指标流
- ✅ 系统健康检查
- ✅ 资源使用情况监控

### API 端点

#### 实时性能流

```
GET /api/monitoring/realtime/stream
```

获取实时性能指标流 (Server-Sent Events)。

**响应**: `text/event-stream`

**事件类型**:
- `metric`: 性能指标
- `alert`: 性能告警
- `status`: 状态更新

**示例**:

```
event: metric
data: {"type":"cpu","value":45.2,"timestamp":"2026-04-05T12:00:00.000Z"}

event: metric
data: {"type":"memory","value":67.8,"timestamp":"2026-04-05T12:00:01.000Z"}

event: alert
data: {"level":"warning","message":"High CPU usage","threshold":80,"current":85.2}
```

---

#### 系统健康检查

```
GET /api/monitoring/realtime/health
```

检查系统整体健康状态。

**响应**:

```json
{
  "status": "healthy",
  "checks": {
    "cpu": { "status": "healthy", "value": 45.2, "unit": "%" },
    "memory": { "status": "healthy", "value": 67.8, "unit": "%" },
    "disk": { "status": "healthy", "value": 45.5, "unit": "%" },
    "network": { "status": "healthy", "latency": 5, "unit": "ms" }
  },
  "uptime": 3600,
  "timestamp": "2026-04-05T12:00:00.000Z"
}
```

---

### 类型定义

```typescript
interface RealtimeMetric {
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'requests'
  value: number
  unit: string
  timestamp: string
}

interface HealthCheck {
  status: 'healthy' | 'warning' | 'critical'
  checks: {
    cpu: HealthCheckItem
    memory: HealthCheckItem
    disk: HealthCheckItem
    network: HealthCheckItem
  }
  uptime: number
  timestamp: string
}

interface HealthCheckItem {
  status: 'healthy' | 'warning' | 'critical'
  value: number
  unit: string
  threshold?: number
}

interface PerformanceAlert {
  level: 'info' | 'warning' | 'critical'
  message: string
  threshold?: number
  current: number
  timestamp: string
}
```

---

**文档维护**: 📚 咨询师 (AI 团队)
**最后更新**: 2026-04-05
**版本**: v1.12.2
