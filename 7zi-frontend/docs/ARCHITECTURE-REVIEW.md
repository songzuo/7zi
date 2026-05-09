# 7zi-Frontend 架构评估报告

**版本**: v1.14.x  
**评估日期**: 2026-05-08  
**评估者**: 🏗️ 架构师

---

## 1. Next.js App Router 结构评估

### 1.1 整体结构概览

```
src/app/
├── (dashboard)/          # Route Group: 仪表盘布局
├── [locale]/              # Route Group: 国际化支持
├── admin/                 # 管理后台页面
├── api/                   # API 路由（22个子目录）
├── analytics-demo/
├── dashboard/
├── demo/
├── design-system/
├── discover/
├── feedback/
├── page.tsx               # 首页
├── pricing/
├── profile/
├── providers/             # React Context Providers
├── register/
├── rooms/
└── layout.tsx             # 根布局
```

### 1.2 优点 ✅

| 特性 | 评价 |
|------|------|
| **Route Groups** | 正确使用 `(dashboard)` 分组 dashboard 专属布局 |
| **国际化** | `[locale]` route group 支持多语言，架构合理 |
| **布局分层** | 根布局 → Locale 布局 → Page 布局，分层清晰 |
| **Metadata API** | 充分利用 Next.js 16 的 metadata（JSON-LD、OG、Twitter Card） |
| **PWA 支持** | manifest.ts、apple-touch-icon、启动画面配置完整 |

### 1.3 问题与建议 ⚠️

#### 问题 1: Demo 页面过多
```
analytics-demo/
collaboration-cursor-demo/
image-optimization-demo/
mobile-optimization-demo/
mobile-optimization-v1130/
notification-demo/
rich-text-editor-demo/
```
这些 demo 页面混在 `src/app/` 根目录，应该移至 `/demos/` route group。

**建议**: 创建 `src/app/demos/` route group，将所有 demo 页面统一管理。

#### 问题 2: 混合页面路由
`dashboard/` 和 `(dashboard)/` 同时存在，容易混淆：
- `dashboard/` - 独立 dashboard 页面
- `(dashboard)/` - 使用 dashboard 布局的页面组

**建议**: 统一使用 `(dashboard)/` 约定，仅保留一个 dashboard 路由。

#### 问题 3: Providers 位置
`src/app/providers/` 放置 Context Providers，但这些是 app-level 的，不属于页面路由。

**建议**: 将 providers 移至 `src/providers/` 目录，与 components 平级。

---

## 2. API 路由组织评估

### 2.1 API 路由结构

```
src/app/api/
├── a2a/          # Agent to Agent 通信
├── agents/       # Agent 管理
├── ai/           # AI 对话 (chat, conversations, suggestions)
├── alerts/       # 告警管理
├── analytics/   # 分析数据
├── auth/         # 认证 (NextAuth.js)
├── csrf/         # CSRF 防护
├── data/         # 数据管理
├── feedback/     # 反馈系统
├── health/       # 健康检查
├── mcp/          # Model Context Protocol
├── notifications/# 通知系统
├── performance/  # 性能监控
├── projects/     # 项目管理
├── pwa/          # PWA 相关
├── reports/      # 报告生成
├── rooms/        # WebSocket 房间
├── search/       # 搜索功能
├── users/        # 用户管理
└── workflows/    # 工作流管理
```

### 2.2 优点 ✅

| 特性 | 评价 |
|------|------|
| **领域驱动组织** | 按业务领域（auth、ai、rooms）划分，职责清晰 |
| **嵌套路由** | 如 `ai/chat/route.ts` 和 `ai/chat/stream/route.ts`，HTTP 方法分离 |
| **统一错误处理** | 使用 `createSuccessResponse`、`createErrorResponse` 标准化响应 |
| **健康检查** | `/api/health` 端点存在 |

### 2.3 问题与建议 ⚠️

#### 问题 1: API 路由过深
`/api/ai/chat/stream/route.ts` 路径过深。

