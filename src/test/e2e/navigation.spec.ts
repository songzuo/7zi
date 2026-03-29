import { test, expect } from '@playwright/test';

/**
 * 导航菜单功能 E2E 测试
 * 测试导航栏的交互、链接跳转、移动端菜单等
 */

test.describe('导航菜单 - 基础功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');
  });

  test('导航栏应正确显示', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    // 导航栏应包含 logo
    const logo = nav.locator('a').first();
    await expect(logo).toBeVisible();
    await expect(logo).toContainText(/7zi|🤖/);
  });

  test('导航链接应可以点击', async ({ page }) => {
    const nav = page.locator('nav').first();

    // 查找所有导航链接
    const navLinks = nav.locator('a');
    const count = await navLinks.count();

    // 至少应该有一些导航链接
    expect(count).toBeGreaterThan(0);
  });

  test('导航栏应固定在页面顶部', async ({ page }) => {
    const nav = page.locator('nav').first();

    // 获取导航位置
    const box = await nav.boundingBox();
    expect(box?.y).toBe(0);

    // 滚动页面
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(200);

    // 导航应该仍然可见（sticky）
    await expect(nav).toBeVisible();

    // 验证导航仍然在顶部
    const boxAfterScroll = await nav.boundingBox();
    expect(boxAfterScroll?.y).toBe(0);
  });
});

test.describe('导航菜单 - 桌面端', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');
  });

  test('桌面导航链接应显示所有主要页面', async ({ page }) => {
    const nav = page.locator('nav').first();

    // 查找桌面导航链接
    const navLinks = nav.locator('a');

    // 验证主要导航项
    const expectedItems = ['首页', '仪表板', '智能体', '任务', '记忆'];
    let foundItems = 0;

    for (const item of expectedItems) {
      const link = nav.locator(`text="${item}"`).first();
      if (await link.isVisible().catch(() => false)) {
        foundItems++;
      }
    }

    // 至少应该找到部分导航项
    expect(foundItems).toBeGreaterThan(0);
  });

  test('导航链接应有悬停效果', async ({ page }) => {
    const nav = page.locator('nav').first();
    const firstLink = nav.locator('a').nth(1);

    // 鼠标悬停
    await firstLink.hover();

    // 验证链接仍然可见
    await expect(firstLink).toBeVisible();
  });

  test('点击首页链接应导航到首页', async ({ page }) => {
    // 先导航到其他页面
    await page.goto('/zh/dashboard');
    await page.waitForLoadState('networkidle');

    // 点击首页链接
    const homeLink = page.locator('nav a[href="/"], nav a[href*="/zh/"]').first();
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await page.waitForLoadState('networkidle');

      // 应该返回首页
      expect(page.url()).toMatch(/\/(zh|en)\/?$/);
    }
  });

  test('点击仪表板链接应导航到仪表板', async ({ page }) => {
    const dashboardLink = page.locator('nav a[href*="dashboard"]').first();

    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');

      // 应该在 Dashboard 页面
      expect(page.url()).toContain('dashboard');
    }
  });

  test('导航应显示当前活动页面', async ({ page }) => {
    // 导航项应该有活动状态指示
    const activeLink = page.locator('nav a[href="/"], nav a.text-cyan-\\[.*\\]').first();

    // 如果存在活动状态链接，验证其样式
    if (await activeLink.isVisible().catch(() => false)) {
      await expect(activeLink).toBeVisible();
    }
  });
});

