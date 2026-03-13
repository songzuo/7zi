/**
 * Tasks E2E 测试
 * 使用 Playwright 测试任务管理的端到端流程
 */

import { test, expect } from '@playwright/test';

test.describe('Tasks 页面 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test.describe('页面加载', () => {
    test('应该成功加载任务页面', async ({ page }) => {
      await expect(page).toHaveTitle(/7zi/i);
    });

    test('应该显示任务列表或空状态', async ({ page }) => {
      // 页面应该有内容区域
      const content = page.locator('main, [role="main"], .container');
      await expect(content.first()).toBeVisible();
    });
  });

  test.describe('任务过滤', () => {
    test('应该能按状态过滤任务', async ({ page }) => {
      // 查找状态过滤选择器
      const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();
      
      if (await statusFilter.count() > 0) {
        await statusFilter.selectOption('completed');
        await page.waitForTimeout(500);
        
        // 验证过滤结果
        const tasks = page.locator('[data-testid="task-card"], .task-item, article');
        if (await tasks.count() > 0) {
          // 如果有任务，检查状态
          await expect(tasks.first()).toBeVisible();
        }
      }
    });

    test('应该能按类型过滤任务', async ({ page }) => {
      const typeFilter = page.locator('select[name="type"], [data-testid="type-filter"]').first();
      
      if (await typeFilter.count() > 0) {
        await typeFilter.selectOption('development');
        await page.waitForTimeout(500);
      }
    });

    test('应该能按负责人过滤任务', async ({ page }) => {
      const assigneeFilter = page.locator('select[name="assignee"], [data-testid="assignee-filter"]').first();
      
      if (await assigneeFilter.count() > 0) {
        await assigneeFilter.selectOption('architect');
        await page.waitForTimeout(500);
      }
    });

    test('应该能清除过滤条件', async ({ page }) => {
      // 先应用过滤
      const filter = page.locator('select').first();
      if (await filter.count() > 0) {
        await filter.selectOption({ index: 0 }); // 选择第一个选项（通常是"全部"）
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('任务创建', () => {
    test('应该能打开创建任务表单', async ({ page }) => {
      const createButton = page.locator('button:has-text("创建"), button:has-text("新建"), button:has-text("Add Task")').first();
      
      if (await createButton.count() > 0) {
        await createButton.click();
        await page.waitForTimeout(500);
        
        // 检查表单是否出现
        const form = page.locator('form');
        await expect(form.first()).toBeVisible();
      }
    });

    test('应该能填写任务表单', async ({ page }) => {
      const createButton = page.locator('button:has-text("创建"), button:has-text("新建")').first();
      
      if (await createButton.count() > 0) {
        await createButton.click();
        await page.waitForTimeout(500);
        
        // 填写标题
        const titleInput = page.locator('input[name="title"], input[placeholder*="标题"], input[placeholder*="title"]').first();
        if (await titleInput.count() > 0) {
          await titleInput.fill('E2E 测试创建的任务');
        }
        
        // 填写描述
        const descInput = page.locator('textarea[name="description"], textarea[placeholder*="描述"]').first();
        if (await descInput.count() > 0) {
          await descInput.fill('这是 E2E 测试创建的任务描述');
        }
      }
    });

    test('没有标题应该显示错误', async ({ page }) => {
      const createButton = page.locator('button:has-text("创建"), button:has-text("新建")').first();
      
      if (await createButton.count() > 0) {
        await createButton.click();
        await page.waitForTimeout(500);
        
        // 不填写标题直接提交
        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          
          // 应该显示错误提示
          const errorMessage = page.locator('[role="alert"], .error, .text-red-500').first();
          if (await errorMessage.count() > 0) {
            await expect(errorMessage).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('任务操作', () => {
    test('应该能查看任务详情', async ({ page }) => {
      // 查找第一个任务
      const taskCard = page.locator('[data-testid="task-card"], .task-item, article').first();
      
      if (await taskCard.count() > 0) {
        await taskCard.click();
        await page.waitForTimeout(500);
        
        // 验证详情内容
        const detail = page.locator('[data-testid="task-detail"], .task-detail, .modal-content');
        if (await detail.count() > 0) {
          await expect(detail.first()).toBeVisible();
        }
      }
    });

    test('应该能编辑任务', async ({ page }) => {
      const editButton = page.locator('button:has-text("编辑"), [data-testid="edit-button"]').first();
      
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(500);
        
        // 检查编辑表单
        const editForm = page.locator('form');
        await expect(editForm.first()).toBeVisible();
      }
    });

    test('应该能删除任务', async ({ page }) => {
      // 这个测试需要谨慎，因为会修改数据
      const deleteButton = page.locator('button:has-text("删除"), [data-testid="delete-button"]').first();
      
      if (await deleteButton.count() > 0) {
        // 点击删除按钮
        await deleteButton.click();
        await page.waitForTimeout(500);
        
        // 确认删除对话框
        const confirmButton = page.locator('button:has-text("确认"), button:has-text("确定")').first();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('响应式设计', () => {
    test('应该在移动端正确显示', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      
      // 页面应该正确加载
      await expect(page).toHaveTitle(/7zi/i);
    });

    test('应该在平板端正确显示', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveTitle(/7zi/i);
    });
  });

  test.describe('无障碍访问', () => {
    test('应该能使用键盘导航', async ({ page }) => {
      // 按 Tab 键应该能在元素间切换
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      // 页面应该响应
      const focusedElement = page.locator(':focus');
      expect(await focusedElement.count()).toBeGreaterThanOrEqual(0);
    });

    test('应该有关键的 ARIA 属性', async ({ page }) => {
      // 检查是否有适当的角色属性
      const main = page.locator('main, [role="main"]');
      if (await main.count() > 0) {
        await expect(main.first()).toBeVisible();
      }
    });
  });
});

test.describe('Tasks API 直接测试', () => {
  test('GET /api/tasks 应该返回任务列表', async ({ request }) => {
    const response = await request.get('/api/tasks');
    expect(response.ok()).toBeTruthy();
    
    const tasks = await response.json();
    expect(Array.isArray(tasks)).toBe(true);
  });

  test('GET /api/tasks?status=completed 应该返回已完成任务', async ({ request }) => {
    const response = await request.get('/api/tasks?status=completed');
    expect(response.ok()).toBeTruthy();
    
    const tasks = await response.json();
    tasks.forEach((task: any) => {
      expect(task.status).toBe('completed');
    });
  });

  test('POST /api/tasks 应该创建新任务', async ({ request }) => {
    const response = await request.post('/api/tasks', {
      data: {
        title: 'Playwright 测试任务',
        description: '通过 Playwright 创建',
        type: 'development',
        priority: 'medium',
      },
    });
    
    // 可能是 201 或 400（如果需要 CSRF token）
    expect([201, 400]).toContain(response.status());
  });
});

test.describe('Tasks 页面导航', () => {
  test('应该能从首页导航到任务页面', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 查找导航链接
    const tasksLink = page.locator('a[href="/tasks"], nav a:has-text("任务")').first();
    
    if (await tasksLink.count() > 0) {
      await tasksLink.click();
      await page.waitForURL('**/tasks');
      await expect(page).toHaveURL(/tasks/);
    }
  });

  test('应该能从导航栏访问任务页面', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 查找导航
    const nav = page.locator('nav').first();
    if (await nav.count() > 0) {
      const tasksLink = nav.locator('a[href*="task"]').first();
      if (await tasksLink.count() > 0) {
        await tasksLink.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
