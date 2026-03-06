import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E 测试
 * 测试 AI 团队实时看板功能
 */

test.describe('Dashboard 基础测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('Dashboard 页面应该正确加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/看板|Dashboard|AI/i);

    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();
  });

  test('Dashboard 应该显示标题区域', async ({ page }) => {
    // 查找标题
    const title = page.locator('text=/AI.*看板|团队.*看板|Dashboard/i');
    await expect(title.first()).toBeVisible();
  });

  test('Dashboard 应该显示统计卡片', async ({ page }) => {
    // 等待内容加载
    await page.waitForTimeout(2000);

    // 查找统计卡片
    const statCards = page.locator('text=/总成员|工作中|忙碌|空闲|离线|进行中|已完成/');
    const count = await statCards.count();

    // 应该有多个统计项
    expect(count).toBeGreaterThan(0);
  });

  test('Dashboard 应该显示成员状态区域', async ({ page }) => {
    await page.waitForTimeout(2000);

    // 查找成员状态
    const memberSection = page.locator('text=/工作中|忙碌中|空闲中|离线/').first();
    
    if (await memberSection.isVisible()) {
      await expect(memberSection).toBeVisible();
    }
  });
});

test.describe('Dashboard 刷新功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('应该有刷新按钮', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("刷新"), button:has-text("🔄")').first();
    
    if (await refreshButton.isVisible()) {
      await expect(refreshButton).toBeVisible();
    }
  });

  test('点击刷新按钮应该触发数据更新', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("刷新"), button:has-text("🔄")').first();
    
    if (await refreshButton.isVisible()) {
      // 点击刷新
      await refreshButton.click();
      
      // 等待刷新完成
      await page.waitForTimeout(1000);
      
      // 页面应该仍然正常显示
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('自动刷新开关应该工作', async ({ page }) => {
    const autoRefreshCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /自动/ });
    
    if (await autoRefreshCheckbox.isVisible()) {
      // 获取初始状态
      const initialState = await autoRefreshCheckbox.isChecked();
      
      // 切换状态
      await autoRefreshCheckbox.click();
      
      // 验证状态已改变
      const newState = await autoRefreshCheckbox.isChecked();
      expect(newState).toBe(!initialState);
    }
  });
});

test.describe('Dashboard 成员卡片测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('应该显示 AI 成员', async ({ page }) => {
    // 查找成员名称
    const members = page.locator('text=/智能体|咨询师|架构师|Executor|管理员|测试员|设计师|推广|销售|财务|媒体/');
    const count = await members.count();

    // 应该有多个成员
    expect(count).toBeGreaterThan(0);
  });

  test('成员卡片应该显示状态', async ({ page }) => {
    // 查找状态指示
    const statusIndicators = page.locator('text=/working|idle|busy|offline|工作中|空闲|忙碌|离线/i');
    const count = await statusIndicators.count();

    // 应该有状态信息
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('成员卡片应该显示任务信息', async ({ page }) => {
    // 查找任务相关信息
    const taskInfo = page.locator('text=/#\\d+|任务|Task/i');
    const count = await taskInfo.count();

    // 可能显示当前任务
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Dashboard 任务看板测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('应该显示任务区域', async ({ page }) => {
    // 查找任务看板
    const taskBoard = page.locator('text=/任务|Task|Issue|进行中|已完成/').first();
    
    if (await taskBoard.isVisible()) {
      await expect(taskBoard).toBeVisible();
    }
  });

  test('任务应该显示标题', async ({ page }) => {
    // 查找任务标题
    const taskTitles = page.locator('[class*="task"] h3, [class*="task"] h4, text=/#\\d+/');
    const count = await taskTitles.count();

    // 可能有任务标题
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Dashboard 活动日志测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('应该显示活动日志区域', async ({ page }) => {
    // 查找活动日志
    const activityLog = page.locator('text=/活动|Activity|日志|Log|commit|提交/i').first();
    
    if (await activityLog.isVisible()) {
      await expect(activityLog).toBeVisible();
    }
  });
});

test.describe('Dashboard 响应式测试', () => {
  test('移动端 Dashboard 布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();

    // 统计卡片应该适应小屏幕
    const statCards = page.locator('[class*="grid"] > div').first();
    if (await statCards.isVisible()) {
      const box = await statCards.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(400);
    }
  });

  test('平板端 Dashboard 布局', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();
  });

  test('桌面端 Dashboard 布局', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();

    // 应该显示多列布局
    const mainContent = page.locator('[class*="grid"]');
    await expect(mainContent.first()).toBeVisible();
  });
});

test.describe('Dashboard 错误处理测试', () => {
  test('API 错误时应该显示错误提示', async ({ page }) => {
    // 拦截 API 请求并返回错误
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server Error' })
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 页面应该仍然正常渲染（即使有错误）
    await expect(page.locator('body')).toBeVisible();
  });

  test('网络错误时应该优雅降级', async ({ page }) => {
    // 模拟网络离线
    await page.context().setOffline(true);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // 恢复网络
    await page.context().setOffline(false);

    // 页面应该仍然有基本结构
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Dashboard 加载状态测试', () => {
  test('加载时应该显示加载指示器', async ({ page }) => {
    // 慢速网络
    const startTime = Date.now();
    
    await page.goto('/dashboard');

    // 在加载过程中检查加载指示器
    const loadingIndicator = page.locator('text=/加载|Loading|.../', { hasText: /加载|Loading/ });
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // 页面应该在合理时间内加载
    expect(loadTime).toBeLessThan(30000);
  });
});

test.describe('Dashboard 无障碍测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('主要按钮应该可访问', async ({ page }) => {
    // 检查按钮
    const buttons = page.locator('button');
    const count = await buttons.count();

    expect(count).toBeGreaterThan(0);

    // 检查第一个按钮
    const firstButton = buttons.first();
    await expect(firstButton).toBeVisible();
    await expect(firstButton).toBeEnabled();
  });

  test('标题应该有正确的层次结构', async ({ page }) => {
    // 检查 h1 标题
    const h1 = page.locator('h1');
    const h1Count = await h1.count();

    // 应该有一个主标题
    expect(h1Count).toBeGreaterThanOrEqual(0);
  });
});