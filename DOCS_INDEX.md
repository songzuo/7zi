# 7zi-frontend 文档索引

> 📚 文档导航中心 | 更新日期: 2026-03-13

---

## 📖 快速导航

| 文档 | 用途 | 适合读者 |
|------|------|----------|
| [README.md](./README.md) | 项目介绍与快速开始 | 所有人 |
| [CHANGELOG.md](./CHANGELOG.md) | **📋 变更日志** | 所有人 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 技术架构说明 | 开发者、架构师 |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 当前项目状态 | 开发者、管理者 |
| [NEXT_FEATURES.md](./NEXT_FEATURES.md) | 功能规划与路线图 | 产品、开发团队 |
| [TECH_DEBT.md](./TECH_DEBT.md) | 技术债务与改进建议 | 开发者 |
| [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) | **📘 使用指南** | 所有用户 |
| [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) | **📗 API 参考文档** | 开发者 |
| [docs/COMPONENTS.md](./docs/COMPONENTS.md) | **🧩 组件库文档** | 前端开发者 |
| [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) | **🧪 测试指南** | 开发者、测试员 |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | **🚀 部署指南** | 系统管理员 |
| [docs/QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md) | **⚡ 快速参考** | 所有人 |
| [docs/DOCUMENTATION_GUIDE.md](./docs/DOCUMENTATION_GUIDE.md) | **📝 文档规范** | 开发者 |
| [docs/DOCUMENTATION_SYNC_SUMMARY.md](./docs/DOCUMENTATION_SYNC_SUMMARY.md) | **📊 文档同步摘要** | 所有人 |

---

## 📂 文档目录结构

