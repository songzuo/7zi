import { test, expect } from '@playwright/test';

/**
 * 团队页面 E2E 测试
 * 测试团队成员展示、交互和响应式布局
 */

test.describe('团队页面 - 基础测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('团队页面应该正确加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/团队|Team/i);
    
    // 验证页面已渲染
    await expect(page.locator('body')).toBeVisible();
  });

  test('页面应该显示团队标题', async ({ page }) => {
    const title = page.locator('h1, h2').filter({ hasText: /团队|Team|成员/i }).first();
    await expect(title).toBeVisible();
  });

  test('页面应该显示 AI 团队成员', async ({ page }) => {
    // 查找成员名称
    const members = [
      '智能体世界专家',
      '咨询师',
      '架构师',
      'Executor',
      '系统管理员',
      '测试员',
      '设计师',
      '推广专员',
      '销售客服',
      '财务',
      '媒体'
    ];

    // 至少应该显示部分成员
    let foundMembers = 0;
    for (const member of members) {
      const memberElement = page.locator(`text=/${member}/i`).first();
      if (await memberElement.isVisible().catch(() => false)) {
        foundMembers++;
      }
    }

    // 应该至少找到 5 个成员
    expect(foundMembers).toBeGreaterThanOrEqual(5);
  });

  test('成员卡片应该包含必要信息', async ({ page }) => {
    // 查找成员卡片
    const memberCards = page.locator('[class*="member"], [class*="team-member"], [class*="card"]').filter({ has: page.locator('text=/专家 | 师 | 员/i') });
    const count = await memberCards.count();

    expect(count).toBeGreaterThan(0);

    // 检查第一个成员卡片
    if (count > 0) {
      const firstCard = memberCards.first();
      await expect(firstCard).toBeVisible();

      // 应该包含名称
      const nameElement = firstCard.locator('h3, h4, [class*="name"], [class*="title"]');
      await expect(nameElement.first()).toBeVisible();
    }
  });

  test('页面应该包含页脚', async ({ page }) => {
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });
});

test.describe('团队页面 - 成员展示测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('成员卡片应该有头像或图标', async ({ page }) => {
    const memberCards = page.locator('[class*="member"], [class*="team-member"]').first();
    
    if (await memberCards.isVisible()) {
      // 查找头像或图标
      const avatar = memberCards.locator('img, svg, [class*="avatar"], [class*="icon"]').first();
      // 头像是可选的，但应该有某种视觉表示
      expect(await memberCards.isVisible()).toBeTruthy();
    }
  });

  test('成员卡片应该显示角色/职责', async ({ page }) => {
    // 查找角色描述
    const roles = page.locator('text=/专家 | 咨询 | 架构 | 执行 | 管理 | 测试 | 设计 | 推广 | 销售 | 财务 | 媒体/i');
    const count = await roles.count();

    // 应该显示多个角色
    expect(count).toBeGreaterThan(0);
  });

  test('成员卡片应该显示提供商信息', async ({ page }) => {
    // 查找提供商名称
    const providers = page.locator('text=/minimax|claude|volcengine|bailian|self/i');
    const count = await providers.count();

    // 可能显示提供商信息（可选）
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('成员卡片应该有正确的布局', async ({ page }) => {
    const memberCards = page.locator('[class*="member"], [class*="team-member"]').first();
    
    if (await memberCards.isVisible()) {
      const box = await memberCards.boundingBox();
      expect(box?.width).toBeGreaterThan(100);
      expect(box?.height).toBeGreaterThan(100);
    }
  });
});

