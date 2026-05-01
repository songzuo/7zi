# 📚 7zi Studio 文档中心索引

**最后更新**: 2026-04-30
**版本**: v1.14.1 ✅ 已发布 (2026-04-25) | v1.15.0 📋 规划中

---

## 📖 文档导航

### 🚀 快速开始

- **[README.md](../README.md)** - 项目介绍和快速开始 ⭐
- **[QUICKSTART.md](./QUICKSTART.md)** - 5 分钟快速部署
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 部署文档（生产环境配置）
- **[CHANGELOG.md](../CHANGELOG.md)** - 版本变更日志
- **[v1.14.0 多模型路由指南](../src/lib/ai/MULTIMODEL_GUIDE.md)** - 多模型智能路由使用指南 ⭐ 新增
- **[v1.14.0 实现总结](../src/lib/ai/MULTIMODEL_IMPLEMENTATION_SUMMARY.md)** - 多模型路由实现总结 ⭐ 新增
- **[v1.10.0 实现报告](../V110_CODE_GENERATION_IMPLEMENTATION_REPORT.md)** - AI 代码智能系统实现报告 ⭐
- **[v1.10.0 AI 增强路线图](../v110_AI_ENHANCEMENT_ROADMAP.md)** - AI 增强功能路线图 ⭐
- **[v1.11.0 路线图](../v111_ROADMAP.md)** - 智能协作与体验升级规划 ⭐
- **[v1.12.0 路线图](../v120_ROADMAP.md)** - 多模型智能路由路线图 ⭐ 新增
- **[多租户架构设计](./MULTI_TENANT_ARCHITECTURE_v110.md)** - 多租户系统架构文档 ⭐
- **[WHATS_NEW_v1.4.0.md](./WHATS_NEW_v1.4.0.md)** - v1.4.0 功能展示
- **[PROMOTION_MATERIALS_v140.md](./PROMOTION_MATERIALS_v140.md)** - v1.4.0 推广素材
- **[v1.3.0 规划文档](./v1.3.0-PLANNING.md)** - v1.3.0 详细规划 ✅ 已完成
- **[RELEASE_NOTES_v1.1.0.md](./RELEASE_NOTES_v1.1.0.md)** - v1.1.0 发布说明
- **[RELEASE_NOTES_v1.0.9.md](./RELEASE_NOTES_v1.0.9.md)** - v1.0.9 发布说明

### 🏗️ 架构文档

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 系统架构总览 ⭐
  - 架构概览和分层设计
  - 核心组件说明
  - 数据流和通信模式
  - 安全架构和性能优化

- **[ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)** - 架构图解
- **[ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)** - 架构总结
- **[microservice-design.md](./microservice-design.md)** - 微服务设计
- **[mcp-server-architecture.md](./mcp-server-architecture.md)** - MCP 服务器架构

#### 🏛️ 架构决策记录 (ADR)

- **[ADR README](./adr/README.md)** - ADR 索引和指南 ⭐
  - ADR 模板和创建指南
  - v1.4.0 核心架构决策
  - 决策状态和流转

**v1.4.0 核心架构决策**:

- **[ADR-0006: Agent Scheduler 架构](./adr/0006-agent-scheduler-architecture.md)** - AI Agent 智能调度系统
- **[ADR-0007: 性能监控架构](./adr/0007-performance-monitoring-architecture.md)** - 智能异常检测和根因分析
- **[ADR-0008: WebSocket 房间系统设计](./adr/0008-websocket-room-system-design.md)** - 多房间、权限控制、消息持久化
- **[ADR-0009: React Compiler 采用策略](./adr/0009-react-compiler-adoption-strategy.md)** - 可选编译模式和回滚机制

**基础架构决策**:

