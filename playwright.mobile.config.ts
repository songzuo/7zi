/**
 * 移动端响应式测试配置
 *
 * 测试策略:
 * 1. 使用 Playwright 进行自动化测试
 * 2. 覆盖三个关键断点: 375px, 768px, 1024px
 * 3. 测试导航、布局、交互
 * 4. 验证触摸友好性和可访问性
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/mobile',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // 375px - 小屏手机 (iPhone SE)
    {
      name: 'mobile-375',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
        contextOptions: {
          hasTouch: true,
        },
      },
    },

    // 414px - 大屏手机 (iPhone 12 Pro)
    {
      name: 'mobile-414',
      use: {
        ...devices['iPhone 12 Pro'],
        viewport: { width: 414, height: 896 },
        contextOptions: {
          hasTouch: true,
        },
      },
    },

    // 768px - 平板竖屏 (iPad mini)
    {
      name: 'tablet-768-portrait',
      use: {
        ...devices['iPad mini'],
        viewport: { width: 768, height: 1024 },
        contextOptions: {
          hasTouch: true,
        },
      },
    },

    // 1024px - 平板横屏 (iPad Pro)
    {
      name: 'tablet-1024-landscape',
      use: {
        ...devices['iPad Pro 11'],
        viewport: { width: 1024, height: 768 },
        contextOptions: {
          hasTouch: true,
        },
      },
    },

    // 1280px - 桌面
    {
      name: 'desktop-1280',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        contextOptions: {
          hasTouch: false,
        },
      },
    },

    // 1920px - 大屏桌面
    {
      name: 'desktop-1920',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        contextOptions: {
          hasTouch: false,
        },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
