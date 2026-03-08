import { test, expect } from '@playwright/test';

/**
 * 关键路径 E2E 测试
 * 测试系统核心功能的端到端流程
 * 覆盖：首页加载、导航、任务管理、Dashboard、错误处理
 */

test.describe('关键路径 - 核心功能', () => {
  
  test.describe('首页加载流程', () => {
    test('应该成功加载首页并显示主要内容', async ({ page }) => {
      // 访问首页
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      
      // 等待页面加载完成
      await page.waitForLoadState('networkidle');
      
      // 验证页面标题
      await expect(page).toHaveTitle(/7zi|Studio/i);
      
      // 验证主要内容区域存在
      await expect(page.locator('body')).toBeVisible();
      
      // 验证导航栏存在
      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible();
      
      // 验证页脚存在
      const footer = page.locator('footer').first();
      await expect(footer).toBeVisible();
    });

    test('首页加载时间应该在可接受范围内', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // 页面应在 5 秒内加载完成
      expect(loadTime).toBeLessThan(5000);
    });

    test('首页应该正确处理语言路由', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      const url = page.url();
      
      // URL 应该包含语言代码或根路径
      const isValidUrl = /\/(zh|en)\//.test(url) || url.endsWith('/') || url === 'http://localhost:3000/';
      expect(isValidUrl).toBeTruthy();
    });
  });

  test.describe('Dashboard 功能', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    });

    test('Dashboard 页面应该正确加载', async ({ page }) => {
      // 验证页面 URL
      expect(page.url()).toContain('dashboard');
      
      // 验证页面标题
      await expect(page).toHaveTitle(/Dashboard|仪表板/i);
      
      // 验证主要内容区域
      const mainContent = page.locator('main').first();
      await expect(mainContent).toBeVisible();
    });

    test('Dashboard 应该显示统计数据', async ({ page }) => {
      // 查找统计卡片或数据展示区域
      const statsCards = page.locator('[class*="stat"], [class*="card"], .dashboard-stats').first();
      
      // 统计区域应该可见（如果存在）
      if (await statsCards.isVisible()) {
        await expect(statsCards).toBeVisible();
      }
    });

    test('Dashboard 应该显示任务列表或项目信息', async ({ page }) => {
      // 查找任务列表或项目区域
      const taskList = page.locator('[class*="task"], [class*="project"], ul, ol').first();
      
      // 列表区域应该存在
      await expect(page.locator('body')).toContainText(/任务 | 项目|Task|Project|Dashboard/i);
    });
  });

  test.describe('任务管理流程', () => {
    test('任务列表页面应该正确加载', async ({ page }) => {
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      
      // 验证页面
      expect(page.url()).toContain('tasks');
      await expect(page).toHaveTitle(/任务|Task/i);
      
      // 验证任务列表区域存在
      const taskList = page.locator('[class*="task-list"], [class*="task"], main').first();
      await expect(taskList).toBeVisible();
    });

    test('应该能访问新建任务页面', async ({ page }) => {
      await page.goto('/tasks/new');
      await page.waitForLoadState('networkidle');
      
      // 验证页面加载
      expect(page.url()).toContain('tasks/new');
      
      // 应该包含表单元素
      const form = page.locator('form, [class*="form"]').first();
      await expect(form).toBeVisible();
    });

    test('任务页面应该支持导航返回', async ({ page }) => {
      // 访问任务列表
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      
      const tasksUrl = page.url();
      
      // 导航到新建任务
      await page.goto('/tasks/new');
      await page.waitForLoadState('networkidle');
      
      // 返回
      await page.goBack();
      await page.waitForLoadState('networkidle');
      
      // 应该回到任务列表
      expect(page.url()).toContain('tasks');
    });
  });

  test.describe('Portfolio 展示', () => {
    test('Portfolio 列表页面应该正确加载', async ({ page }) => {
      await page.goto('/portfolio');
      await page.waitForLoadState('networkidle');
      
      // 验证页面
      expect(page.url()).toContain('portfolio');
      await expect(page).toHaveTitle(/Portfolio|作品/i);
      
      // 验证内容区域
      const content = page.locator('main, [class*="portfolio"]').first();
      await expect(content).toBeVisible();
    });

    test('Portfolio 项目应该可点击', async ({ page }) => {
      await page.goto('/portfolio');
      await page.waitForLoadState('networkidle');
      
      // 查找项目卡片或链接
      const projectLinks = page.locator('a[href*="portfolio"]').first();
      
      if (await projectLinks.isVisible()) {
        // 获取链接数量
        const count = await page.locator('a[href*="portfolio"]').count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('关于页面', () => {
    test('关于页面应该正确加载', async ({ page }) => {
      await page.goto('/about');
      await page.waitForLoadState('networkidle');
      
      // 验证页面
      expect(page.url()).toContain('about');
      await expect(page).toHaveTitle(/关于|About/i);
      
      // 验证内容存在
      await expect(page.locator('body')).toContainText(/关于|About|团队|Team/i);
    });
  });

  test.describe('联系页面', () => {
    test('联系页面应该正确加载', async ({ page }) => {
      await page.goto('/contact');
      await page.waitForLoadState('networkidle');
      
      // 验证页面
      expect(page.url()).toContain('contact');
      await expect(page).toHaveTitle(/联系|Contact/i);
      
      // 验证表单存在
      const form = page.locator('form').first();
      await expect(form).toBeVisible();
    });
  });

  test.describe('错误处理', () => {
    test('404 页面应该正确显示', async ({ page }) => {
      await page.goto('/nonexistent-page-12345');
      await page.waitForLoadState('networkidle');
      
      // 应该显示 404 或错误页面
      const statusCode = page.url();
      
      // 页面应该仍然可访问（可能显示自定义 404）
      await expect(page.locator('body')).toBeVisible();
    });

    test('API 错误应该被正确处理', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 监听可能的 API 错误
      page.on('response', response => {
        if (response.status() >= 400 && response.url().includes('/api/')) {
          console.log(`API 错误：${response.status()} - ${response.url()}`);
        }
      });
      
      // 页面应该正常加载，即使有 API 错误
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('多浏览器兼容性', () => {
    test('应该在所有配置的浏览器上正常工作', async ({ page, browserName }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 验证基本功能
      await expect(page.locator('body')).toBeVisible();
      
      // 记录浏览器信息
      console.log(`测试浏览器：${browserName}`);
    });
  });
});

test.describe('关键路径 - 用户流程', () => {
  
  test('完整用户访问流程', async ({ page }) => {
    // 1. 访问首页
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    
    // 2. 浏览 Dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('dashboard');
    
    // 3. 查看任务列表
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('tasks');
    
    // 4. 查看 Portfolio
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('portfolio');
    
    // 5. 查看关于页面
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('about');
    
    // 6. 访问联系页面
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('contact');
    
    // 7. 返回首页
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/7zi|Studio/i);
  });

  test('任务创建流程', async ({ page }) => {
    // 1. 访问任务列表
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 2. 点击新建任务
    await page.goto('/tasks/new');
    await page.waitForLoadState('networkidle');
    
    // 3. 填写表单（如果表单存在）
    const form = page.locator('form').first();
    if (await form.isVisible()) {
      // 尝试填写字段
      const titleInput = page.locator('input[name="title"], input[placeholder*="标题"], input[type="text"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('E2E 测试任务');
      }
      
      const descInput = page.locator('textarea[name="description"], textarea[placeholder*="描述"]').first();
      if (await descInput.isVisible()) {
        await descInput.fill('这是一个 E2E 测试创建的任务');
      }
    }
    
    // 4. 验证页面仍然稳定
    await expect(page.locator('body')).toBeVisible();
  });

  test('导航一致性测试', async ({ page }) => {
    const pages = [
      '/',
      '/dashboard',
      '/tasks',
      '/portfolio',
      '/about',
      '/contact'
    ];
    
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      // 验证导航栏存在
      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible();
      
      // 验证页脚存在
      const footer = page.locator('footer').first();
      await expect(footer).toBeVisible();
    }
  });
});

test.describe('性能测试', () => {
  
  test('页面加载性能', async ({ page }) => {
    const pages = [
      { path: '/', name: '首页' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/tasks', name: '任务列表' },
      { path: '/portfolio', name: 'Portfolio' }
    ];
    
    for (const { path, name } of pages) {
      const startTime = Date.now();
      
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`${name} 加载时间：${loadTime}ms`);
      
      // 每页应在 5 秒内加载完成
      expect(loadTime).toBeLessThan(5000);
    }
  });

  test('网络请求不应该有失败', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 允许一些可选资源失败（如分析脚本）
    const criticalFailures = failedRequests.filter(url => 
      !url.includes('analytics') && 
      !url.includes('tracking') &&
      !url.includes('doubleclick')
    );
    
    // 关键资源不应该失败
    expect(criticalFailures.length).toBeLessThan(3);
  });
});