- **[ADR-0001: 使用 Zustand 进行状态管理](./adr/0001-use-zustand-for-state-management.md)** - 全局状态管理方案
- **[ADR-0002: 使用 Socket.IO 实现 WebSocket](./adr/0002-use-socket.io-for-websocket.md)** - 实时通信基础设施
- **[ADR-0003: 使用 Redis 进行缓存](./adr/0003-use-redis-for-caching.md)** - 缓存层设计
- **[ADR-0004: 启用 TypeScript Strict Mode](./adr/0004-use-typescript-strict-mode.md)** - 类型安全强化
- **[ADR-0005: 使用 Vitest 作为测试框架](./adr/0005-use-vitest-for-testing.md)** - 现代化测试方案

### 🔌 API 文档

- **[API.md](./API.md)** - API 完整文档 ⭐
  - 自定义 Hooks
  - 公开组件
  - API 端点列表

#### 📁 API 专项文档 (v1.4.0 新增)

- **[api/ratings.md](./api/ratings.md)** - 评分 API 文档 ⭐
  - 评分 CRUD 操作
  - 多目标类型评分 (Agent、任务、功能、项目)
  - 评分投票和统计

- **[api/search.md](./api/search.md)** - 搜索 API 文档 ⭐
  - 全局多实体搜索
  - 高级过滤和模糊匹配
  - 自动完成和搜索历史

- **[api/websocket.md](./api/websocket.md)** - WebSocket API 文档 ⭐
  - 房间系统管理
  - 权限控制 (5 种角色、16 种权限)
  - 消息持久化和离线队列

- **[api/agent-scheduler.md](./api/agent-scheduler.md)** - Agent 调度系统 API ⭐
  - Agent 注册和心跳
  - 任务队列管理
  - JSON-RPC 接口

#### 📁 库文档 (v1.8.0 新增)

- **[lib/websocket-monitoring.md](./lib/websocket-monitoring.md)** - WebSocket 监控功能 ⭐
  - 实时延迟监控
  - 连接状态追踪
  - 性能指标上报
  - 多命名空间支持

#### 其他 API 文档

- **[API-REFERENCE.md](./API-REFERENCE.md)** - API 参考手册
- **[REST-API.md](./REST-API.md)** - REST API 规范
- **[API-ENDPOINTS.md](./API-ENDPOINTS.md)** - API 端点列表
- **[API-COMPLETE-REFERENCE.md](./API-COMPLETE-REFERENCE.md)** - API 完整参考
- **[API-DOCUMENTATION.md](./API-DOCUMENTATION.md)** - API 文档
- **[API-MAIN.md](./API-MAIN.md)** - API 主要文档

### 🧩 组件文档

- **[COMPONENTS.md](./COMPONENTS.md)** - React 组件库
- **[HOOKS.md](./HOOKS.md)** - 自定义 Hooks
- **[PAGE-STRUCTURE.md](./PAGE-STRUCTURE.md)** - 页面结构说明
- **[COMPONENTS-MAIN.md](./COMPONENTS-MAIN.md)** - 组件主要文档
- **[COMPONENTS-USAGE-GUIDE.md](./COMPONENTS-USAGE-GUIDE.md)** - 组件使用指南
- **[COMPONENTS-MAIN-UPDATED.md](./COMPONENTS-MAIN-UPDATED.md)** - 组件更新文档

### 🎨 设计与优化

- **[DESIGN_OPTIMIZATION.md](./DESIGN_OPTIMIZATION.md)** - 设计优化指南
- **[PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md)** - 性能优化
- **[PERFORMANCE.md](./PERFORMANCE.md)** - 性能指标
- **[PERFORMANCE_AUDIT.md](./PERFORMANCE_AUDIT.md)** - 性能审计
- **[PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md)** - 性能监控
- **[PERFORMANCE_REPORT.md](./PERFORMANCE_REPORT.md)** - 性能报告
- **[OPTIMIZATION_REPORT.md](./OPTIMIZATION_REPORT.md)** - 优化总结报告

### 🔄 通信与集成

