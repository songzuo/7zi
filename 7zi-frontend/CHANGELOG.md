# 更新日志 / Changelog

本文档记录 7zi-frontend 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 计划中
- Multi-Agent 协作框架
- AI 对话式任务创建界面
- 可视化工作流编排器

---

## [1.3.0] - 2026-03-28

### 新增 / Added

#### 国际化 (i18n Phase 2) ✅
- 完整的国际化系统实现 (react-i18next)
- 支持中文 (zh) 和英文 (en) 切换
- 自动语言检测 (Cookie + Accept-Language header)
- 服务端和客户端翻译支持
- 5 个翻译命名空间：common, auth, navigation, errors, dashboard
- 500+ 翻译键
- LanguageSwitcher 组件（3 种显示模式：dropdown, buttons, compact）
- i18n 中间件和配置
- 完整的测试覆盖 (11+ tests)
- 详细文档：`docs/I18N_IMPLEMENTATION.md`

#### 图片优化 ✅
- Next.js Image 优化配置
- 支持 AVIF/WebP 现代格式
- 6 种图片预设尺寸（avatar, thumbnail, card, hero, content, logo）
- OptimizedImage 组件
- BackgroundImage 组件
- ImageGallery 组件
- useImageOptimization Hook
- 图片懒加载
- SVG 占位符和 blur 效果
- LCP 优化（priority 属性）
- 预加载支持
- 性能提升：Performance ~90+, LCP ~1.5s, FID ~50ms
- 详细文档：`docs/IMAGE_OPTIMIZATION_GUIDE.md`

#### 安全加固 ✅
- JWT 认证系统（使用 jose）
- 认证中间件 (`src/middleware/auth.middleware.ts`)
- 原型污染防护
- 完整的安全响应头（CSP, HSTS, X-Frame-Options 等）
- XSS/SQL/NoSQL 注入防护
- 输入验证（Zod）
- 速率限制（Redis + Memory）
- 环境变量配置示例 (`.env.example`)
- 新增受保护 API 端点：
  - `/api/data/import` - 数据导入
  - `/api/feedback` - 反馈
  - `/api/search` - 搜索
- 详细文档：`docs/SECURITY_HARDENING.md`

#### E2E 测试框架 ✅
- Playwright E2E 测试框架配置
- 登录流程测试
- 通知系统测试
- WebSocket 连接测试
- 错误处理测试
- 测试报告生成
- UI 模式和调试模式
- 详细文档：`docs/E2E_TEST_COMPLETION_REPORT.md`

#### 深色模式 ✅
- 完整的深色模式实现
- 主题切换组件
- 自动主题检测（系统偏好）
- 主题持久化
- CSS 变量主题系统
- 设计系统深色模式适配
- 详细文档：`DARK_MODE_IMPLEMENTATION_REPORT.md`

#### 性能监控 ✅
- 实时性能 Dashboard
- Web Vitals 监控（LCP, FID, CLS, FCP, TTFB, TTI）
- 性能历史记录
- 性能评分系统
- 性能优化建议
- WebSocket 实时更新
- 详细文档：`docs/PERFORMANCE_MONITORING_IMPLEMENTATION_SUMMARY.md`

#### 测试性能优化 ✅
- 测试套件性能优化
- 并行测试执行
- Mock 优化
- 测试隔离改进
- 详细文档：`TEST_PERFORMANCE_OPTIMIZATION.md`

#### Three.js 优化 ✅
- Three.js 组件性能优化
- 渲染优化
- 内存管理
- 详细文档：`THREE_JS_OPTIMIZATION.md`

#### TypeScript 类型修复 ✅
- TypeScript 类型系统修复
- 类型错误解决
- 详细文档：`TYPESCRIPT_FIX_REPORT_2026-03-28.md`

### 改进 / Improved

#### 代码优化
- 重构现有组件提升性能
- 优化 Webpack/TurboPack 配置
- 减少包体积
- 优化代码分割

#### 设计系统
- 完成设计系统 v1.0
- 组件库标准化
- 详细文档：`DESIGN_SYSTEM_COMPLETION_REPORT.md`

#### 测试覆盖
- 单元测试覆盖率达到 85%+
- 346+ 测试用例
- 详细文档：`docs/TEST_COVERAGE_SUMMARY.md`

### 修复 / Fixed

- 修复原型污染漏洞防护
- 修复认证流程问题
- 修复 WebSocket 连接稳定性
- 修复通知系统内存泄漏
- 修复深色模式切换闪烁问题
- 修复 TypeScript 类型错误

### 文档 / Documentation

- 新增 `docs/I18N_IMPLEMENTATION.md` - i18n 实现文档
- 新增 `docs/IMAGE_OPTIMIZATION_GUIDE.md` - 图片优化指南
- 新增 `docs/SECURITY_HARDENING.md` - 安全加固文档
- 新增 `docs/E2E_TEST_COMPLETION_REPORT.md` - E2E 测试完成报告
- 新增 `docs/PERFORMANCE_MONITORING_IMPLEMENTATION_SUMMARY.md` - 性能监控实现总结
- 新增 `docs/TEST_COVERAGE_SUMMARY.md` - 测试覆盖总结
- 更新 `docs/TESTING_STRATEGY.md` - 测试策略文档
- 新增 `.env.example` - 环境变量配置示例

