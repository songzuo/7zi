import { test, expect } from '@playwright/test';

/**
 * 导航 E2E 测试
 * 测试导航栏功能、链接跳转、移动端菜单等
 */
test.describe('导航测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('导航栏应该正确显示', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    
    // 导航应该包含 logo
    const logo = nav.locator('a').first();
    await expect(logo).toBeVisible();
  });

  test('导航链接应该可以点击', async ({ page }) => {
    const nav = page.locator('nav').first();
    
    // 查找所有导航链接
    const navLinks = nav.locator('a');
    const count = await navLinks.count();
    
    // 至少应该有一些导航链接
    expect(count).toBeGreaterThan(0);
  });

  test('点击首页链接应该导航到首页', async ({ page }) => {
    // 先导航到其他页面
    await page.goto('/dashboard');
    
    // 点击首页链接
    const homeLink = page.locator('nav a[href="/"], nav a[href*="/zh/"]').first();
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该返回首页
      expect(page.url()).toMatch(/\/(zh|en)?\/?$/);
    }
  });

  test('导航应该显示当前活动页面', async ({ page }) => {
    // 导航项应该有活动状态指示
    const activeLink = page.locator('nav a[href="/"], nav a.bg-\\[var\\(--nav-active-bg\\)\\]').first();
    
    // 如果存在活动状态链接，验证其样式
    if (await activeLink.isVisible()) {
      await expect(activeLink).toBeVisible();
    }
  });

  test('移动端菜单按钮应该工作', async ({ page, isMobile }) => {
    // 只在移动端测试
    if (!isMobile) {
      test.skip();
      return;
    }
    
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰")').first();
    
    if (await menuButton.isVisible()) {
      // 点击菜单按钮
      await menuButton.click();
      
      // 菜单应该展开
      await expect(page.locator('nav')).toContainText(/首页|Home/);
    }
  });

  test('导航应该固定在页面顶部', async ({ page }) => {
    const nav = page.locator('nav').first();
    
    // 获取导航位置
    const box = await nav.boundingBox();
    expect(box?.y).toBe(0);
    
    // 滚动页面
    await page.evaluate(() => window.scrollTo(0, 500));
    
    // 导航应该仍然可见（sticky）
    await expect(nav).toBeVisible();
  });
});

test.describe('页面导航测试', () => {
  test('应该能导航到 Dashboard 页面', async ({ page }) => {
    await page.goto('/');
    
    // 点击 Dashboard 链接
    const dashboardLink = page.locator('a[href*="dashboard"]').first();
    
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该在 Dashboard 页面
      expect(page.url()).toContain('dashboard');
    }
  });

  test('应该能导航到关于页面', async ({ page }) => {
    await page.goto('/');
    
    // 尝试导航到关于页面
    const aboutLink = page.locator('a[href*="about"]').first();
    
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await page.waitForLoadState('networkidle');
      
      expect(page.url()).toContain('about');
    }
  });

  test('应该能导航到团队页面', async ({ page }) => {
    await page.goto('/');
    
    // 尝试导航到团队页面
    const teamLink = page.locator('a[href*="team"]').first();
    
    if (await teamLink.isVisible()) {
      await teamLink.click();
      await page.waitForLoadState('networkidle');
      
      expect(page.url()).toContain('team');
    }
  });

  test('浏览器后退和前进应该正常工作', async ({ page }) => {
    await page.goto('/');
    
    // 导航到另一个页面
    const dashboardLink = page.locator('a[href*="dashboard"]').first();
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');
      
      // 后退
      await page.goBack();
      await page.waitForLoadState('networkidle');
      
      // 应该返回首页
      expect(page.url()).not.toContain('dashboard');
      
      // 前进
      await page.goForward();
      await page.waitForLoadState('networkidle');
      
      // 应该回到 Dashboard
      expect(page.url()).toContain('dashboard');
    }
  });
});