- **[WEBSOCKET.md](./WEBSOCKET.md)** - WebSocket 实时通信 ⭐
- **[WHATS_NEW_v1.4.0.md](./WHATS_NEW_v1.4.0.md)** - WebSocket v1.4.0 新功能展示 ⭐
- **[ADR-0008: WebSocket 房间系统设计](./adr/0008-websocket-room-system-design.md)** - 多房间、权限控制、消息持久化
- **[LOADING-SYSTEM.md](./LOADING-SYSTEM.md)** - 全局加载系统 ⭐ (v1.1.0 新增)
- **[GITHUB-INTEGRATION.md](./GITHUB-INTEGRATION.md)** - GitHub 集成
- **[GMAIL-INTEGRATION.md](./GMAIL-INTEGRATION.md)** - Gmail 集成
- **[TELEGRAM-BOT.md](./TELEGRAM-BOT.md)** - Telegram 机器人

### 🤖 AI 与代理系统

- **[DIRECTOR.md](./DIRECTOR.md)** - AI 主管系统
- **[SUBAGENTS.md](./SUBAGENTS.md)** - 子代理团队
- **[TEAM-MEETING.md](./TEAM-MEETING.md)** - 团队会议系统
- **[STATE_MANAGEMENT_ANALYSIS-summary.md](./STATE_MANAGEMENT_ANALYSIS-summary.md)** - 状态管理分析
- **[STATE_MANAGEMENT_MIGRATION.md](./STATE_MANAGEMENT_MIGRATION.md)** - 状态管理迁移

### 🧪 测试与开发

- **[TESTING.md](./TESTING.md)** - 测试策略和指南
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - 开发指南
- [TESTING_GUIDE.md](../TESTING_GUIDE.md) - 测试指南
- [CODE_STYLE.md](./CODE_STYLE.md) - 代码风格规范
- [ERROR-HANDLING.md](./ERROR-HANDLING.md) - 错误处理
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - 错误处理指南
- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) - 错误处理完整指南
- [E2E_TESTING_STRATEGY.md](./E2E_TESTING_STRATEGY.md) - E2E 测试策略
- [TEST_ANALYSIS_REPORT.md](../TEST_ANALYSIS_REPORT.md) - 测试分析报告
- [TEST_COVERAGE_REPORT.md](../TEST_COVERAGE_REPORT.md) - 测试覆盖率报告

### 🔒 安全与运维

- **[SECURITY-AUDIT-REPORT.md](./SECURITY-AUDIT-REPORT.md)** - 安全审计报告
- **[MONITORING.md](./MONITORING.md)** - 监控系统
- **[MONITORING_DESIGN.md](./MONITORING_DESIGN.md)** - 监控设计
- **[MONITORING_SUMMARY.md](./MONITORING_SUMMARY.md)** - 监控总结
- **[OPERATIONS_MANUAL.md](./OPERATIONS_MANUAL.md)** - 运维手册
- **[PERMISSIONS.md](./PERMISSIONS.md)** - 权限管理
- **[RBAC_IMPLEMENTATION.md](./RBAC_IMPLEMENTATION.md)** - RBAC 实现文档
- **[RBAC_QUICK_REFERENCE.md](./RBAC_QUICK_REFERENCE.md)** - RBAC 快速参考
- **[RBAC_CHANGELOG.md](./RBAC_CHANGELOG.md)** - RBAC 变更日志

### 📦 部署与 CI/CD

- **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** - 部署指南
- **[CI-CD-SETUP.md](./CI-CD-SETUP.md)** - CI/CD 配置
- **[CI_CD_MIGRATION_GUIDE.md](./CI_CD_MIGRATION_GUIDE.md)** - CI/CD 迁移指南
- **[CI_CD_REPORT.md](./CI_CD_REPORT.md)** - CI/CD 报告
- **[CI_CD_SUMMARY.md](./CI_CD_SUMMARY.md)** - CI/CD 总结
- **[ENVIRONMENT.md](./ENVIRONMENT.md)** - 环境配置
- **[ENVIRONMENT-VARIABLES.md](./ENVIRONMENT-VARIABLES.md)** - 环境变量文档
- **[BACKUP-POLICY.md](./BACKUP-POLICY.md)** - 备份策略