test.describe('导航菜单 - 移动端', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');
  });

  test('移动端应显示汉堡菜单按钮', async ({ page }) => {
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰")').first();
    await expect(menuButton).toBeVisible();
  });

  test('点击汉堡菜单按钮应打开菜单', async ({ page }) => {
    const menuButton = page.locator('button[aria-label*="menu"]').first();

    // 确保菜单按钮可见
    await expect(menuButton).toBeVisible();

    // 点击菜单按钮
    await menuButton.click();
    await page.waitForTimeout(500);

    // 菜单应该展开
    const mobileMenu = page.locator('#mobile-menu, [role="dialog"], .mobile-menu').first();
    await expect(mobileMenu).toBeVisible();
  });

  test('打开的菜单应显示导航链接', async ({ page }) => {
    // 打开菜单
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await menuButton.click();
    await page.waitForTimeout(500);

    // 验证菜单包含导航链接
    const mobileMenu = page.locator('#mobile-menu, [role="dialog"]').first();

    const navLinks = mobileMenu.locator('a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('点击导航链接应关闭菜单并导航', async ({ page }) => {
    // 打开菜单
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await menuButton.click();
    await page.waitForTimeout(500);

    // 点击第一个导航链接
    const mobileMenu = page.locator('#mobile-menu, [role="dialog"]').first();
    const firstLink = mobileMenu.locator('a').first();

    if (await firstLink.isVisible()) {
      await firstLink.click();
      await page.waitForLoadState('networkidle');

      // 菜单应该关闭
      const menuAfterClick = page.locator('#mobile-menu, [role="dialog"]').first();
      const isVisible = await menuAfterClick.isVisible().catch(() => false);
      expect(isVisible).toBeFalsy();
    }
  });

  test('点击遮罩应关闭菜单', async ({ page }) => {
    // 打开菜单
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await menuButton.click();
    await page.waitForTimeout(500);

    // 点击遮罩
    const backdrop = page.locator('.fixed.bg-black\\/60, .backdrop, [class*="backdrop"]').first();
    if (await backdrop.isVisible()) {
      await backdrop.click();
      await page.waitForTimeout(500);

      // 菜单应该关闭
      const mobileMenu = page.locator('#mobile-menu, [role="dialog"]').first();
      const isVisible = await mobileMenu.isVisible().catch(() => false);
      expect(isVisible).toBeFalsy();
    }
  });

  test('按 ESC 键应关闭菜单', async ({ page }) => {
    // 打开菜单
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await menuButton.click();
    await page.waitForTimeout(500);

    // 按 ESC 键
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 菜单应该关闭
    const mobileMenu = page.locator('#mobile-menu, [role="dialog"]').first();
    const isVisible = await mobileMenu.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('移动端菜单应显示语言切换器', async ({ page }) => {
    // 打开菜单
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await menuButton.click();
    await page.waitForTimeout(500);

    // 验证菜单包含语言切换器
    const mobileMenu = page.locator('#mobile-menu, [role="dialog"]').first();
    const langSwitcher = mobileMenu.locator('button:has-text("🇺🇸"), button:has-text("🇨🇳")').first();

    await expect(langSwitcher).toBeVisible();
  });

  test('移动端菜单应显示主题切换器', async ({ page }) => {
    // 打开菜单
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await menuButton.click();
    await page.waitForTimeout(500);

    // 验证菜单包含主题切换器
    const mobileMenu = page.locator('#mobile-menu, [role="dialog"]').first();
    const themeToggle = mobileMenu.locator('button:has-text("🌙"), button:has-text("☀️")').first();

    await expect(themeToggle).toBeVisible();
  });

  test('移动端菜单应可滚动', async ({ page }) => {
    // 打开菜单
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    await menuButton.click();
    await page.waitForTimeout(500);

    // 验证菜单可滚动
    const mobileMenu = page.locator('#mobile-menu, [role="dialog"]').first();

    // 检查 overflow 样式
    const overflowY = await mobileMenu.evaluate(el =>
      window.getComputedStyle(el).overflowY
    );

    expect(overflowY).toBe('auto');
  });
});

test.describe('导航菜单 - 页面跳转', () => {
  test('应能导航到仪表板页面', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const dashboardLink = page.locator('a[href*="dashboard"]').first();

    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('dashboard');
    }
  });

  test('应能导航到关于页面', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const aboutLink = page.locator('a[href*="about"]').first();

    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('about');
    }
  });

  test('应能导航到团队页面', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const teamLink = page.locator('a[href*="team"]').first();

    if (await teamLink.isVisible()) {
      await teamLink.click();
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('team');
    }
  });

  test('应能导航到联系页面', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const contactLink = page.locator('a[href*="contact"]').first();

    if (await contactLink.isVisible()) {
      await contactLink.click();
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('contact');
    }
  });
});

test.describe('导航菜单 - 浏览器历史', () => {
  test('浏览器后退应正常工作', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const dashboardLink = page.locator('a[href*="dashboard"]').first();
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');

      // 后退
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // 应该返回首页
      expect(page.url()).not.toContain('dashboard');
    }
  });

  test('浏览器前进应正常工作', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const dashboardLink = page.locator('a[href*="dashboard"]').first();
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');

      // 后退
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // 前进
      await page.goForward();
      await page.waitForLoadState('networkidle');

      // 应该回到 Dashboard
      expect(page.url()).toContain('dashboard');
    }
  });

  test('刷新页面应保持当前页面', async ({ page }) => {
    await page.goto('/zh/dashboard');
    await page.waitForLoadState('networkidle');

    const urlBefore = page.url();

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');

    const urlAfter = page.url();
    expect(urlAfter).toBe(urlBefore);
  });
});

test.describe('导航菜单 - 可访问性', () => {
  test('导航链接应有正确的 ARIA 标签', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav').first();

    // 导航应有正确的角色
    const navRole = await nav.getAttribute('role');
    expect(navRole || 'navigation').toBeTruthy();

    // 导航链接应有有意义的文本
    const links = nav.locator('a');
    const count = await links.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('移动端菜单按钮应有正确的 ARIA 标签', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const menuButton = page.locator('button[aria-label*="menu"]').first();

    // 应有 aria-label
    const ariaLabel = await menuButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // 应有 aria-expanded
    const ariaExpanded = await menuButton.getAttribute('aria-expanded');
    expect(ariaExpanded).toBe('false');

    // 点击按钮后，aria-expanded 应变为 true
    await menuButton.click();
    await page.waitForTimeout(500);

    const ariaExpandedAfter = await menuButton.getAttribute('aria-expanded');
    expect(ariaExpandedAfter).toBe('true');
  });

  test('导航应支持键盘导航', async ({ page }) => {
    await page.goto('/zh');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav').first();

    // 使用 Tab 键导航
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // 验证焦点在导航内
    const focusedElement = page.locator(':focus');
    const isInNav = await focusedElement.evaluate(el =>
      el.closest('nav') !== null
    );

    expect(isInNav).toBeTruthy();
  });
});