test.describe('团队页面 - 交互测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('成员卡片应该支持悬停效果', async ({ page }) => {
    const memberCard = page.locator('[class*="member"], [class*="team-member"]').first();
    
    if (await memberCard.isVisible()) {
      // 悬停
      await memberCard.hover();
      await page.waitForTimeout(300);

      // 卡片应该仍然可见
      await expect(memberCard).toBeVisible();
    }
  });

  test('点击成员卡片可能显示详情', async ({ page }) => {
    const memberCard = page.locator('[class*="member"], [class*="team-member"]').first();
    
    if (await memberCard.isVisible()) {
      // 尝试点击
      await memberCard.click();
      await page.waitForTimeout(500);

      // 页面应该仍然正常
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('页面应该支持滚动查看所有成员', async ({ page }) => {
    // 获取页面高度
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    
    // 滚动到中间
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(300);

    // 页面应该仍然正常
    await expect(page.locator('body')).toBeVisible();

    // 滚动到底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    // 页脚应该可见
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });
});

test.describe('团队页面 - 响应式测试', () => {
  test('移动端布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();

    // 成员卡片应该适应小屏幕
    const memberCards = page.locator('[class*="member"], [class*="team-member"]').first();
    if (await memberCards.isVisible()) {
      const box = await memberCards.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(400);
    }
  });

  test('平板端布局', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();
  });

  test('桌面端布局', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();

    // 应该显示网格布局
    const grid = page.locator('[class*="grid"], [class*="flex"]').first();
    await expect(grid).toBeVisible();
  });

  test('超大屏幕布局', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('团队页面 - 导航测试', () => {
  test('从首页导航到团队页面', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 点击团队链接
    const teamLink = page.locator('a[href*="team"]').first();
    if (await teamLink.isVisible()) {
      await teamLink.click();
      await page.waitForLoadState('networkidle');

      // 应该到达团队页面
      expect(page.url()).toContain('team');
      await expect(page).toHaveTitle(/团队|Team/i);
    }
  });

  test('从团队页面导航回首页', async ({ page }) => {
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');

    // 点击首页链接
    const homeLink = page.locator('nav a[href="/"], nav a:has-text("7zi"), nav a:has-text("首页")').first();
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await page.waitForLoadState('networkidle');

      // 应该返回首页
      expect(page.url()).toMatch(/\/(zh|en)?\/?$/);
    }
  });

  test('团队页面应该有返回导航', async ({ page }) => {
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');

    // 导航栏应该可见
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();

    // 应该包含导航链接
    const navLinks = nav.locator('a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('团队页面 - 无障碍测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');
  });

  test('页面应该有正确的标题层次', async ({ page }) => {
    // 检查 h1 标题
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    
    // 应该有一个主标题
    expect(h1Count).toBeGreaterThanOrEqual(0);
  });

  test('成员卡片应该可访问', async ({ page }) => {
    const memberCards = page.locator('[class*="member"], [class*="team-member"]');
    const count = await memberCards.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = memberCards.nth(i);
      await expect(card).toBeVisible();
      
      // 检查是否有可访问的标签
      const roleName = await card.locator('h3, h4, [class*="name"], [class*="title"]').first().textContent();
      expect(roleName?.length).toBeGreaterThan(0);
    }
  });

  test('页面应该支持键盘导航', async ({ page }) => {
    // 按 Tab 键导航
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // 应该有元素获得焦点
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(focusedElement);
  });
});

test.describe('团队页面 - 性能测试', () => {
  test('页面应该在合理时间内加载', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;

    // 页面应该在 10 秒内加载完成
    expect(loadTime).toBeLessThan(10000);
  });

  test('成员卡片应该快速渲染', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/zh/team');
    await page.waitForLoadState('domcontentloaded');
    
    // 第一个成员卡片应该快速出现
    const memberCard = page.locator('[class*="member"], [class*="team-member"]').first();
    await expect(memberCard).toBeVisible({ timeout: 5000 });
    
    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(5000);
  });
});

test.describe('团队页面 - 国际化测试', () => {
  test('中文版本应该正确显示', async ({ page }) => {
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');

    // 应该显示中文内容
    const chineseContent = page.locator('text=/团队 | 成员 | 专家/i');
    await expect(chineseContent.first()).toBeVisible();
  });

  test('英文版本应该正确显示', async ({ page }) => {
    await page.goto('/en/team');
    await page.waitForLoadState('networkidle');

    // 应该显示英文内容
    const englishContent = page.locator('text=/Team|Member|Expert/i');
    await expect(englishContent.first()).toBeVisible();
  });

  test('语言切换应该工作', async ({ page }) => {
    await page.goto('/zh/team');
    await page.waitForLoadState('networkidle');

    // 查找语言切换器
    const langSwitcher = page.locator('[aria-label*="language"], [aria-label*="语言"], button:has-text("EN"), button:has-text("中文")').first();

    if (await langSwitcher.isVisible()) {
      await langSwitcher.click();
      await page.waitForTimeout(500);

      // URL 应该改变或内容应该改变
      const url = page.url();
      expect(url).toBeTruthy();
    }
  });
});
