# 7zi-frontend 文档索引

> 📚 文档导航中心 | 更新日期: 2026-03-06

---

## 📖 快速导航

| 文档 | 用途 | 适合读者 |
|------|------|----------|
| [README.md](./README.md) | 项目介绍与快速开始 | 所有人 |
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 当前项目状态 | 开发者、管理者 |
| [NEXT_FEATURES.md](./NEXT_FEATURES.md) | 功能规划与路线图 | 产品、开发团队 |
| [TECH_DEBT.md](./TECH_DEBT.md) | 技术债务与改进建议 | 开发者 |
| [docs/DESIGN_OPTIMIZATION.md](./docs/DESIGN_OPTIMIZATION.md) | UI/UX 优化记录 | 设计师、前端 |

---

## 📄 文档概述

### 1. README.md — 项目门面

**一句话描述**: 项目介绍、团队介绍、快速开始指南

**主要内容**:
- 🌟 项目核心理念：11 位 AI 成员自主工作
- 👥 团队成员介绍（11 个角色及职责）
- ✨ 功能特点与技术栈
- 🗺️ 产品路线图（2026 Q1-Q4）
- 🚀 快速开始与部署指南

**适合人群**: 所有人，特别是新用户和项目评估者

---

### 2. PROJECT_STATUS.md — 项目体检报告

**一句话描述**: 当前项目状态、已完成工作、待办事项

**主要内容**:
- 📊 今日工作总结（提交统计、测试覆盖）
- 🏗️ 项目结构概览
- 🔧 本次迭代新增功能（i18n、PWA、错误边界等）
- 📈 改进对比数据
- 🚀 部署状态与目标服务器
- 📋 待办事项清单（高/中/低优先级）
- 📁 完整文档清单

**适合人群**: 开发者、项目管理者、进度追踪者

---

### 3. NEXT_FEATURES.md — 功能蓝图

**一句话描述**: 新功能规划、技术方案、工时预估

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

### 4. TECH_DEBT.md — 技术债务清单

**一句话描述**: 依赖分析、代码质量评估、改进建议

**主要内容**:
- 📊 执行摘要（总体评级 B+）
- 1️⃣ 依赖版本分析（过时依赖、安全审计）
- 2️⃣ 代码质量分析（大型组件、类型安全）
- 3️⃣ 架构与技术债务（Sentry 集成、测试覆盖）
- 4️⃣ 优先级分级（P0/P1/P2）
- 5️⃣ 推荐行动计划

**关键问题**:
| 问题 | 风险 | 建议 |
|------|------|------|
| Sentry 集成未完成 | 🔴 高 | 配置初始化或移除依赖 |
| UserSettingsPage 过大 (713行) | 🟡 中 | 拆分组件 |
| eslint/web-vitals 主版本落后 | 🟡 中 | 计划升级 |

**适合人群**: 开发者、技术负责人

---

### 5. docs/DESIGN_OPTIMIZATION.md — 设计优化日志

**一句话描述**: UI/UX 优化记录、动画效果、设计系统

**主要内容**:
- 🎨 CSS 设计变量增强（颜色、阴影、动画）
- 📱 组件优化记录：
  - Navigation 导航栏
  - MemberCard 成员卡片
  - Dashboard 仪表板
  - TaskBoard 任务看板
  - ActivityLog 活动日志
  - ChatInput 聊天输入
- 📐 响应式优化（移动端触摸、安全区域）
- ⚡ 性能优化（GPU 加速、内容可见性）
- ♿ 无障碍优化（焦点状态、文字选中）

**统计数据**:
- 组件优化: 7 个
- 新增动画: 12 种
- 新增工具类: 30+ 个

**适合人群**: 设计师、前端开发者

---

## 🔗 文档关系图

```
                    ┌─────────────────┐
                    │   README.md     │
                    │   (项目入口)     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ PROJECT_    │  │ NEXT_       │  │ TECH_       │
    │ STATUS.md   │  │ FEATURES.md │  │ DEBT.md     │
    │ (当前状态)   │  │ (未来规划)   │  │ (技术债务)   │
    └──────┬──────┘  └─────────────┘  └─────────────┘
           │
           │ 提到
           ▼
    ┌─────────────────────────┐
    │ docs/DESIGN_            │
    │ OPTIMIZATION.md         │
    │ (UI优化详情)             │
    └─────────────────────────┘
```

