import { defineConfig, devices } from '@playwright/test';

/**
 * Enhanced E2E Test Configuration
 * Location: /tests/e2e/
 *
 * Features:
 * - Multi-browser testing (Chromium, Firefox, WebKit)
 * - Mobile device emulation
 * - Visual regression testing
 * - Enhanced reporting (HTML, JSON, JUnit)
 * - Trace on failure
 * - Screenshots and video recording
 */

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Test matching pattern
  testMatch: '**/*.spec.ts',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration - Enhanced reporting
  reporter: [
    // HTML Report with open in browser
    ['html', {
      outputFolder: 'tests/e2e/playwright-report',
      open: 'never',
      host: '0.0.0.0',
      port: 9324,
    }],
    // Console output
    ['list'],
    // JSON for CI integration
    ['json', {
      outputFile: 'tests/e2e/test-results/test-results.json',
    }],
    // JUnit for test tracking
    ['junit', {
      outputFile: 'tests/e2e/test-results/junit-results.xml',
    }],
    // GitHub Actions annotations
    process.env.GITHUB_ACTIONS ? ['github'] : null,
  ].filter(Boolean),

  // Global test configuration
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot configuration
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },

    // Video recording
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 },
    },

    // Test timeout settings
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // Browser context options
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Locale
    locale: 'zh-CN',

    // Timezone
    timezoneId: 'Asia/Shanghai',
  },

  // Visual regression testing configuration
  expect: {
    // Screenshot comparison thresholds
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled',
    },

    // Timeout for assertions
    timeout: 5000,
  },

  // Configure projects for different browsers and devices
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
      },
    },

    // Tablet
    {
      name: 'iPad',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
      },
    },

    // Visual regression testing project (Chromium only)
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      },
      testMatch: '**/visual-regression.spec.ts',
    },
  ],

  // Local development server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Output directory for test artifacts
  outputDir: 'tests/e2e/test-results',

  // Snapshot directory for visual regression
  snapshotDir: 'tests/e2e/snapshots',
});
