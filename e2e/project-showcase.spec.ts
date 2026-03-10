import { test, expect } from '@playwright/test';

/**
 * E2E 测试：项目展示页面交互
 * 由于项目数据通过任务API管理，项目展示主要在仪表盘和任务页面中
 */

test.describe('项目展示功能', () => {
  test.beforeEach(async ({ page }) => {
    // 访问仪表盘页面（主要的项目展示页面）
    await page.goto('/dashboard');
    
    // 等待页面加载完成
    await expect(page.getByRole('heading', { name: /Dashboard|实时看板/i })).toBeVisible();
  });

  test('应该在仪表盘中显示项目列表', async ({ page }) => {
    // 切换到项目标签页
    await page.getByRole('tab', { name: /Projects|项目/i }).click();
    
    // 验证项目卡片存在
    const projectCards = page.locator('.project-card');
    await expect(projectCards).toHaveCount({ greaterThan: 0 });
    
    // 验证项目包含基本信息
    await expect(projectCards.first().getByText(/7zi.com 官网重构|AI 聊天系统集成/)).toBeVisible();
    await expect(projectCards.first().getByText(/Deadline|截止日期/i)).toBeVisible();
    await expect(projectCards.first().getByText(/Team|团队/i)).toBeVisible();
  });

  test('应该显示项目进度信息', async ({ page }) => {
    // 切换到项目标签页
    await page.getByRole('tab', { name: /Projects|项目/i }).click();
    
    // 验证进度条存在
    const progressBar = page.locator('.progress-bar').first();
    await expect(progressBar).toBeVisible();
    
    // 验证进度百分比显示
    await expect(page.getByText(/75%|90%|100%|45%/)).toBeVisible();
  });

  test('应该显示项目状态', async ({ page }) => {
    // 切换到项目标签页
    await page.getByRole('tab', { name: /Projects|项目/i }).click();
    
    // 验证项目状态标签存在
    await expect(page.getByText(/Active|Completed|active|completed/i)).toBeVisible();
  });

  test('应该显示项目团队成员', async ({ page }) => {
    // 切换到项目标签页
    await page.getByRole('tab', { name: /Projects|项目/i }).click();
    
    // 验证团队成员显示
    await expect(page.getByText(/Executor|设计师|架构师|推广专员/)).toBeVisible();
  });

  test('应该从任务数据生成项目信息', async ({ page }) => {
    // 切换到项目标签页
    await page.getByRole('tab', { name: /Projects|项目/i }).click();
    
    // 验证项目是基于任务类型分组的
    await expect(page.getByText(/开发项目|设计项目|研究项目|营销项目/)).toBeVisible();
    
    // 验证任务计数正确显示
    await expect(page.getByText(/Total tasks|总任务数/i)).toBeVisible();
    await expect(page.getByText(/Completed|已完成/i)).toBeVisible();
  });

  test('应该显示项目截止日期', async ({ page }) => {
    // 切换到项目标签页
    await page.getByRole('tab', { name: /Projects|项目/i }).click();
    
    // 验证截止日期格式正确
    const deadlineText = await page.getByText(/2024-03-15|2024-03-10|2024-03-01|2024-03-20/).textContent();
    expect(deadlineText).toBeTruthy();
  });
});

test.describe('任务页面中的项目信息', () => {
  test.beforeEach(async ({ page }) => {
    // 访问任务页面
    await page.goto('/tasks');
    
    // 等待页面加载完成
    await expect(page.getByRole('heading', { name: /AI 任务管理/i })).toBeVisible();
  });

  test('应该在任务卡片中显示项目相关信息', async ({ page }) => {
    // 验证任务卡片存在
    const taskCards = page.locator('.task-card');
    await expect(taskCards).toHaveCount({ greaterThan: 0 });
    
    // 验证任务类型显示（这对应于项目分类）
    await expect(page.getByText(/Development|Research|Design|Marketing/i)).toBeVisible();
    
    // 验证任务状态显示
    await expect(page.getByText(/Pending|Assigned|In Progress|Completed/i)).toBeVisible();
  });

  test('应该能够通过任务类型过滤查看特定项目', async ({ page }) => {
    // 检查是否存在类型过滤选项
    const typeFilter = page.getByRole('combobox', { name: /Type|类型/i });
    if (await typeFilter.count() > 0) {
      // 选择开发类型
      await typeFilter.selectOption('development');
      
      // 验证只显示开发相关的任务
      await expect(page.getByText(/Development|开发/i)).toBeVisible();
    }
  });
});

// 移动端项目展示测试
test.describe('移动端项目展示', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('移动端应该正确显示项目卡片', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 切换到项目标签页
    await page.getByRole('tab', { name: /Projects|项目/i }).click();
    
    // 验证移动端项目卡片布局
    const projectCards = page.locator('.project-card');
    await expect(projectCards).toHaveCount({ greaterThan: 0 });
    
    // 验证响应式设计元素
    await expect(projectCards.first().locator('.progress-bar')).toBeVisible();
  });
});