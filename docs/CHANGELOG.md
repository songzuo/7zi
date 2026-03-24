# 7zi 项目版本变更日志

本文档记录 7zi 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.1.0] - 2026-03-23

### 🎉 版本亮点

v1.1.0 版本带来了重大性能和协作功能提升，包括 WebSocket 实时协作、Redis 客户端集成、Next.js 代码分割优化和完整的性能监控系统。同时修复了内存泄漏问题，改进了类型安全，并增强了测试覆盖率。

### ✨ 新功能

#### 🔄 WebSocket Real-Time Collaboration
- **完整的实时协作演示页面** - 支持多用户交互
- **WebSocket 服务器集成** - Socket.IO 实时通信
- **实时 Dashboard** - 实时数据更新
- **缓存队列实现** - 高效数据同步

#### ⚡ Redis Client Integration
- **生产级 Redis 客户端** - 支持连接池和自动重连
- **LRU 内存缓存** - 高性能缓存，支持 TTL 和统计追踪
- **错误处理和优雅降级** - Redis 不可用时自动降级
- **性能监控和日志记录** - 完整的监控支持

#### 📦 Next.js Code Splitting
- **动态导入** - 减少 bundle 大小
- **懒加载** - 非关键组件按需加载
- **XLSX 库动态导入** - 优化主包体积
- **browserslist 配置** - 减少 polyfills
- **splitChunks 优化** - 合并小块，减少碎片

#### 📊 Performance Monitoring System
- **实时性能指标收集** - 全面监控应用性能
- **E2E 性能监控测试** - 端到端性能验证
- **性能分析 Dashboard** - 可视化性能数据
- **性能退化告警** - 自动检测性能问题
- **历史性能数据追踪** - 长期性能趋势分析

### 🔧 改进与优化

#### 🧹 内存管理
- ✅ 修复组件文件中的内存泄漏
- ✅ 清理未使用的组件和依赖
- ✅ 优化组件生命周期管理
- ✅ 改进垃圾回收效率

#### 🔧 类型安全
- ✅ 解决测试文件中的 vi.mock 类型错误
- ✅ 修复 TypeScript 类型问题
- ✅ 改进跨代码库的类型推断
- ✅ 替换 require() 为 import 语句

#### 📈 性能提升
- ✅ 减少 30-60% 的不必要重渲染
- ✅ 优化主 bundle 大小
- ✅ 改进初始页面加载时间
- ✅ 提升缓存命中率

### 🐛 Bug 修复
- 修复构建错误相关的代码分割问题
- 解决 XLSX 库的导入/导出问题
- 修复 settings/error 组件的类型错误
- 更正 web-vitals 废弃（移除 onFID）
- 修复 React 19 组件兼容性问题

### 🧪 测试
- WebSocket 连接测试
- 性能监控测试套件
- 缓存集成测试
- 类型安全验证测试
- 持续提升测试覆盖率

### 📚 文档
- `REDIS_CLIENT.md` - Redis 客户端完整文档
- 更新 `CACHE_CONFIG.md` - 缓存配置说明
- 更新 `CHANGELOG.md` - 版本变更日志
- 更新 `README.md` - 项目介绍和快速开始
- 统一文档格式，改进代码示例

### 🛠️ 维护
- 更新 `.gitignore` - 排除临时和部署文件
- 移除实时 dashboard 示例 - 简化部署
- 清理缓存通知处理器 - 优化代码
- 优化 Docker 构建配置 - 多阶段构建
- 更新依赖 - Node 版本升级

---

## [1.1.0] - 2026-03-24 (Documentation Update)

### 📚 文档更新

本次更新重点完善了项目文档，确保文档与 v1.1.0 版本功能同步，提供更清晰、更完整的技术文档。

#### 更新的文档

- **README.md**
  - ✅ 更新版本号至 v1.1.0
  - ✅ 添加 v1.1.0 核心亮点说明
  - ✅ 更新最新进展章节，包含 WebSocket 实时协作、Redis 客户端、代码分割等功能
  - ✅ 添加 v1.0.9 回顾内容
  - ✅ 更新性能提升总结表格（测试覆盖率、TTFB、API 响应等）
  - ✅ 添加主题系统特性详细说明

- **docs/API.md**
  - ✅ 更新最后更新日期为 2026-03-24
  - ✅ 更新版本号至 v1.1.0
  - ✅ 更新 API 端点总数（79+）
  - ✅ 重组文档目录结构，新增 10 个分类章节
  - ✅ 添加 API 概览和分类统计