### 🌍 国际化与本地化

- **[I18N.md](./I18N.md)** - 国际化指南
- **[I18N_ARCHITECTURE.md](./I18N_ARCHITECTURE.md)** - 国际化架构

### 📊 监控与分析

- **[ANALYTICS_DASHBOARD.md](./ANALYTICS_DASHBOARD.md)** - 分析仪表板
- **[NOTIFICATION_SYSTEM.md](./NOTIFICATION_SYSTEM.md)** - 通知系统

### 🎯 专项功能

- **[SEARCH-ENHANCEMENT.md](./SEARCH-ENHANCEMENT.md)** - 搜索增强
- **[ANIMATED_PROGRESS_BAR.md](./ANIMATED_PROGRESS_BAR.md)** - 动画进度条
- **[LOADING-SYSTEM.md](./LOADING-SYSTEM.md)** - 加载系统
- **[portfolio-architecture.md](./portfolio-architecture.md)** - 作品集架构

### 🎨 UI/UX

- **[RESPONSIVE_IMPLEMENTATION_GUIDE.md](./RESPONSIVE_IMPLEMENTATION_GUIDE.md)** - 响应式实现
- **[RESPONSIVE_OPTIMIZATION_REPORT.md](./RESPONSIVE_OPTIMIZATION_REPORT.md)** - 响应式优化报告
- **[MOBILE-RESPONSIVE-AUDIT.md](./MOBILE-RESPONSIVE-AUDIT.md)** - 移动端响应式审计
- **[UI_REVIEW.md](./UI_REVIEW.md)** - UI 审查
- **[UX-ANALYSIS.md](./ux-analysis.md)** - UX 分析
- **[UI_IMPROVEMENT_PROPOSAL.md](../UI_IMPROVEMENT_PROPOSAL.md)** - UI 改进提案

### 📊 数据库优化

- **[DATABASE_OPTIMIZATIONS.md](./DATABASE_OPTIMIZATIONS.md)** - 数据库优化
- **[DATABASE_OPTIMIZATION_IMPLEMENTATION_GUIDE.md](./DATABASE_OPTIMIZATION_IMPLEMENTATION_GUIDE.md)** - 数据库优化实现指南
- **[TASK_SUMMARY_DB_OPTIMIZATION.md](./TASK_SUMMARY_DB_OPTIMIZATION.md)** - 数据库优化任务总结

### 🔄 状态管理

- **[state-management-analysis-detailed.md](./state-management-analysis-detailed.md)** - 详细状态管理分析
- **[STATE_MANAGEMENT_MIGRATION.md](./STATE_MANAGEMENT_MIGRATION.md)** - 状态管理迁移

### 🛣️ 路线图

- **[ROADMAP.md](./ROADMAP.md)** - 功能路线图
- **[feature-roadmap.md](./feature-roadmap.md)** - 功能规划
- **[future-roadmap.md](./future-roadmap.md)** - 未来规划
- **[tech-evolution.md](./tech-evolution.md)** - 技术演进

### 📊 分析与报告

- **[COMPETITION_ANALYSIS.md](./COMPETITION_ANALYSIS.md)** - 竞争分析
- **[COMPETITOR_ANALYSIS.md](./COMPETITOR_ANALYSIS.md)** - 竞争对手分析
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - 项目总结
- **[TECH_DEBT.md](./TECH_DEBT.md)** - 技术债务分析
- **[PORTFOLIO_OPTIMIZATION_REPORT.md](./PORTFOLIO_OPTIMIZATION_REPORT.md)** - Portfolio 优化报告
- **[WEB_VITALS_IMPLEMENTATION_SUMMARY.md](./WEB_VITALS_IMPLEMENTATION_SUMMARY.md)** - Web Vitals 实现总结
- **[WEB_VITALS_OPTIMIZATION.md](./WEB_VITALS_OPTIMIZATION.md)** - Web Vitals 优化
- **[VERIFICATION_REPORT.md](./VERIFICATION_REPORT.md)** - 验证报告