```
7zi-frontend/
├── 📄 核心文档
│   ├── README.md                    # 项目介绍
│   ├── CHANGELOG.md                 # 变更日志
│   ├── ARCHITECTURE.md              # 技术架构说明
│   ├── PROJECT_STATUS.md            # 项目状态报告
│   ├── NEXT_FEATURES.md             # 功能规划
│   ├── TECH_DEBT.md                 # 技术债务评估
│   ├── MEMORY.md                    # 长期记忆
│   └── DOCS_INDEX.md                # 本文档
│
├── 📄 功能与状态
│   ├── FEATURES.md                  # 功能清单
│   ├── NEW-FEATURES.md              # 新功能设计
│   ├── COMPLETION_REPORT.md         # 完成报告
│   └── FINAL_REVIEW.md              # 最终评审
│
├── 📄 部署与运维
│   ├── DEPLOYMENT-CHECKLIST.md      # 部署检查清单
│   ├── CI-CD-REPORT.md              # CI/CD 配置报告
│   ├── CACHE_CONFIG.md              # 缓存配置说明
│   └── CONTRIBUTING.md              # 贡献指南
│
├── 📄 SEO 与优化
│   └── SEO-OPTIMIZATION-SUMMARY.md  # SEO 优化总结
│
└── 📁 docs/ (详细文档)
    ├── 📊 文档同步
    │   ├── DOCUMENTATION_SYNC_SUMMARY.md  # 文档同步摘要 ⭐ 新增
    │   └── DOCUMENTATION_GUIDE.md         # 文档维护指南
    │
    ├── 📘 使用指南
    │   ├── USER_GUIDE.md            # 用户使用指南 ⭐ 新增
    │   └── API_REFERENCE.md         # API 参考文档 ⭐ 新增
    │
    ├── 📦 模块文档
    │   └── TASKS_MODULE.md          # Tasks 模块文档
    │
    ├── 🏗️ 架构与设计
    │   ├── ARCHITECTURE_REVIEW.md   # 架构审查报告
    │   ├── DESIGN_OPTIMIZATION.md   # UI/UX 优化记录
    │   └── UI_REVIEW.md             # UI/UX 审查报告
    │
    ├── 🚀 性能与优化
    │   ├── OPTIMIZATION_REPORT.md   # Next.js 优化报告
    │   ├── PERFORMANCE-OPTIMIZATION-REPORT.md  # 性能优化报告
    │   ├── PERFORMANCE_OPTIMIZATION_REPORT.md  # 性能优化报告(新)
    │   └── PERFORMANCE_AUDIT.md     # 性能审计
    │
    ├── 📱 响应式与移动端
    │   ├── RESPONSIVE_OPTIMIZATION_REPORT.md       # 响应式优化报告
    │   ├── RESPONSIVE_OPTIMIZATION_REPORT_DRAFT.md # 响应式优化草稿
    │   └── RESPONSIVE_IMPLEMENTATION_GUIDE.md      # 响应式实现指南
    │
    ├── 🗃️ 状态管理
    │   ├── STATE_MANAGEMENT_ANALYSIS-summary.md    # 状态管理分析(简版)
    │   ├── state-management-analysis-detailed.md   # 状态管理分析(详版)
    │   └── STATE_MANAGEMENT_MIGRATION.md           # 状态管理迁移
    │
    ├── 📊 监控与运维
    │   ├── MONITORING_DESIGN.md      # 监控系统设计
    │   ├── MONITORING_SUMMARY.md     # 监控系统摘要
    │   ├── MONITORING_IMPLEMENTATION_REPORT.md  # 监控实现报告
    │   ├── OPERATIONS_MANUAL.md      # 运维手册
    │   ├── DEPLOYMENT.md             # 部署指南
    │   └── PROMETHEUS_METRICS_GUIDE.md  # Prometheus 指标指南
    │
    ├── 🧪 测试与质量
    │   ├── TESTING_GUIDE.md          # 测试指南 ⭐ 新增
    │   └── test-reports/             # 测试报告目录
    │
    ├── 🧩 组件库
    │   └── COMPONENTS.md             # 组件文档 ⭐ 新增
    │
    ├── 📈 市场分析
    │   └── COMPETITION_ANALYSIS.md   # 竞品分析报告
    │
    ├── 🧠 智能体世界
    │   ├── AGENT_COLLABORATION_FRAMEWORK.md  # AI 协作框架
    │   ├── agent-world-innovation-roadmap.md # 创新路线图
    │   ├── KNOWLEDGE_LATTICE.md              # 知识晶格
    │   ├── KNOWLEDGE_LATTICE_SUMMARY.md      # 知识晶格摘要
    │   └── KNOWLEDGE_LATTICE_QUICKSTART.md   # 知识晶格快速开始
    │
    └── 📋 任务报告
        ├── task-8-innovation-planning-report.md   # 任务8报告
        └── KNOWLEDGE_LATTICE_COMPLETION_REPORT.md # 知识晶格完成报告
```

---

## 📄 文档详情

### 🏠 核心文档

#### 1. README.md — 项目门面

**一句话**: 项目介绍、团队介绍、快速开始指南

**主要内容**:
- 🌟 项目核心理念：11 位 AI 成员自主工作
- 👥 团队成员介绍（11 个角色及职责）
- ✨ 功能特点与技术栈
- 🗺️ 产品路线图（2026 Q1-Q4）
- 🚀 快速开始与部署指南

**适合人群**: 所有人，特别是新用户和项目评估者

---

#### 2. ARCHITECTURE.md — 技术架构

**一句话**: 技术架构、设计决策、实现细节

**主要内容**:
- 技术栈概览（Next.js 16 + React 19 + TypeScript 5）
- 架构设计（App Router、Server Components）
- 目录结构与核心模块
- 数据流与状态管理
- 国际化与主题系统
- 性能优化与安全策略
- 部署架构与技术决策记录

**适合人群**: 开发者、架构师

---

#### 3. PROJECT_STATUS.md — 项目体检报告

**一句话**: 当前项目状态、已完成工作、待办事项

**主要内容**:
- 📊 今日工作总结（提交统计、测试覆盖）
- 🏗️ 项目结构概览
- 🔧 本次迭代新增功能（i18n、PWA、错误边界等）
- 📈 改进对比数据
- 🚀 部署状态与目标服务器
- 📋 待办事项清单（高/中/低优先级）

**适合人群**: 开发者、项目管理者、进度追踪者

---

#### 4. NEXT_FEATURES.md — 功能蓝图

**一句话**: 新功能规划、技术方案、工时预估

