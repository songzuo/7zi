import { defineConfig, devices } from '@playwright/test';

/**
 * E2E 测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试目录
  testDir: './e2e',
  
  // 测试匹配模式
  testMatch: '**/*.spec.ts',
  
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
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never',
      host: '0.0.0.0',
      port: 9323
    }],
    ['list'],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit-results.xml' }],
  ],
  
  // 全局测试配置
  use: {
    // 基础 URL
    baseURL: 'http://localhost:3000',
    
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
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // 浏览器上下文选项
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  },

  // 视觉回归测试配置（根级别）
  expect: {
    // 截图比较允许的像素差异
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },

  // 配置项目（优化后的浏览器配置 - CI 友好）
  projects: [
    // 主要桌面浏览器（仅 Chromium - 最常用且最快）
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 移动端测试（仅 Mobile Chrome）
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    // 视觉回归测试专用（仅 Chromium）
    {
      name: 'visual-regression',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/visual-regression.spec.ts',
    },
  ],

  // 本地开发服务器
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // 输出目录配置
  outputDir: 'test-results/',
  
  // 快照目录（视觉回归测试）
  snapshotDir: './e2e/snapshots',
  
  // 更新视觉回归基线时使用 --update-snapshots
});