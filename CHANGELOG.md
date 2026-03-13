# 变更日志 (Changelog)

> 7zi 项目所有重要变更记录

**项目**: 7zi - AI 驱动的团队管理平台  
**仓库**: https://github.com/songzuo/7zi  
**格式**: 基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)

---

## [0.2.1] - 2026-03-13

### Added
- **Portfolio 模块完整上线**
  - 项目卡片组件 (ProjectCard)
  - 分类过滤功能 (CategoryFilter)
  - SEO 优化的详情页
  - 6 个示例项目展示
  - 完整 CRUD API 支持

- **Tasks AI 任务管理系统**
  - AI 驱动的智能任务分配算法
  - 任务优先级管理
  - 工作负载均衡
  - 任务详情页面
  - `/api/tasks/:id/assign` AI 分配端点

- **Knowledge API 完整实现**
  - `/api/knowledge/nodes` - 知识节点 CRUD
  - `/api/knowledge/edges` - 知识边关系管理
  - `/api/knowledge/query` - 知识查询
  - `/api/knowledge/inference` - 知识推理
  - `/api/knowledge/lattice` - 知识晶格展示

- **Health API 标准化**
  - `/api/health` - 基础健康检查
  - `/api/health/ready` - 就绪状态检查
  - `/api/health/live` - 存活状态检查
  - `/api/health/detailed` - 详细健康报告

### Changed
- **代码质量改进**
  - Console 清理：移除开发环境的 console.log/warn/error 调用
  - 测试增强：新增更多组件单元测试
  - ESLint 配置优化：降级到 v9.39.4 解决兼容性问题
  - 类型安全改进：`any` 类型使用减少到 4 处

### Fixed
- 修复 ESLint v10 兼容性问题（降级到 v9.39.4）
- 修复 Settings Page 回归问题（重新优化组件结构）
- 修复大型组件（knowledge-lattice, tasks/[id], contact 拆分优化）

### Documentation
- 更新 README.md 与最新功能同步
- 更新 TECH_DEBT.md 状态
- 新增 docs/KNOWLEDGE_LATTICE.md 文档

---

## [Unreleased]

### Added
- **认证系统 API 完整实现**
  - `POST /api/auth/login` - 用户登录（JWT + Cookie）
  - `POST /api/auth/logout` - 用户登出（清除 Cookie）
  - `POST /api/auth/refresh` - 令牌刷新机制
  - `GET /api/auth/me` - 获取当前用户信息
  - `GET /api/auth?action=csrf` - CSRF Token 获取
  - `GET /api/auth?action=check-secret` - JWT Secret 强度检查

- **Projects API 完整 CRUD**
  - `GET /api/projects` - 获取项目列表（支持 status/priority/assignee 过滤）
  - `POST /api/projects` - 创建项目（需认证）
  - `GET /api/projects/:id` - 获取项目详情
  - `PUT /api/projects/:id` - 更新项目（需认证）
  - `DELETE /api/projects/:id` - 删除项目（需管理员权限）

- **日志系统增强**
  - `GET /api/logs/export` - 日志导出（支持 JSON/CSV 格式）

- **安全增强**
  - JWT + CSRF Token 双重认证机制
  - 基于角色的权限控制 (RBAC)
  - 安全中间件验证

---

## [0.2.0] - 2026-03-08

### Added
- **Portfolio 项目展示模块**
  - 项目卡片组件
  - 分类过滤功能
  - SEO 优化的详情页
  - 6 个示例项目（AI 分析仪表板、移动电商平台、区块链供应链等）
- **Tasks AI 智能分配系统**
  - AI 驱动的任务分配算法
  - 任务优先级管理
  - 工作负载均衡
  - 任务详情页面
- **Knowledge Lattice 知识图谱系统**
  - `/api/knowledge/*` 完整 API 端点
  - 知识节点和边管理
  - 推理查询功能
  - 可视化展示页面 `/knowledge-lattice`
- **实时 Dashboard 任务追踪功能**
  - 任务状态实时更新
  - 团队工作量可视化
  - 图表数据展示
- **PWA 支持**
  - Service Worker 注册
  - 离线缓存策略
  - 安装提示组件
- **监控系统**
  - Prometheus 指标收集
  - 告警规则配置
  - 错误追踪和日志记录
- **测试覆盖扩展**
  - 组件单元测试
  - E2E 关键路径测试
  - 用户流程测试

### Changed
- **UserSettingsPage 重构**: 713 行 → 160 行 (精简 77.6%)
  - 拆分为独立子组件（AccountSettings, GeneralSettings 等）
  - 提取自定义 hooks
  - 改进类型定义和验证逻辑
- **Dashboard 组件拆分与性能优化**: 466 行 → ~100 行 (精简 78%)
  - 使用 Zustand 状态管理
  - 懒加载优化
  - 数据缓存策略
- **AboutContent 代码结构优化**: 584 行 → ~150 行 (精简 74%)
- **首页重构**
  - 添加 Hero 区域
  - 优化服务展示
  - 改进呼叫行动按钮
