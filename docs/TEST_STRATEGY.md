# 测试策略文档

> **文档日期:** 2026-05-10  
> **来源:** 测试覆盖率评估 (TEST_COVERAGE_REPORT.md, reports/)  
> **状态:** 进行中

---

## 📋 执行摘要

| 指标 | 数值 |
|------|------|
| 测试框架 | Vitest v4.1.0 + Playwright (E2E) |
| 单元测试覆盖 | ~85% (部分模块 95%+) |
| 测试用例数 | 500+ (70+ 新增 data-converter, 40+ 新增 helpers) |
| 测试执行时间 | data-converter: ~41ms, helpers: ~25ms |
| API 路由测试 | 150+ 路由文件 |
| 组件测试覆盖 | 200+ 组件部分覆盖 |

---

## 🎯 测试目标

1. **质量保证** - 确保代码功能正确，减少回归问题
2. **快速反馈** - 本地验证 < 5 分钟，CI < 15 分钟
3. **高覆盖** - 目标：核心模块 90%+, 整体 85%+
4. **可维护** - 测试代码与生产代码同等质量

---

## 🧪 测试框架

### 主要框架: Vitest

**配置:** `vitest.config.ts`

**优势:**
- Vite 原生支持，快速 HMR
- Jest 兼容 API
- 内置 TypeScript 支持
- 快速并行执行

### E2E 框架: Playwright

**配置:** `playwright.config.ts`, `playwright.*.config.ts`

**覆盖范围:**
- 登录流程
- 通知系统
- WebSocket 连接
- 错误处理
- UI 交互

---

## 📁 测试目录结构

```
src/
├── app/
│   └── api/
│       └── __tests__/           # API 路由测试
├── components/
│   └── __tests__/               # 组件测试
├── lib/
│   ├── __tests__/               # 工具函数测试
│   ├── agents/
│   │   └── __tests__/           # Agent 模块测试
│   ├── validation/
│   │   └── __tests__/           # 验证模块测试 (70+40 新用例)
│   └── workflow/
│       └── __tests__/           # 工作流测试
└── stores/
    └── __tests__/               # Store 测试
```

---

## 📊 测试覆盖率目标

| 模块 | 当前覆盖 | 目标 | 优先级 |
|------|----------|------|--------|
| **lib/validation/** | ~95% | 95% | ✅ 已达到 |
| **lib/utils/** | ~90% | 90% | ✅ 已达到 |
| **lib/agents/** | ~85% | 90% | 🟠 P1 |
| **lib/workflow/** | ~80% | 90% | 🟠 P1 |
| **stores/** | ~75% | 85% | 🟠 P1 |
| **components/** | ~60% | 80% | 🟡 P2 |
| **API routes/** | ~70% | 85% | 🟡 P2 |

---

## 🧪 测试类型

### 1. 单元测试 (Unit Tests)

**目标:** 每个函数/模块独立验证

**原则:**
- ✅ 单一职责
- ✅ 无外部依赖（Mock 所有依赖）
- ✅ 快速执行
- ✅ 明确错误信息

**覆盖模块:**
- `lib/utils/` - 工具函数 (id, async, format)
- `lib/validation/` - 验证器 (form-validator, data-converter, helpers)
- `lib/agents/` - Agent 核心功能
- `lib/workflow/` - 工作流引擎

### 2. 集成测试 (Integration Tests)

**目标:** 多模块协作验证

**原则:**
- ✅ 测试模块间交互
- ✅ 使用真实数据库（测试环境）
- ✅ 测试 API 端点

**覆盖场景:**
- API 路由 (`/api/*/route.ts`)
- 数据库操作
- WebSocket 连接

### 3. E2E 测试 (End-to-End)

**目标:** 完整用户流程验证

**覆盖流程:**
| 流程 | 测试用例数 | 状态 |
|------|-----------|------|
| 登录 | 5+ | ✅ |
| 通知系统 | 8+ | ✅ |
| WebSocket | 4+ | ✅ |
| 错误处理 | 3+ | ✅ |

### 4. 性能测试 (Performance Tests)

**目标:** 验证性能指标

**指标:**
- API 响应时间 < 200ms
- 页面加载时间 < 1s
- 并发用户数 100+

---

## 🔍 测试策略

### TDD (测试驱动开发)

**流程:**
1. 编写失败测试
2. 实现最小代码使测试通过
3. 重构代码
4. 重复

**适用场景:**
- 新功能开发
- Bug 修复验证
- 重构验证

### BDD (行为驱动开发)

**流程:**
1. 定义业务行为
2. 编写 Gherkin 格式测试
3. 实现功能

**适用场景:**
- 用户故事验收
- 跨团队协作

---

## 📝 测试文件命名规范

```
{module}.test.ts           # 单元测试
{module}.integration.test.ts  # 集成测试
{module}.e2e.test.ts       # E2E 测试
__tests__/
├── {module}.test.ts
└── {module}.test.tsx
```

---

## 🛠️ 测试最佳实践

### 1. Mock 策略

```typescript
// 使用 vi.hoisted() 共享 Mock
const { mockDb } = vi.hoisted(() => ({
  query: vi.fn()
}))

