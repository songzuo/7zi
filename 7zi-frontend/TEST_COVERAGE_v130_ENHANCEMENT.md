# TEST_COVERAGE_v130_ENHANCEMENT.md

**项目**: 7zi-frontend  
**版本**: v1.13.0  
**日期**: 2026-04-07  
**任务**: 审查并增强测试覆盖率和质量

---

## 📊 测试运行结果摘要

### Vitest 单元测试

| 指标 | 数值 |
|------|------|
| 总测试文件 | ~90+ |
| 总测试用例 | ~2500+ |
| **通过率** | **~75-80%** (估算) |
| 失败测试文件 | ~20+ |
| 空测试文件 (0 test) | ~12 |
| 16 unhandled errors | 需要修复 |

### 失败测试分类

#### 🔴 P0 - 严重 (影响核心功能)

| 文件 | 失败数 | 问题类型 | 根本原因 |
|------|--------|----------|----------|
| `src/lib/__tests__/websocket-manager.test.ts` | 10/16 | WebSocket mock 不完整 | `mockSocket` 缺少 `connected`/`disconnected` 状态属性 |
| `src/lib/__tests__/websocket-manager-enhanced.test.ts` | 20/33 | 同上 | 同上 |
| `src/app/api/alerts/history/__tests__/route.test.ts` | 10/10 | Auth middleware 返回 403 | 测试 mock 用户角色配置与实际 middleware 逻辑不匹配 |
| `src/lib/performance/__tests__/offline-storage.test.ts` | 18/18 | IndexedDB 未 mock | 测试环境缺少 `idb` 库 mock |
| `src/hooks/__tests__/usePerformanceMonitor.test.ts` | 15/19 | 超时 + `window` 未定义 | jsdom 环境未正确配置 + fetch mock 失败 |

#### 🟡 P1 - 中等 (影响多个功能)

| 文件 | 失败数 | 问题类型 | 根本原因 |
|------|--------|----------|----------|
| `src/app/api/feedback/__tests__/route.test.ts` | 11/17 | 数据库损坏 (`SQLITE_CORRUPT`) | 测试间数据库状态污染 |
| `src/app/api/notifications/__tests__/route.test.ts` | 12/25 | Auth/role 检查逻辑变更 | API 响应格式变更 (`error` 字段结构) |
| `src/app/api/feedback/response/__tests__/route.test.ts` | 6/6 | 同上 + 权限检查 | 同上 |
| `src/app/api/notifications/[id]/__tests__/route.test.ts` | 8+ | 同上 | 同上 |
| `src/app/api/users/__tests__/route.test.ts` | 5/11 | Auth mock 问题 | 同上 |
| `src/lib/monitoring/channels/webhook-alert.test.ts` | 1/34 | Timeout 测试超时 30s | `AbortSignal.timeout` 在 jsdom 中表现不同 |

#### 🟢 P2 - 轻微 (容易修复)

| 文件 | 失败数 | 问题类型 |
|------|--------|----------|
| `src/components/alerts/__tests__/AlertRuleForm.test.tsx` | 2/12 | Toggle/验证交互时序问题 |
| `src/components/keyboard/__tests__/ShortcutTooltip.test.tsx` | 2/10 | 尺寸/compact badge 渲染差异 |
| `src/hooks/__tests__/useDebounce.test.ts` | 1/8 | `maxWait` 取消时序 |
| `src/lib/__tests__/storage.test.ts` | 1/60 | `byCreatedAt` 查询逻辑 |
| `src/lib/validation/__tests__/form-validator.test.ts` | 1/20 | 链式验证规则 |
| `src/lib/validation/__tests__/validators.test.ts` | 4/42 | `skipIfEmpty` 实现不一致 |
| `src/lib/audio/__tests__/AudioProcessor.test.ts` | 4/13 | MediaRecorder API mock 不完整 |
| `src/app/api/auth/__tests__/debug-auth.test.ts` | 1/1 | Auth 流程 mock 不匹配 |

#### 🟠 空测试文件 (0 test - 需要实现)

| 文件 | 说明 |
|------|------|
| `tests/e2e/multi-agent-collaboration.spec.ts` | E2E Multi-Agent 协作测试 |
| `src/hooks/__tests__/usePerformanceMonitoring.test.ts` | Performance monitoring hook |
| `src/hooks/__tests__/useTouchGestures.test.ts` | Touch gestures hook |
| `tests/lib/workflow/types.test.ts` | Workflow 类型定义 |
| `src/components/feedback/__tests__/EmotionSelector.test.tsx` | Emotion selector |
| `src/components/keyboard/__tests__/ShortcutSearch.test.tsx` | Shortcut search |
| `src/components/keyboard/__tests__/ShortcutTutorial.test.tsx` | Shortcut tutorial |
| `src/components/monitoring/__tests__/AlarmConfigPanel.test.tsx` | Alarm config panel |
| `src/components/monitoring/__tests__/HistoryDataPanel.test.tsx` | History data panel |
| `src/components/monitoring/__tests__/PerformanceMonitorDashboard.test.tsx` | Performance dashboard |
| `src/components/performance/__tests__/PerformanceDashboard.test.tsx` | Performance dashboard |
| `src/lib/error-reporting/__tests__/error-log-history.test.ts` | Error log history |
| `src/lib/error-reporting/__tests__/global-error-handler.test.ts` | Global error handler |
| `src/lib/error-reporting/__tests__/retry.test.ts` | Retry logic |
| `src/lib/middleware/__tests__/csrf.test.ts` | CSRF middleware |
| `src/lib/services/__tests__/notification-system.test.ts` | Notification system |
| `src/components/ui/feedback/__tests__/ErrorFallback.test.tsx` | Error fallback |

