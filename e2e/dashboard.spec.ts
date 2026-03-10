import { test, expect } from '@playwright/test';

/**
 * E2E 测试：仪表盘数据展示
 * 覆盖所有主要浏览器（Chromium, Firefox, WebKit）
 */

test.describe('仪表盘功能', () => {
  test.beforeEach(async ({ page }) => {
    // 访问仪表盘页面
    await page.goto('/dashboard');
    
    // 等待页面加载完成
    await expect(page.getByRole('heading', { name: /Dashboard|实时看板/i })).toBeVisible();
  });

  test('应该正确显示仪表盘标题', async ({ page }) => {
    // 验证仪表盘标题存在
    await expect(page.getByRole('heading', { name: /Dashboard|实时看板/i })).toBeVisible();
  });

  test('应该显示概览标签页', async ({ page }) => {
    // 验证概览标签页存在并可点击
    const overviewTab = page.getByRole('tab', { name: /Overview|概览/i });
    await expect(overviewTab).toBeVisible();
    
    // 点击概览标签页
    await overviewTab.click();
    
    // 验证概览内容显示
    await expect(page.getByText(/Projects|项目/i)).toBeVisible();
    await expect(page.getByText(/Activity|活动/i)).toBeVisible();
  });

  test('应该显示项目标签页', async ({ page }) => {
    // 验证项目标签页存在
    const projectsTab = page.getByRole('tab', { name: /Projects|项目/i });
    await expect(projectsTab).toBeVisible();
    
    // 点击项目标签页
    await projectsTab.click();
    
    // 验证项目内容显示
    await expect(page.getByText(/7zi.com 官网重构|AI 聊天系统集成/)).toBeVisible();
    
    // 验证项目进度条存在
    const progressBars = page.locator('.progress-bar');
    await expect(progressBars).toHaveCount({ greaterThan: 0 });
  });

  test('应该显示活动标签页', async ({ page }) => {
    // 验证活动标签页存在
    const activityTab = page.getByRole('tab', { name: /Activity|活动/i });
    await expect(activityTab).toBeVisible();
    
    // 点击活动标签页
    await activityTab.click();
    
    // 验证活动日志显示
    await expect(page.getByText(/添加 AI 聊天组件|部署到生产环境/)).toBeVisible();
  });

  test('应该显示任务统计数据', async ({ page }) => {
    // 验证统计数据存在
    await expect(page.getByText(/Total Tasks|总任务数/i)).toBeVisible();
    await expect(page.getByText(/Completed|已完成/i)).toBeVisible();
    await expect(page.getByText(/Progress|进度/i)).toBeVisible();
  });

  test('应该显示团队成员信息', async ({ page }) => {
    // 验证团队成员信息存在
    await expect(page.getByText(/Executor|咨询师|架构师/)).toBeVisible();
    
    // 验证成员状态显示
    await expect(page.getByText(/Available|Busy|Offline/i)).toBeVisible();
  });

  test('应该正确加载项目数据', async ({ page }) => {
    // 等待项目数据加载
    await page.waitForTimeout(2000);
    
    // 验证项目列表存在
    const projectCards = page.locator('.project-card');
    await expect(projectCards).toHaveCount({ greaterThan: 0 });
    
    // 验证项目包含必要信息
    await expect(projectCards.first().getByText(/7zi.com 官网重构|AI 聊天系统集成/)).toBeVisible();
    await expect(projectCards.first().getByText(/Deadline|截止日期/i)).toBeVisible();
  });

  test('应该正确显示活动日志', async ({ page }) => {
    // 切换到活动标签页
    await page.getByRole('tab', { name: /Activity|活动/i }).click();
    
    // 验证活动日志项存在
    const activityItems = page.locator('.activity-item');
    await expect(activityItems).toHaveCount({ greaterThan: 0 });
    
    // 验证活动包含时间戳
    await expect(activityItems.first().getByText(/分钟前|小时前/i)).toBeVisible();
  });
});

// 移动端测试
test.describe('移动端仪表盘', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('移动端应该正确显示仪表盘', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 验证移动端布局
    await expect(page.getByRole('heading', { name: /Dashboard|实时看板/i })).toBeVisible();
    
    // 验证标签页在移动端正确显示
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3); // Overview, Projects, Activity
    
    // 验证响应式设计
    await expect(page.locator('.project-card')).toBeVisible();
  });
});

// 平板端测试
test.describe('平板端仪表盘', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad

  test('平板端应该正确显示仪表盘布局', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 验证平板端布局优化
    await expect(page.getByRole('heading', { name: /Dashboard|实时看板/i })).toBeVisible();
    
    // 验证网格布局在平板上正确显示
    await expect(page.locator('.project-grid')).toBeVisible();
  });
});