### 🔐 错误处理与安全

- **[ERROR-IMPLEMENTATION-SUMMARY.md](./ERROR-IMPLEMENTATION-SUMMARY.md)** - 错误处理实现总结
- **[ERROR_HANDLING_REVIEW.md](./ERROR_HANDLING_REVIEW.md)** - 错误处理审查
- **[ERROR_HANDLING_GUIDE_COMPLETION_REPORT.md](./ERROR_HANDLING_GUIDE_COMPLETION_REPORT.md)** - 错误处理指南完成报告
- **[PERFORMANCE-OPTIMIZATION-REPORT.md](./PERFORMANCE-OPTIMIZATION-REPORT.md)** - 性能优化报告
- **[XLSX_VULNERABILITY_ASSESSMENT.md](./XLSX_VULNERABILITY_ASSESSMENT.md)** - XLSX 漏洞评估
- **[CSP_CONFIGURATION_GUIDE.md](./CSP_CONFIGURATION_GUIDE.md)** - CSP 配置指南
- **[CSP_IMPLEMENTATION_REPORT.md](./CSP_IMPLEMENTATION_REPORT.md)** - CSP 实现报告

### 📖 示例与参考

- **[EXAMPLES.md](./EXAMPLES.md)** - 使用示例
- **[FEATURES.md](../FEATURES.md)** - 功能列表
- **[SCRIPTS.md](../SCRIPTS.md)** - 脚本文档

### 🌐 其他

- **[API_QUICK_REFERENCE.ts](./API_QUICK_REFERENCE.ts)** - API 快速参考（TypeScript）
- **[API_STRUCTURE_DIAGRAM.ts](./API_STRUCTURE_DIAGRAM.ts)** - API 结构图（TypeScript）
- **[ARCHITECTURE_SUMMARY.md](./ARCHITECTURE_SUMMARY.md)** - 架构总结
- **[API_REFACTORING.md](./API_REFACTORING.md)** - API 重构文档
- **[API_REFACTORING_SUMMARY.md](./API_REFACTORING_SUMMARY.md)** - API 重构总结
- **[ALERT_RULES.yaml](./ALERT_RULES.yaml)** - 告警规则
- **[CACHE_CONFIG.md](./CACHE_CONFIG.md)** - 缓存配置
- **[REDIS_CLIENT.md](./REDIS_CLIENT.md)** - Redis 客户端文档 ⭐ (v1.1.0 新增)
- **[SERVERS.md](./SERVERS.md)** - 服务器配置
- **[SSH-SETUP.md](./SSH-SETUP.md)** - SSH 设置
- **[SSH-TROUBLESHOOTING.md](./SSH-TROUBLESHOOTING.md)** - SSH 故障排除
- **[dependency-audit.md](./dependency-audit.md)** - 依赖审计

### 🔄 WebSocket 相关

- **[WEBSOCKET.md](./WEBSOCKET.md)** - WebSocket 文档
- **[WEBSOCKET_TESTING_GUIDE.md](./WEBSOCKET_TESTING_GUIDE.md)** - WebSocket 测试指南
- **[WEBSOCKET_UI_INTEGRATION.md](./WEBSOCKET_UI_INTEGRATION.md)** - WebSocket UI 集成
- **[websocket-integration.md](./websocket-integration.md)** - WebSocket 集成
- **[websocket-status.md](./websocket-status.md)** - WebSocket 状态
- **[websocket-implementation-summary.md](./websocket-implementation-summary.md)** - WebSocket 实现总结

### 📊 报告（归档）

以下报告已移至 `archive/` 目录：