---

## 📝 重复内容说明

以下内容在多个文档中出现，但侧重点不同：

| 内容 | 出现文档 | 区别 |
|------|----------|------|
| **技术栈版本** | README, PROJECT_STATUS, NEXT_FEATURES | README 是概览，其他是具体工作基础 |
| **Sentry 集成** | PROJECT_STATUS, TECH_DEBT | STATUS 说"已配置禁用"，DEBT 详细分析问题 |
| **AI 团队成员** | README, PROJECT_STATUS | README 是介绍，STATUS 是工作分配 |
| **组件优化** | PROJECT_STATUS, DESIGN_OPTIMIZATION | STATUS 是成果总结，DESIGN 是实施细节 |

---

## 🛤️ 建议阅读顺序

### 新用户/项目评估
```
README.md → PROJECT_STATUS.md → NEXT_FEATURES.md
```
了解项目是什么 → 现在做到哪了 → 未来要做什么

### 开发者加入项目
```
README.md → TECH_DEBT.md → PROJECT_STATUS.md → docs/DESIGN_OPTIMIZATION.md
```
了解项目 → 知道技术债务 → 查看当前状态 → 学习设计规范

### 产品/规划会议
```
PROJECT_STATUS.md → NEXT_FEATURES.md → TECH_DEBT.md
```
审视现状 → 规划新功能 → 考虑技术债务影响

### UI/UX 工作
```
docs/DESIGN_OPTIMIZATION.md → PROJECT_STATUS.md (组件列表)
```
了解现有设计系统 → 查看组件状态

### 技术债务处理
```
TECH_DEBT.md → PROJECT_STATUS.md (待办事项) → NEXT_FEATURES.md (技术债务提醒)
```
分析债务 → 查看优先级 → 规划与功能开发的协调

---

## 📂 完整文档目录

```
7zi-frontend/
├── README.md                    # 项目介绍
├── PROJECT_STATUS.md            # 项目状态报告
├── NEXT_FEATURES.md             # 功能规划
├── TECH_DEBT.md                 # 技术债务评估
├── DOCS_INDEX.md                # 本文档
│
└── docs/
    ├── DESIGN_OPTIMIZATION.md   # 设计优化记录
    ├── DEPLOYMENT.md            # 部署指南
    ├── PERFORMANCE-OPTIMIZATION-REPORT.md  # 性能优化报告
    ├── MONITORING_DESIGN.md     # 监控设计
    ├── MONITORING_SUMMARY.md    # 监控摘要
    ├── OPERATIONS_MANUAL.md     # 运维手册
    ├── ALERT_RULES.yaml         # 告警规则
    ├── responsive-implementation-guide.md  # 响应式指南
    └── state-management-analysis.md        # 状态管理分析
```

---

## 📌 关键数据速查

| 指标 | 数值 | 来源 |
|------|------|------|
| 项目版本 | 0.1.0 | PROJECT_STATUS |
| TypeScript 文件 | 139 个 | PROJECT_STATUS |
| 代码总行数 | 20,098 行 | PROJECT_STATUS |
| 组件数量 | 30+ 个 | PROJECT_STATUS |
| 测试文件 | 17-23 个 | PROJECT_STATUS/TECH_DEBT |
| 测试通过 | 294 个 | PROJECT_STATUS |
| AI 团队成员 | 11 位 | README |
| 技术债务评分 | 3/10 (低) | TECH_DEBT |
| 总体评级 | B+ | TECH_DEBT |

---

## 🔄 文档维护

### 更新频率建议

| 文档 | 更新时机 |
|------|----------|
| README.md | 版本发布、重大功能上线 |
| PROJECT_STATUS.md | 每日/每周工作总结 |
| NEXT_FEATURES.md | 功能规划会议后 |
| TECH_DEBT.md | 代码审查、依赖更新后 |
| DESIGN_OPTIMIZATION.md | UI/UX 优化完成后 |

### 文档负责人

| 文档 | 建议负责人 |
|------|------------|
| README.md | 产品/媒体 |
| PROJECT_STATUS.md | 咨询师 |
| NEXT_FEATURES.md | 架构师 |
| TECH_DEBT.md | 咨询师 |
| DESIGN_OPTIMIZATION.md | 设计师 |

---

*索引由咨询师子代理创建 | 2026-03-06*