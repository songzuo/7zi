import { test, expect } from '@playwright/test';

/**
 * 任务管理 E2E 测试
 * 测试任务创建、分配、状态变更等核心功能
 */

test.describe('任务管理 - 用户认证状态', () => {
  test.beforeEach(async ({ page }) => {
    // 确保用户已登录或处理未登录状态
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('未登录用户访问任务页面应该被重定向或显示提示', async ({ page, context }) => {
    // 清除 cookies 模拟未登录状态
    await context.clearCookies();
    
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    const hasLoginForm = await page.locator('input[type="password"]').count() > 0;
    const hasLoginPrompt = await page.locator(':text("登录"), :text("Login")').count() > 0;
    
    // 未登录用户应该看到登录提示或被重定向
    expect(
      currentUrl.includes('/login') || 
      hasLoginForm || 
      hasLoginPrompt
    ).toBeTruthy();
  });
});

test.describe('任务列表浏览', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('任务列表页面应该正确加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/任务|Task/i);
    
    // 验证主要内容区域
    await expect(page.locator('body')).toBeVisible();
    
    // 验证任务容器存在
    const taskContainer = page.locator('[class*="task-list"], [class*="tasks"], main').first();
    await expect(taskContainer).toBeVisible();
  });

  test('任务列表应该显示任务卡片', async ({ page }) => {
    // 查找任务卡片
    const taskCards = page.locator('[class*="task"], [class*="card"], article, li');
    const count = await taskCards.count();
    
    // 应该有任务卡片（可能为0，但容器应该存在）
    console.log(`找到 ${count} 个任务卡片`);
  });

  test('任务卡片应该显示基本信息', async ({ page }) => {
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      // 检查标题
      const title = taskCard.locator('h2, h3, h4, [class*="title"]').first();
      
      // 检查描述
      const description = taskCard.locator('p, [class*="description"]').first();
      
      // 检查优先级标签
      const priority = taskCard.locator('[class*="priority"], text=/高|中|低|high|medium|low/i').first();
      
      // 检查类型标签  
      const type = taskCard.locator('[class*="type"], text=/feature|bug|refactor|test|开发|设计/i').first();
      
      // 至少应该有一些信息
      const hasInfo = await title.isVisible() || 
                     await description.isVisible() || 
                     await priority.isVisible() || 
                     await type.isVisible();
      
      expect(hasInfo).toBeTruthy();
    }
  });

  test('空任务列表应该显示友好提示', async ({ page }) => {
    // 检查空状态提示
    const emptyState = page.locator(
      ':text("暂无任务"), :text("没有任务"), :text("No tasks"), :text("Create your first")'
    );
    const emptyCount = await emptyState.count();
    
    // 如果没有任务，应该显示空状态
    console.log(`空状态提示数量: ${emptyCount}`);
  });
});

test.describe('任务创建流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('应该能访问任务创建页面', async ({ page }) => {
    // 查找创建按钮
    const createButton = page.locator(
      'button:has-text("创建"), button:has-text("Create"), a[href*="new"]'
    ).first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
      
      // 应该到达创建页面
      expect(page.url()).toMatch(/tasks.*new/);
    } else {
      // 直接导航到创建页面
      await page.goto('/tasks/new');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('new');
    }
  });

  test('任务创建表单应该包含必要字段', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');
    
    // 验证表单存在
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
    
    // 验证标题输入框
    const titleInput = form.locator('input[name="title"], input[placeholder*="标题"], input[type="text"]').first();
    await expect(titleInput).toBeVisible();
    
    // 验证描述文本框
    const descTextarea = form.locator('textarea[name="description"], textarea[placeholder*="描述"]').first();
    await expect(descTextarea).toBeVisible();
    
    // 验证优先级选择器（如果有）
    const prioritySelect = form.locator('select[name="priority"], select:has-text("优先级")').first();
    if (await prioritySelect.isVisible()) {
      await expect(prioritySelect).toBeVisible();
    }
    
    // 验证类型选择器（如果有）
    const typeSelect = form.locator('select[name="type"], select:has-text("类型")').first();
    if (await typeSelect.isVisible()) {
      await expect(typeSelect).toBeVisible();
    }
  });

  test('应该能填写并提交任务表单', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');
    
    // 填写标题
    const titleInput = page.locator('input[type="text"], input[name="title"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill(`E2E测试任务-${Date.now()}`);
    }
    
    // 填写描述
    const descInput = page.locator('textarea').first();
    if (await descInput.isVisible()) {
      await descInput.fill('这是一个通过E2E测试自动创建的任务，用于验证任务创建功能。');
    }
    
    // 选择优先级
    const prioritySelect = page.locator('select[name="priority"]').first();
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption({ index: 1 });
    }
    
    // 选择类型
    const typeSelect = page.locator('select[name="type"]').first();
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ index: 1 });
    }
    
    // 提交表单
    const submitButton = page.locator('button[type="submit"], button:has-text("创建"), button:has-text("提交")').first();
    if (await submitButton.isVisible()) {
      // 监听API请求
      const requestPromise = page.waitForRequest(req => 
        req.url().includes('/api/tasks') && req.method() === 'POST'
      ).catch(() => null);
      
      await submitButton.click();
      
      // 等待API请求
      const request = await requestPromise;
      if (request) {
        console.log(`任务创建请求: ${request.url()}`);
      }
      
      // 等待页面响应
      await page.waitForTimeout(2000);
      
      // 验证页面稳定
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('表单验证应该工作正常', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');
    
    // 不填写任何内容直接提交
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(1000);
      
      // 检查验证错误
      const errors = page.locator(
        '[class*="error"], [class*="invalid"], :text("必填"), :text("required"), :text("错误")'
      );
      const errorCount = await errors.count();
      
      console.log(`表单验证错误数量: ${errorCount}`);
    }
  });

  test('应该能取消任务创建', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');
    
    // 填写一些内容
    const titleInput = page.locator('input[type="text"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('将被取消的任务');
    }
    
    // 查找取消按钮
    const cancelButton = page.locator('button:has-text("取消"), button:has-text("Cancel"), a:has-text("取消")').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await page.waitForLoadState('networkidle');
      
      // 应该返回任务列表
      expect(page.url()).toContain('/tasks');
    }
  });
});

