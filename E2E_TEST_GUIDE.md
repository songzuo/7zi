# E2E 测试指南 (E2E Testing Guide)

> 7zi AI 团队管理平台 - 端到端测试完整指南

---

## 📋 目录

1. [概述](#概述)
2. [测试框架选择](#测试框架选择)
3. [环境准备](#环境准备)
4. [测试结构](#测试结构)
5. [快速开始](#快速开始)
6. [编写测试](#编写测试)
7. [页面对象模型 (POM)](#页面对象模型-pom)
8. [测试场景示例](#测试场景示例)
9. [测试报告](#测试报告)
10. [最佳实践](#最佳实践)
11. [故障排除](#故障排除)
12. [CI/CD 集成](#cicd-集成)

---

## 概述

### 测试覆盖范围

本项目的 E2E 测试使用 **Playwright** 框架，覆盖以下关键业务流程：

| 场景          | 测试文件                    | 状态 |
| ------------- | --------------------------- | ---- |
| 用户登录      | `auth-flow.spec.ts`         | ✅   |
| 用户注册      | `user-registration.spec.ts` | ✅   |
| 任务创建/管理 | `task-creation-pom.spec.ts` | ✅   |
| 反馈提交      | `form.spec.ts`              | ✅   |
| 项目管理      | `dashboard.spec.ts`         | ✅   |

### 测试统计

- **测试文件数**: 24 个
- **总测试用例**: 3,106+（跨所有浏览器）
- **浏览器覆盖**: Chromium, Firefox, WebKit
- **设备覆盖**: Desktop, Mobile (Pixel 5), Tablet (iPad)

---

## 测试框架选择

### 为什么选择 Playwright？

相比 Cypress，Playwright 的优势：

| 特性                | Playwright                   | Cypress              |
| ------------------- | ---------------------------- | -------------------- |
| **多浏览器支持**    | ✅ Chromium, Firefox, WebKit | ⚠️ 主要基于 Chromium |
| **并行执行**        | ✅ 原生支持                  | ⚠️ 需要额外配置      |
| **移动端测试**      | ✅ 设备模拟                  | ⚠️ 有限支持          |
| **性能**            | ✅ 更快                      | ⚠️ 较慢              |
| **自动化截图/视频** | ✅ 内置                      | ✅ 内置              |
| **测试隔离**        | ✅ 浏览器上下文隔离          | ⚠️ 共享窗口          |
| **API 支持**        | ✅ 强大的 API 测试           | ⚠️ 有限              |

### 架构设计

```
测试执行层
    ↓
Page Object Model (POM)
    ↓
页面对象 (pages/*)
    ↓
辅助函数 (helpers/*)
    ↓
测试数据 (fixtures/*)
```

---

## 环境准备

### 系统要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **操作系统**: Linux, macOS, Windows

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd 7zi-project

# 安装项目依赖
npm install

# 安装 Playwright 浏览器
npx playwright install --with-deps
```

### 环境变量

创建 `.env.test` 文件：

```env
# 应用配置
BASE_URL=http://localhost:3000
NODE_ENV=test

# 测试用户（可选）
TEST_USER_EMAIL=test@7zi.com
TEST_USER_PASSWORD=test123456
TEST_ADMIN_EMAIL=admin@7zi.com
TEST_ADMIN_PASSWORD=admin123456

# 数据库配置
DATABASE_URL=:memory:

# API 配置
API_URL=http://localhost:3000/api
```

### 开发服务器

测试需要应用在后台运行：

```bash
# 方式 1: 使用 Playwright 自动启动（推荐）
# playwright.config.ts 已配置 webServer

# 方式 2: 手动启动
npm run dev &
```

---

## 测试结构

### 目录结构

```
e2e/
├── fixtures/                    # 测试数据和 Mock
│   └── test-data.ts            # 测试数据工厂
├── helpers/                    # 辅助函数
│   ├── index.ts               # 导出
│   └── test-helpers.ts        # 工具函数
├── pages/                      # Page Object Model
│   ├── index.ts               # 统一导出
│   ├── login-page.ts          # 登录页
│   ├── dashboard-page.ts      # 仪表盘页
│   ├── task-creation-page.ts   # 任务创建页
│   └── ...                    # 其他页面对象
├── integration/                # 集成测试
│   └── user-flow.spec.ts      # 完整用户流程
├── snapshots/                  # 视觉回归基线
├── auth-flow.spec.ts           # 认证流程测试
├── task-creation-pom.spec.ts   # 任务创建测试（POM）
├── form.spec.ts                # 表单测试（反馈提交）
├── dashboard.spec.ts           # 仪表盘测试
└── ...                        # 其他测试文件
```

### 配置文件

**playwright.config.ts** - 主配置文件

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // 测试目录
  testDir: './e2e',

  // 匹配模式
  testMatch: '**/*.spec.ts',

  // 并行执行
  fullyParallel: true,

  // 重试次数
  retries: process.env.CI ? 2 : 0,

  // 浏览器项目
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // 报告器
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit-results.xml' }],
  ],

  // 开发服务器
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 快速开始

### 基本命令

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 使用 UI 模式（推荐）
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug

# 查看测试报告
npm run test:e2e:report

# 只运行 Chromium 浏览器
npm run test:e2e:chromium

# 运行特定测试文件
npx playwright test login-flow.spec.ts

# 运行匹配的测试
npx playwright test -g "should login"

# 慢速模式（便于观察）
npx playwright test --slowMo=1000
```

### 使用运行脚本

```bash
# 运行所有测试
./run-e2e.sh

# UI 模式
./run-e2e.sh -u

# 调试模式
./run-e2e.sh -d

# 运行特定文件
./run-e2e.sh -f login-flow-pom.spec.ts

# 查看报告
./run-e2e.sh -r

# 更新截图
./run-e2e.sh -s
```

---

## 编写测试

### 测试模板

```typescript
import { test, expect } from '@playwright/test'

test.describe('功能模块名称', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前的准备
    await page.goto('/')
  })

  test('应该完成某个功能', async ({ page }) => {
    // 测试步骤
    await page.click('button')
    await expect(page).toHaveURL('/new-page')
  })

  test('另一个测试用例', async ({ page }) => {
    // ...
  })

  test.afterEach(async ({ page }) => {
    // 每个测试后的清理
    await page.close()
  })
})
```

### 选择器策略

优先使用 Playwright 的语义化选择器：

```typescript
// ✅ 推荐：使用角色
page.getByRole('button', { name: '提交' })

// ✅ 推荐：使用文本
page.getByText('欢迎')
page.getByLabel('邮箱')

// ✅ 推荐：使用测试 ID
page.getByTestId('submit-button')

// ⚠️ 谨慎使用：CSS 选择器
page.locator('.btn-primary')

// ❌ 避免：脆弱的选择器
page.locator('div > div:nth-child(2) > span')
```

### 异步操作

```typescript
test('should handle async operations', async ({ page }) => {
  // 等待元素出现
  await page.waitForSelector('.element')

  // 等待页面加载
  await page.waitForLoadState('networkidle')

  // 等待 URL 变化
  await page.waitForURL('/dashboard')

  // 等待响应
  const response = await page.waitForResponse('/api/data')

  // 带重试的等待
  await expect(page.locator('.element')).toBeVisible({ timeout: 10000 })
})
```

---

## 页面对象模型 (POM)

### 什么是 POM？

Page Object Model 将页面元素和操作封装成类，提高测试的可维护性和复用性。

### 页面对象示例

**pages/login-page.ts**

```typescript
import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByLabel('邮箱')
    this.passwordInput = page.getByLabel('密码')
    this.loginButton = page.getByRole('button', { name: '登录' })
    this.errorMessage = page.locator('.error-message')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent()
  }
}
```

### 使用页面对象

```typescript
import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login-page'

test('should login with valid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page)

  // 使用页面对象
  await loginPage.goto()
  await loginPage.login('test@7zi.com', 'password123')

  // 验证结果
  await expect(page).toHaveURL('/dashboard')
})
```

### 已有页面对象列表

| 文件                      | 描述         |
| ------------------------- | ------------ |
| `login-page.ts`           | 登录页面     |
| `dashboard-page.ts`       | 仪表盘页面   |
| `task-creation-page.ts`   | 任务创建页面 |
| `navigation-page.ts`      | 导航控制     |
| `contact-page.ts`         | 联系表单页面 |
| `team-page.ts`            | 团队管理页面 |
| `user-management-page.ts` | 用户管理页面 |
| `notifications-page.ts`   | 通知页面     |
| `settings-page.ts`        | 设置页面     |
| `analytics-page.ts`       | 分析页面     |

---

## 测试场景示例

### 场景 1: 用户登录

**文件**: `e2e/auth-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login-page'

test.describe('Authentication Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page)

    await loginPage.goto()
    await loginPage.login('test@7zi.com', 'password123')

    // 验证登录成功
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('欢迎')).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page)

    await loginPage.goto()
    await loginPage.login('wrong@email.com', 'wrongpassword')

    // 验证错误消息
    const error = await loginPage.getErrorMessage()
    expect(error).toContain('邮箱或密码错误')
  })
})
```

### 场景 2: 项目/任务创建

**文件**: `e2e/task-creation-pom.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login-page'
import { TaskCreationPage } from './pages/task-creation-page'

test.describe('Task Creation', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('test@7zi.com', 'password123')
  })

  test('should create a new task', async ({ page }) => {
    const taskPage = new TaskCreationPage(page)

    await taskPage.goto()
    await taskPage.createTask({
      title: '测试任务',
      description: '这是一个测试任务描述',
      priority: 'high',
      assignee: 'John Doe',
    })

    // 验证任务创建成功
    await expect(page.getByText('任务创建成功')).toBeVisible()
    await expect(page).toHaveURL(/\/tasks\/.+/)
  })

  test('should validate required fields', async ({ page }) => {
    const taskPage = new TaskCreationPage(page)
    await taskPage.goto()

    // 不填写必填字段直接提交
    await taskPage.submitForm()

    // 验证验证错误
    await expect(page.getByText('标题是必填的')).toBeVisible()
  })
})
```

### 场景 3: 反馈提交

**文件**: `e2e/form.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { ContactPage } from './pages/contact-page'

test.describe('Feedback Form', () => {
  test('should submit feedback successfully', async ({ page }) => {
    const contactPage = new ContactPage(page)

    await contactPage.goto()
    await contactPage.submitFeedback({
      name: '张三',
      email: 'zhangsan@example.com',
      subject: '功能建议',
      message: '建议增加新的数据分析功能',
      rating: 5,
    })

    // 验证提交成功
    await expect(page.getByText('感谢您的反馈')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    const contactPage = new ContactPage(page)
    await contactPage.goto()

    // 填写无效邮箱
    await contactPage.fillEmail('invalid-email')
    await contactPage.submitForm()

    // 验证错误
    await expect(page.getByText('请输入有效的邮箱地址')).toBeVisible()
  })
})
```

### 完整用户流程示例

**文件**: `e2e/integration/user-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/login-page'
import { TaskCreationPage } from '../pages/task-creation-page'
import { DashboardPage } from '../pages/dashboard-page'

test.describe('Complete User Flow', () => {
  test('should complete full workflow: login -> create task -> verify on dashboard', async ({
    page,
  }) => {
    // 1. 登录
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('test@7zi.com', 'password123')

    // 2. 创建任务
    const taskPage = new TaskCreationPage(page)
    await taskPage.goto()
    const taskTitle = `测试任务-${Date.now()}`
    await taskPage.createTask({
      title: taskTitle,
      description: '完整流程测试任务',
      priority: 'medium',
    })

    // 3. 验证任务出现在仪表盘
    const dashboardPage = new DashboardPage(page)
    await dashboardPage.goto()
    await dashboardPage.searchTask(taskTitle)

    await expect(page.getByText(taskTitle)).toBeVisible()
  })
})
```

---

## 测试报告

### HTML 报告

运行测试后自动生成 HTML 报告：

```bash
npm run test:e2e
npm run test:e2e:report  # 查看报告
```

报告位置：`playwright-report/index.html`

### JSON 报告

```json
{
  "config": {},
  "suites": [
    {
      "title": "Authentication Flow",
      "specs": [
        {
          "title": "should login with valid credentials",
          "ok": true,
          "tests": []
        }
      ]
    }
  ]
}
```

### JUnit 报告

用于 CI/CD 集成：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="Authentication Flow" tests="2" failures="0">
    <testcase name="should login with valid credentials" />
    <testcase name="should show error with invalid credentials" />
  </testsuite>
</testsuites>
```

### 视觉回归报告

运行视觉回归测试后：

```bash
npm run test:e2e:report
```

查看截图对比和差异报告。

---

## 最佳实践

### 1. 测试独立性

每个测试应该独立运行，不依赖其他测试：

```typescript
test('should work independently', async ({ page }) => {
  // 每个测试都有自己的页面上下文
  // 使用测试数据工厂创建独立数据
})
```

### 2. 智能等待

避免硬编码延迟，使用 Playwright 的自动等待：

```typescript
// ❌ 不好：硬编码延迟
await page.waitForTimeout(5000)

// ✅ 好：等待元素
await expect(page.locator('.element')).toBeVisible()

// ✅ 好：等待网络空闲
await page.waitForLoadState('networkidle')

// ✅ 好：等待 API 响应
await page.waitForResponse('/api/data')
```

### 3. 语义化测试名称

测试名称应该描述用户行为：

```typescript
// ❌ 不好
test('test1', async ({ page }) => {})

// ✅ 好
test('should display error message when email is invalid', async ({ page }) => {})
```

### 4. 使用测试数据工厂

统一管理测试数据：

```typescript
// fixtures/test-data.ts
export class TestData {
  static users() {
    return {
      admin: { email: 'admin@7zi.com', password: 'admin123' },
      user: { email: 'user@7zi.com', password: 'user123' },
    }
  }

  static tasks() {
    return {
      pending: { title: '待办任务', status: 'pending' },
      completed: { title: '已完成任务', status: 'completed' },
    }
  }
}

// 使用
const { admin } = TestData.users()
```

### 5. 断言精确性

断言应该明确且具体：

```typescript
// ❌ 模糊
expect(page.url()).toContain('dashboard')

// ✅ 精确
await expect(page).toHaveURL(/\/dashboard$/)
```

### 6. 测试组织

使用 describe 分组相关测试：

```typescript
test.describe('User Authentication', () => {
  test.describe('Login', () => {
    test('with valid credentials', async ({ page }) => {})
    test('with invalid credentials', async ({ page }) => {})
  })

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {})
  })
})
```

### 7. 处理异步状态

使用 waitFor 处理异步更新：

```typescript
await page.click('button')

// 等待状态更新
await page.waitForTimeout(100) // 给反应时间
await expect(page.locator('.status')).toHaveText('success')
```

### 8. 测试清理

使用 afterEach 清理测试状态：

```typescript
test.afterEach(async ({ page }) => {
  // 清理创建的数据
  await page.goto('/settings')
  await page.click('button:text("清除所有数据")')
})
```

---

## 故障排除

### 问题 1: 测试超时

**错误**：

```
Error: Test timeout of 30000ms exceeded
```

**解决方案**：

```typescript
// 增加超时时间
test.setTimeout(60000)

// 或在配置中设置
test.use({ actionTimeout: 30000 })
```

### 问题 2: 元素未找到

**错误**：

```
Error: locator.click: Target closed
```

**解决方案**：

```typescript
// 使用重试
await page.click('button', { timeout: 10000 })

// 或等待元素稳定
await page.waitForSelector('button', { state: 'visible' })
```

### 问题 3: 测试不稳定（Flaky）

**解决方案**：

```typescript
// 增加重试次数
test(
  'flaky test',
  async ({ page }) => {
    // ...
  },
  { retries: 3 }
)

// 或在配置中
export default defineConfig({
  retries: 3,
})
```

### 问题 4: 视觉回归失败

**解决方案**：

```bash
# 更新基线截图
npx playwright test --update-snapshots

# 或忽略某些元素
await expect(page.locator('.content')).toHaveScreenshot({
  mask: [page.locator('.dynamic-date')],
});
```

### 问题 5: 数据库连接问题

**解决方案**：

```typescript
// 使用内存数据库
process.env.DATABASE_URL = ':memory:'

// 或 Mock 数据库
vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(() => mockDb),
}))
```

---

## CI/CD 集成

### GitHub Actions

创建 `.github/workflows/e2e-tests.yml`：

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Upload test screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: test-results/
          retention-days: 7
```

### Docker 测试环境

创建 `docker-compose.test.yml`：

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=test
      - DATABASE_URL=/data/test.db
    volumes:
      - ./test-results:/app/test-results

  playwright:
    image: mcr.microsoft.com/playwright:v1.58.2-jammy
    depends_on:
      - app
    volumes:
      - .:/tests
      - ./test-results:/tests/test-results
    working_dir: /tests
    command: npx playwright test
```

运行：

```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

---

## 附录

### 相关文档

- [Playwright 官方文档](https://playwright.dev/)
- [项目 README](/README.md)
- [测试策略文档](/TESTING.md)
- [E2E 完成报告](/e2e/COMPLETION_SUMMARY.md)

### 脚本参考

| 脚本                      | 功能              |
| ------------------------- | ----------------- |
| `npm run test:e2e`        | 运行所有 E2E 测试 |
| `npm run test:e2e:ui`     | UI 模式运行测试   |
| `npm run test:e2e:debug`  | 调试模式          |
| `npm run test:e2e:report` | 查看测试报告      |
| `./run-e2e.sh`            | 高级运行脚本      |

### 示例测试文件

- ✅ `auth-flow.spec.ts` - 登录流程
- ✅ `task-creation-pom.spec.ts` - 任务创建
- ✅ `form.spec.ts` - 反馈表单
- ✅ `integration/user-flow.spec.ts` - 完整流程

---

**文档版本**: 1.0.0
**最后更新**: 2026-03-22
**维护者**: 🧪 测试员
