# 7zi-Frontend 测试策略文档

## 📊 测试金字塔

```
                    ▲
                   /E\
                  /2E\        E2E Tests (端到端测试)
                 /----\       - 用户真实流程
                /      \      - 跨系统集成
               /  集成  \     
              /   测试   \    Integration Tests (集成测试)
             /------------\   - API 集成
            /              \  - 模块间交互
           /    单元测试    \ 
          /------------------\
          Unit Tests (单元测试)
          - 函数/组件测试
          - 346 个测试用例 ✅
```

## 📈 当前测试覆盖情况

### 已有测试 (单元测试)

| 模块 | 测试文件 | 测试用例数 | 状态 |
|------|----------|-----------|------|
| validation | validation.test.ts | 89 | ✅ |
| auth | auth.test.ts | 75 | ✅ |
| storage | storage.test.ts | 82 | ✅ |
| logger | logger.test.ts | 73 | ✅ |
| mcp/server | server.test.ts | 27 | ✅ |
| websocket-manager | websocket-manager.test.ts | 20+ | ✅ |
| rate-limit | limiter.test.ts, memory-storage.test.ts | 30+ | ✅ |
| notifications | notification*.test.ts | 40+ | ✅ |
| hooks | useDebounce.test.ts, useNotifications.test.ts | 15+ | ✅ |
| **总计** | **24+ 文件** | **~400+** | ✅ |

### 缺失测试

| 测试类型 | 当前状态 | 优先级 |
|----------|----------|--------|
| **E2E 测试** | ❌ 无 | 🔴 高 |
| **集成测试** | ⚠️ 部分 | 🟡 中 |
| **组件测试** | ⚠️ 部分 | 🟡 中 |
| **API 测试** | ⚠️ 部分 | 🟡 中 |

## 🎯 测试策略目标

### 短期目标 (Phase 1)
1. ✅ 建立 Playwright E2E 测试框架
2. ✅ 实现核心用户流程 E2E 测试
3. ✅ 覆盖登录、通知、WebSocket 功能

### 中期目标 (Phase 2)
1. 增加组件测试覆盖率
2. 实现 API 集成测试
3. 添加视觉回归测试

### 长期目标 (Phase 3)
1. 完善测试自动化流程
2. 集成 CI/CD 测试流水线
3. 实现性能基准测试

## 🔧 测试工具栈

### 单元测试 (已配置)
- **Vitest** - 测试运行器
- **React Testing Library** - React 组件测试
- **MSW** - API Mock

### E2E 测试 (新增)
- **Playwright** - E2E 测试框架
- **Playwright Reporters** - 测试报告
- **Playwright Trace** - 失败追踪

### 辅助工具
- **faker** - 测试数据生成
- **jest-axe** - 可访问性测试
- **lcov** - 覆盖率报告

## 📋 E2E 测试用例设计

### 1. 登录流程测试
```
场景: 用户登录
  ✅ 显示登录表单
  ✅ 输入有效凭证登录成功
  ✅ 输入无效凭证显示错误
  ✅ 会话持久化
  ✅ 登出功能
```

### 2. 通知系统测试
```
场景: 通知管理
  ✅ 显示通知中心
  ✅ 接收新通知
  ✅ 标记通知为已读
  ✅ 清除通知
  ✅ 通知偏好设置
```

### 3. WebSocket 连接测试
```
场景: WebSocket 通信
  ✅ 建立连接
  ✅ 显示连接状态
  ✅ 自动重连
  ✅ 消息收发
  ✅ 断开连接
```

### 4. 错误处理测试
```
场景: 错误场景
  ✅ 网络错误处理
  ✅ API 错误响应
  ✅ 表单验证错误
  ✅ 权限错误
```

## 📊 测试覆盖率目标

```
┌─────────────────┬──────────┬──────────┐
│ 测试类型        │ 当前     │ 目标     │
├─────────────────┼──────────┼──────────┤
│ 单元测试        │ 85%      │ 90%      │
│ 集成测试        │ 40%      │ 70%      │
│ E2E 测试        │ 0%       │ 60%      │
│ 组件测试        │ 50%      │ 80%      │
└─────────────────┴──────────┴──────────┘
```

## 🚀 运行测试

### 单元测试
```bash
# 运行所有单元测试
npm run test

# 运行特定测试
npm run test -- auth.test.ts

# 生成覆盖率报告
npm run test:coverage
```

### E2E 测试
```bash
# 运行 E2E 测试
npm run test:e2e

# UI 模式运行
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug
```

### 全量测试
```bash
# 运行所有测试
npm run test:all

# CI 环境
npm run test:ci
```

## 📝 测试最佳实践

### 1. 测试命名规范
```typescript
// ✅ 好的命名
describe('NotificationProvider', () => {
  it('should display notification when message is received', () => {})
})

// ❌ 差的命名
describe('test', () => {
  it('works', () => {})
})
```

### 2. AAA 模式
```typescript
it('should mark notification as read', async () => {
  // Arrange - 准备
  const notification = { id: '1', read: false }
  
  // Act - 执行
  await markAsRead(notification.id)
  
  // Assert - 断言
  expect(notification.read).toBe(true)
})
```

### 3. 测试隔离
```typescript
beforeEach(() => {
  // 重置状态
  cleanup()
})

afterEach(() => {
  // 清理资源
  vi.clearAllMocks()
})
```

### 4. 选择器策略
```typescript
// ✅ 使用可访问选择器
await page.getByRole('button', { name: '登录' })
await page.getByLabel('用户名')

// ❌ 避免使用 CSS 选择器
await page.locator('#login-btn')
await page.locator('.submit-button')
```

## 🔄 CI/CD 集成

### GitHub Actions 工作流
```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

## 📈 监控与报告

### 测试报告指标
- 测试通过率
- 测试覆盖率趋势
- 执行时间趋势
- 失败原因分析

### 报告生成
```bash
# HTML 报告
npm run test:e2e -- --reporter=html

# JUnit 报告 (CI)
npm run test:e2e -- --reporter=junit
```

## 🎓 团队培训

### 测试培训内容
1. Vitest 基础与进阶
2. React Testing Library 实践
3. Playwright E2E 测试
4. 测试驱动开发 (TDD)
5. 测试重构技巧

---

**文档版本**: 1.0
**更新日期**: 2026-03-28
**负责人**: 🧪 测试员
