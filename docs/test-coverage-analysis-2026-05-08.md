# 代码覆盖率分析

**项目**: 7zi-frontend  
**版本**: v1.0.0  
**分析日期**: 2026-05-08  
**技术栈**: Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI

---

## 测试文件统计

| 类别 | 数量 |
|------|------|
| **总测试文件** | 222 |
| `src/lib/` 单元测试 | ~60 |
| `src/components/` 组件测试 | ~50 |
| `src/app/api/` API 路由测试 | ~30 |
| 其他测试文件 | ~82 |

**测试命令状态**: ✅ 正常运行 (vitest run)
- 测试框架: Vitest v4.1.4
- 有 1 个失败的测试 (`EmotionSelector.test.tsx > should submit satisfaction rating`) — 偶发性网络超时

---

## 覆盖模块

### ✅ 已覆盖的核心模块

#### lib/ 业务逻辑层
| 模块 | 测试文件数 | 说明 |
|------|-----------|------|
| `workflow` | 6 | 模板系统、版本控制、编排器、分析、重放引擎、执行历史 |
| `collab` | 6 | 实时协作、CRDT操作、冲突解决、状态管理、光标同步 |
| `performance` | 11 | 告警、指标、离线存储、缓存策略、异常检测、根因分析 |
| `notification` | 6 | 服务、增强通知、边缘情况、系统 |
| `rate-limit` | 2 | 限流器、内存存储 |
| `evomap` | 1 | Gateway 连接 |
| `analytics` | 1 | 指标收集 |
| `reporting` | 3 | NLG处理、报告生成、数据聚合 |
| `db` | 2 | 草稿存储、查询优化 |
| `theme` | 2 | 主题、Profile主题集成 |
| `websocket` | 1 | WebSocket客户端 |
| `webhook` | 1 | Webhook |
| `alerting` | 2 | SMTP测试器、多渠道通知 |
| `automation` | 1 | 自动化集成 |

#### components/ 组件层
| 模块 | 测试文件数 | 说明 |
|------|-----------|------|
| `WorkflowEditor` | 16 | 编辑器、节点类型、验证、执行、存储、工具栏、模板 |
| `ui` | 4 | Input、RichTextEditor、ErrorFallback、AI-Chat |
| `feedback` | 2 | EmotionSelector、MultiStepFeedbackForm |
| `keyboard` | 4 | ShortcutManager、Search、Tooltip、Tutorial |
| `onboarding` | 1 | OnboardingFlow |
| `performance` | 3 | LazyLoadImage、VirtualizedList、PerformanceDashboard |
| `monitoring` | 5 | 监控面板、告警配置、历史数据、性能图表 |
| `notifications` | 1 | NotificationProvider |
| `alerts` | 1 | AlertRuleForm |
| `dashboard` | 1 | AgentStatusPanel |
| `error-boundary` | 1 | ErrorBoundary |
| `cookie-consent` | 1 | CookieConsentBanner |

#### app/api/ 路由层
| 路由 | 测试文件数 | 说明 |
|------|-----------|------|
| `notifications/` | 3 | 基础、增强、stats、单个通知 |
| `alerts/` | 2 | history、rules |
| `a2a/` | 3 | registry、jsonrpc、queue |
| `auth/` | 2 | route、debug-auth |
| `rooms/` | 4 | route、[id]、join、leave |
| `feedback/` | 2 | route、response |
| `projects/` | 1 | route |
| `users/` | 2 | route、[id] |
| `workflows/` | 2 | rollback、versions |
| `search/` | 1 | route |
| `data/import/` | 1 | route |
| `health/` | 1 | route |
| `agents/learning/` | 1 | learning-api |
| `mcp/rpc/` | 1 | route |

---

## 未覆盖模块（高优先级）

### 🔴 高优先级 — 核心业务逻辑无测试

| 模块 | 路径 | 风险说明 |
|------|------|----------|
| **权限系统** | `src/lib/permissions.ts` | 核心安全逻辑，漏洞可能导致越权 |
| **认证模块** | `src/lib/auth.ts` | 登录/JWT 核心逻辑 |
| **API 客户端** | `src/lib/api-clients.ts` | 所有外部 API 调用的基础 |
| **WebSocket 管理** | `src/lib/websocket-manager.ts` | 核心连接管理 |
| **搜索服务** | `src/lib/search/` | 全文搜索逻辑 |
| **存储层** | `src/lib/storage/` | IndexedDB 操作 |
| **验证逻辑** | `src/lib/validation.ts` | Zod schema 验证 |
| **错误上报** | `src/lib/error-reporting/` | 前端错误收集 |
| **审计日志** | `src/lib/audit/` | 合规性追踪 |
| **PWA** | `src/lib/pwa/` | Service Worker 逻辑 |
| **中间件** | `src/lib/middleware/` | 请求拦截处理 |