- **docs/ARCHITECTURE.md**
  - ✅ 更新 Next.js 版本至 16.2.1
  - ✅ 更新架构描述，添加实时协作系统
  - ✅ 扩展架构概览，包含完整的页面列表
  - ✅ 更新 API 层描述（79+ 端点）

- **docs/DEPLOYMENT.md**
  - ✅ 添加版本信息（v1.1.0, 2026-03-24）
  - ✅ 更新 Next.js 版本至 16.2.1
  - ✅ 更新 React 版本至 19.2.4
  - ✅ 添加部署文件结构说明
  - ✅ 添加生产环境变量配置说明

- **docs/INDEX.md**
  - ✅ 更新最后更新日期为 2026-03-24
  - ✅ 更新版本号至 v1.1.0
  - ✅ 添加 v1.1.0 和 v1.0.9 发布说明链接
  - ✅ 新增 REDIS_CLIENT.md 文档链接

### 📊 文档统计

| 文档 | 修改行数 | 主要变更 |
|------|---------|---------|
| README.md | 200+ | 版本更新、功能亮点、性能数据 |
| docs/API.md | 262+ | API 目录重组、端点统计 |
| docs/ARCHITECTURE.md | 50+ | 架构更新、版本同步 |
| docs/DEPLOYMENT.md | 30+ | 部署文档完善 |
| docs/INDEX.md | 10+ | 文档索引更新 |

### 🎯 更新目标

- ✅ 确保所有文档与 v1.1.0 版本功能同步
- ✅ 提供清晰的 API 端点分类和统计
- ✅ 完善部署和配置说明
- ✅ 提升文档可读性和完整性

---

## [1.0.9] - 2026-03-23

### 🎉 版本亮点

本次版本实现了基于 Redis 的完整 API 限流系统，支持滑动窗口和 Token Bucket 算法。提供精确控制、突发流量处理和完整的监控能力。此外，本版本包含 React 19 兼容性重大改进、数据库性能显著优化（提升 85-90%）以及测试覆盖率提升（67% → 72-75%）。

### ✨ 新功能

#### 🚀 Redis API 限流系统

- **滑动窗口算法** - 使用 Redis 有序集合实现精确时间窗口控制
- **Token Bucket 算法** - 支持突发流量平滑处理
- **混合算法** - 结合两种算法实现最优控制
- **限流中间件** - 简单易用的 Next.js API 路由中间件
- **预配置规则** - 默认限流规则覆盖所有主要 API 端点
- **标准响应头** - 所有响应包含 X-RateLimit-* 标准限流头
- **事件日志** - 完整的限流事件跟踪和分析
- **Redis 客户端管理** - 自动连接处理，支持回退到内存限流

#### 🔄 React 19 完整兼容

- 更新所有组件以兼容 React 19
- 迁移到新的 React 19 API 和 Hooks
- 修复并发渲染问题
- 优化过渡支持以实现更流畅的 UI 更新
- 解决 React 19 特定的类型错误
- 更新 Suspense 边界以支持 React 19 流式 SSR

### 📦 新增模块

- **`src/lib/redis/client.ts`** - Redis 客户端配置和连接管理
- **`src/lib/rate-limit/index.ts`** - 主限流中间件和默认规则
- **`src/lib/rate-limit/sliding-window.ts`** - 滑动窗口算法实现
- **`src/lib/rate-limit/token-bucket.ts`** - Token Bucket 算法实现
- **`src/lib/rate-limit/event-logger.ts`** - 事件日志和统计

### 🔧 配置