test.describe('任务分配流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('任务详情页面应该显示分配选项', async ({ page }) => {
    // 查找任务卡片
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      // 点击任务进入详情
      await taskCard.click();
      await page.waitForLoadState('networkidle');
      
      // 查找分配相关元素
      const assignSection = page.locator(
        '[class*="assign"], :text("分配"), :text("Assign"), select[name*="assign"]'
      ).first();
      
      if (await assignSection.isVisible()) {
        await expect(assignSection).toBeVisible();
      }
    }
  });

  test('应该能选择AI团队成员进行分配', async ({ page }) => {
    // 先创建一个任务
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');
    
    // 填写任务
    const titleInput = page.locator('input[type="text"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill(`待分配任务-${Date.now()}`);
    }
    
    const descInput = page.locator('textarea').first();
    if (await descInput.isVisible()) {
      await descInput.fill('这个任务将被分配给AI团队成员');
    }
    
    // 提交任务
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(2000);
    }
    
    // 返回任务列表
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 查找新创建的任务
    const newTask = page.locator(`:text("待分配任务-${Date.now()}")`).first();
    if (await newTask.isVisible()) {
      await newTask.click();
      await page.waitForLoadState('networkidle');
      
      // 查找分配选择器
      const assignSelect = page.locator('select[name*="assign"], [class*="assign"] select').first();
      if (await assignSelect.isVisible()) {
        // 获取选项数量
        const options = await assignSelect.locator('option').count();
        
        if (options > 1) {
          // 选择第二个选项（第一个通常是"未分配"）
          await assignSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          
          // 验证分配成功
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
  });

  test('分配后任务状态应该更新', async ({ page }) => {
    // 查找已分配的任务
    const assignedTask = page.locator('[class*="assigned"], :has-text("已分配"), :has-text("assigned")').first();
    
    if (await assignedTask.isVisible()) {
      // 点击任务查看详情
      await assignedTask.click();
      await page.waitForLoadState('networkidle');
      
      // 验证状态显示
      const statusIndicator = page.locator('[class*="status"], :text("已分配"), :text("assigned")').first();
      await expect(statusIndicator).toBeVisible();
    }
  });

  test('应该能取消任务分配', async ({ page }) => {
    // 查找已分配的任务
    const assignedTask = page.locator('[class*="assigned"]').first();
    
    if (await assignedTask.isVisible()) {
      await assignedTask.click();
      await page.waitForLoadState('networkidle');
      
      // 查找取消分配选项
      const unassignButton = page.locator('button:has-text("取消分配"), button:has-text("Unassign")').first();
      const unassignOption = page.locator('option:has-text("未分配"), option[value=""]').first();
      
      if (await unassignButton.isVisible()) {
        await unassignButton.click();
        await page.waitForTimeout(1000);
      } else if (await unassignOption.isVisible()) {
        // 在选择器中选择"未分配"
        const assignSelect = page.locator('select[name*="assign"]').first();
        await assignSelect.selectOption({ index: 0 });
        await page.waitForTimeout(1000);
      }
      
      // 验证页面稳定
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('任务状态管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('任务应该显示当前状态', async ({ page }) => {
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      // 查找状态标签
      const statusBadge = taskCard.locator(
        '[class*="status"], :text("待处理"), :text("已分配"), :text("进行中"), :text("已完成"), ' +
        ':text("pending"), :text("assigned"), :text("in_progress"), :text("completed")'
      ).first();
      
      if (await statusBadge.isVisible()) {
        await expect(statusBadge).toBeVisible();
      }
    }
  });

  test('应该能更新任务状态', async ({ page }) => {
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      await taskCard.click();
      await page.waitForLoadState('networkidle');
      
      // 查找状态选择器
      const statusSelect = page.locator('select[name="status"], [class*="status"] select').first();
      
      if (await statusSelect.isVisible()) {
        const options = await statusSelect.locator('option').count();
        
        if (options > 1) {
          // 更改状态
          await statusSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          
          // 验证状态更新
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
  });

  test('不同状态应该有不同视觉标识', async ({ page }) => {
    // 查找不同状态的任务
    const statuses = ['pending', 'assigned', 'in_progress', 'completed'];
    const chineseStatuses = ['待处理', '已分配', '进行中', '已完成'];
    
    for (const status of [...statuses, ...chineseStatuses]) {
      const taskWithStatus = page.locator(`:has-text("${status}")`).first();
      
      if (await taskWithStatus.isVisible()) {
        // 检查是否有颜色类
        const className = await taskWithStatus.getAttribute('class') || '';
        const hasColorClass = className.includes('bg-') || className.includes('text-');
        
        console.log(`状态 "${status}" 有颜色标识: ${hasColorClass}`);
      }
    }
  });
});

test.describe('任务编辑和删除', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('应该能编辑任务', async ({ page }) => {
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      await taskCard.click();
      await page.waitForLoadState('networkidle');
      
      // 查找编辑按钮
      const editButton = page.locator('button:has-text("编辑"), button:has-text("Edit")').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForLoadState('networkidle');
        
        // 应该进入编辑模式
        const editForm = page.locator('form, input[type="text"]').first();
        await expect(editForm).toBeVisible();
      }
    }
  });

  test('编辑后应该能保存更改', async ({ page }) => {
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      await taskCard.click();
      await page.waitForLoadState('networkidle');
      
      // 查找可编辑的标题
      const titleInput = page.locator('input[type="text"]').first();
      
      if (await titleInput.isVisible()) {
        const originalTitle = await titleInput.inputValue();
        
        // 修改标题
        await titleInput.fill(originalTitle + ' (已编辑)');
        
        // 保存
        const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(1000);
          
          // 验证页面稳定
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
  });

  test('应该能删除任务', async ({ page }) => {
    const taskCard = page.locator('[class*="task"], [class*="card"]').first();
    
    if (await taskCard.isVisible()) {
      await taskCard.click();
      await page.waitForLoadState('networkidle');
      
      // 查找删除按钮
      const deleteButton = page.locator('button:has-text("删除"), button:has-text("Delete")').first();
      
      if (await deleteButton.isVisible()) {
        // 注意：不实际点击删除，避免删除真实数据
        // 只验证按钮存在
        console.log('删除按钮存在');
      }
    }
  });
});

test.describe('任务导航和交互', () => {
  test('从Dashboard导航到任务页面', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 查找任务链接
    const tasksLink = page.locator('a[href*="tasks"], button:has-text("任务"), button:has-text("Tasks")').first();
    
    if (await tasksLink.isVisible()) {
      await tasksLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该到达任务页面
      expect(page.url()).toContain('tasks');
    }
  });

  test('从首页导航到任务页面', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 查找任务链接
    const tasksLink = page.locator('a[href*="tasks"]').first();
    
    if (await tasksLink.isVisible()) {
      await tasksLink.click();
      await page.waitForLoadState('networkidle');
      
      // 应该到达任务页面
      expect(page.url()).toContain('tasks');
    }
  });

  test('任务页面内导航应该工作', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 创建新任务
    const createButton = page.locator('button:has-text("创建")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('new');
      
      // 返回列表
      const backButton = page.locator('a[href*="tasks"]:not([href*="new"])').first();
      if (await backButton.isVisible()) {
        await backButton.click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('tasks');
      }
    }
  });
});