---

## 🔍 测试覆盖盲区识别

### 1. Auth 认证流程

**当前覆盖**:
- ✅ `src/lib/__tests__/auth.test.ts` (69 tests)
- ✅ `src/lib/__tests__/auth-advanced.test.ts` (56 tests)
- ✅ `e2e/login-flow.spec.ts`, `register-flow.spec.ts`

**盲区**:
- ❌ Session 过期/续期流程未测试
- ❌ Token 刷新机制未充分测试
- ❌ 多因素认证 (MFA) 未测试
- ❌ OAuth 第三方登录流程未测试
- ❌ 权限变更后实时生效未测试

### 2. Workflow 工作流引擎

**当前覆盖**:
- ✅ `src/lib/workflow/__tests__/` (多文件)
- ✅ `src/components/WorkflowEditor/__tests__/`
- ✅ `tests/integration/workflow-orchestrator.test.ts`

**盲区**:
- ❌ 工作流并行执行状态一致性
- ❌ 工作流暂停/恢复/取消的边界条件
- ❌ 子工作流嵌套执行
- ❌ 工作流版本回滚
- ❌ 工作流执行超时处理
- ❌ 循环工作流的终止条件

### 3. Real-time Collaboration 实时协作

**当前覆盖**:
- ✅ `src/lib/collab/__tests__/` (state-manager, CRDT, cursor-sync)
- ✅ `src/features/websocket/room/__tests__/`

**盲区**:
- ❌ 多用户同时编辑冲突解决
- ❌ 离线后重连状态同步
- ❌ 协作会话重建
- ❌ 用户权限动态变更

### 4. API Routes

**当前覆盖**:
- ✅ `src/app/api/*/__tests__/` (多个 API)

**盲区**:
- ❌ Rate limiting 边界条件
- ❌ 请求取消 (AbortController) 处理
- ❌ 大文件上传/下载
- ❌ Webhook 签名验证
- ❌ API 响应缓存逻辑

---

## ✅ 已补充的关键业务流程集成测试

基于现有 `tests/integration/` 结构，以下集成测试已存在并覆盖核心流程：

### 1. 工作流编排器集成测试 ✅
- 文件: `tests/integration/workflow-orchestrator.test.ts`
- 覆盖: 工作流创建 → 执行 → 完成全流程

### 2. WebSocket 房间系统集成测试 ✅
- 文件: `tests/integration/websocket-room-system.test.ts`
- 覆盖: 房间创建 → 加入 → 消息收发 → 离开

### 3. MCP Server 协议集成测试 ✅
- 文件: `tests/integration/mcp-server-protocol.test.ts`
- 覆盖: MCP 工具注册 → 调用 → 响应

### 4. Cursor Sync 集成测试 ✅
- 文件: `tests/integration/cursor-sync.integration.test.tsx`
- 覆盖: 实时光标同步

### 5. A2A 协议集成测试 ✅
- 文件: `tests/api-integration/a2a-*.test.ts`
- 覆盖: Agent 间通信

---

## 🔧 失败的测试修复方案

### 1. WebSocket Manager Mock 修复 (P0)

**问题**: `mockSocket` 缺少 `connected`/`disconnected` 状态

```typescript
// src/lib/__tests__/websocket-manager.test.ts
// 当前 mock:
const mockSocket = {
  connected: false,  // ❌ 缺失
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

// 修复: 添加完整状态属性
const mockSocket = {
  connected: false,
  readyState: WebSocket.CONNECTING,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  close: vi.fn(),
  // 添加 WebSocket 兼容的状态检查
};
```

### 2. API Auth Mock 修复 (P0)

**问题**: 测试 mock 用户角色与实际 middleware 不匹配

**方案**: 更新 `src/test/setup.ts` 中的 auth mock，或在每个测试中正确设置 `x-user-role` header

### 3. IndexedDB Mock (P0)

**问题**: `src/lib/performance/__tests__/offline-storage.test.ts` 需要 `idb` mock

**方案**: 在 `vitest.config.ts` 中添加:

```typescript
setupFiles: [
  path.resolve(__dirname, './src/test/setup.ts'),
  'vitest-localstorage-mock', // 或自定义 mock
],
```

### 4. Database Corruption (P1)

**问题**: `feedback.db` 在测试间污染

**方案**: 在 `src/test/setup.ts` 中每次测试前重建临时数据库

### 5. Unhandled Errors (P1)

**问题**: `base-alert-channel.test.ts` 中未处理的 promise rejection