### 依赖更新 / Dependencies

- 新增 `i18next`, `react-i18next`, `i18next-browser-languagedetector`
- 新增 `jose` - JWT 处理
- 新增 `@playwright/test` - E2E 测试
- 新增 `next-themes` - 主题管理
- 新增 `date-fns` - 日期处理

### API 变更 / API Changes

#### 新增 API 端点
- `POST /api/data/import` - 数据导入（需要认证）
- `POST /api/feedback` - 提交反馈（需要认证）
- `GET /api/search` - 搜索（需要认证）
- `GET /api/feedback/stats` - 反馈统计
- `GET /api/feedback/response` - 反馈响应
- `GET /api/feedback/export` - 反馈导出
- `GET /api/notifications/preferences/[userId]` - 通知偏好设置
- `GET /api/notifications/stats` - 通知统计
- `GET /api/notifications/socket` - WebSocket 状态
- `GET /api/notifications/enhanced` - 增强通知

#### API 安全增强
- 所有端点支持 JWT 认证
- 添加速率限制
- 添加输入验证

### 性能提升 / Performance Improvements

- LCP 从 ~4s 优化到 ~1.5s (-62%)
- FID 从 ~150ms 优化到 ~50ms (-67%)
- CLS 从 ~0.3 优化到 ~0.05 (-83%)
- TTI 从 ~5s 优化到 ~2s (-60%)
- Performance Score 从 ~60 提升到 ~90+

### 待完成 / TODO

#### v1.3.0 技术债务清理 (优先级：高)

- [ ] Turbopack 生产构建完整迁移（移除 webpack 配置）
  - 移除 `webpack()` 函数中的复杂配置
  - 迁移 9 个 cacheGroups 分包策略
  - 迁移性能预算检查机制
  - 验证 Bundle Analyzer 兼容性
  - 详见：`TURBOPACK_RESEARCH_20260328.md`

- [ ] React Compiler 集成（可选功能）
  - 评估 React Compiler 对现有组件的兼容性
  - 测试编译器自动优化效果
  - 备份现有手动优化方案
  - 详见：`REACT_OPTIMIZATION_SUMMARY.md`

- [ ] 未使用代码清理完成
  - 继续清理废弃的导入和未使用的组件
  - 清理无用的类型定义和接口
  - 清理冗余的工具函数
  - 详见：`CODE_REFACTOR_REPORT_20260328.md`

- [ ] 数据库 N+1 查询优化完成
  - 推广 `/api/users/batch` 优化方案到其他 API
  - 添加数据库索引优化
  - 启用开发环境 N+1 检测器
  - 详见：`NPLUS1_OPTIMIZATION_SUMMARY.md`

- [ ] 测试覆盖率提升至 80%+
  - 补充 `src/stores/` 缺失的单元测试
  - 补充 `src/middleware/` 单元测试
  - 添加 WebSocket 和 A2A 集成测试
  - 补充剩余 54 个组件测试
  - 优化测试执行性能（目标 3min）
  - 详见：`TEST_COVERAGE_IMPROVEMENT_PLAN.md`

- [ ] 移动端响应式问题完全修复
  - 修复所有断点的布局问题
  - 优化触摸交互体验
  - 添加移动端专用组件优化
  - 完成移动端 E2E 测试

#### v1.4.0 及后续计划

- [ ] 实现可视化工作流编排器 (v1.4.0)
- [ ] 实现 Multi-Agent 协作框架 (v1.4.0)
- [ ] 实现 AI 对话式任务创建 (v1.4.0)
- [ ] 实现实时协作功能 (v1.5.0)
- [ ] 实现智能通知路由 (v1.6.0)
- [ ] 添加更多语言支持 (日语、韩语、西班牙语)
- [ ] 实现 2FA（双因素认证）
- [ ] 实现 CSRF 保护
- [ ] 集成 Sentry 错误追踪
- [ ] 配置 CDN 加速

---

## [1.2.0] - 2026-03-22

### 新增 / Added
- MCP (Model Context Protocol) Server 实现
- JSON-RPC 2.0 协议支持
- WebSocket 通信系统
- 通知系统（Toaster, Center, Dashboard）
- Zustand 状态管理集成
- 性能监控 Dashboard

### 改进 / Improved
- 前端架构重构（基于功能）
- 认证系统升级
- 响应式设计优化

---

## [1.1.0] - 2026-03-15

### 新增 / Added
- Next.js 14 App Router 迁移
- 基础 UI 组件库
- 用户认证系统
- 数据导入导出功能

---

## [1.0.0] - 2026-03-01

### 新增 / Added
- 项目初始化
- 基础架构搭建
- 核心功能实现

---

## 版本说明 / Version Notes

### 语义化版本格式
- **主版本号**: 不兼容的 API 变更
- **次版本号**: 向后兼容的功能新增
- **修订号**: 向后兼容的问题修复

### 变更类型
- **新增**: 新功能
- **改进**: 现有功能增强
- **修复**: Bug 修复
- **移除**: 功能删除
- **弃用**: 即将删除的功能
- **安全**: 安全相关修复

---

**最后更新**: 2026-03-28
