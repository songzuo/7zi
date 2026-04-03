# E2E 测试配置 - v1.9.1
# Playwright 增强配置

import { defineConfig, devices } from '@playwright/test'

/**
 * v1.9.1 E2E 测试配置
 * 针对关键用户流程和压力测试进行了优化
 */
export default defineConfig({
  // 测试目录
  testDir: './e2e',

  // v1.9.1 测试文件
  testMatch: '**/v191-*.spec.ts',

  // 完全并行运行测试
  fullyParallel: true,

  // CI 上失败时禁止 test.only
  forbidOnly: !!process.env.CI,

  // CI 上重试失败测试
  retries: process.env.CI ? 2 : 0,

  // CI 环境下使用 4 个并行 workers
  workers: process.env.CI ? 4 : undefined,

  // Reporter 配置 - 增强报告生成
  reporter: [
    [
      'html',
      {
        outputFolder: 'playwright-report/v191',
        open: 'never',
        host: '0.0.0.0',
        port: 9323,
      },
    ],
    ['list'],
    ['json', { outputFile: 'test-results/v191-test-results.json' }],
    ['junit', { outputFile: 'test-results/v191-junit-results.xml' }],
    [
      'allure-playwright',
      {
        outputFolder: 'test-results/allure-results',
        includeTestSteps: true,
        includeEnvironmentInfo: true,
      },
    ],
  ],

  // 全局测试配置
  use: {
    // 基础 URL
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',

    // 收集失败测试的 trace
    trace: 'on-first-retry',

    // 截图 - 失败时截图
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },

    // 视频录制
    video: 'retain-on-failure',

    // 测试超时
    actionTimeout: 15000,
    navigationTimeout: 45000,

    // 浏览器上下文选项
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,

    // 权限和地理位置
    permissions: ['geolocation', 'notifications'],
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },

  // 视觉回归测试配置
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },

  // 配置项目（优化后的浏览器配置 - CI 友好）
  projects: [
    // 主要桌面浏览器
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 移动端测试
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    // 移动端 Safari
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    // 压力测试专用（不使用视频和截图）
    {
      name: 'stress-test',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'off',
        video: 'off',
      },
      testMatch: '**/v191-api-stress.spec.ts',
    },
  ],

  // 本地开发服务器
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // 输出目录配置
  outputDir: 'test-results/',

  // 快照目录
  snapshotDir: './e2e/snapshots',

  // 全局钩子
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),
})

/// <reference types="@playwright/test" />
