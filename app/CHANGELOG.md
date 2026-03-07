# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### 批量操作功能 (2026-03-06)
- **useBatchOperations Hook** - 新增任务批量操作 Hook
  - 支持批量更新状态、优先级
  - 支持批量分配/取消分配任务
  - 支持批量删除任务
  - 支持批量添加/移除标签
  - 支持批量设置截止日期
  - 提供统一的操作结果和错误处理
  - 文件：`hooks/useBatchOperations.ts`

#### 路由 Layout 优化 (2026-03-06)
- **Charts Layout** - 数据可视化页面 layout
  - SEO 元数据：title、description、keywords
  - Open Graph 和 Twitter Card 支持
  - 文件：`app/charts/layout.tsx`

- **Profile Layout** - 个人资料页面 layout
  - 完整的 SEO 元数据配置
  - 文件：`app/profile/layout.tsx`

- **Tasks Layout** - 任务列表页面 layout
  - GitHub 集成相关的 SEO 描述
  - 文件：`app/tasks/layout.tsx`

- **Settings Layout** - 设置页面 layout
  - 个性化配置相关的元数据
  - 文件：`app/settings/layout.tsx`

#### API 缓存功能 (2026-03-06)
- **Cache Middleware** - API 缓存中间件
  - 内存缓存存储
  - ETag 支持（304 Not Modified 响应）
  - Stale-While-Revalidate 模式
  - 缓存键变体（Vary headers）
  - 自动清理过期缓存
  - 文件：`lib/api/cache.ts`

- **Cache Test Suite** - 缓存功能测试
  - 缓存读写测试
  - ETag 生成测试
  - 过期缓存清理测试
  - 文件：`lib/api/cache.test.ts`

#### 其他 API 工具 (2026-03-06)
- **Rate Limit** - 请求限流工具
  - 文件：`lib/api/rate-limit.ts`
  - 测试：`lib/api/rate-limit.test.ts`

- **Response Helpers** - API 响应辅助函数
  - 文件：`lib/api/response.ts`
  - 测试：`lib/api/response.test.ts`

- **Validation** - 请求数据验证
  - 文件：`lib/api/validation.ts`
  - 测试：`lib/api/validation.test.ts`

- **API Index** - 统一导出入口
  - 文件：`lib/api/index.ts`

### Changed
- 更新 README.md，添加批量操作、Layout 文件、缓存功能说明

## [1.0.0] - 2026-03-06

### Added
- 初始版本发布
- AI 团队实时看板功能
- 11 位 AI 成员状态展示
- GitHub Issues 集成
- 实时活动日志
- 统计面板
- 基础组件库（MemberCard、TaskBoard、ActivityLog、LoadingSpinner）
- useDashboardData Hook
- Tailwind CSS 样式系统
- Next.js 14 App Router 架构

---

## 版本说明

- **[Unreleased]** - 开发中的功能，将在下次发布
- **[1.0.0]** - 初始稳定版本

## 变更类型

- `Added` - 新增功能
- `Changed` - 功能变更
- `Deprecated` - 即将废弃的功能
- `Removed` - 已移除的功能
- `Fixed` - Bug 修复
- `Security` - 安全相关更新