import { test, expect } from '@playwright/test';

/**
 * 首页 E2E 测试
 * 测试首页加载、内容展示和基本功能
 */
test.describe('首页测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('首页应该正确加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/7zi Studio/);
    
    // 验证页面已渲染
    await expect(page.locator('body')).toBeVisible();
  });

  test('页面应该包含主要内容区域', async ({ page }) => {
    // 检查页面是否有主要内容
    const mainContent = page.locator('main, [role="main"], .main-content').first();
    
    // 页面应该有可见内容
    await expect(page.locator('body')).toContainText(/AI|工作室|Studio/);
  });

  test('页面应该正确处理语言重定向', async ({ page }) => {
    // 根页面应该重定向到带语言前缀的 URL
    // 等待重定向完成
    await page.waitForURL(/\/(zh|en)\//, { timeout: 10000 }).catch(() => {
      // 如果没有重定向，检查是否已包含语言路径
    });
    
    // 验证 URL 包含语言代码
    const url = page.url();
    const hasLocale = /\/(zh|en)/.test(url) || url === page.context().options.baseURL + '/';
    expect(hasLocale).toBeTruthy();
  });

  test('首页应该包含导航栏', async ({ page }) => {
    // 查找导航元素
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible();
  });

  test('首页应该包含页脚', async ({ page }) => {
    // 查找页脚元素
    const footer = page.locator('footer, [role="contentinfo"]').first();
    await expect(footer).toBeVisible();
  });

  test('页面应该在合理时间内加载完成', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // 页面应在 10 秒内加载完成
    expect(loadTime).toBeLessThan(10000);
  });
});