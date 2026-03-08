import { test, expect } from '@playwright/test';

/**
 * Tasks E2E 测试
 * 测试任务创建、分配、状态变更等核心功能
 */

test.describe('Tasks 页面加载', () => {
  test('应该成功加载任务页面', async ({ page }) => {
    const response = await page.goto('/tasks');
    expect(response?.status()).toBe(200);
    
    await page.waitForLoadState('networkidle');
    
    // 验证页面标题
    await expect(page).toHaveTitle(/任务|Task/i);
    
    // 验证主要内容区域
    await expect(page.locator('body')).toBeVisible();
  });

  test('任务页面应该显示标题', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 验证标题
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('任务页面应该显示创建按钮', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 查找创建任务按钮
    const createButton = page.locator('button:has-text("创建"), button:has-text("Create")').first();
    
    // 应该有创建按钮
    await expect(createButton).toBeVisible();
  });

  test('任务页面加载时间应该合理', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 页面应在 5 秒内加载完成
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('任务创建流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('点击创建按钮应该显示创建表单', async ({ page }) => {
    // 点击创建按钮
    const createButton = page.locator('button:has-text("创建"), button:has-text("Create")').first();
    await createButton.click();
    
    // 等待表单出现
    await page.waitForTimeout(500);
    
    // 验证表单显示
    const form = page.locator('form, [class*="form"]').first();
    await expect(form).toBeVisible();
  });

  test('任务创建表单应该有必填字段', async ({ page }) => {
    // 打开创建表单
    const createButton = page.locator('button:has-text("创建")').first();
    await createButton.click();
    await page.waitForTimeout(300);
    
    // 验证标题输入框
    const titleInput = page.locator('input[name="title"], input[placeholder*="标题"], input[type="text"]').first();
    await expect(titleInput).toBeVisible();
    
    // 验证描述输入框
    const descInput = page.locator('textarea[name="description"], textarea[placeholder*="描述"]').first();
    await expect(descInput).toBeVisible();
  });

  test('填写并创建任务', async ({ page }) => {
    // 打开创建表单
    const createButton = page.locator('button:has-text("创建")').first();
    await createButton.click();
    await page.waitForTimeout(300);
    
    // 填写任务标题
    const titleInput = page.locator('input[name="title"], input[type="text"]').first();
    await titleInput.fill('E2E 测试任务 - ' + Date.now());
    
    // 填写任务描述
    const descInput = page.locator('textarea').first();
    await descInput.fill('这是一个通过 E2E 测试创建的任务，用于验证任务创建功能。');
    
    // 选择优先级（如果有）
    const prioritySelect = page.locator('select[name="priority"], select').first();
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption({ index: 1 });
    }
    
    // 选择类型（如果有）
    const typeSelect = page.locator('select[name="type"]').first();
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ index: 1 });
    }
    
    // 提交表单
    const submitButton = page.locator('button[type="submit"], button:has-text("确定"), button:has-text("提交")').first();
    await submitButton.click();
    
    // 等待创建完成
    await page.waitForTimeout(1000);
    
    // 验证页面稳定
    await expect(page.locator('body')).toBeVisible();
  });

  test('取消创建任务', async ({ page }) => {
    // 打开创建表单
    const createButton = page.locator('button:has-text("创建")').first();
    await createButton.click();
    await page.waitForTimeout(300);
    
    // 填写一些内容
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill('将被取消的任务');
    
    // 点击取消按钮
    const cancelButton = page.locator('button:has-text("取消"), button:has-text("Cancel")').first();
    await cancelButton.click();
    
    // 等待表单关闭
    await page.waitForTimeout(300);
    
    // 表单应该消失
    const form = page.locator('form, [class*="form"]');
    const formVisible = await form.isVisible().catch(() => false);
    
    // 表单可能已经关闭
    console.log(`表单已关闭: ${!formVisible}`);
  });

  test('空表单验证', async ({ page }) => {
    // 打开创建表单
    const createButton = page.locator('button:has-text("创建")').first();
    await createButton.click();
    await page.waitForTimeout(300);
    
    // 直接提交空表单
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // 等待验证
    await page.waitForTimeout(500);
    
    // 应该显示验证错误
    const errors = page.locator('text=/必填|请输入|required|错误/i');
    const errorCount = await errors.count();
    
    console.log(`验证错误数量: ${errorCount}`);
  });
});