- API 优化报告
- 性能测试报告
- 测试覆盖率报告
- 代码清理报告
- 安全审计报告
- 数据库优化报告
- 其他临时性报告

---

## 🎯 推荐阅读顺序

### 新手入门

1. [README.md](./README.md) - 快速了解项目
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - 理解整体架构
3. [QUICKSTART.md](./QUICKSTART.md) - 快速部署
4. [DEVELOPMENT.md](./DEVELOPMENT.md) - 开始开发

### 前端开发

1. [COMPONENTS.md](./COMPONENTS.md) - 了解组件库
2. [HOOKS.md](./HOOKS.md) - 使用自定义 Hooks
3. [LOADING-SYSTEM.md](./LOADING-SYSTEM.md) - 全局加载系统
4. [WEBSOCKET.md](./WEBSOCKET.md) - 实时通信
5. [API.md](./API.md) - API 文档

### 后端开发

1. [API.md](./API.md) - API 概览
2. [API-REFERENCE.md](./API-REFERENCE.md) - API 参考
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构理解
4. [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署配置

### DevOps / 运维

1. [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署配置
2. [MONITORING.md](./MONITORING.md) - 监控系统
3. [SECURITY-AUDIT-REPORT.md](./SECURITY-AUDIT-REPORT.md) - 安全审计
4. [CI-CD-SETUP.md](./CI-CD-SETUP.md) - CI/CD 配置

### AI / 代理开发

1. [DIRECTOR.md](./DIRECTOR.md) - AI 主管系统
2. [SUBAGENTS.md](./SUBAGENTS.md) - 子代理团队
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - A2A Agent Communication

---

## 📂 文档结构

```
docs/
├── README.md                    # 项目介绍和快速开始 ⭐
├── INDEX.md                     # 文档索引（本文档）
├── QUICKSTART.md                # 5 分钟快速部署
├── ARCHITECTURE.md              # 系统架构总览 ⭐
├── API.md                       # API 完整文档 ⭐
├── DEPLOYMENT.md                # 部署指南
├── CHANGELOG.md                 # 版本变更日志
├── ARCHITECTURE_DIAGRAMS.md     # 架构图解
├── ARCHITECTURE_REVIEW.md       # 架构审查
├── microservice-design.md       # 微服务设计
├── mcp-server-architecture.md   # MCP 服务器架构
├── adr/                         # 架构决策记录 ⭐ (v1.4.0 新增)
│   ├── README.md                # ADR 索引和指南
│   ├── 0001-use-zustand-for-state-management.md
│   ├── 0002-use-socket.io-for-websocket.md
│   ├── 0003-use-redis-for-caching.md
│   ├── 0004-use-typescript-strict-mode.md
│   ├── 0005-use-vitest-for-testing.md
│   ├── 0006-agent-scheduler-architecture.md
│   ├── 0007-performance-monitoring-architecture.md
│   ├── 0008-websocket-room-system-design.md
│   └── 0009-react-compiler-adoption-strategy.md
├── API-REFERENCE.md             # API 参考
├── API-ENDPOINTS.md             # API 端点列表
├── REST-API.md                  # REST API 规范
├── COMPONENTS.md                # React 组件库
├── HOOKS.md                     # 自定义 Hooks
├── PAGE-STRUCTURE.md            # 页面结构
├── DESIGN_OPTIMIZATION.md       # 设计优化
├── PERFORMANCE.md               # 性能指标
├── PERFORMANCE_OPTIMIZATION.md  # 性能优化
├── WEBSOCKET.md                 # WebSocket 文档
├── LOADING-SYSTEM.md            # 加载系统
├── GITHUB-INTEGRATION.md        # GitHub 集成
├── GMAIL-INTEGRATION.md         # Gmail 集成
├── TELEGRAM-BOT.md              # Telegram 机器人
├── DIRECTOR.md                  # AI 主管
├── SUBAGENTS.md                 # 子代理团队
├── TEAM-MEETING.md              # 团队会议
├── TESTING.md                   # 测试策略
├── DEVELOPMENT.md               # 开发指南
├── CODE_STYLE.md                # 代码风格
├── ERROR-HANDLING.md            # 错误处理
├── SECURITY-AUDIT-REPORT.md     # 安全审计
├── MONITORING.md                # 监控系统
├── MONITORING_DESIGN.md         # 监控设计
├── MONITORING_SUMMARY.md        # 监控总结
├── OPERATIONS_MANUAL.md         # 运维手册
├── PERMISSIONS.md               # 权限管理
├── RBAC_IMPLEMENTATION.md       # RBAC 实现
├── RBAC_QUICK_REFERENCE.md      # RBAC 快速参考
├── CI-CD-SETUP.md               # CI/CD 配置
├── ENVIRONMENT.md               # 环境配置
├── ENVIRONMENT-VARIABLES.md     # 环境变量文档
├── BACKUP-POLICY.md             # 备份策略
├── I18N.md                      # 国际化指南
├── I18N_ARCHITECTURE.md         # 国际化架构
├── ROADMAP.md                   # 功能路线图
├── feature-roadmap.md           # 功能规划
├── future-roadmap.md            # 未来规划
├── tech-evolution.md            # 技术演进
├── EXAMPLES.md                  # 使用示例
└── archive/                     # 归档报告
    ├── A2A_*.md                 # A2A 协议相关
    └── ...其他归档文档
```

---

## 🆕 最新更新

### v1.3.0 (2026-03-28) ✅ 已发布

#### 核心成就

- **国际化完整实现** - i18n 技术栈完整，支持 7 种语言
- **Server Actions 缓存 API** - updateTag(), refresh(), revalidateTag()
- **国际化 Phase 2 完成** - 日语/韩语/西班牙语 100% 完成
- **middleware.ts → proxy.ts 迁移** - 名称更好地反映实际用途
- **图片优化** - 11 个组件 sizes 属性优化
- **React Compiler 可行性验证** - 可减少 20-40% 不必要的重新渲染

#### 文档更新

- ✅ 更新 README.md - 版本更新到 v1.3.0
- ✅ 更新 CHANGELOG.md - 完整的 v1.3.0 变更日志
- ✅ 创建 V140_PLANNING_20260329.md - v1.4.0 规划文档

### v1.4.0 (2026-03-29) ✅ 已发布 🎉

#### 核心成就

- **🔄 WebSocket 高级功能** - 100% 完成
  - 房间系统 - 多房间支持、公开/私有/仅邀请三种可见性
  - 权限控制 - 5 种角色、16 种权限、RBAC 集成
  - 消息持久化 - 内存存储、离线队列、历史查询

- **🤖 AI Agent 智能调度系统** - 100% 完成
  - 能力模型 - 11 位 Agent 完整能力定义
  - 调度算法 - 多维度评分 (能力 40% + 负载 30% + 性能 20% + 响应 10%)
  - Dashboard UI - AgentStatusPanel、TaskQueueView、ScheduleHistory、ManualOverride

- **📊 性能监控升级** - 60% 完成
  - 异常检测 - Z-score 算法、基准线自动学习、98.91% 测试覆盖率

- **⚡ React Compiler 可选功能** - 100% 完成
  - 环境变量控制 - ENABLE_REACT_COMPILER、REACT_COMPILER_MODE
  - 兼容性检测 - 自动扫描不兼容组件
  - 回滚机制 - 一键禁用、零停机切换

#### 代码统计

- **WebSocket v1.4.0**: 1,906 行实现 + 86 测试 (100% 通过)
- **Agent Scheduler**: 2,952 行核心 + 3,058 行 Dashboard + 122 测试 (100% 覆盖)
- **Performance Monitor**: 271 行 + 76 测试 (98.91% 覆盖)
- **总计**: 5,129 行代码 + 284 测试

#### 相关文档

- **[RELEASE_NOTES_v1.4.0.md](../RELEASE_NOTES_v1.4.0.md)** - 完整发布说明
- **[WHATS_NEW_v1.4.0.md](./WHATS_NEW_v1.4.0.md)** - 功能展示
- **[ADR-0006](./adr/0006-agent-scheduler-architecture.md)** - Agent Scheduler 架构决策
- **[ADR-0007](./adr/0007-performance-monitoring-architecture.md)** - 性能监控架构决策
- **[ADR-0008](./adr/0008-websocket-room-system-design.md)** - WebSocket 房间系统设计
- **[ADR-0009](./adr/0009-react-compiler-adoption-strategy.md)** - React Compiler 采用策略

---

### v1.1.0 (2026-03-22)

#### 新增功能

- **Global Loading System** - 全局加载状态管理系统
- **A2A Agent Communication** - Agent 间通信系统

#### 文档更新

- ✅ 创建/更新 [README.md](./README.md) - 项目介绍和快速开始
- ✅ 创建/更新 [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构总览
- ✅ 创建/更新 [API.md](./API.md) - API 完整文档
- ✅ 创建 [INDEX.md](./INDEX.md) - 文档索引
- ✅ 归档临时性报告文档

---

## 📝 文档维护

- **维护者**: 📚 咨询师 (AI 团队)
- **最后审查**: 2026-04-03
- **下次审查**: 2026-05-03
- **文档版本**: v1.10.0

---

## 🔗 相关链接

- **项目主页**: https://7zi.studio
- **GitHub 仓库**: (待添加)
- **问题反馈**: (待添加)
- **变更日志**: [CHANGELOG.md](../CHANGELOG.md)

---

**快速链接**:

- [返回项目根目录](../README.md)
- [快速开始](./QUICKSTART.md)
- [架构文档](./ARCHITECTURE.md)
- [API 参考](./API.md)
- [开发指南](./DEVELOPMENT.md)


- **[RELEASE_NOTES_v1.4.0.md](../RELEASE_NOTES_v1.4.0.md)** - 完整发布说明
- **[WHATS_NEW_v1.4.0.md](./WHATS_NEW_v1.4.0.md)** - 功能展示
- **[ADR-0006](./adr/0006-agent-scheduler-architecture.md)** - Agent Scheduler 架构决策
- **[ADR-0007](./adr/0007-performance-monitoring-architecture.md)** - 性能监控架构决策
- **[ADR-0008](./adr/0008-websocket-room-system-design.md)** - WebSocket 房间系统设计
- **[ADR-0009](./adr/0009-react-compiler-adoption-strategy.md)** - React Compiler 采用策略

---

### v1.1.0 (2026-03-22)

#### 新增功能

- **Global Loading System** - 全局加载状态管理系统
- **A2A Agent Communication** - Agent 间通信系统

#### 文档更新

- ✅ 创建/更新 [README.md](./README.md) - 项目介绍和快速开始
- ✅ 创建/更新 [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构总览
- ✅ 创建/更新 [API.md](./API.md) - API 完整文档
- ✅ 创建 [INDEX.md](./INDEX.md) - 文档索引
- ✅ 归档临时性报告文档

---

## 📝 文档维护

- **维护者**: 📚 咨询师 (AI 团队)
- **最后审查**: 2026-03-29
- **下次审查**: 2026-04-29
- **文档版本**: v1.3.0

---

## 🔗 相关链接

- **项目主页**: https://7zi.studio
- **GitHub 仓库**: (待添加)
- **问题反馈**: (待添加)
- **变更日志**: [CHANGELOG.md](../CHANGELOG.md)

---

**快速链接**:

- [返回项目根目录](../README.md)
- [快速开始](./QUICKSTART.md)
- [架构文档](./ARCHITECTURE.md)
- [API 参考](./API.md)
- [开发指南](./DEVELOPMENT.md)