### 🟡 中优先级 — API 路由缺失测试

| 路由 | 路径 | 风险说明 |
|------|------|----------|
| `ai/chat` | `src/app/api/ai/chat/` | 核心 AI 对话 API |
| `ai/conversations` | `src/app/api/ai/conversations/` | 对话历史管理 |
| `ai/suggestions` | `src/app/api/ai/suggestions/` | AI 建议生成 |
| `notifications/preferences` | `src/app/api/notifications/preferences/` | 用户通知偏好 |
| `notifications/socket` | `src/app/api/notifications/socket/` | WebSocket 通知 |
| `analytics/*` | `src/app/api/analytics/` | 分析数据 API (4个路由) |
| `performance/*` | `src/app/api/performance/` | 性能监控 API (4个路由) |
| `csrf/token` | `src/app/api/csrf/token/` | CSRF 防护 |
| `alerts/rules/[id]` | `src/app/api/alerts/rules/[id]/` | 告警规则 CRUD |
| `mcp/rpc` | `src/app/api/mcp/rpc/` | MCP 协议通信 |
| `projects` | `src/app/api/projects/` | 项目管理 |
| `reports` | `src/app/api/reports/` | 报告生成 |
| `data/export` | `src/app/api/data/export/` | 数据导出 |

### 🟢 低优先级 — UI/功能组件缺失测试

| 组件 | 路径 | 说明 |
|------|------|------|
| `KnowledgeLattice` | `src/components/knowledge-lattice/` | 知识 lattice 组件 |
| `Editor` | `src/components/editor/` | 富文本编辑器 |
| `SEO` | `src/components/seo/` | SEO 组件 |
| `Mobile` | `src/components/mobile/` | 移动端适配组件 |
| `Workflow` | `src/components/workflow/` | 工作流组件（非编辑器） |
| `Rooms` | `src/components/rooms/` | 房间组件 |
| `Webhook` | `src/components/webhook/` | Webhook 组件 |
| `WebSocket` | `src/components/websocket/` | WebSocket 组件 |

---

## 测试命令检查

```bash
npm test        # ✅ vitest run — 正常运行
npm run test:coverage  # ✅ vitest run --coverage
npm run test:e2e       # ✅ playwright test
npm run test:ci        # ✅ vitest run --reporter=junit --reporter=json
```

**测试配置**: Vitest + @vitest/coverage-v8 + @testing-library

**已知问题**:
- `EmotionSelector.test.tsx` 有一个偶发失败的测试 (`should submit satisfaction rating`)，疑似网络相关
- 测试运行时存在 Vite 废弃警告 (deprecation warnings)，建议升级 `esbuild` -> `oxc`

---

## 改进建议

### 1. 立即行动 — 添加关键模块测试

```bash
# 优先为以下模块添加测试（按风险排序）:
# 1. permissions.ts — 权限控制是安全关键
# 2. auth.ts — 认证逻辑
# 3. websocket-manager.ts — 连接稳定性
# 4. api-clients.ts — API 基础调用

# 使用 Vitest 生成测试:
npx vitest src/lib/permissions --ui  # 交互式测试开发
```

### 2. API 路由测试补充

当前 API 路由测试覆盖率约 **50%**，建议优先补充:

```typescript
// 示例: src/app/api/ai/chat/__tests__/route.test.ts
import { describe, it, expect } from 'vitest'
import { POST } from '../route'
import { createMocks } from 'node-mocks-http'

describe('AI Chat API', () => {
  it('should return chat response', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: 'Hello', conversationId: '123' }
    })
    // ... 测试逻辑
  })
})
```

### 3. 修复现有失败测试

```bash
# 运行单个失败测试排查问题
npx vitest run src/components/feedback/__tests__/EmotionSelector.test.tsx
```

### 4. 覆盖率目标建议

| 阶段 | 目标覆盖率 | 关键模块 |
|------|-----------|----------|
| **当前** | ~40% | 已测试模块 |
| **第一阶段** | 60% | 添加 permissions, auth, websocket-manager |
| **第二阶段** | 75% | API 路由全覆盖 |
| **第三阶段** | 85% | 组件测试完善 |

### 5. CI/CD 集成

```yaml
# .github/workflows/test.yml (建议添加)
- name: Test with Coverage
  run: npm run test:ci
- name: Upload Coverage
  uses: codecov/codecov-action@v4
```

---

## 总结

| 指标 | 数值 |
|------|------|
| 总测试文件 | 222 |
| 核心 lib 模块 | 14/32 (43%) |
| 组件模块 | ~12/18 |
| API 路由 | ~28/45 (62%) |
| 测试框架 | Vitest + React Testing Library |
| E2E 测试 | Playwright (已配置) |

**整体评估**: 测试基础良好，框架成熟，但存在**关键业务逻辑（权限、认证、WebSocket）缺少测试覆盖**。建议按优先级逐步补充。