#### Redis 连接支持
- `REDIS_URL` - 完整的 Redis 连接字符串
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` - 独立配置选项
- `ENABLE_REDIS_RATE_LIMIT` - 启用/禁用 Redis 限流

#### 默认限流规则

| 端点 | 限制 | 算法 | 突发容量 |
|------|------|------|----------|
| `/api/health/*` | 100 请求/60秒 | sliding-window | - |
| `/api/auth/login` | 10 请求/60秒 | token-bucket | 15 |
| `/api/auth/register` | 5 请求/60秒 | token-bucket | 8 |
| `/api/auth/logout` | 20 请求/60秒 | sliding-window | - |
| `/api/auth/refresh` | 30 请求/60秒 | sliding-window | - |
| `/api/auth/me` | 60 请求/60秒 | sliding-window | - |
| `/api/tasks` | 50 请求/60秒 | sliding-window | - |
| `/api/projects` | 50 请求/60秒 | sliding-window | - |

### ⚡ 性能改进

#### 数据库查询优化 - 85-90% 性能提升

- 实现查询结果缓存 - 为频繁访问的数据添加缓存
- 添加 N+1 查询检测和预防 - 自动识别并修复 N+1 查询
- 优化索引 - 为常见查询模式优化索引
- 添加慢查询日志 - 添加性能监控日志
- 创建数据库性能分析器 - 创建专业的性能分析工具
- 实现连接池优化 - 改进连接池管理以提升资源利用率

#### React 性能优化

- 为关键组件添加 React.memo 以减少不必要的重渲染
- 优化组件依赖数组
- 改进大型数据列表和仪表板的性能
- 为大型数据集实现虚拟滚动
- 优化 Hooks：`useDashboardData`, `useBatchSelection`, `useGitHubData`
- 减少 30-60% 不必要的重渲染

#### 测试覆盖率提升 - 67% → 72-75%

- 添加 feedback 模块单元测试
- 添加 query-optimizations 模块单元测试
- 关键业务逻辑综合测试覆盖
- 改进 A2A JSON-RPC 集成测试
- 修复 100+ 测试用例以通过

### 🐛 Bug 修复

#### React 19 兼容性修复

- 解决 React 19 特定的类型错误
- 修复并发渲染问题
- 更新 Suspense 边界以支持 React 19 流式 SSR
- 从废弃的 React API 迁移到新的 React 19 API

#### 数据库性能修复

- 解决连接池耗尽问题
- 修复慢查询性能瓶颈
- 优化事务处理以提升吞吐量

#### 测试套件改进

- 修复与 React 19 更新相关的测试失败
- 解决异步测试中的竞态条件
- 提高测试可靠性和一致性

### 📚 文档

- **`API_RATE_LIMIT_IMPLEMENTATION_REPORT.md`** - 完整实现指南，包含架构详情
- **`API_RATE_LIMIT_QUICKSTART.md`** - 快速入门指南
- **`API_RATE_LIMIT_README.md`** - 综合配置和使用指南
- **`RELEASE_NOTES_v1.0.9.md`** - v1.0.9 发布说明

### 💡 使用示例

```typescript
// 基本用法（使用默认配置）
import { withRateLimit } from '@/lib/rate-limit';

export const GET = withRateLimit(async (req: NextRequest) => {
  return NextResponse.json({ data: 'Hello World' });
});

// 自定义配置
export const POST = withRateLimit(
  handler,
  {
    algorithm: 'token-bucket',
    limit: 10,
    window: 60,
    burstCapacity: 20,
    refillRate: 0.167,
  }
);

// 基于用户的限流
export const GET = withRateLimit(
  handler,
  { identifier: getUserIdFromRequest(req) }
);
```

### 📊 响应头

所有 API 响应包含限流信息：

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2026-03-23T12:00:00.000Z
X-RateLimit-Algorithm: sliding-window
Retry-After: 30  # 当被限流时
```

### 🛡️ 安全与可靠性

- **自动回退** - 当 Redis 不可用时回退到内存限流
- **优雅降级** - 在 Redis 连接问题期间继续运行
- **连接池** - 高效的 Redis 连接管理
- **自动重连** - 使用重试逻辑处理连接失败
- **事件过期** - 自动清理旧的限流数据

### 📈 监控

- **限流事件** - 所有限流事件记录到 Redis（7 天保留）
- **统计 API** - 按路径、算法和 IP 获取限流统计
- **违规者列表** - 识别违规最多的 IP
- **实时状态** - 查询任何端点的当前限流状态

---

## [1.0.8] - 2026-03-22

### 🎉 版本亮点

本版本专注于 TypeScript 类型安全改进、性能优化和代码质量增强。解决了关键构建错误，改进了测试覆盖率，增强了 RBAC 系统。通过动态导入实现显著缩减包大小，并进行了全面的代码清理。

### ✨ 新功能

- **🔐 RBAC 权限控制系统（增强版）**
  - 完整实现基于角色的访问控制 API 端点
  - 增强的权限验证中间件
  - 用户-角色映射和细粒度权限
  - 权限管理的综合 API 文档

- **📊 性能报告 API**
  - 新增性能报告端点
  - 增强的指标收集和聚合
  - 实时性能监控能力
  - 历史性能数据跟踪

- **🧪 扩展测试覆盖**
  - 添加 feedback 模块单元测试
  - 添加 query-optimizations 模块单元测试
  - 关键业务逻辑模块综合测试覆盖
  - 改进 A2A JSON-RPC 集成测试

### 🐛 Bug 修复

- **Web Vitals onFID 废弃**
  - 移除废弃的 `onFID`（首次输入延迟）指标
  - 修复与 web-vitals API 相关的语法错误
  - 更新为使用 INP（Interaction to Next Paint）

- **TypeScript 构建错误**
  - 将 TypeScript 错误从 588 减少到 0（完整类型安全）
  - 解决 MSW（Mock Service Worker）TypeScript 类型错误
  - 修复 AuditLog 类型错误和相关类型问题
  - 修复 A2A JSON-RPC 集成测试中的 ApiResponse 类型不匹配
  - 解决 performance-api.test.ts 类型转换问题

- **控制台输出清理**
  - 将控制台输出限制为仅开发环境
  - 从生产构建中移除调试语句

### ⚡ 性能改进

- **代码分割优化**
  - 为基于路由的代码分割实现动态导入
  - 优化包大小以加快初始页面加载
  - 显著减少主包大小

- **WebSocket 改进**
  - 增强 Socket.IO 连接稳定性和性能
  - 添加连接池管理以提高可扩展性
  - 改进实时消息传递可靠性
  - 使用指数退避优化重连逻辑

- **React 19 兼容性**
  - 更新组件以兼容 React 19
  - 迁移到新的 React 19 API 和 Hooks
  - 修复并发渲染问题
  - 优化过渡支持以实现更流畅的 UI 更新

- **状态管理（Zustand）集成**
  - 集成 Zustand 进行集中状态管理
  - 为仪表板、通知和用户偏好创建优化的存储
  - 实现 Zustand 中间件用于持久化和日志记录
  - 从基于 Context 的状态迁移到 Zustand 以提高性能

- **数据库查询优化**
  - 为频繁访问的数据添加查询结果缓存
  - 实现 N+1 查询检测和预防
  - 为常见查询模式优化索引
  - 添加慢查询日志以进行性能监控

- **API 限流实现**
  - 为 API 端点实现全面的限流
  - 添加滑动窗口算法进行精确速率控制
  - 创建可配置阈值的限流中间件
  - 为客户端感知添加限流头

- **包大小优化**
  - 将 XLSX 库更改为动态导入
  - 显著减少主包大小
  - 改进初始页面加载时间

- **React 渲染优化**
  - 为关键组件添加 React.memo 以减少不必要的重渲染
  - 优化组件依赖数组
  - 改进大型数据列表和仪表板的性能

- **代码组织**
  - 从 lib 目录移除重复导出
  - 改进代码组织和模块化
  - 增强代码可维护性

### 📚 文档

- **更新的文档和注释**
  - 增强内联代码文档
  - 为新端点更新 API 文档
  - 改进 README 和快速入门指南

### 🔧 代码质量

- **类型安全改进**
  - 移除未使用的 `@ts-expect-error` 指令
  - 修复整个代码库中的类型错误
  - 增强类型定义以改进类型推断
  - 改进泛型类型使用

- **错误处理**
  - 增强多个模块的错误处理
  - 改进错误消息和日志记录
  - 更好的错误恢复机制

### 🧪 测试

- **测试套件增强**
  - 修复 100+ 测试用例通过
  - 增强 A2A JSON-RPC 集成测试
  - 改进 feedback 和 query-optimizations 模块的测试覆盖
  - 为关键业务逻辑添加综合单元测试

### 📦 依赖

- **更新的依赖**
  - MSW (Mock Service Worker) - 带有类型修复的最新版本
  - Web Vitals - 更新到最新 API 标准
  - XLSX - 移至动态导入以提高性能

### 🐳 Docker 优化

- **多阶段 Docker 构建**
  - 使用多阶段构建优化 Docker 镜像
  - 减少 40% 的最终镜像大小
  - 分离构建和运行时依赖

- **Docker Compose 配置**
  - 使用服务依赖增强 docker-compose.yml
  - 为所有服务添加健康检查
  - 为开发和生产优化卷挂载

- **容器资源限制**
  - 为 CPU 和内存添加资源限制
  - 为可靠性实现容器重启策略
  - 优化容器启动时间

- **构建缓存优化**
  - 为更快重建实现层缓存
  - 为增量构建优化 Dockerfile
  - 减少 50% 的构建时间

### 🔄 迁移说明

如果从 v1.0.6 升级：

1. 更新依赖：`npm install`
2. 运行测试确保兼容：`npm test`
3. 检查任何 TypeScript 错误：`npm run type-check`
4. 如果有自定义角色，请审查 RBAC 权限更改
5. 清除浏览器缓存以获得最佳性能

### ⚠️ 破坏性变更

无 - 本版本保持与 v1.0.6 完全向后兼容。

---

## [1.0.6] - 2026-03-21

### 🎉 版本亮点

本版本专注于代码质量改进、测试覆盖扩展、全面的 API 文档更新以及主要功能添加，包括实时通知系统和 RBAC 权限控制。增强了整个代码库的类型安全。

### ✨ 新功能

- **🔔 实时通知系统**
  - 使用 Socket.IO 的全面基于 WebSocket 的通知系统
  - SQLite 持久化存储，支持已读/未读跟踪
  - 通过 Resend API 进行邮件通知集成
  - 用户可自定义偏好（邮件/推送阈值、静默时段）
  - 多种通知类型：info、success、warning、error、task_assigned、task_completed、system
  - 四个优先级级别：low、medium、high、urgent
  - 通知统计和交付日志
  - NotificationProvider、NotificationCenter、NotificationToast 组件
  - useNotifications React Hook 以便轻松集成

- **👥 RBAC 权限控制系统**
  - 基于角色的访问控制实现
  - 权限管理的全面 API 端点
  - 角色分配和权限检查
  - 用户-角色映射和细粒度权限
  - 权限验证中间件

- **🧪 综合测试覆盖**
  - 添加 490+ 测试文件，涵盖关键业务逻辑
  - 扩展核心库模块的单元测试
  - 增强集成测试的 API 路由
  - 为实用函数和 Hooks 添加测试覆盖

- **🔒 类型安全改进**
  - 用适当的 TypeScript 类型替换所有 `any` 类型
  - 增强类型定义的 API 响应
  - 改进组件 props 的类型推断
  - 在开发模式下添加严格类型检查

### 🐛 Bug 修复

- **数据库健康检查** - 修复生产环境中的健康端点失败
- **控制台清理** - 从生产代码中移除调试控制台语句
- **导入优化** - 修复未使用的导入和循环依赖
- **构建优化** - 解决编译警告并减少包大小

### ⚡ 性能改进

- **React 优化**
  - 为 ContactForm 中的事件处理程序实现 `useCallback`
  - 为 SEO 组件中的昂贵计算添加 `useMemo`
  - 使用适当的依赖数组优化 HealthDashboard 渲染
  - 减少 30-40% 的不必要重渲染

- **API 性能**
  - 增强数据库查询优化
  - 改进频繁访问数据的缓存策略
  - 为大型数据集优化响应序列化

### 📚 文档

- **API 文档完整**
  - 使用所有 28+ API 端点更新 API.md
  - 添加示例的综合端点文档
  - 包含错误响应文档
  - 添加身份验证和限流信息

- **架构文档**
  - 更新系统概览增强 ARCHITECTURE.md
  - 添加 WebSocket 实时通信架构
  - 更新 v1.0.6 的部署文档
  - 添加组件使用指南

- **测试文档**
  - 创建综合测试指南
  - 添加 E2E 测试文档
  - 更新测试覆盖报告

### 🔒 安全增强

- **内容安全策略**
  - 实现全面的 CSP 头
  - 添加 CSP 违规报告端点
  - 增强 XSS 保护措施
  - 为内联脚本添加 script nonce 支持

- **安全审计修复**
  - 解决已识别的安全漏洞
  - 增强 API 路由的输入验证
  - 改进错误消息清理
  - 为生产添加安全头

### 🔧 CI/CD 改进

- **自动化测试**
  - 增强测试覆盖报告
  - 添加自动 lint 和类型检查
  - 改进 PR 验证工作流
  - 添加性能回归检测

- **依赖更新**
  - 更新 `@types/socket.io` 到 3.0.2
  - 升级 `msw` 到 2.12.14
  - 更新 ESLint 和相关开发依赖
  - Next.js 依赖组更新（11 个包）

### 📦 依赖

- **更新的依赖**
  - Next.js 16.2.1（最新）
  - React 19.2.4
  - TypeScript 5.0
  - Tailwind CSS 4
  - Socket.IO 4.8.3
  - Better-sqlite3 11.10.0

### 🔥 破坏性变更

无 - 本版本保持与 v1.0.5 完全向后兼容。

### ⚠️ 弃用

本版本中无弃用项。

---

## 历史版本

完整变更历史请参见 [CHANGELOG.md](../CHANGELOG.md)。
