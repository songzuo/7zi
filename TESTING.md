# 7zi 项目测试文档

> 完整的测试指南 - Unit、Integration 和 E2E 测试

## 📋 目录

- [测试概览](#测试概览)
- [测试工具链](#测试工具链)
- [快速开始](#快速开始)
- [单元测试](#单元测试)
- [集成测试](#集成测试)
- [E2E 测试](#e2e-测试)
- [测试覆盖率](#测试覆盖率)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

---

## 🎯 测试概览

### 测试金字塔

```
           /\
          /  \
         / E2E \     少量关键用户流程
        /------\     10-20 个测试
       /        \
      /Integration\  中量 API/组件集成
     /------------\  50-100 个测试
    /              \
   /    Unit Tests  \ 大量单元测试
  /==================\ 400+ 个测试
```

### 测试分类

| 类型         | 工具       | 位置                             | 数量 | 覆盖率目标    |
| ------------ | ---------- | -------------------------------- | ---- | ------------- |
| **单元测试** | Vitest     | `src/**/__tests__/*.test.ts`     | 400+ | 80%+          |
| **集成测试** | Vitest     | `src/test/integration/*.test.ts` | 50+  | 70%+          |
| **API 测试** | Vitest     | `src/app/api/**/*.test.ts`       | 30+  | 75%+          |
| **E2E 测试** | Playwright | `e2e/*.spec.ts`                  | 20+  | 关键流程 100% |

---

## 🛠️ 测试工具链

### Unit & Integration 测试

| 工具                            | 版本  | 用途           |
| ------------------------------- | ----- | -------------- |
| **Vitest**                      | 4.1.0 | 测试框架       |
| **React Testing Library**       | 16.x  | React 组件测试 |
| **@testing-library/user-event** | 14.x  | 用户交互模拟   |
| **@vitest/coverage-v8**         | 4.1.0 | 代码覆盖率     |

### E2E 测试

| 工具                 | 版本   | 用途              |
| -------------------- | ------ | ----------------- |
| **Playwright**       | 1.58.2 | E2E 测试框架      |
| **@playwright/test** | 1.58.2 | Playwright 测试库 |
| **TypeScript**       | 5.x    | 类型安全          |

---

## 🚀 快速开始

### 运行所有测试

```bash
# 运行所有测试（unit + E2E）
npm run test:all

# 只运行单元测试
npm run test:run

# 只运行 E2E 测试
npm run test:e2e
```

### 生成覆盖率报告

```bash
# 单元测试覆盖率
npm run test:coverage

# 查看覆盖率报告
open coverage/index.html
```

### 监视模式

```bash
# 单元测试监视
npm run test

# E2E 测试 UI 模式
npm run test:e2e:ui
```

---

## 📝 单元测试

### 测试结构

```
src/
├── lib/
│   ├── utils.ts
│   └── __tests__/
│       └── utils.test.ts       # 单元测试
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx     # 组件测试
└── hooks/
    ├── useCounter.ts
    └── __tests__/
        └── useCounter.test.ts  # Hook 测试
```

### 编写单元测试

```typescript
import { describe, it, expect } from 'vitest'

describe('Utils', () => {
  it('should format date correctly', () => {
    const date = new Date('2026-03-21')
    const formatted = formatDate(date)
    expect(formatted).toBe('2026-03-21')
  })
})
```

### 组件测试

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('should call onClick', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## 🔗 集成测试

### 测试 API 路由

```typescript
import { POST, GET } from './route'

describe('API Route', () => {
  it('should handle POST request', async () => {
    const request = mockRequest({
      email: 'test@example.com',
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
  })
})
```

### 测试数据库操作

```typescript
describe('Database Integration', () => {
  it('should create and fetch user', async () => {
    const user = await createUser({ email: 'test@example.com' })
    const fetched = await getUser(user.id)
    expect(fetched.email).toBe('test@example.com')
  })
})
```

---

## 🎭 E2E 测试

### 测试架构

```
e2e/
├── pages/                    # Page Object Model
│   ├── index.ts             # 导出所有页面
│   ├── login-page.ts        # 登录页面
│   ├── dashboard-page.ts    # Dashboard 页面
│   ├── task-creation-page.ts # 任务创建页面
│   └── navigation-page.ts   # 导航页面
├── fixtures/                # 测试 fixtures
│   └── test-data.ts         # 测试数据工厂
├── helpers/                 # 辅助函数
│   └── test-helpers.ts      # 测试辅助工具
├── auth-flow.spec.ts       # 登录流程测试
├── task-creation.spec.ts   # 任务创建测试
├── navigation.spec.ts      # 导航测试
└── visual-regression.spec.ts # 视觉回归测试
```

### 使用页面对象模型

```typescript
import { LoginPage, DashboardPage } from './pages'

test('should login and access dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page)
  const dashboardPage = new DashboardPage(page)

  await loginPage.goto()
  await loginPage.login('user@example.com', 'password')

  await dashboardPage.waitForLoad()
  expect(await dashboardPage.isOnDashboard()).toBeTruthy()
})
```

### 关键用户流程

#### 1. 登录流程

```typescript
test('should login with valid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.login('test@7zi.com', 'test123456')
  await expect(page).toHaveURL('/dashboard')
})
```

#### 2. 创建任务流程

```typescript
test('should create a new task', async ({ page }) => {
  const dashboardPage = new DashboardPage(page)
  const taskCreationPage = new TaskCreationPage(page)

  await dashboardPage.goto()
  await dashboardPage.clickCreateTask()

  await taskCreationPage.fillTitle('Test Task')
  await taskCreationPage.submit()

  const taskCard = dashboardPage.getTaskCardByTitle('Test Task')
  await expect(taskCard).toBeVisible()
})
```

#### 3. 导航流程

```typescript
test('should navigate between pages', async ({ page }) => {
  const nav = new NavigationPage(page)

  await nav.goToTeam()
  await nav.waitForNavigation()
  expect(page.url()).toContain('/team')

  await nav.goToDashboard()
  await nav.waitForNavigation()
  expect(page.url()).toContain('/dashboard')
})
```

### 视觉回归测试

```typescript
test('should match home page screenshot', async ({ page }) => {
  await page.goto('/')
  await page.setViewportSize({ width: 1920, height: 1080 })

  await expect(page).toHaveScreenshot('home-desktop.png', {
    fullPage: true,
    maxDiffPixels: 100,
  })
})
```

### E2E 测试命令

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行特定文件
npm run test:e2e -- login-flow-pom.spec.ts

# 运行特定测试
npm run test:e2e -g "should login"

# UI 模式
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug

# 只运行 Chromium
npm run test:e2e:chromium

# 更新截图基线
npx playwright test --update-snapshots

# 查看 HTML 报告
npm run test:e2e:report
```

### E2E 测试最佳实践

1. **使用页面对象模型 (POM)**
   - 封装页面细节
   - 提高代码复用性
   - 便于维护

2. **智能等待**

   ```typescript
   await page.waitForLoadState('networkidle')
   await page.waitForSelector('.element')
   ```

3. **语义化定位器**

   ```typescript
   page.getByRole('button', { name: 'Submit' })
   page.getByLabel('Email')
   ```

4. **测试数据隔离**

   ```typescript
   const testData = new TestData()
   const uniqueTitle = testData.generateTaskTitle()
   ```

5. **清理测试状态**
   ```typescript
   test.afterEach(async () => {
     await cleanupTestData()
   })
   ```

---

## 📊 测试覆盖率

### 当前覆盖率

| 指标           | 当前 | 目标 | 状态    |
| -------------- | ---- | ---- | ------- |
| **Lines**      | 85%  | 80%  | ✅ 超标 |
| **Functions**  | 82%  | 80%  | ✅ 超标 |
| **Branches**   | 78%  | 70%  | ✅ 超标 |
| **Statements** | 85%  | 80%  | ✅ 超标 |

### 查看覆盖率

```bash
# 生成覆盖率报告
npm run test:coverage

# 在浏览器中查看
open coverage/index.html

# 或使用本地服务器
npx serve coverage
```

### 覆盖率阈值

在 `vitest.config.ts` 中配置：

```typescript
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80,
  },
}
```

---

## ✅ 最佳实践

### 单元测试

**DO ✅**

1. **测试行为，不测试实现**

   ```typescript
   // ✅ 好的测试
   expect(result).toBe('expected')

   // ❌ 测试实现细节
   expect(mockFn).toHaveBeenCalledWith('arg')
   ```

2. **使用描述性测试名称**

   ```typescript
   test('should return 400 when email is invalid')
   ```

3. **AAA 模式**

   ```typescript
   // Arrange
   const input = 'value'

   // Act
   const result = doSomething(input)

   // Assert
   expect(result).toBe('expected')
   ```

4. **使用 beforeEach 清理**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks()
   })
   ```

**DON'T ❌**

1. **不要测试第三方库**
2. **不要测试私有方法**
3. **不要编写脆弱的选择器**
4. **不要在测试中共享状态**

### E2E 测试

**DO ✅**

1. **使用页面对象模型**
2. **智能等待，避免硬编码延迟**
3. **使用语义化定位器**
4. **测试数据隔离**
5. **清理测试状态**

**DON'T ❌**

1. **不要过度使用截图**
2. **不要测试第三方服务**
3. **不要在测试中共享状态**
4. **不要编写脆弱的选择器**

---

## 🔧 故障排除

### 单元测试问题

#### 测试超时

```typescript
test(
  'slow test',
  async () => {
    // ...
  },
  { timeout: 10000 }
)
```

#### Mock 不工作

```typescript
beforeEach(() => {
  vi.clearAllMocks()
  vi.resetAllMocks()
})
```

### E2E 测试问题

#### 元素未找到

```typescript
// 使用更灵活的选择器
await page.locator('button:has-text("Submit")').click()
```

#### 测试不稳定（Flaky）

```typescript
// 等待网络空闲
await page.waitForLoadState('networkidle')

// 等待动画完成
await page.waitForTimeout(500)

// 使用重试
test(
  'flaky test',
  async () => {
    // ...
  },
  { retries: 3 }
)
```

#### 视觉回归失败

```bash
# 更新基线截图
npx playwright test --update-snapshots

# 查看差异
npx playwright show-report
```

### 调试技巧

```typescript
// 暂停执行
await page.pause();

// 截图调试
await page.screenshot({ path: 'debug.png' });

// 检查控制台
page.on('console', msg => console.log(msg.text()));

// 慢速模式
npx playwright test --headed --slowMo=1000
```

---

## 📚 参考资源

### 文档

- [Vitest 官方文档](https://vitest.dev/)
- [Playwright 官方文档](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing JavaScript](https://testingjavascript.com/)

### 7zi 项目文档

- [E2E 测试策略](/docs/E2E_TESTING_STRATEGY.md)
- [测试指南](/docs/TESTING.md)
- [API 文档](/API.md)

---

_最后更新: 2026-03-21_