**主要内容**:
- 📊 现有功能模块分析
- 🚀 三大新功能规划：
  1. **项目案例展示 (Portfolio)** - 13h
  2. **AI 任务分配系统** - 18h  
  3. **实时协作工作区** - 19h (MVP)
- 📈 优先级建议与实施顺序
- 🔧 技术债务提醒

**适合人群**: 产品经理、开发团队、计划制定者

---

#### 5. TECH_DEBT.md — 技术债务清单

**一句话**: 依赖分析、代码质量评估、改进建议

**关键问题**:
| 问题 | 风险 | 建议 |
|------|------|------|
| Sentry 集成未完成 | 🔴 高 | 配置初始化或移除依赖 |
| UserSettingsPage 过大 (713行) | 🟡 中 | 拆分组件 |
| eslint/web-vitals 主版本落后 | 🟡 中 | 计划升级 |

**适合人群**: 开发者、技术负责人

---

### 📁 docs/ 详细文档

#### 架构与设计

| 文档 | 描述 | 行数 |
|------|------|------|
| ARCHITECTURE_REVIEW.md | 架构审查报告，项目规模、技术栈评估 | ~484 行 |
| DESIGN_OPTIMIZATION.md | UI/UX 优化记录，CSS 变量、动画效果 | ~236 行 |
| UI_REVIEW.md | UI/UX 审查报告，响应式、无障碍评估 | ~538 行 |

#### 性能与优化

| 文档 | 描述 | 行数 |
|------|------|------|
| OPTIMIZATION_REPORT.md | Next.js 优化报告，配置、代码分割 | ~629 行 |
| PERFORMANCE-OPTIMIZATION-REPORT.md | 性能优化调研报告，缓存、构建优化 | ~733 行 |
| PERFORMANCE_AUDIT.md | 性能审计 | - |

#### 响应式与移动端

| 文档 | 描述 | 行数 |
|------|------|------|
| RESPONSIVE_OPTIMIZATION_REPORT.md | 响应式优化报告（正式版） | ~226 行 |
| RESPONSIVE_OPTIMIZATION_REPORT_DRAFT.md | 响应式优化报告（草稿，含问题清单） | ~182 行 |
| RESPONSIVE_IMPLEMENTATION_GUIDE.md | 响应式实现指南 | ~302 行 |

#### 状态管理

| 文档 | 描述 | 行数 |
|------|------|------|
| STATE_MANAGEMENT_ANALYSIS-summary.md | 状态管理分析（简版） | ~335 行 |
| state-management-analysis-detailed.md | 状态管理分析（详版，含方案对比） | ~1267 行 |
| STATE_MANAGEMENT_MIGRATION.md | 状态管理迁移指南 | ~613 行 |

#### 监控与运维

| 文档 | 描述 | 行数 |
|------|------|------|
| MONITORING_DESIGN.md | 监控系统设计 | ~703 行 |
| MONITORING_SUMMARY.md | 监控系统摘要 | ~217 行 |
| MONITORING_IMPLEMENTATION_REPORT.md | 监控实现报告 | ~350 行 |
| OPERATIONS_MANUAL.md | 运维手册 | ~272 行 |
| DEPLOYMENT.md | 部署指南 (完整版) | ~450 行 |
| PROMETHEUS_METRICS_GUIDE.md | Prometheus 指标指南 | ~150 行 |

#### 测试与质量