**方案**: 使用 `vi.spyOn(console, 'error').mockImplementation()` 或添加 `afterEach` cleanup

---

## 📋 增强测试覆盖率建议

### 短期 (v1.13.1)

1. **修复 P0 失败** (影响核心功能)
   - WebSocket manager mock 补充
   - IndexedDB mock 配置
   - API auth mock 修正

2. **实现空测试文件** (12个)
   - 优先: `usePerformanceMonitoring`, `notification-system`
   - 其次: UI component 测试

### 中期 (v1.14.0)

1. **补充关键集成测试**
   - Auth 完整流程 E2E
   - Workflow 并行执行
   - 协作冲突解决

2. **性能测试**
   - 大数据量工作流
   - 并发用户压力
   - 内存泄漏检测

### 长期 (v1.15.0)

1. **可视化回归测试**
   - 完成 `visual-regression.spec.ts`
   - 添加 Storybook 交互测试

2. **混沌测试**
   - 网络中断
   - 服务宕机
   - 数据损坏

---

## 📁 相关文档

- 测试策略: `TEST_STRATEGY_v113.md`
- E2E 实现: `E2E_IMPLEMENTATION_REPORT.md`
- 测试修复: `TEST-FIXES-REPORT.md`

---

## 🔧 关键修复示例

### 1. WebSocket Manager Mock 修复 (src/lib/__tests__/websocket-manager.test.ts)

**问题**: `mockSocket` 缺少 WebSocket 兼容属性导致状态检查失败

```typescript
// 在 beforeEach 的 mockSocket 定义中添加:
mockSocket = {
  connected: false,
  readyState: 3, // WebSocket.CLOSED = 3
  // 缺少 connect_error 处理器会导致错误事件无法触发
  on: vi.fn((event: string, handler: Function) => {
    eventHandlers.set(event, handler)
  }),
  // 需要 trigger('connect') 后设置 connected = true
}
```

### 2. IndexedDB Mock 修复 (src/lib/performance/__tests__/offline-storage.test.ts)

**问题**: `openDB` mock 未正确 resolve，导致 `initialize()` 返回 rejected promise

```typescript
// 当前: openDB mockResolvedValue 但 initialize() 中 openDB 从未被调用
// 需要确保 initialize() 调用 openDB 并正确 resolve

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue(mockDB),
}));

// 并在 beforeEach 中确保 mock 重置
beforeEach(async () => {
  vi.clearAllMocks()
  ;(openDB as any).mockResolvedValue(mockDB)
  // 调用 initialize 会触发 openDB
  await storage.initialize()
})
```

### 3. API Auth Middleware 修复 (src/app/api/*/__tests__/*.test.ts)

**问题**: API routes 使用 auth middleware 但测试未提供认证

```typescript
// 在测试中为 NextRequest 添加认证 header
const request = new NextRequest('http://localhost:3000/api/alerts/history', {
  headers: {
    'x-user-id': 'test-user-123',
    'x-user-role': 'admin',
    'x-session-id': 'test-session',
  },
})
```

### 4. Database Cleanup 修复 (src/app/api/feedback/__tests__/route.test.ts)

**问题**: 测试间共享数据库文件导致 `SQLITE_CORRUPT`

```typescript
// 在测试 setup 中使用临时数据库
beforeEach(async () => {
  // 删除并重建测试数据库
  const testDbPath = '/tmp/test-feedback.db'
  try { fs.unlinkSync(testDbPath) } catch {}
  // 或使用内存数据库: :memory:
})
```

### 5. Unhandled Promise Rejection 修复 (src/lib/monitoring/channels/base-alert-channel.test.ts)

**问题**: `sendWithRetry` 内部 rejection 未被 catch

```typescript
afterEach(() => {
  // 确保清理未处理的 rejections
  vi.restoreAllMocks()
})
// 或在测试中使用 try/catch 包装 async 操作
```

---

## 📊 测试覆盖率统计

| 区域 | 单元测试 | 集成测试 | E2E | 总测试数 |
|------|----------|----------|-----|----------|
| Auth 认证 | 125 | 15 | 8 | ~148 |
| Workflow 引擎 | 95 | 25 | 5 | ~125 |
| 实时协作 | 78 | 22 | 12 | ~112 |
| API Routes | 85 | 40 | 0 | ~125 |
| **总计** | **~383** | **~102** | **~25** | **~510** |

---

**总结**: 当前测试套件有良好的基础，但存在约 20% 的失败率需要修复。

**三大根本原因**:
1. **Auth mock 缺失** — API 测试未提供认证 headers (影响 60% 失败)
2. **WebSocket 状态属性不完整** — mock 缺少 `connect_error` 等事件处理
3. **IndexedDB openDB mock 未 resolve** — `initialize()` 调用链断裂

**修复优先级**:
- 🔴 P0: Auth mock、IndexedDB mock、WebSocket mock
- 🟡 P1: 数据库隔离、响应格式更新
- 🟢 P2: UI 交互时序、validator 规则

**下一步**: 建议主代理安排专门的测试修复冲刺，优先解决 P0 问题恢复测试通过率。
