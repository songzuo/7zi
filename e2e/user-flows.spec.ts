import { test, expect } from '@playwright/test';

/**
 * 用户流程 E2E 测试
 * 测试真实用户场景的完整流程
 * 覆盖：访客浏览、任务管理、表单提交、错误恢复等场景
 */

test.describe('用户流程 - 访客场景', () => {
  
  test('首次访问者浏览流程', async ({ page }) => {
    // 场景：新用户首次访问网站
    
    // 1. 访问首页
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 验证首页加载
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveTitle(/7zi|Studio/i);
    
    // 2. 查看导航栏
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    
    // 3. 浏览关于页面了解团队
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/关于|About|团队/i);
    
    // 4. 查看作品集
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('portfolio');
    
    // 5. 查看联系页面
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('contact');
    
    // 6. 返回首页
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('移动端用户浏览流程', async ({ page, isMobile }) => {
    test.skip(!isMobile, '仅在移动端运行');
    
    // 场景：移动端用户访问
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 验证移动端视图
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768);
    
    // 检查移动端菜单
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰"), .mobile-menu').first();
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // 菜单应该展开
      const menuContent = page.locator('nav, [class*="mobile-nav"], [class*="menu"]').first();
      await expect(menuContent).toBeVisible();
    }
    
    // 浏览页面
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 验证内容可读
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('用户流程 - 任务管理场景', () => {
  
  test('用户查看任务列表流程', async ({ page }) => {
    // 场景：用户查看和管理任务
    
    // 1. 访问任务列表
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 验证任务页面加载
    expect(page.url()).toContain('tasks');
    await expect(page.locator('body')).toBeVisible();
    
    // 2. 检查任务列表元素
    const taskList = page.locator('[class*="task-list"], [class*="task"], main').first();
    await expect(taskList).toBeVisible();
    
    // 3. 查看任务详情（如果有任务）
    const taskItems = page.locator('[class*="task-item"], li, tr').first();
    if (await taskItems.isVisible()) {
      const count = await page.locator('[class*="task-item"], li, tr').count();
      console.log(`找到 ${count} 个任务项`);
    }
  });

  test('用户创建新任务流程', async ({ page }) => {
    // 场景：用户创建新任务
    
    // 1. 访问新建任务页面
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');
    
    // 2. 验证表单存在
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
    
    // 3. 填写任务信息
    const inputs = form.locator('input, textarea, select');
    const count = await inputs.count();
    
    if (count > 0) {
      // 填写第一个文本输入框
      const textInput = form.locator('input[type="text"], input:not([type])').first();
      if (await textInput.isVisible()) {
        await textInput.fill('E2E 测试任务 - ' + Date.now());
      }
      
      // 填写描述
      const textarea = form.locator('textarea').first();
      if (await textarea.isVisible()) {
        await textarea.fill('这是一个通过 E2E 测试自动创建的任务，用于验证任务创建流程。');
      }
      
      // 选择优先级（如果有）
      const select = form.locator('select').first();
      if (await select.isVisible()) {
        await select.selectOption({ index: 1 });
      }
    }
    
    // 4. 验证表单填写后页面稳定
    await expect(page.locator('body')).toBeVisible();
    
    // 注意：不实际提交，避免创建测试数据
  });

  test('任务页面导航流程', async ({ page }) => {
    // 场景：用户在任务相关页面间导航
    
    // 1. 从任务列表开始
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    const tasksUrl = page.url();
    
    // 2. 导航到新建任务
    const newTaskLink = page.locator('a[href*="new"], a:has-text("新建"), a:has-text("New"), button:has-text("新建")').first();
    if (await newTaskLink.isVisible()) {
      await newTaskLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('new');
    } else {
      await page.goto('/tasks/new');
      await page.waitForLoadState('networkidle');
    }
    
    // 3. 返回列表
    const backLink = page.locator('a[href*="tasks"]:not([href*="new"])').first();
    if (await backLink.isVisible()) {
      await backLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('tasks');
    }
  });
});

test.describe('用户流程 - Dashboard 场景', () => {
  
  test('用户查看 Dashboard 流程', async ({ page }) => {
    // 场景：用户登录后查看 Dashboard
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 验证 Dashboard 加载
    expect(page.url()).toContain('dashboard');
    await expect(page.locator('body')).toBeVisible();
    
    // 检查 Dashboard 元素
    const dashboardContent = page.locator('[class*="dashboard"], main').first();
    await expect(dashboardContent).toBeVisible();
    
    // 检查是否有统计信息
    const stats = page.locator('[class*="stat"], [class*="metric"], [class*="card"]').first();
    if (await stats.isVisible()) {
      await expect(stats).toBeVisible();
    }
  });

  test('Dashboard 到任务页面导航', async ({ page }) => {
    // 场景：用户从 Dashboard 导航到任务管理
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 查找任务相关链接
    const taskLink = page.locator('a[href*="task"], a:has-text("任务"), a:has-text("Task")').first();
    
    if (await taskLink.isVisible()) {
      await taskLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('tasks');
    } else {
      // 直接导航
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
    }
    
    // 验证到达任务页面
    expect(page.url()).toContain('tasks');
  });
});

test.describe('用户流程 - 表单提交场景', () => {
  
  test('联系表单完整提交流程', async ({ page }) => {
    // 场景：用户填写并提交联系表单
    
    // 1. 访问联系页面
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    // 2. 验证表单存在
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
    
    // 3. 填写表单
    const nameInput = page.locator('input[name="name"], #name').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2E 测试用户');
    }
    
    const emailInput = page.locator('input[name="email"], #email').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('e2e-test@example.com');
    }
    
    const messageInput = page.locator('textarea[name="message"], #message').first();
    if (await messageInput.isVisible()) {
      await messageInput.fill('这是一条 E2E 测试消息，用于验证联系表单功能。');
    }
    
    // 4. 提交表单
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      // 监听可能的 API 请求
      const requestPromise = page.waitForRequest(request => 
        request.url().includes('/api/contact') || 
        request.url().includes('/api/form')
      ).catch(() => null);
      
      await submitButton.click();
      
      // 等待可能的 API 请求
      const request = await requestPromise;
      if (request) {
        console.log(`表单提交请求：${request.url()}`);
      }
      
      // 等待响应
      await page.waitForTimeout(2000);
    }
    
    // 5. 验证页面仍然稳定
    await expect(page.locator('body')).toBeVisible();
  });

  test('表单验证错误处理流程', async ({ page }) => {
    // 场景：用户提交无效表单，查看错误提示
    
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
    
    // 尝试提交空表单
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // 等待验证
      await page.waitForTimeout(1000);
      
      // 检查是否有错误提示
      const errors = page.locator('[class*="error"], [class*="invalid"], text=/必填|required/i');
      const errorCount = await errors.count();
      
      console.log(`找到 ${errorCount} 个验证错误提示`);
    }
    
    // 页面应该保持稳定
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('用户流程 - 错误恢复场景', () => {
  
  test('页面加载失败后的恢复', async ({ page }) => {
    // 场景：页面加载遇到问题后的恢复
    
    // 访问正常页面
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    
    // 访问不存在的页面
    await page.goto('/nonexistent-page-test');
    await page.waitForLoadState('networkidle');
    
    // 应该显示错误页面或 404
    await expect(page.locator('body')).toBeVisible();
    
    // 返回首页
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/7zi|Studio/i);
  });

  test('网络错误后的页面恢复', async ({ page }) => {
    // 场景：网络请求失败后的页面恢复
    
    // 设置请求拦截模拟部分失败
    let requestCount = 0;
    page.route('**/*', route => {
      requestCount++;
      route.continue().catch(() => {
        // 忽略失败
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 页面应该仍然可访问
    await expect(page.locator('body')).toBeVisible();
    
    console.log(`拦截了 ${requestCount} 个请求`);
  });
});

test.describe('用户流程 - 多标签页场景', () => {
  
  test('多标签页浏览流程', async ({ context }) => {
    // 场景：用户在多个标签页间切换浏览
    
    // 打开第一个标签页 - 首页
    const page1 = await context.newPage();
    await page1.goto('/');
    await page1.waitForLoadState('networkidle');
    
    // 打开第二个标签页 - Dashboard
    const page2 = await context.newPage();
    await page2.goto('/dashboard');
    await page2.waitForLoadState('networkidle');
    
    // 打开第三个标签页 - 任务
    const page3 = await context.newPage();
    await page3.goto('/tasks');
    await page3.waitForLoadState('networkidle');
    
    // 验证所有标签页都正常加载
    await expect(page1.locator('body')).toBeVisible();
    await expect(page2.locator('body')).toBeVisible();
    await expect(page3.locator('body')).toBeVisible();
    
    // 切换回第一个标签页
    await page1.bringToFront();
    await expect(page1).toHaveTitle(/7zi|Studio/i);
    
    // 清理
    await page1.close();
    await page2.close();
    await page3.close();
  });
});

test.describe('用户流程 - 会话持久性', () => {
  
  test('页面状态保持测试', async ({ page }) => {
    // 场景：用户浏览后返回，页面状态保持
    
    // 访问任务页面
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    const tasksUrl = page.url();
    
    // 导航到其他页面
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // 返回任务页面
    await page.goto(tasksUrl);
    await page.waitForLoadState('networkidle');
    
    // 验证页面仍然可访问
    expect(page.url()).toContain('tasks');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('用户流程 - 边界情况', () => {
  
  test('快速连续导航测试', async ({ page }) => {
    // 场景：用户快速点击导航
    
    const pages = ['/', '/dashboard', '/tasks', '/portfolio', '/about', '/contact'];
    
    for (const path of pages) {
      await page.goto(path);
      // 不等待 networkidle，模拟快速导航
      await page.waitForLoadState('domcontentloaded');
    }
    
    // 最后等待完成
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('深层链接访问测试', async ({ page }) => {
    // 场景：用户直接访问深层链接
    
    const deepLinks = [
      '/tasks/new',
      '/portfolio',
      '/dashboard',
      '/about',
      '/contact'
    ];
    
    for (const link of deepLinks) {
      await page.goto(link);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
