/**
 * 移动端响应式测试 - 导航组件
 *
 * 测试内容:
 * - 响应式导航切换
 * - 汉堡菜单交互
 * - 触摸目标尺寸
 * - 可访问性
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation Responsive Tests', () => {
  test('should show hamburger menu on mobile (375px)', async ({ page }) => {
    await page.goto('/');

    // 验证汉堡菜单可见
    const hamburgerButton = page.getByRole('button', { name: /打开菜单|菜单/i });
    await expect(hamburgerButton).toBeVisible();

    // 验证桌面导航链接不可见
    const desktopNav = page.locator('.hidden.md\\:flex');
    await expect(desktopNav).not.toBeVisible();

    // 点击汉堡菜单
    await hamburgerButton.click();

    // 验证抽屉菜单打开
    const mobileMenu = page.getByRole('dialog', { name: '导航菜单' });
    await expect(mobileMenu).toBeVisible();

    // 验证导航链接在菜单中可见
    const navLinks = mobileMenu.getByRole('menuitem');
    await expect(navLinks.first()).toBeVisible();
  });

  test('should show desktop navigation on tablet (1024px)', async ({ page }) => {
    await page.goto('/');

    // 验证汉堡菜单不可见
    const hamburgerButton = page.getByRole('button', { name: /打开菜单|菜单/i });
    await expect(hamburgerButton).not.toBeVisible();

    // 验证桌面导航可见
    const desktopNav = page.locator('.hidden.md\\:flex');
    await expect(desktopNav).toBeVisible();

    // 验证导航链接可见
    const navLinks = desktopNav.getByRole('link');
    await expect(navLinks.first()).toBeVisible();
  });

  test('should close mobile menu on navigation', async ({ page }) => {
    await page.goto('/');

    // 打开菜单
    const hamburgerButton = page.getByRole('button', { name: /打开菜单|菜单/i });
    await hamburgerButton.click();

    // 点击导航链接
    const dashboardLink = page.getByRole('menuitem').filter({ hasText: /仪表盘|dashboard/i });
    await dashboardLink.click();

    // 等待导航完成
    await page.waitForURL('/dashboard');

    // 验证菜单已关闭
    const mobileMenu = page.getByRole('dialog', { name: '导航菜单' });
    await expect(mobileMenu).not.toBeVisible();

    // 验证背景滚动恢复
    const body = page.locator('body');
    const style = await body.getAttribute('style');
    expect(style).not.toContain('position: fixed');
  });

  test('should close mobile menu on ESC key', async ({ page }) => {
    await page.goto('/');

    // 打开菜单
    const hamburgerButton = page.getByRole('button', { name: /打开菜单|菜单/i });
    await hamburgerButton.click();

    // 验证菜单打开
    const mobileMenu = page.getByRole('dialog', { name: '导航菜单' });
    await expect(mobileMenu).toBeVisible();

    // 按 ESC 键
    await page.keyboard.press('Escape');

    // 验证菜单关闭
    await expect(mobileMenu).not.toBeVisible();
  });

  test('should close mobile menu on backdrop click', async ({ page }) => {
    await page.goto('/');

    // 打开菜单
    const hamburgerButton = page.getByRole('button', { name: /打开菜单|菜单/i });
    await hamburgerButton.click();

    // 验证菜单打开
    const mobileMenu = page.getByRole('dialog', { name: '导航菜单' });
    await expect(mobileMenu).toBeVisible();

    // 点击背景
    const backdrop = page.locator('[aria-hidden="true"]').first();
    await backdrop.click({ force: true });

    // 验证菜单关闭
    await expect(mobileMenu).not.toBeVisible();
  });

  test('should have accessible touch targets', async ({ page }) => {
    await page.goto('/');

    // 汉堡按钮尺寸
    const hamburgerButton = page.getByRole('button', { name: /打开菜单|菜单/i });
    const box = await hamburgerButton.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);

    // 导航链接尺寸
    await hamburgerButton.click();
    const navLinks = page.getByRole('menuitem');
    const firstLinkBox = await navLinks.first().boundingBox();
    expect(firstLinkBox).toBeTruthy();
    expect(firstLinkBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('should prevent body scroll when menu is open', async ({ page }) => {
    await page.goto('/');

    // 记录初始滚动位置
    const initialScroll = await page.evaluate(() => window.scrollY);

    // 打开菜单
    const hamburgerButton = page.getByRole('button', { name: /打开菜单|菜单/i });
    await hamburgerButton.click();

    // 验证 body 样式
    const body = page.locator('body');
    const style = await body.getAttribute('style');
    expect(style).toContain('position: fixed');

    // 尝试滚动
    await page.mouse.wheel(0, 100);

    // 验证滚动位置未改变
    const scrollAfterOpen = await page.evaluate(() => window.scrollY);
    expect(scrollAfterOpen).toBe(initialScroll);

    // 关闭菜单
    const backdrop = page.locator('[aria-hidden="true"]').first();
    await backdrop.click({ force: true });

    // 验证 body 样式恢复
    const styleAfterClose = await body.getAttribute('style');
    expect(styleAfterClose).not.toContain('position: fixed');
  });
});
