# 7zi-Frontend 端到端测试最佳实践

> 🧪 Playwright E2E Testing Best Practices Guide
>
> 创建日期: 2026-03-22
> 维护者: 测试团队

---

## 📋 目录

- [简介](#简介)
- [1. Playwright 测试配置](#1-playwright-测试配置)
- [2. 测试用例设计模式](#2-测试用例设计模式)
- [3. 覆盖率提升策略](#3-覆盖率提升策略)
- [4. 测试运行与维护](#4-测试运行与维护)
- [5. 最佳实践清单](#5-最佳实践清单)

---

## 简介

本文档为 7zi-Frontend 项目提供全面的端到端（E2E）测试最佳实践指南。基于 Playwright 框架，涵盖从配置到维护的完整测试生命周期。

### 项目特点

- **框架**: Next.js 14+ with App Router
- **语言**: TypeScript
- **核心功能**: 性能监控仪表板、权限管理、实时数据展示
- **测试目标**: 覆盖用户关键路径、组件交互、性能指标

---

## 1. Playwright 测试配置

### 1.1 项目初始化

#### 安装 Playwright

```bash
# 使用 npm
npm init playwright@latest

# 使用 pnpm
pnpm create playwright

# 使用 yarn
yarn create playwright
```

#### 目录结构

```
7zi-frontend/
├── e2e/                          # E2E 测试根目录
│   ├── tests/                    # 测试用例
│   │   ├── auth/                 # 认证相关测试
│   │   ├── dashboard/            # 仪表板测试
│   │   ├── monitoring/           # 性能监控测试
│   │   └── api/                  # API 集成测试
│   ├── fixtures/                 # 测试夹具
│   ├── helpers/                  # 测试辅助函数
│   ├── data/                     # 测试数据
│   └── pages/                    # 页面对象模型
├── playwright.config.ts          # Playwright 配置文件
└── tests-examples/               # 示例测试
```

### 1.2 核心配置文件

#### `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // 测试目录
  testDir: './e2e/tests',

  // 并行运行测试
  fullyParallel: true,

  // 失败时重试
  retries: process.env.CI ? 2 : 0,

  // 并发工作进程数
  workers: process.env.CI ? 1 : undefined,

  // 测试报告
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  // 全局设置
  use: {
    // 基础 URL
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

    // 追踪（失败时）
    trace: 'retain-on-failure',

    // 截图（失败时）
    screenshot: 'only-on-failure',

    // 视频录制
    video: 'retain-on-failure',

    // 动作超时
    actionTimeout: 10000,

    // 导航超时
    navigationTimeout: 30000,

    // 视口大小
    viewport: { width: 1280, height: 720 },

    // 忽略 HTTPS 错误（仅测试环境）
    ignoreHTTPSErrors: true,

    // 时区
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },

  // 测试项目配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // 移动端测试
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    // 视觉回归测试
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'only-on-failure',
      },
      testMatch: /.*\.visual\.spec\.ts/,
    },
  ],

  // 测试运行前启动开发服务器
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // 依赖
  dependencies: ['setup'],

  // 输出目录
  outputDir: 'test-results',
});
```

### 1.3 环境变量配置

#### `.env.test`

```bash
# 测试环境配置
NODE_ENV=test

# 测试服务器
TEST_BASE_URL=http://localhost:3000
TEST_API_URL=http://localhost:3000/api

# 测试账户
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# 测试 API 密钥
TEST_API_KEY=test-api-key-12345

# 测试数据库
TEST_DB_URL=postgresql://test:password@localhost:5432/7zi_test

# 外部服务 Mock
MOCK_EXTERNAL_SERVICES=true
```

### 1.4 包脚本配置

#### `package.json` 添加测试脚本

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:chromium": "playwright test --project=chromium",
    "test:e2e:mobile": "playwright test --project='Mobile Chrome'",
    "test:e2e:visual": "playwright test --project=visual-regression",
    "test:e2e:update-snapshots": "playwright test --update-snapshots",
    "test:e2e:report": "playwright show-report",
    "test:e2e:install": "npx playwright install --with-deps",
    "test:e2e:codegen": "playwright codegen"
  }
}
```

---

## 2. 测试用例设计模式

### 2.1 页面对象模型（POM）

#### 基础页面对象

```typescript
// e2e/pages/BasePage.ts
import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }
}
```

#### 仪表板页面

```typescript
// e2e/pages/DashboardPage.ts
import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly pageTitle: Locator;
  readonly refreshButton: Locator;
  readonly metricsGrid: Locator;
  readonly apiRequestCard: Locator;
  readonly operationCard: Locator;
  readonly errorCard: Locator;
  readonly alarmSection: Locator;
  readonly clearDataButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = this.page.getByRole('heading', { name: 'Performance Dashboard' });
    this.refreshButton = this.page.getByRole('button', { name: /refresh/i }).first();
    this.metricsGrid = this.page.locator('.grid').first();
    this.apiRequestCard = this.page.locator('text=API Requests').locator('..').locator('..');
    this.operationCard = this.page.locator('text=Operations').locator('..').locator('..');
    this.errorCard = this.page.locator('text=Errors').locator('..').locator('..');
    this.alarmSection = this.page.locator('text=Recent Alarms').locator('..').locator('..');
    this.clearDataButton = this.page.getByRole('button', { name: /clear data/i });
  }

  async goto(): Promise<void> {
    await this.navigateTo('/monitoring-example');
  }

  async isLoaded(): Promise<boolean> {
    try {
      await expect(this.pageTitle).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async refresh(): Promise<void> {
    await this.refreshButton.click();
    await this.page.waitForSelector('[class*="animate-spin"]', { state: 'hidden' });
  }

  async getAPIRequestCount(): Promise<number> {
    const text = await this.apiRequestCard.locator('.text-2xl').textContent();
    return parseInt(text || '0', 10);
  }

  async getOperationCount(): Promise<number> {
    const text = await this.operationCard.locator('.text-2xl').textContent();
    return parseInt(text || '0', 10);
  }

  async getErrorCount(): Promise<number> {
    const text = await this.errorCard.locator('.text-2xl').textContent();
    return parseInt(text || '0', 10);
  }

  async hasActiveAlarms(): Promise<boolean> {
    const alarmIndicator = this.page.locator('text=Active Alarms');
    return await alarmIndicator.isVisible();
  }

  async verifyMetricsCards(): Promise<void> {
    await expect(this.apiRequestCard).toBeVisible();
    await expect(this.operationCard).toBeVisible();
    await expect(this.errorCard).toBeVisible();
  }
}
```

### 2.2 测试用例模式

#### 快乐路径测试

```typescript
// e2e/tests/dashboard/happy-path.spec.ts
import { test, expect } from '../../../tests/setup';
import { DashboardPage } from '../../pages/DashboardPage';

test.describe('仪表板 - 快乐路径', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test('应该成功加载仪表板页面', async () => {
    await dashboardPage.goto();
    await expect(dashboardPage.pageTitle).toBeVisible();
    await expect(dashboardPage.refreshButton).toBeVisible();
    await expect(dashboardPage.clearDataButton).toBeVisible();
  });

  test('应该显示所有指标卡片', async () => {
    await dashboardPage.goto();
    await dashboardPage.verifyMetricsCards();
  });

  test('应该能够刷新数据', async () => {
    await dashboardPage.goto();
    const initialCount = await dashboardPage.getAPIRequestCount();
    await dashboardPage.refresh();
    const refreshedCount = await dashboardPage.getAPIRequestCount();
    expect(typeof refreshedCount).toBe('number');
    expect(refreshedCount).toBeGreaterThanOrEqual(0);
  });
});
```

#### 数据驱动测试

```typescript
// e2e/tests/dashboard/data-driven.spec.ts
import { test, expect } from '../../../tests/setup';
import { DashboardPage } from '../../pages/DashboardPage';

const metricThresholds = [
  { name: 'API Success Rate', min: 0.95, max: 1.0 },
  { name: 'Operation Success Rate', min: 0.95, max: 1.0 },
  { name: 'Error Rate', min: 0.0, max: 0.05 },
];

test.describe('仪表板 - 数据驱动测试', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test('应该验证所有指标在正常范围内', async () => {
    for (const threshold of metricThresholds) {
      const value = await dashboardPage.getMetricValue(threshold.name);
      expect(value).toBeGreaterThanOrEqual(threshold.min);
      expect(value).toBeLessThanOrEqual(threshold.max);
    }
  });

  test('应该处理各种屏幕尺寸', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await dashboardPage.goto();
      await expect(dashboardPage.pageTitle).toBeVisible();
      await expect(dashboardPage.metricsGrid).toBeVisible();
    }
  });
});
```

### 2.3 测试辅助函数

```typescript
// e2e/helpers/test-utils.ts
import { Page, Locator, expect } from '@playwright/test';

export async function waitForNetworkIdle(page: Page, timeout = 30000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

export async function waitForClickable(locator: Locator, timeout = 5000): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });
  await locator.waitForElementState('stable', { timeout });
}

export async function waitForText(
  page: Page,
  text: string,
  options: { timeout?: number; exact?: boolean } = {}
): Promise<void> {
  const { timeout = 5000, exact = false } = options;
  await expect(page.locator(`text=${text}`), `Expected text "${text}" to appear`)
    .toBeVisible({ timeout });
}

export async function compareScreenshots(
  page: Page,
  name: string,
  threshold = 0.2
): Promise<void> {
  await expect(page).toHaveScreenshot(name, {
    maxDiffPixels: 100,
    threshold,
  });
}

export function generateRandomEmail(): string {
  return `test-${Date.now()}@example.com`;
}

export function generateRandomPassword(): string {
  return `Test${Math.random().toString(36).slice(-8)}!`;
}
```

#### API 模拟辅助函数

```typescript
// e2e/helpers/api-mock.ts
import { Page, Route } from '@playwright/test';

export async function mockAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: any,
  status = 200
): Promise<void> {
  await page.route(urlPattern, async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

export async function mockAPIError(
  page: Page,
  urlPattern: string | RegExp,
  errorStatus = 500,
  errorMessage = 'Internal Server Error'
): Promise<void> {
  await page.route(urlPattern, async (route: Route) => {
    await route.fulfill({
      status: errorStatus,
      contentType: 'application/json',
      body: JSON.stringify({ error: errorMessage }),
    });
  });
}

export async function mockAPIDelay(
  page: Page,
  urlPattern: string | RegExp,
  delay = 2000
): Promise<void> {
  await page.route(urlPattern, async (route: Route) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    await route.continue();
  });
}
```

---

## 3. 覆盖率提升策略

### 3.1 覆盖率目标

| 覆盖率类型 | 目标值 | 说明 |
|-----------|--------|------|
| 关键路径 | 100% | 用户核心操作流程 |
| 代码覆盖率 | >80% | 语句覆盖率 |
| 分支覆盖率 | >75% | 条件分支覆盖 |
| 组件覆盖率 | >70% | React 组件覆盖 |

### 3.2 测试矩阵策略

```typescript
// e2e/tests/test-matrix.spec.ts
import { test } from '../tests/setup';

const testMatrix = {
  browsers: ['chromium', 'firefox', 'webkit'],
  viewports: [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 },
  ],
  userRoles: ['admin', 'user', 'guest'],
  themes: ['light', 'dark'],
};

test.describe('测试矩阵', () => {
  for (const browser of testMatrix.browsers) {
    test.describe(`浏览器: ${browser}`, () => {
      for (const viewport of testMatrix.viewports) {
        test.describe(`视口: ${viewport.name}`, () => {
          test('应该正确渲染仪表板', async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            // 执行测试
          });
        });
      }
    });
  }
});
```

### 3.3 边界测试策略

```typescript
// e2e/tests/dashboard/boundary-tests.spec.ts
import { test, expect } from '../../tests/setup';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('仪表板 - 边界测试', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
  });

  test('应该处理零指标值', async () => {
    // 模拟零数据，验证零值显示
  });

  test('应该处理最大指标值', async () => {
    // 模拟最大值，验证最大值显示和格式化
  });

  test('应该处理极端延迟响应', async ({ page }) => {
    // 模拟超长 API 响应时间，验证加载状态和超时处理
  });

  test('应该处理并发刷新', async () => {
    // 多次快速点击刷新，验证不会导致重复请求或错误
  });
});
```

### 3.4 视觉回归测试

```typescript
// e2e/tests/visual/dashboard-visual.spec.ts
import { test, expect } from '../../tests/setup';

test.describe('仪表板 - 视觉回归', () => {
  test('应该匹配仪表板截图', async ({ page }) => {
    await page.goto('/monitoring-example');
    await page.waitForLoadState('networkidle');

    // 完整页面截图
    await expect(page).toHaveScreenshot('dashboard-full.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('应该匹配指标卡片截图', async ({ page }) => {
    await page.goto('/monitoring-example');
    await page.waitForLoadState('networkidle');

    const metricsGrid = page.locator('.grid').first();
    await expect(metricsGrid).toHaveScreenshot('metrics-cards.png');
  });
});
```

### 3.5 性能测试策略

```typescript
// e2e/tests/performance/performance.spec.ts
import { test } from '../../tests/setup';

test.describe('仪表板 - 性能测试', () => {
  test('页面加载应该在合理时间内完成', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/monitoring-example');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // 页面加载时间应小于 3 秒
    expect(loadTime).toBeLessThan(3000);
  });

  test('刷新操作应该快速响应', async ({ page }) => {
    await page.goto('/monitoring-example');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();
    await page.getByRole('button', { name: /refresh/i }).click();
    await page.waitForSelector('[class*="animate-spin"]', { state: 'hidden' });
    const responseTime = Date.now() - startTime;

    // 刷新响应应小于 1 秒
    expect(responseTime).toBeLessThan(1000);
  });

  test('应该检测内存泄漏', async ({ page }) => {
    await page.goto('/monitoring-example');

    const initialMemory = await page.evaluate(() =>
      (performance as any).memory?.usedJSHeapSize || 0
    );

    // 执行多次刷新
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: /refresh/i }).click();
      await page.waitForTimeout(500);
    }

    const finalMemory = await page.evaluate(() =>
      (performance as any).memory?.usedJSHeapSize || 0
    );

    const memoryIncrease = finalMemory - initialMemory;

    // 内存增长应小于 10MB
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
```

### 3.6 可访问性测试

```typescript
// e2e/tests/accessibility/a11y.spec.ts
import { test, expect } from '../../tests/setup';

test.describe('仪表板 - 可访问性', () => {
  test('应该支持键盘导航', async ({ page }) => {
    await page.goto('/monitoring-example');

    // 测试 Tab 导航
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // 验证焦点元素可见
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'A']).toContain(focusedElement);
  });

  test('应该有适当的 ARIA 标签', async ({ page }) => {
    await page.goto('/monitoring-example');

    // 检查按钮有 aria-label 或 text
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const hasLabel = await button.evaluate((el) => {
        const ariaLabel = el.getAttribute('aria-label');
        const text = el.textContent?.trim();
        return !!(ariaLabel || text);
      });
      expect(hasLabel).toBeTruthy();
    }
  });
});
```

### 3.7 国际化测试

```typescript
// e2e/tests/i18n/i18n.spec.ts
import { test, expect } from '../../tests/setup';

const locales = ['zh-CN', 'en-US', 'ja-JP'];

test.describe('仪表板 - 国际化', () => {
  for (const locale of locales) {
    test.describe(`语言: ${locale}`, () => {
      test('应该正确显示翻译文本', async ({ page }) => {
        await page.addInitScript(`window.locale = '${locale}'`);
        await page.goto('/monitoring-example');

        const titles = {
          'zh-CN': '性能仪表板',
          'en-US': 'Performance Dashboard',
          'ja-JP': 'パフォーマンスダッシュボード',
        };

        await expect(page.locator('h1, h2')).toContainText(titles[locale as keyof typeof titles]);
      });
    });
  }
});
```

---

## 4. 测试运行与维护

### 4.1 测试运行策略

#### 本地开发环境

```bash
# 快速运行（仅 Chromium）
npm run test:e2e

# 调试模式
npm run test:e2e:debug

# UI 模式（可视化测试运行）
npm run test:e2e:ui
```

#### CI/CD 环境

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
```

### 4.2 测试维护

#### 定期维护任务

1. **每周**:
   - 更新测试数据
   - 清理过期的测试截图
   - 审查测试覆盖率报告

2. **每月**:
   - 更新 Playwright 版本
   - 审查并优化慢速测试
   - 更新测试文档

3. **每季度**:
   - 全面审查测试套件
   - 删除冗余测试
   - 优化测试执行时间

### 4.3 测试报告与分析

#### 生成 HTML 报告

```bash
# 运行测试并生成报告
npm run test:e2e

# 查看报告
npm run test:e2e:report
```

---

## 5. 最佳实践清单

### 5.1 测试编写原则

#### ✅ 推荐做法

- 使用页面对象模型（POM）封装页面逻辑
- 编写独立、可重复的测试
- 使用描述性的测试名称
- 测试应该验证一个单一行为
- 使用合理的等待策略（避免硬编码延迟）
- 使用数据驱动测试减少重复代码

#### ❌ 避免的做法

- 在测试中使用 `sleep()` 或固定延迟
- 编写过长的测试（超过 5 分钟）
- 在多个测试中重复相同的代码
- 使用硬编码的选择器
- 忽略测试失败
- 在测试中包含复杂的业务逻辑

### 5.2 测试稳定性

- 使用 Playwright 的自动等待功能
- 为不稳定测试配置重试策略
- 使用 `test.step()` 组织测试步骤
- 避免依赖外部不可控资源
- 使用 Mock 和 Stub 隔离依赖
- 在 CI 环境中使用 `headless` 模式

### 5.3 性能优化

- 并行运行测试（`fullyParallel: true`）
- 合理使用 `test.describe()` 分组
- 避免重复的页面导航
- 使用 `test.beforeEach()` 和 `test.afterEach()` 清理
- 只测试必要的浏览器组合
- 使用测试标签过滤运行特定测试

### 5.4 调试技巧

- 使用 `playwright test --debug` 模式
- 检查 `test-results/` 目录下的截图和视频
- 使用 `console.log()` 输出调试信息
- 启用 `trace: 'on'` 查看完整追踪
- 使用 Playwright Inspector 检查元素选择器
- 利用 VS Code 的 Playwright 扩展

---

## 附录

### A. 快速参考

#### 常用命令

```bash
# 安装 Playwright
npm init playwright@latest

# 运行所有测试
npx playwright test

# 运行特定测试文件
npx playwright test tests/example.spec.ts

# 运行特定测试
npx playwright test -g "test name"

# 调试模式
npx playwright test --debug

# UI 模式
npx playwright test --ui

# 显示报告
npx playwright show-report

# 代码生成器
npx playwright codegen

# 更新截图
npx playwright test --update-snapshots
```

### B. 有用的链接

- [Playwright 官方文档](https://playwright.dev)
- [Playwright GitHub](https://github.com/microsoft/playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Next.js Testing](https://nextjs.org/docs/testing)

### C. 常见问题

**Q: 如何处理动态内容？**

A: 使用 `waitForSelector()` 或 `waitForFunction()` 等待特定条件满足，而不是使用固定的延迟。

**Q: 如何模拟 API 响应？**

A: 使用 `page.route()` 拦截请求并返回自定义响应。参见 `api-mock.ts` 辅助函数。

**Q: 如何测试文件上传？**

A: 使用 `setInputFiles()` 方法，可以传入文件路径或 Buffer。

**Q: 如何处理认证？**

A: 使用 `context.storageState()` 保存认证状态，或创建自定义 Fixture。

---

**文档版本**: 1.0.0
**最后更新**: 2026-03-22
**维护者**: 测试团队
