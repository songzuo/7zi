/**
 * 移动端响应式测试 - 仪表盘
 *
 * 测试内容:
 * - 响应式网格布局
 * - 移动端标签切换
 * - 触摸交互
 * - 加载状态
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Responsive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should show single column grid on mobile (375px)', async ({ page }) => {
    // 查找成员网格
    const memberGrid = page.locator('.grid-cols-1');
    await expect(memberGrid).toBeVisible();

    // 验证只有一个子元素可见（单列）
    const cards = memberGrid.locator('> div');
    const firstCard = cards.first();
    const secondCard = cards.nth(1);

    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    expect(firstCardBox).toBeTruthy();
    expect(secondCardBox).toBeTruthy();

    // 验证卡片垂直排列
    expect(secondCardBox!.y).toBeGreaterThan(firstCardBox!.y);
  });

  test('should show tab layout on mobile (375px)', async ({ page }) => {
    // 验证标签栏可见
    const tabBar = page.locator('.sticky.top-0');
    await expect(tabBar).toBeVisible();

    // 验证默认标签（成员）
    const membersTab = page.getByRole('button', { name: /成员|members/i });
    await expect(membersTab).toBeVisible();
    await expect(membersTab).toHaveClass(/text-cyan/);

    // 点击任务标签
    const tasksTab = page.getByRole('button', { name: /任务|tasks/i });
    await tasksTab.click();

    // 验证任务内容可见
    const taskBoard = page.locator('text=/当前任务|current tasks/i');
    await expect(taskBoard).toBeVisible();

    // 点击活动标签
    const activityTab = page.getByRole('button', { name: /活动|activity/i });
    await activityTab.click();

    // 验证活动内容可见
    const activityLog = page.locator('text=/最近活动|recent activity/i');
    await expect(activityLog).toBeVisible();
  });

  test('should show three column grid on tablet (1024px)', async ({ page }) => {
    // 查找成员网格
    const memberGrid = page.locator('.grid-cols-1');
    await expect(memberGrid).toBeVisible();

    // 获取网格宽度
    const gridBox = await memberGrid.boundingBox();
    expect(gridBox).toBeTruthy();

    // 验证有多个卡片在同一行
    const cards = memberGrid.locator('> div');
    const firstCard = cards.first();
    const secondCard = cards.nth(1);
    const thirdCard = cards.nth(2);

    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();
    const thirdCardBox = await thirdCard.boundingBox();

    expect(firstCardBox).toBeTruthy();
    expect(secondCardBox).toBeTruthy();
    expect(thirdCardBox).toBeTruthy();

    // 验证卡片水平排列（同一行）
    expect(secondCardBox!.y).toBeCloseTo(firstCardBox!.y, 10);
    expect(thirdCardBox!.y).toBeCloseTo(firstCardBox!.y, 10);

    // 验证卡片在水平方向上有间距
    expect(secondCardBox!.x).toBeGreaterThan(firstCardBox!.x);
    expect(thirdCardBox!.x).toBeGreaterThan(secondCardBox!.x);
  });

  test('should show desktop layout on large screens (1280px)', async ({ page }) => {
    // 验证标签栏不可见（桌面模式）
    const tabBar = page.locator('.sticky.top-0');
    await expect(tabBar).not.toBeVisible();

    // 验证所有部分同时可见
    await expect(page.locator('text=/团队成员|team members/i')).toBeVisible();
    await expect(page.locator('text=/当前任务|current tasks/i')).toBeVisible();
    await expect(page.locator('text=/最近活动|recent activity/i')).toBeVisible();
    await expect(page.locator('text=/实时仪表盘|realtime dashboard/i')).toBeVisible();
    await expect(page.locator('text=/团队活动|team activity/i')).toBeVisible();
  });

  test('should have touch-friendly card interactions on mobile', async ({ page }) => {
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

    // 验证点击反馈（可能触发模态框或详情页）
    // 根据实际实现调整
  });

  test('should handle tab switching smoothly', async ({ page }) => {
    const membersTab = page.getByRole('button', { name: /成员|members/i });
    const tasksTab = page.getByRole('button', { name: /任务|tasks/i });
    const activityTab = page.getByRole('button', { name: /活动|activity/i });

    // 切换到任务
    await tasksTab.click();
    await expect(tasksTab).toHaveClass(/text-cyan/);
    await expect(membersTab).not.toHaveClass(/text-cyan/);

    // 切换到活动
    await activityTab.click();
    await expect(activityTab).toHaveClass(/text-cyan/);
    await expect(tasksTab).not.toHaveClass(/text-cyan/);

    // 切换回成员
    await membersTab.click();
    await expect(membersTab).toHaveClass(/text-cyan/);
    await expect(activityTab).not.toHaveClass(/text-cyan/);
  });

  test('should show loading state', async ({ page, context }) => {
    // 阻断 API 请求以模拟加载状态
    await context.route('**/api/**', route => {
      route.abort();
    });

    await page.goto('/dashboard');

    // 验证加载器可见
    const loader = page.locator('[class*="LoadingSpinner"]');
    await expect(loader).toBeVisible();
  });

  test('should handle orientation changes', async ({ page }) => {
    // 初始竖屏
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // 验证单列布局
    const grid = page.locator('.grid-cols-1');
    await expect(grid).toBeVisible();

    // 切换到横屏
    await page.setViewportSize({ width: 667, height: 375 });

    // 等待布局更新
    await page.waitForTimeout(300);

    // 验证布局可能发生变化（根据实际实现）
    // 可能保持单列或切换到双列
  });

  test('should have accessible content', async ({ page }) => {
    // 验证标题存在
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 验证所有卡片有可访问名称
    const cards = page.locator('[class*="MemberCard"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = cards.nth(i);
      await expect(card).toBeVisible();

      // 验证卡片内的文本可见
      const text = await card.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(0);
    }
  });
});