// 统一 Mock 工厂
const createMockDb = () => ({
  query: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
})
```

### 2. 测试数据

```typescript
// 使用工厂函数生成测试数据
const createTestUser = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  ...overrides
})
```

### 3. 断言风格

```typescript
// 优先使用具体断言
expect(result).toEqual({ expected: 'value' })
expect(error.message).toContain('specific error')

// 避免过度断言
expect(result).toBeDefined() // 过于宽泛
expect(result.status).toBe(200) // 更好
```

### 4. 测试隔离

```typescript
// 每个测试独立
beforeEach(() => {
  vi.clearAllMocks()
})

// 使用 describe 块分组相关测试
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', () => ...)
    it('should throw on invalid email', () => ...)
  })
})
```

---

## 📈 测试执行

### 本地执行

```bash
# 所有测试
pnpm test:run

# 监视模式
pnpm test

# 单个文件
pnpm test:run src/lib/validation/__tests__/data-converter.test.ts

# 覆盖报告
pnpm test:run --coverage
```

### CI 执行

```bash
# PR 检查 (< 15 分钟)
pnpm type-check && pnpm test:run && pnpm lint

# 主分支部署检查
pnpm type-check && pnpm test:run && pnpm build
```

---

## 🎯 测试覆盖率改进计划

### Phase 1: 补齐短板 (P1)

**目标:** 核心模块达到 90% 覆盖

| 模块 | 当前 | 目标 | 行动项 |
|------|------|------|--------|
| `lib/agents/` | 85% | 90% | 增加 Agent 协作测试 |
| `lib/workflow/` | 80% | 90% | 增加边缘用例测试 |

### Phase 2: 扩展覆盖 (P2)

**目标:** 组件和 API 达到 80% 覆盖

| 模块 | 当前 | 目标 | 行动项 |
|------|------|------|--------|
| `components/` | 60% | 80% | 增加 UI 组件测试 |
| `API routes/` | 70% | 85% | 增加路由集成测试 |

### Phase 3: 维护优化 (P3)

**目标:** 保持高覆盖，持续改进

- 定期审查测试质量
- 移除过期测试
- 更新测试数据
- 优化测试执行时间

---

## 🚨 已知问题

### 1. 测试文件类型错误 (~100 个)

**来源:** Mock 类型不匹配、导入错误

**解决方案:**
- 统一 Mock 工厂函数
- 修复导入路径
- 使用 `vi.hoisted()`

**状态:** 🟡 P2 - 进行中

### 2. 测试执行时间

**问题:** 部分测试执行时间较长

**优化:**
- 使用 `vi.mock()` 懒加载
- 并行测试执行
- 减少不必要的数据准备

### 3. 测试覆盖盲区

**发现:**
- 边缘用例覆盖不足
- 错误处理路径未充分测试
- 异步边界情况遗漏

**改进:**
- 增加边界值测试
- 增加异常路径测试
- 增加并发测试

---

## 📝 修复记录

| 日期 | 修复项 | 状态 |
|------|--------|------|
| 2026-05-09 | 创建 data-converter.test.ts (70 tests) | ✅ 完成 |
| 2026-05-09 | 创建 helpers.test.ts (40 tests) | ✅ 完成 |
| 2026-05-10 | 本文档创建 | ✅ 完成 |

---

## 🔗 相关文档

- [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md)
- [TESTING.md](./TESTING.md)
- [TEST_COVERAGE_ANALYSIS.md](./TEST_COVERAGE_ANALYSIS.md)

---

*文档生成: 技术文档专家子代理 | 任务: update-critical-docs*