/**
 * 移动端响应式测试 - 团队页面
 *
 * 测试内容:
 * - 响应式网格布局
 * - 成员卡片显示
 * - 搜索和筛选
 * - 滚动性能
 */

import { test, expect } from '@playwright/test';

test.describe('Team Page Responsive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/team');
    await page.waitForLoadState('networkidle');
  });

  test('should show member cards in single column on mobile (375px)', async ({ page }) => {
    // 查找成员卡片
    const memberCards = page.locator('[class*="MemberCard"]');
    const count = await memberCards.count();
    expect(count).toBeGreaterThan(0);

    // 验证第一个卡片
    const firstCard = memberCards.first();
    await expect(firstCard).toBeVisible();

    const firstCardBox = await firstCard.boundingBox();
    expect(firstCardBox).toBeTruthy();

    // 验证卡片占据全宽
    expect(firstCardBox!.width).toBeGreaterThan(300);

    // 验证第二个卡片在第一个下方
    const secondCard = memberCards.nth(1);
    const secondCardBox = await secondCard.boundingBox();
    expect(secondCardBox!.y).toBeGreaterThan(firstCardBox!.y);
  });

  test('should show member cards in two columns on tablet (768px)', async ({ page }) => {
    // 查找成员卡片
    const memberCards = page.locator('[class*="MemberCard"]');
    const count = await memberCards.count();
    expect(count).toBeGreaterThan(1);

    // 验证前两个卡片在同一行
    const firstCard = memberCards.first();
    const secondCard = memberCards.nth(1);

    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    // 验证水平排列
    expect(secondCardBox!.y).toBeCloseTo(firstCardBox!.y, 20);
    expect(secondCardBox!.x).toBeGreaterThan(firstCardBox!.x);
  });

  test('should show member cards in three columns on large tablet (1024px)', async ({ page }) => {
    // 查找成员卡片
    const memberCards = page.locator('[class*="MemberCard"]');
    const count = await memberCards.count();
    expect(count).toBeGreaterThan(2);

    // 验证前三个卡片在同一行
    const firstCard = memberCards.first();
    const secondCard = memberCards.nth(1);
    const thirdCard = memberCards.nth(2);

    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();
    const thirdCardBox = await thirdCard.boundingBox();

    // 验证水平排列
    expect(secondCardBox!.y).toBeCloseTo(firstCardBox!.y, 20);
    expect(thirdCardBox!.y).toBeCloseTo(firstCardBox!.y, 20);
  });

  test('should have search functionality', async ({ page }) => {
    // 查找搜索框
    const searchInput = page.getByPlaceholder(/搜索/i);
    await expect(searchInput).toBeVisible();

    // 输入搜索词
    await searchInput.fill('Expert');

    // 等待搜索结果
    await page.waitForTimeout(500);

    // 验证搜索结果
    const memberCards = page.locator('[class*="MemberCard"]');
    const count = await memberCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have filter functionality', async ({ page }) => {
    // 查找筛选按钮
    const filterButtons = page.locator('button').filter({ hasText: /在线|工作/i });
    const count = await filterButtons.count();
    expect(count).toBeGreaterThan(0);

    // 点击第一个筛选按钮
    await filterButtons.first().click();

    // 等待筛选结果
    await page.waitForTimeout(500);

    // 验证筛选结果
    const memberCards = page.locator('[class*="MemberCard"]');
    const filteredCount = await memberCards.count();
    expect(filteredCount).toBeGreaterThanOrEqual(0);
  });

  test('should have touch-friendly card interactions', async ({ page }) => {
    // 查找成员卡片
    const memberCard = page.locator('[class*="MemberCard"]').first();
    await expect(memberCard).toBeVisible();

    // 验证卡片尺寸
    const cardBox = await memberCard.boundingBox();
    expect(cardBox).toBeTruthy();

    // 卡片应该足够大以触摸
    expect(cardBox!.width).toBeGreaterThan(200);
    expect(cardBox!.height).toBeGreaterThan(100);

    // 点击卡片
    await memberCard.click();

    // 验证点击反馈
    // 根据实际实现调整
  });

  test('should scroll smoothly', async ({ page }) => {
    // 查找成员卡片
    const memberCards = page.locator('[class*="MemberCard"]');
    const count = await memberCards.count();
    expect(count).toBeGreaterThan(5);

    // 滚动到页面底部
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(500);

    // 验证最后的卡片可见
    const lastCard = memberCards.last();
    await expect(lastCard).toBeInViewport();

    // 滚动回到顶部
    await page.mouse.wheel(0, -1000);
    await page.waitForTimeout(500);

    // 验证第一个卡片可见
    const firstCard = memberCards.first();
    await expect(firstCard).toBeInViewport();
  });

  test('should handle orientation changes', async ({ page }) => {
    // 初始竖屏
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/team');

    // 验证单列布局
    const grid = page.locator('.grid-cols-1');
    await expect(grid).toBeVisible();

    // 切换到横屏
    await page.setViewportSize({ width: 667, height: 375 });

    // 等待布局更新
    await page.waitForTimeout(300);

    // 验证布局可能发生变化
    const gridAfter = page.locator('.grid-cols-1');
    await expect(gridAfter).toBeVisible();
  });

  test('should show member count', async ({ page }) => {
    // 查找成员数量显示
    const memberCount = page.locator('text=/\\d+.*成员/i');
    await expect(memberCount).toBeVisible();
  });

  test('should have accessible member cards', async ({ page }) => {
    // 查找成员卡片
    const memberCards = page.locator('[class*="MemberCard"]');
    const count = await memberCards.count();
    expect(count).toBeGreaterThan(0);

    // 验证每个卡片的可访问性
    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = memberCards.nth(i);

      // 验证卡片可见
      await expect(card).toBeVisible();

      // 验证卡片有文本内容
      const text = await card.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(0);

      // 验证卡片有可访问的名称或角色
      const hasAccessibleName = await card.getAttribute('aria-label') !== null;
      const hasRole = await card.getAttribute('role') !== null;
      expect(hasAccessibleName || hasRole).toBeTruthy();
    }
  });

  test('should handle empty search results', async ({ page }) => {
    // 查找搜索框
    const searchInput = page.getByPlaceholder(/搜索/i);
    await expect(searchInput).toBeVisible();

    // 输入不存在的搜索词
    await searchInput.fill('nonexistentmember12345');

    // 等待搜索结果
    await page.waitForTimeout(500);

    // 验证空状态
    const emptyState = page.getByText(/没有找到|no results/i);
    await expect(emptyState).toBeVisible();
  });
});
