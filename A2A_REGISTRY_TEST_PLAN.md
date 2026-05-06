# A2A Registry API 集成测试计划

**任务**: 为 `src/app/api/a2a/registry/route.ts` 编写 Vitest 集成测试
**状态**: 📋 规划中
**日期**: 2026-05-04

---

## 现有代码分析

### 路由端点

| 方法 | 路径 | 功能 | 认证 |
|------|------|------|------|
| GET | `/api/a2a/registry` | 列出所有/单个Agent | JWT |
| POST | `/api/a2a/registry` | 注册新Agent | JWT |
| PUT | `/api/a2a/registry` | 更新Agent状态 | JWT |
| DELETE | `/api/a2a/registry` | 注销Agent | JWT |

### 依赖模块

- `agentScheduler` from `@/lib/agents/scheduler/scheduler`
- `authenticateJWT` from `@/lib/auth/api-auth`
- `createSuccessResponse` / `createErrorResponse` from `@/lib/api/error-handler`

### 测试文件位置

```
src/app/api/a2a/registry/__tests__/route.test.ts  (已存在，需要扩展)
```

---

## 测试用例设计

### Test Suite 1: GET /api/a2a/registry

| # | 用例 | 预期 | mocks |
|---|------|------|-------|
| 1 | 无认证请求 → 401 | `{ success: false, error: 'Unauthorized' }` | `authenticateJWT` → `{ authenticated: false }` |
| 2 | 有认证 + 无参数 → 返回全部Agent | `{ success: true, agents, count }` | `agentScheduler.getAllAgents()` → `[]` |
| 3 | 有认证 + `?id=xxx` → 返回单个Agent | `{ success: true, agent }` | `agentScheduler.getAgent('xxx')` → `{ id: 'xxx' }` |
| 4 | 有认证 + `?id=xxx` → Agent不存在 → 404 | `{ success: false, error: 'Agent not found' }` | `agentScheduler.getAgent('xxx')` → `null` |
| 5 | 有认证 + `?capability=tool` → 按能力过滤 | `{ success: true, agents }` | `agentScheduler.getAgentsByCapability('tool')` → `[]` |

### Test Suite 2: POST /api/a2a/registry

| # | 用例 | 预期 | mocks |
|---|------|------|-------|
| 6 | 无认证 → 401 | 401 Unauthorized | - |
| 7 | 缺 name/type → 400 | `VALIDATION` error | - |
| 8 | capabilities 不是数组 → 400 | `VALIDATION` error | - |
| 9 | 有效请求 → 201 | `{ success: true, agent }` | `agentScheduler.registerAgent()` |
| 10 | 注册异常 → 500 | ERROR | `agentScheduler.registerAgent` → throw |

### Test Suite 3: PUT /api/a2a/registry

| # | 用例 | 预期 | mocks |
|---|------|------|-------|
| 11 | 缺 agentId/status → 400 | VALIDATION error | - |
| 12 | 无效status值 → 400 | VALIDATION error with allowed values | - |
| 13 | 有效更新 → 返回更新后agent | `{ success: true, agent }` | `updateAgentStatus` → `true`, `getAgent` → `{}` |
| 14 | Agent不存在 → 404 | `{ success: false }` | `updateAgentStatus` → `false` |

### Test Suite 4: DELETE /api/a2a/registry

| # | 用例 | 预期 | mocks |
|---|------|------|-------|
| 15 | 无认证 → 401 | - | - |
| 16 | 缺 id 参数 → 400 | VALIDATION error | - |
| 17 | 有效删除 → 成功 | `{ success: true }` | `unregisterAgent` → `true` |
| 18 | Agent不存在 → 404 | - | `unregisterAgent` → `false` |

---

## Mock 策略

使用 Vitest + mock 函数：

```typescript
import { agentScheduler } from '@/lib/agents/scheduler/scheduler'
import { authenticateJWT } from '@/lib/auth/api-auth'

vi.mock('@/lib/agents/scheduler/scheduler', () => ({
  agentScheduler: {
    getAllAgents: vi.fn(),
    getAgent: vi.fn(),
    getAgentsByCapability: vi.fn(),
    registerAgent: vi.fn(),
    updateAgentStatus: vi.fn(),
    unregisterAgent: vi.fn(),
  },
}))

vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn(),
}))
```

---

## 验收标准

- [ ] 18 个测试用例全部通过
- [ ] 覆盖所有 4 个 HTTP 方法
- [ ] 覆盖正常路径和错误路径
- [ ] Mock 正确隔离外部依赖
- [ ] 运行命令: `npm test -- --run src/app/api/a2a/registry/__tests__/route.test.ts`