| 文档 | 描述 | 行数 |
|------|------|------|
| TESTING_GUIDE.md | 完整测试指南 (Vitest + Playwright) | ~450 行 |
| test-reports/*.md | 各类测试报告 | - |

#### 组件库

| 文档 | 描述 | 行数 |
|------|------|------|
| COMPONENTS.md | 可复用组件完整文档 | ~200 行 |
| TASKS_MODULE.md | Tasks 模块详细文档 | ~350 行 |

#### 快速参考

| 文档 | 描述 | 行数 |
|------|------|------|
| QUICK_REFERENCE.md | 命令、API、配置速查表 | ~150 行 |

#### 文档维护

| 文档 | 描述 | 行数 |
|------|------|------|
| DOCUMENTATION_GUIDE.md | 文档编写规范与维护指南 | ~150 行 |

#### 市场分析

| 文档 | 描述 | 行数 |
|------|------|------|
| COMPETITION_ANALYSIS.md | 竞品分析报告 | ~442 行 |

---

## 🔄 文档关系图

```
                    ┌─────────────────┐
                    │   README.md     │
                    │   (项目入口)     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ ARCHITECTURE  │    │ PROJECT_      │    │ NEXT_         │
│ .md           │    │ STATUS.md     │    │ FEATURES.md   │
│ (架构设计)     │    │ (当前状态)     │    │ (未来规划)     │
└───────┬───────┘    └───────┬───────┘    └───────────────┘
        │                    │
        │                    │
        ▼                    ▼
┌───────────────────────────────────────┐
│              docs/                    │
├───────────────────────────────────────┤
│  架构审查 → 性能优化 → 响应式 → 监控   │
└───────────────────────────────────────┘
```

---

## 🛤️ 建议阅读顺序

### 新用户/项目评估
```
README.md → PROJECT_STATUS.md → NEXT_FEATURES.md
```

### 开发者加入项目
```
README.md → ARCHITECTURE.md → TECH_DEBT.md → docs/ARCHITECTURE_REVIEW.md
```

### 前端/UI 开发
```
docs/DESIGN_OPTIMIZATION.md → docs/UI_REVIEW.md → docs/RESPONSIVE_*
```

### 性能优化工作
```
docs/OPTIMIZATION_REPORT.md → docs/PERFORMANCE-* → TECH_DEBT.md
```

### 运维部署
```
DEPLOYMENT-CHECKLIST.md → docs/DEPLOYMENT.md → docs/OPERATIONS_MANUAL.md
```

---

## 📌 关键数据速查

| 指标 | 数值 | 来源 |
|------|------|------|
| 项目版本 | 0.2.1 | README |
| TypeScript 文件 | 270+ 个 | PROJECT_STATUS |
| 代码总行数 | 20,000+ 行 | PROJECT_STATUS |
| 组件数量 | 50+ 个 | PROJECT_STATUS |
| 测试文件 | 270+ 个 | PROJECT_STATUS |
| AI 团队成员 | 11 位 | README |
| 技术债务评分 | 3/10 (低) | TECH_DEBT |
| API 端点 | 17 个 | API_REFERENCE |

---

## 🔌 API 端点完整列表

### 任务管理 API (`/api/tasks`)

| 方法 | 端点 | 说明 | 状态 |
|------|------|------|------|
| GET | `/api/tasks` | 获取任务列表（支持过滤） | ✅ |
| POST | `/api/tasks` | 创建新任务 | ✅ |
| PUT | `/api/tasks` | 更新任务 | ✅ |
| GET | `/api/tasks/:id` | 获取单个任务详情 | ✅ |
| POST | `/api/tasks/:id/assign` | AI 智能分配任务 | ✅ |

### 项目管理 API (`/api/projects`)

| 方法 | 端点 | 说明 | 状态 |
|------|------|------|------|
| - | `/api/projects` | 获取项目列表 | ⚠️ 未实现 |
| - | `/api/projects` | 创建新项目（需认证） | ⚠️ 未实现 |
| - | `/api/projects/:id` | 更新项目（需认证） | ⚠️ 未实现 |
| - | `/api/projects/:id` | 删除项目（需管理员） | ⚠️ 未实现 |
| - | `/api/projects/:id/tasks` | 获取项目相关任务 | ⚠️ 未实现 |

> 注: 项目数据目前通过 `/api/tasks` 管理

### 知识图谱 API (`/api/knowledge`)

| 方法 | 端点 | 说明 | 状态 |
|------|------|------|------|
| GET | `/api/knowledge/nodes` | 获取知识节点列表 | ✅ |
| POST | `/api/knowledge/nodes` | 创建知识节点 | ✅ |
| GET | `/api/knowledge/nodes/:id` | 获取节点详情 | ✅ |
| PUT | `/api/knowledge/nodes/:id` | 更新节点 | ✅ |
| DELETE | `/api/knowledge/nodes/:id` | 删除节点 | ✅ |
| GET | `/api/knowledge/edges` | 获取知识边列表 | ✅ |
| POST | `/api/knowledge/edges` | 创建知识边 | ✅ |
| POST | `/api/knowledge/query` | 知识查询 | ✅ |
| POST | `/api/knowledge/inference` | 知识推理 | ✅ |
| GET | `/api/knowledge/lattice` | 获取知识晶格 | ✅ |

### 健康检查 API (`/api/health`)

| 方法 | 端点 | 说明 | 状态 |
|------|------|------|------|
| GET | `/api/health` | 基础健康检查 | ✅ |
| GET | `/api/health/ready` | 就绪状态检查 | ✅ |
| GET | `/api/health/live` | 存活状态检查 | ✅ |
| GET | `/api/health/detailed` | 详细健康报告 | ✅ |

### 日志系统 API (`/api/logs`)

| 方法 | 端点 | 说明 | 状态 |
|------|------|------|------|
| GET | `/api/logs` | 查询日志（支持分页） | ✅ |
| POST | `/api/logs` | 创建日志条目 | ✅ |
| DELETE | `/api/logs` | 清理旧日志 | ✅ |
| GET | `/api/logs/export` | 导出日志（JSON/CSV） | ✅ |

### 认证 API (`/api/auth`)

| 方法 | 端点 | 说明 | 状态 |
|------|------|------|------|
| POST | `/api/auth/login` | 用户登录 | ✅ |
| POST | `/api/auth/logout` | 用户登出 | ✅ |
| POST | `/api/auth/refresh` | 刷新令牌 | ✅ |
| GET | `/api/auth/me` | 获取当前用户 | ✅ |
| GET | `/api/auth?action=csrf` | 获取 CSRF Token | ✅ |
| GET | `/api/auth?action=check-secret` | JWT Secret 强度检查 | ✅ |

### 系统状态 API (`/api/status`)

| 方法 | 端点 | 说明 | 状态 |
|------|------|------|------|
| GET | `/api/status` | 获取系统状态 | ✅ |

---

## 📝 重复内容说明

以下内容在多个文档中出现，但侧重点不同：

| 内容 | 出现文档 | 区别 |
|------|----------|------|
| **技术栈版本** | README, ARCHITECTURE, PROJECT_STATUS | README 概览，ARCHITECTURE 详细，STATUS 当前状态 |
| **Sentry 集成** | PROJECT_STATUS, TECH_DEBT | STATUS 说"已配置禁用"，DEBT 详细分析问题 |
| **响应式优化** | RESPONSIVE_OPTIMIZATION_REPORT.md, RESPONSIVE_OPTIMIZATION_REPORT_DRAFT.md | 正式版是修复后的总结，草稿版是问题清单 |
| **状态管理** | STATE_MANAGEMENT_ANALYSIS-summary.md, state-management-analysis-detailed.md | 简版是架构分析，详版是方案调研对比 |

---

## 🔄 文档维护

### 更新频率建议

| 文档 | 更新时机 |
|------|----------|
| README.md | 版本发布、重大功能上线 |
| ARCHITECTURE.md | 架构变更、技术栈升级 |
| PROJECT_STATUS.md | 每日/每周工作总结 |
| NEXT_FEATURES.md | 功能规划会议后 |
| TECH_DEBT.md | 代码审查、依赖更新后 |
| docs/* | 对应工作完成后 |

### 文档负责人

| 文档 | 建议负责人 |
|------|------------|
| README.md | 媒体 |
| ARCHITECTURE.md | 架构师 |
| PROJECT_STATUS.md | 咨询师 |
| NEXT_FEATURES.md | 架构师 |
| TECH_DEBT.md | 咨询师 |
| docs/DESIGN_*, UI_* | 设计师 |
| docs/PERFORMANCE_*, OPTIMIZATION_* | 系统管理员 |
| docs/MONITORING_*, OPERATIONS_* | 系统管理员 |
| docs/COMPETITION_* | 推广专员 |

---

*索引由架构师子代理整理 | 2026-03-06*