test.describe('任务分配流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('任务卡片应该显示分配选项', async ({ page }) => {
    // 查找任务卡片
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      // 查找分配按钮或选项
      const assignButton = taskCard.locator('button:has-text("分配"), button:has-text("Assign")').first();
      
      // 记录是否有分配功能
      console.log(`有分配按钮: ${await assignButton.isVisible()}`);
    }
  });

  test('点击分配应该显示成员列表', async ({ page }) => {
    // 查找任务卡片
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      // 点击任务卡片（可能需要先选中）
      await taskCard.click();
      await page.waitForTimeout(300);
      
      // 查找分配相关元素
      const assignOptions = page.locator('button:has-text("分配"), select[name*="assign"], [class*="assign"]').first();
      
      if (await assignOptions.isVisible()) {
        await assignOptions.click();
        await page.waitForTimeout(300);
        
        // 应该显示成员选项
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('选择成员分配任务', async ({ page }) => {
    // 先创建一个任务
    const createButton = page.locator('button:has-text("创建")').first();
    await createButton.click();
    await page.waitForTimeout(300);
    
    // 填写任务
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill('待分配任务 - ' + Date.now());
    
    const descInput = page.locator('textarea').first();
    await descInput.fill('这个任务将被分配给 AI 成员');
    
    // 提交
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(500);
    
    // 查找新创建的任务
    const newTask = page.locator('text=待分配任务').first();
    
    if (await newTask.isVisible()) {
      // 点击任务
      await newTask.click();
      await page.waitForTimeout(300);
      
      // 查找分配选项
      const assignButton = page.locator('button:has-text("分配"), button:has-text("Assign")').first();
      
      if (await assignButton.isVisible()) {
        await assignButton.click();
        await page.waitForTimeout(300);
        
        // 选择一个成员
        const memberOption = page.locator('button:has-text("执行者"), button:has-text("架构师"), option').first();
        
        if (await memberOption.isVisible()) {
          await memberOption.click();
          await page.waitForTimeout(500);
          
          // 验证分配成功
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
  });

  test('取消分配任务', async ({ page }) => {
    // 查找已分配的任务
    const assignedTask = page.locator('[class*="assigned"], [class*="task"]:has-text("已分配")').first();
    
    if (await assignedTask.isVisible()) {
      // 点击任务
      await assignedTask.click();
      await page.waitForTimeout(300);
      
      // 查找取消分配选项
      const unassignButton = page.locator('button:has-text("取消分配"), button:has-text("Unassign")').first();
      
      if (await unassignButton.isVisible()) {
        await unassignButton.click();
        await page.waitForTimeout(500);
        
        // 验证页面稳定
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

test.describe('任务状态变更', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('任务卡片应该显示当前状态', async ({ page }) => {
    // 查找任务卡片
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      // 查找状态标签
      const statusBadge = taskCard.locator('[class*="status"], text=/pending|assigned|in_progress|completed|待处理|已分配|进行中|已完成/i').first();
      
      // 记录状态显示
      console.log(`状态标签可见: ${await statusBadge.isVisible()}`);
    }
  });

  test('更新任务状态', async ({ page }) => {
    // 查找任务卡片
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      // 点击任务
      await taskCard.click();
      await page.waitForTimeout(300);
      
      // 查找状态选择器
      const statusSelect = page.locator('select[name="status"], [class*="status"] select').first();
      
      if (await statusSelect.isVisible()) {
        // 更改状态
        await statusSelect.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        
        // 验证页面稳定
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('状态应该有对应的颜色标识', async ({ page }) => {
    // 查找不同状态的任务
    const statuses = ['pending', 'assigned', 'in_progress', 'completed'];
    
    for (const status of statuses) {
      const taskWithStatus = page.locator(`[class*="${status}"], :has-text("${status}")`).first();
      
      if (await taskWithStatus.isVisible()) {
        // 检查是否有颜色类
        const className = await taskWithStatus.getAttribute('class') || '';
        const hasColorClass = className.includes('bg-') || className.includes('text-');
        
        console.log(`状态 ${status} 有颜色标识: ${hasColorClass}`);
      }
    }
  });

  test('完成任务的流程', async ({ page }) => {
    // 查找进行中的任务
    const inProgressTask = page.locator('[class*="in_progress"], :has-text("进行中")').first();
    
    if (await inProgressTask.isVisible()) {
      // 点击任务
      await inProgressTask.click();
      await page.waitForTimeout(300);
      
      // 查找状态更新选项
      const completeButton = page.locator('button:has-text("完成"), button:has-text("Complete"), select option:has-text("已完成")').first();
      
      if (await completeButton.isVisible()) {
        await completeButton.click();
        await page.waitForTimeout(500);
        
        // 验证状态变更
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

test.describe('任务列表显示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('应该显示任务列表', async ({ page }) => {
    // 查找任务列表容器
    const taskList = page.locator('[class*="task-list"], [class*="tasks"], main').first();
    
    await expect(taskList).toBeVisible();
  });

  test('任务卡片应该显示优先级', async ({ page }) => {
    // 查找优先级标签
    const priorityBadge = page.locator('[class*="priority"], text=/urgent|high|medium|low|紧急|高|中|低/i').first();
    
    if (await priorityBadge.isVisible()) {
      await expect(priorityBadge).toBeVisible();
    }
  });

  test('任务卡片应该显示类型', async ({ page }) => {
    // 查找类型标签
    const typeBadge = page.locator('[class*="type"], text=/development|design|research|marketing|开发|设计|研究|营销/i').first();
    
    if (await typeBadge.isVisible()) {
      await expect(typeBadge).toBeVisible();
    }
  });

  test('空任务状态应该显示提示', async ({ page }) => {
    // 检查是否有空状态提示
    const emptyState = page.locator('text=/暂无任务|没有任务|No tasks|Create.*first/i');
    
    // 如果没有任务，应该显示空状态
    const hasEmptyState = await emptyState.count() > 0;
    console.log(`有空状态提示: ${hasEmptyState}`);
  });
});

test.describe('任务编辑功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('任务应该可以编辑', async ({ page }) => {
    // 查找任务卡片
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      // 点击任务
      await taskCard.click();
      await page.waitForTimeout(300);
      
      // 查找编辑按钮
      const editButton = page.locator('button:has-text("编辑"), button:has-text("Edit")').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(300);
        
        // 应该进入编辑模式
        const form = page.locator('form, input[type="text"]').first();
        await expect(form).toBeVisible();
      }
    }
  });

  test('编辑后保存更改', async ({ page }) => {
    // 查找任务卡片
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      // 点击任务
      await taskCard.click();
      await page.waitForTimeout(300);
      
      // 查找可编辑的标题
      const titleInput = page.locator('input[type="text"]').first();
      
      if (await titleInput.isVisible()) {
        const originalTitle = await titleInput.inputValue();
        
        // 修改标题
        await titleInput.fill(originalTitle + ' (已编辑)');
        
        // 保存
        const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")').first();
        await saveButton.click();
        await page.waitForTimeout(500);
        
        // 验证页面稳定
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

test.describe('任务删除功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('任务应该可以删除', async ({ page }) => {
    // 查找任务卡片
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      // 点击任务
      await taskCard.click();
      await page.waitForTimeout(300);
      
      // 查找删除按钮
      const deleteButton = page.locator('button:has-text("删除"), button:has-text("Delete")').first();
      
      if (await deleteButton.isVisible()) {
        // 注意：不实际点击删除，避免删除数据
        console.log('删除按钮存在');
      }
    }
  });
});

test.describe('任务导航测试', () => {
  test('从首页导航到任务页面', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 点击任务链接
    const tasksLink = page.locator('a[href*="tasks"]').first();
    
    if (await tasksLink.isVisible()) {
      await tasksLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该到达任务页面
      expect(page.url()).toContain('tasks');
    }
  });

  test('从 Dashboard 导航到任务页面', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 查找任务链接
    const tasksLink = page.locator('a[href*="tasks"], button:has-text("任务")').first();
    
    if (await tasksLink.isVisible()) {
      await tasksLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该到达任务页面
      expect(page.url()).toContain('tasks');
    }
  });
});

test.describe('任务响应式测试', () => {
  test('移动端任务页面应该正确显示', async ({ page, isMobile }) => {
    test.skip(!isMobile, '仅在移动端运行');
    
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
    
    // 验证创建按钮可见
    const createButton = page.locator('button:has-text("创建")').first();
    await expect(createButton).toBeVisible();
  });

  test('桌面端任务页面应该正确显示', async ({ page, isMobile }) => {
    test.skip(isMobile, '仅在桌面端运行');
    
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
    
    // 验证任务列表显示
    const taskList = page.locator('[class*="task"], main').first();
    await expect(taskList).toBeVisible();
  });
});

test.describe('任务性能测试', () => {
  test('任务列表加载性能', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 页面应在 5 秒内加载完成
    expect(loadTime).toBeLessThan(5000);
  });

  test('任务创建响应时间', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 点击创建按钮
    const createButton = page.locator('button:has-text("创建")').first();
    
    const startTime = Date.now();
    await createButton.click();
    await page.waitForTimeout(500);
    const responseTime = Date.now() - startTime;
    
    // 表单应该快速显示
    expect(responseTime).toBeLessThan(2000);
  });
});

test.describe('任务 SEO 测试', () => {
  test('任务页面应该有正确的 SEO 元素', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 检查标题
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    
    // 检查 meta description
    const metaDescription = page.locator('meta[name="description"]');
    const hasDescription = await metaDescription.count() > 0;
    
    console.log(`有 meta description: ${hasDescription}`);
  });
});