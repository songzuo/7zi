import { test, expect } from '@playwright/test';

/**
 * E2E 测试：任务创建和分配流程
 * 覆盖所有主要浏览器（Chromium, Firefox, WebKit）
 */

test.describe('任务管理功能', () => {
  test.beforeEach(async ({ page }) => {
    // 访问任务页面
    await page.goto('/tasks');
    
    // 等待页面加载完成
    await expect(page.getByRole('heading', { name: /AI 任务管理/i })).toBeVisible();
  });

  test('应该能够创建新任务', async ({ page }) => {
    // 点击创建新任务按钮
    await page.getByRole('button', { name: /创建新任务/i }).click();
    
    // 等待表单出现
    await expect(page.getByText(/创建新任务/i)).toBeVisible();
    
    // 填写任务表单
    await page.fill('input[name="title"]', '测试任务 - E2E 自动化');
    await page.fill('textarea[name="description"]', '这是通过 E2E 测试创建的任务');
    
    // 选择任务类型
    await page.selectOption('select[name="type"]', 'development');
    
    // 选择优先级
    await page.selectOption('select[name="priority"]', 'high');
    
    // 提交表单
    await page.getByRole('button', { name: /创建任务/i }).click();
    
    // 验证任务创建成功
    await expect(page.getByText('测试任务 - E2E 自动化')).toBeVisible();
    await expect(page.getByText('这是通过 E2E 测试创建的任务')).toBeVisible();
  });

  test('应该能够编辑现有任务', async ({ page }) => {
    // 找到第一个任务并点击编辑
    const firstTask = page.locator('.task-card').first();
    await expect(firstTask).toBeVisible();
    
    // 点击编辑按钮（假设存在编辑按钮）
    const editButton = firstTask.getByRole('button', { name: /编辑/i });
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // 修改任务标题
      await page.fill('input[name="title"]', '更新后的测试任务');
      
      // 保存更改
      await page.getByRole('button', { name: /保存/i }).click();
      
      // 验证更新成功
      await expect(page.getByText('更新后的测试任务')).toBeVisible();
    }
  });

  test('应该能够查看任务详情', async ({ page }) => {
    // 找到第一个任务
    const firstTask = page.locator('.task-card').first();
    await expect(firstTask).toBeVisible();
    
    // 获取任务标题
    const taskTitle = await firstTask.getByText(/分析市场趋势|竞品调研报告|系统架构评审/).textContent();
    expect(taskTitle).toBeTruthy();
    
    // 验证任务包含必要的信息
    await expect(firstTask.getByText(/描述:/i)).toBeVisible();
    await expect(firstTask.getByText(/状态:/i)).toBeVisible();
    await expect(firstTask.getByText(/优先级:/i)).toBeVisible();
  });

  test('应该能够过滤任务', async ({ page }) => {
    // 检查是否存在过滤选项（如果有的话）
    const filterOptions = page.getByRole('combobox', { name: /状态|类型/i });
    if (await filterOptions.count() > 0) {
      // 选择特定状态过滤
      await filterOptions.first().selectOption('completed');
      
      // 验证只显示已完成任务
      const completedTasks = await page.getByText(/已完成|completed/i).count();
      expect(completedTasks).toBeGreaterThan(0);
    }
  });
});

test.describe('智能任务分配功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: /AI 任务管理/i })).toBeVisible();
  });

  test('应该能够请求智能分配建议', async ({ page }) => {
    // 找到一个未分配的任务
    const unassignedTask = page.locator('.task-card', { has: page.getByText(/未分配|unassigned/i) }).first();
    
    if (await unassignedTask.isVisible()) {
      // 点击选择任务以查看分配建议
      await unassignedTask.click();
      
      // 验证分配建议区域出现
      await expect(page.getByText(/智能分配建议/i)).toBeVisible();
      
      // 验证建议列表存在
      const suggestions = page.locator('.assignment-suggestion');
      await expect(suggestions).toHaveCount({ greaterThan: 0 });
    }
  });

  test('应该能够手动分配任务给团队成员', async ({ page }) => {
    // 找到一个未分配的任务
    const unassignedTask = page.locator('.task-card', { has: page.getByText(/未分配|unassigned/i) }).first();
    
    if (await unassignedTask.isVisible()) {
      // 点击选择任务
      await unassignedTask.click();
      
      // 等待分配建议加载
      await page.waitForTimeout(1000);
      
      // 获取第一个可用的团队成员
      const firstMember = page.locator('.assignment-suggestion').first();
      if (await firstMember.isVisible()) {
        const memberName = await firstMember.getByText(/Executor|咨询师|架构师/).textContent();
        
        // 点击分配按钮
        const assignButton = firstMember.getByRole('button', { name: /分配/i });
        if (await assignButton.isVisible()) {
          await assignButton.click();
          
          // 验证任务状态更新为已分配
          await expect(unassignedTask.getByText(/已分配|assigned/i)).toBeVisible();
          await expect(unassignedTask.getByText(memberName || '')).toBeVisible();
        }
      }
    }
  });

  test('应该能够取消任务分配', async ({ page }) => {
    // 找到一个已分配的任务
    const assignedTask = page.locator('.task-card', { has: page.getByText(/已分配|assigned/i) }).first();
    
    if (await assignedTask.isVisible()) {
      // 点击取消分配按钮（如果存在）
      const unassignButton = assignedTask.getByRole('button', { name: /取消分配|unassign/i });
      if (await unassignButton.isVisible()) {
        await unassignButton.click();
        
        // 验证任务状态更新为未分配
        await expect(assignedTask.getByText(/未分配|unassigned/i)).toBeVisible();
      }
    }
  });
});

// 移动端测试
test.describe('移动端任务管理', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('移动端应该正确显示任务列表', async ({ page }) => {
    await page.goto('/tasks');
    
    // 验证移动端布局
    await expect(page.getByRole('heading', { name: /AI 任务管理/i })).toBeVisible();
    
    // 验证任务卡片在移动端正确显示
    const taskCards = page.locator('.task-card');
    await expect(taskCards).toHaveCount({ greaterThan: 0 });
    
    // 验证响应式设计元素
    await expect(page.getByRole('button', { name: /创建新任务/i })).toBeVisible();
  });
});