**建议**: 考虑简化为 `/api/ai/stream` 或在 ai 路由内用 query param 区分。

#### 问题 2: 缺少 API 版本控制
没有 `/api/v1/`、`/api/v2/` 形式的版本前缀。

**建议**: 添加版本前缀，为未来 API 升级预留空间：
```
/api/v1/ai/chat
/api/v2/ai/chat
```

#### 问题 3: Mock 数据问题
AI 路由返回硬编码的模拟响应：
```typescript
function generateAIResponse(userMessage: string, systemPrompt?: string): string {
  const lowerMessage = userMessage.toLowerCase()
  // 大量硬编码的模拟响应...
}
```

**建议**: 区分 dev/mock 路由和生产路由，或使用 MSW (Mock Service Worker) 进行 API mock。

---

## 3. 状态管理方案评估

### 3.1 Zustand Stores

```
src/stores/
├── app-store.ts           # 应用全局设置
├── auth-store.ts          # 认证状态
├── notification-store.ts  # 通知状态
├── permission-store.ts    # 权限管理
├── room-store.ts          # 房间/WebSocket
├── websocket-store.ts     # WebSocket 连接
└── index.ts               # 统一导出
```

### 3.2 优点 ✅

| 特性 | 评价 |
|------|------|
| **无 Boilerplate** | 比 Redux 简洁，减少样板代码 |
| **细粒度选择器** | 使用 `shallow` 比较，避免不必要的重渲染 |
| **持久化支持** | Zustand persist middleware 支持 localStorage/sessionStorage |
| **TypeScript 友好** | 完整的类型定义和导出 |
| **性能优化** | 如 `permission-store` 的细粒度选择器优化 |

### 3.3 问题与建议 ⚠️

#### 问题 1: 没有 React Query / TanStack Query

当前项目**完全没有**使用 React Query 进行服务端状态管理。

```
package.json 中没有 @tanstack/react-query 或 @tanstack/query-core
```

这意味着：
- **API 数据获取** 依赖组件内部 state 或直接调用 API
- **缓存管理** 需要自己实现
- **乐观更新** 需要手动处理
- **后台数据同步** 需要自己实现轮询

**建议**: 引入 `@tanstack/react-query` 作为服务端状态管理，Zustand 专注客户端 UI 状态。

```typescript
// 建议的职责划分
Zustand:   UI 状态、认证、权限、主题、WebSocket 连接
TanStack:  API 数据获取、缓存、乐观更新、后台同步
```

#### 问题 2: WebSocket 状态重复

`room-store.ts` 和 `websocket-store.ts` 存在功能重叠：
- 两者都处理 WebSocket 连接状态
- 消息管理可能有重复

**建议**: 统一为 `realtime-store.ts`，或明确区分：
- `websocket-store.ts` - 底层连接管理
- `room-store.ts` - 业务层的房间状态（依赖 websocket-store）

#### 问题 3: Store 间依赖

`permission-store.ts` 依赖 `auth-store.ts` 的 User 类型，可能造成循环依赖风险。

**建议**: 将共享类型提取到 `src/types/` 目录。

---

## 4. 组件复用性与设计系统

### 4.1 UI 组件结构

```
src/components/ui/
├── Button.tsx
├── Card.tsx
├── Badge.tsx
├── Input.tsx
├── Modal.tsx
├── Select.tsx
├── Switch.tsx
├── Tabs.tsx
├── Loading.tsx
├── Skeleton.tsx
├── Progress.tsx
├── EmptyState.tsx
├── TaskCard.tsx
├── Navigation.tsx
├── NavigationSkeleton.tsx
├── ThemeSwitcher.tsx
├── LazyImage.tsx
├── RichTextEditor/
├── feedback/              # 反馈组件
└── index.ts               # 统一导出
```

### 4.2 优点 ✅

