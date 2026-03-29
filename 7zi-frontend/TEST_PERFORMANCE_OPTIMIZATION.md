# Playwright E2E 测试性能优化报告

**项目**: 7zi-frontend  
**分析日期**: 2026-03-28  
**分析师**: 🧪 测试员

---

## 📊 当前配置概览

| 配置项 | 当前值 | 评估 |
|--------|--------|------|
| `fullyParallel` | `true` | ✅ 良好 |
| `workers` (本地) | `undefined` (全部核心) | ✅ 良好 |
| `workers` (CI) | `1` | ⚠️ 可优化 |
| `retries` (本地) | `0` | ✅ 合理 |
| `retries` (CI) | `2` | ✅ 合理 |
| `actionTimeout` | `10000ms` | ✅ 合理 |
| `navigationTimeout` | `30000ms` | ⚠️ 可收紧 |
| `trace` | `on-first-retry` | ✅ 良好 |
| `video` | `retain-on-failure` | ✅ 良好 |
| `screenshot` | `only-on-failure` | ✅ 良好 |

## 📁 测试文件统计

| 文件 | 行数 | 测试数 |
|------|------|--------|
| `core-features.spec.ts` | 505 | 13 |
| `error-handling.spec.ts` | 623 | 14 |
| `login-flow.spec.ts` | 272 | 6 |
| `notifications.spec.ts` | 423 | 6 |
| `register-flow.spec.ts` | 371 | 6 |
| `visual-regression.spec.ts` | 98 | 5 |
| `websocket.spec.ts` | 703 | 9 |
| **总计** | **2995** | **~59** |

## 🔴 性能问题分析

### 问题 1: 浏览器项目过多 (严重)

**现状**: 配置了 5 个浏览器项目
- chromium (桌面)
- firefox (桌面)
- webkit (桌面)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

**问题**: 本地开发时运行全部 5 个浏览器，测试时间 ×5

**建议**: 
```typescript
// 开发环境只跑 chromium
projects: process.env.CI ? [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  // ... 其他浏览器
] : [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
]
```

---

### 问题 2: 硬编码等待时间

**发现位置**:
```typescript
// core-features.spec.ts:202
await page.waitForTimeout(500);

// test-helpers.ts:10
export async function waitForElement(page, selector, timeout = 5000)

// test-helpers.ts:118
export async function waitForNetworkIdle(page, timeout = 10000)
```

**问题**: 
- `waitForTimeout(500)` 是盲目等待，不可靠且浪费
- `networkidle` 等待可能过长

**建议**: 使用 `expect(locator).toBeVisible()` 替代，它更智能且有内置重试

---

### 问题 3: 重复页面导航

**发现**: 多个测试文件都有 `test.beforeEach(async ({ page }) => { await page.goto('/'); })`

**问题**: 每个测试都重新加载页面，没有利用 Playwright 的 SPA 路由测试能力

**建议**: 
- 使用 `baseURL` + 相对路径
- 相关测试放在同一个 `test.describe` 块内共享导航

---

### 问题 4: 缺少全局 Setup/Teardown

**现状**: 没有 `globalSetup` 或 `globalTeardown`

**问题**: 每个 worker 独立启动，重复操作

**建议**: 添加全局 setup 做一次性的初始化

---

## ✅ 优化建议

### 1. 优化后的 playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  
  // 本地开发优化重试
  retries: process.env.CI ? 2 : 1,
  
  // Workers 优化
  workers: process.env.CI 
    ? 2  // CI 上减少并行，避免资源争抢
    : Math.max(1, require('os').cpus().length - 1),  // 本地留一个核心给系统
  
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 收紧超时
    actionTimeout: 8000,      // 8s (原 10s)
    navigationTimeout: 20000, // 20s (原 30s)
    
    // 优化页面加载
    launchOptions: {
      args: ['--disable-dev-shm-usage'],
    },
  },

  // 浏览器项目优化
  projects: [
    // 开发环境只用 chromium
    ...(process.env.CI 
      ? [
          { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : [
          { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        ]
    ),
  ],

  // 全局 setup
  globalSetup: process.env.CI ? './e2e/config/global-setup.ts' : undefined,

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### 2. 添加全局 Setup (可选)

```typescript
// e2e/config/global-setup.ts
import { chromium } from '@playwright/test';

export default async () => {
  // 预热浏览器
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await browser.close();
};
```

### 3. 优化测试代码

**替换硬编码等待**:
```typescript
// ❌ 之前
await page.waitForTimeout(500);

// ✅ 之后 - 使用智能等待
await expect(page.getByRole('textbox')).toBeVisible({ timeout: 5000 });
```

**合并相关测试减少导航**:
```typescript
test.describe('搜索功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/search');
  });

  test('搜索输入框可见', async ({ page }) => {
    await expect(page.getByRole('searchbox')).toBeVisible();
  });

  test('搜索结果正常', async ({ page }) => {
    await page.getByRole('searchbox').fill('test');
    await page.getByRole('button', { name: '搜索' }).click();
    await expect(page.getByRole('list')).toBeVisible();
  });
});
```

---

## 📈 预期性能提升

| 优化项 | 提升幅度 |
|--------|----------|
| 仅开发环境使用 chromium | **~70%** 测试时间减少 |
| 收紧超时 | **~5-10%** 失败快速反馈 |
| 减少盲目等待 | **~10-20%** 单测试时间 |
| CI 减少 workers | 资源争抢减少，稳定性提升 |
| 添加 retries=1 本地 | 偶发失败自动恢复 |

**总体预期**: 本地开发测试时间从 **~10分钟 → ~2-3分钟**

---

## 🚀 推荐实施步骤

1. ✅ 采纳优化后的 `playwright.config.ts`
2. ✅ 审查测试文件，移除 `waitForTimeout`
3. ⬜ 考虑添加 `globalSetup`（可选）
4. ⬜ 设置环境变量区分开发/CI 流程
5. ⬜ 运行基准测试，记录优化前后的实际时间

---

**报告生成**: TEST_PERFORMANCE_OPTIMIZATION.md  
**状态**: 待实施