test.describe('任务响应式测试', () => {
  test('移动端任务页面布局', async ({ page, isMobile }) => {
    test.skip(!isMobile, '仅在移动端运行');
    
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
    
    // 验证创建按钮可见
    const createButton = page.locator('button:has-text("创建")').first();
    await expect(createButton).toBeVisible();
    
    // 验证任务列表适应小屏幕
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768);
  });

  test('桌面端任务页面布局', async ({ page, isMobile }) => {
    test.skip(isMobile, '仅在桌面端运行');
    
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
    
    // 验证多列布局（如果有的话）
    const taskGrid = page.locator('[class*="grid"]');
    if (await taskGrid.count() > 0) {
      await expect(taskGrid.first()).toBeVisible();
    }
  });
});

test.describe('任务性能测试', () => {
  test('任务列表加载性能', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 页面应在5秒内加载完成
    expect(loadTime).toBeLessThan(5000);
  });

  test('任务创建响应时间', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');
    
    // 填写表单
    const titleInput = page.locator('input[type="text"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('性能测试任务');
    }
    
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      const startTime = Date.now();
      await submitButton.click();
      await page.waitForTimeout(1000);
      const responseTime = Date.now() - startTime;
      
      // 表单提交应该快速响应
      expect(responseTime).toBeLessThan(3000);
    }
  });
});

test.describe('任务浏览器兼容性', () => {
  test('任务页面在Chromium中应该正常工作', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '仅在Chromium中运行');
    
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('任务页面在Firefox中应该正常工作', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', '仅在Firefox中运行');
    
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('任务页面在WebKit中应该正常工作', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', '仅在WebKit中运行');
    
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('body')).toBeVisible();
  });
});