| 特性 | 评价 |
|------|------|
| **统一导出** | `index.ts` 提供清晰的 API surface |
| **类型安全** | Props 接口完整定义 |
| **变体支持** | Button 支持 6 种变体、5 种尺寸 |
| **无障碍支持** | Skip to main content link、ARIA 支持 |

### 4.3 问题与建议 ⚠️

#### 问题 1: design-system 目录几乎为空

```
design-system/
└── changelog
```

`design-system/` 目录没有实际的设计系统代码。设计组件散落在 `src/components/ui/` 中。

**建议**: 明确 design-system 的定位：
- 如果是内部组件库 → 迁移到 `design-system/` 并发布为内部 npm 包
- 如果是应用组件 → 移除 design-system/ 目录

#### 问题 2: 组件测试不足

`src/components/__tests__/` 和 `src/components/ui/__tests__/` 目录存在但可能测试覆盖率不足。

**建议**: 每个 UI 组件应有对应的 `.test.tsx` 文件。

#### 问题 3: 缺少 Storybook 集成

项目有 `.storybook/` 配置但未确认是否正常使用。

**建议**: 确保 Storybook 用于文档和组件开发预览。

#### 问题 4: Hooks 分散

自定义 hooks 在 `src/hooks/` 中，但部分业务 hooks（如 `useWorkflowDraft`、`useWorkflowTemplate`）可能属于特定领域。

**建议**: 领域特定 hooks 应放在对应功能目录下：
```
src/features/workflows/hooks/useWorkflowDraft.ts
src/features/rooms/hooks/useRoomWebSocket.ts
```

---

## 5. 总体架构评分

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| **App Router 结构** | 7/10 | Route groups 使用正确，但 demo 页面过多 |
| **API 路由组织** | 7/10 | 领域驱动划分清晰，缺少版本控制 |
| **状态管理** | 6/10 | Zustand 使用得当，但缺少 React Query |
| **组件复用性** | 7/10 | UI 组件设计良好，但 design-system 未充分利用 |
| **TypeScript 支持** | 8/10 | 类型定义完善，strict mode 支持 |
| **性能优化** | 7/10 | 有 dynamic import、lazy loading，但 bundle 分析未完成 |

### 综合评分: **7.0/10**

---

## 6. 优先改进建议

### P0 - 高优先级

1. **引入 TanStack Query**
   - 解决服务端状态管理缺失问题
   - 位置: 新建 `src/lib/query/` 目录

2. **清理 demo 页面**
   - 移动到 `src/app/demos/` route group
   - 避免生产代码污染

### P1 - 中优先级

3. **完善 design-system**
   - 确定 design-system 定位
   - 或移除空目录

4. **API 版本控制**
   - 添加 `/api/v1/` 前缀

5. **Store 职责明确化**
   - 统一 WebSocket 相关 store
   - 解决可能的循环依赖

### P2 - 低优先级

6. **组件测试覆盖率提升**
7. **Storybook 文档完善**
8. **领域 hooks 重新组织**

---

## 7. 附录

### A. 技术栈

| 技术 | 版本 |
|------|------|
| Next.js | ^16.2.4 |
| React | (Next.js 内置) |
| Zustand | ^5.0.12 |
| TypeScript | (tsconfig 配置) |
| Tailwind CSS | (tailwind.config.js) |
| next-i18next | ^16.0.5 |

### B. 项目结构统计

- **组件目录**: 27 个
- **API 路由**: 22 个领域模块
- **Store**: 6 个 Zustand stores
- **Hooks**: 20+ 自定义 hooks
- **类型定义**: 分散在 `src/types/` 和各模块

### C. 相关文档

- `REPORT_ZUSTAND_STORE_AUDIT_V2_0502.md` - Zustand Store 审计
- `REPORT_NEXT16_COMPAT_FINAL_0502.md` - Next 16 兼容性
- `DESIGN_SYSTEM_COMPLETION_REPORT.md` - 设计系统完成报告
- `REACT_OPTIMIZATION_SUMMARY.md` - React 性能优化总结

---

*报告生成时间: 2026-05-08 04:12 GMT+2*
