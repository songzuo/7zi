# 变更日志 (Changelog)

> 7zi 项目所有重要变更记录

**项目**: 7zi - AI 驱动的团队管理平台  
**仓库**: https://github.com/songzuo/7zi  
**格式**: 基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)

---

## [未发布]

### Added
- Portfolio 项目展示模块
  - 项目卡片组件
  - 分类过滤功能
  - SEO 优化的详情页
- Tasks AI 智能分配系统
  - AI 驱动的任务分配算法
  - 任务优先级管理
  - 工作负载均衡
- 实时 Dashboard 任务追踪功能

### Changed
- **UserSettingsPage 重构**: 713 行 → 160 行 (精简 77.6%)
- Dashboard 组件拆分与性能优化
- AboutContent 代码结构优化
- 依赖升级:
  - ESLint v9 → v10
  - web-vitals v4 → v5
  - @types/node v24 → v25

### Fixed
- 修复 ClientProviders 和 layout 问题
- 修复 i18n locale layout 嵌套 HTML 问题
- 实现 i18n 隐式重定向，解决 /zh 页面混乱问题
- 修复所有测试失败

### Documentation
- 完善 API 参考文档 (docs/API_REFERENCE.md)
- 更新 README.md 技术栈版本
- 更新 FEATURES.md 新功能文档
- 整理项目文档结构和命名规范

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

*最后更新：2026-03-08*