- **依赖升级**:
  - ESLint v9 → v10.0.3
  - web-vitals v4 → v5.1.0
  - @types/node v20 → v25.3.5
  - @sentry/nextjs → 移除 (替换为自定义错误系统)
  - Playwright v1.58.2
  - Vitest v4.0.18
- **Docker 配置优化**
  - 多阶段构建
  - Nginx 配置优化
  - 生产环境变量管理

### Fixed
- 修复 ClientProviders 和 layout 问题
- 修复 i18n locale layout 嵌套 HTML 问题
- 实现 i18n 隐式重定向，解决 /zh 页面混乱问题
- 修复所有测试失败
- 修复 TypeScript 类型检查错误
- 修复 ESLint 代码规范问题

### Removed
- 移除 @sentry/nextjs 依赖（替换为自定义错误处理系统）
- 清理测试产物和临时文件

### Documentation
- 完善 API 参考文档 (docs/API_REFERENCE.md)
- 更新 README.md 技术栈版本
- 更新 FEATURES.md 新功能文档
- 整理项目文档结构和命名规范
- 新增文档:
  - docs/USER_GUIDE.md - 用户使用指南
  - docs/TESTING_GUIDE.md - 测试指南
  - docs/COMPONENTS.md - 组件文档
  - docs/DEPLOYMENT.md - 部署指南
  - docs/DOCUMENTATION_GUIDE.md - 文档维护指南
  - docs/KNOWLEDGE_LATTICE.md - 知识图谱文档
  - docs/AGENT_COLLABORATION_FRAMEWORK.md - AI 团队协作框架
  - MONITORING_QUICKSTART.md - 监控快速入门
  - SECURITY_AUDIT_REPORT.md - 安全审计报告
  - MEMORY.md - 长期记忆与项目概览
  - TOOLS.md - API 配置与开发指南

---

## [0.1.0] - 2026-03-08

### Added
- **11 位 AI 团队成员系统**
  - 智能体世界专家 (MiniMax)
  - 咨询师 (MiniMax)
  - 架构师 (Self-Claude)
  - Executor (Volcengine)
  - 系统管理员 (Bailian)
  - 测试员 (MiniMax)
  - 设计师 (Self-Claude)
  - 推广专员 (Volcengine)
  - 销售客服 (Bailian)
  - 财务 (MiniMax)
  - 媒体 (Self-Claude)

- **核心功能模块**
  - 任务管理系统 (`/tasks`)
  - Portfolio 项目展示 (`/portfolio`)
  - 实时 Dashboard (`/dashboard`)
  - 博客系统 (`/blog`)
  - 关于页面 (`/about`)
  - 联系表单 (`/contact`)
  - 设置页面 (`/settings`)

- **API 系统**
  - `/api/tasks` - 任务管理 API (GET, POST, PUT)
  - `/api/tasks/:id` - 单个任务操作
  - `/api/tasks/:id/assign` - AI 智能分配
  - `/api/logs` - 日志系统 API
  - `/api/status` - 系统状态 API
  - `/api/health` - 健康检查 API
  - `/api/knowledge/*` - 知识图谱 API

- **技术基础设施**
  - Next.js 16 + React 19 + TypeScript 5
  - Tailwind CSS 4 原子化 CSS
  - Zustand 状态管理
  - Vitest 4 单元测试
  - Playwright 1.58 E2E 测试
  - Docker 容器化部署
  - 完整的 CI/CD 流程

- **监控系统**
  - Prometheus 指标收集
  - 告警规则配置
  - 运维手册文档

- **国际化支持**
  - 中英文双语支持
  - i18n 隐式重定向
  - locale layout 优化

### Changed
- 组件代码重构优化
- 测试覆盖率提升
- 文档结构规范化

### Fixed
- 所有测试用例通过
- TypeScript 类型检查通过
- ESLint 代码规范检查通过

### Documentation
- README.md - 项目介绍与快速开始
- ARCHITECTURE.md - 技术架构说明
- DOCS_INDEX.md - 完整文档索引
- docs/API_REFERENCE.md - API 参考文档
- docs/USER_GUIDE.md - 用户使用指南
- docs/TESTING_GUIDE.md - 测试指南
- docs/COMPONENTS.md - 组件文档
- docs/DEPLOYMENT.md - 部署指南
- docs/DOCUMENTATION_GUIDE.md - 文档维护指南

---

## [0.0.1] - 2026-03-01

### Added
- 项目初始化
- 基础架构搭建
- 开发环境配置

---

## 版本说明

### 版本号规则

遵循语义化版本 (Semantic Versioning) `MAJOR.MINOR.PATCH`:

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的功能新增
- **PATCH**: 向后兼容的问题修复

### 发布周期

- **Patch 版本**: 每周 (bug 修复)
- **Minor 版本**: 每月 (新功能)
- **Major 版本**: 按需 (重大变更)

### 发布流程

1. 代码冻结与测试
2. 文档更新
3. 版本号更新
4. 变更日志编写
5. Git 标签发布
6. 生产环境部署

---

## 贡献者

感谢所有为 7zi 项目做出贡献的开发者！

- 🧑 宋琢 (项目发起人)
- 🤖 11 位 AI 团队成员

---

*最后更新：2026-03-13*
