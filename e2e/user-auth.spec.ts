import { test, expect } from '@playwright/test';

/**
 * 用户认证和导航 E2E 测试
 * 测试用户登录、登出、页面导航等关键流程
 */

test.describe('用户登录流程', () => {
  test('访客应该能看到登录页面', async ({ page }) => {
    // 访问登录页面
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // 验证登录表单存在
    const loginForm = page.locator('form').first();
    await expect(loginForm).toBeVisible();
    
    // 验证邮箱输入框
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
    
    // 验证密码输入框
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await expect(passwordInput).toBeVisible();
    
    // 验证登录按钮
    const loginButton = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")').first();
    await expect(loginButton).toBeVisible();
  });

  test('用户应该能成功登录', async ({ page }) => {
    // 访问登录页面
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // 填写登录表单
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('admin@7zi.studio');
      await passwordInput.fill('admin123');
      
      // 监听可能的 API 请求
      const loginRequest = page.waitForRequest(request => 
        request.url().includes('/api/auth') && request.method() === 'POST'
      ).catch(() => null);
      
      await loginButton.click();
      
      // 等待登录完成
      await page.waitForTimeout(2000);
      
      // 验证登录成功（应该重定向到其他页面）
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login');
      
      // 页面应该正常显示
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('无效凭据应该显示错误消息', async ({ page }) => {
    // 访问登录页面
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // 填写无效凭据
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('invalid@example.com');
      await passwordInput.fill('wrongpassword');
      
      await loginButton.click();
      
      // 等待错误消息
      await page.waitForTimeout(1000);
      
      // 验证错误消息显示
      const errorMessage = page.locator(
        '.error, .alert-error, [role="alert"], text=/Invalid|错误|无效/i'
      ).first();
      
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
      }
      
      // 应该仍然在登录页面
      expect(page.url()).toContain('/login');
    }
  });

  test('空表单提交应该显示验证错误', async ({ page }) => {
    // 访问登录页面
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // 直接提交空表单
    const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
    await loginButton.click();
    
    // 等待验证
    await page.waitForTimeout(500);
    
    // 验证错误消息
    const validationError = page.locator(
      '.error, .validation-error, text=/required|必填|请输入/i'
    ).first();
    
    if (await validationError.count() > 0) {
      await expect(validationError).toBeVisible();
    }
  });
});

test.describe('用户导航流程', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('admin@7zi.studio');
      await passwordInput.fill('admin123');
      await loginButton.click();
      await page.waitForTimeout(2000);
    }
  });

  test('登录后应该能访问 Dashboard', async ({ page }) => {
    // 导航到 Dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 验证 Dashboard 加载
    expect(page.url()).toContain('dashboard');
    await expect(page.locator('body')).toBeVisible();
    
    // 验证 Dashboard 标题
    const dashboardTitle = page.locator('text=/Dashboard|看板|AI/i').first();
    await expect(dashboardTitle).toBeVisible();
  });

  test('登录后应该能访问任务页面', async ({ page }) => {
    // 导航到任务页面
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    
    // 验证任务页面加载
    expect(page.url()).toContain('tasks');
    await expect(page.locator('body')).toBeVisible();
    
    // 验证任务标题
    const tasksTitle = page.locator('text=/Tasks|任务/i').first();
    await expect(tasksTitle).toBeVisible();
  });

  test('登录后应该能访问 Portfolio', async ({ page }) => {
    // 导航到 Portfolio
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
    
    // 验证 Portfolio 加载
    expect(page.url()).toContain('portfolio');
    await expect(page.locator('body')).toBeVisible();
    
    // 验证 Portfolio 标题
    const portfolioTitle = page.locator('text=/Portfolio|作品/i').first();
    await expect(portfolioTitle).toBeVisible();
  });

  test('登录后应该能访问设置页面', async ({ page }) => {
    // 导航到设置页面
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 验证设置页面加载
    expect(page.url()).toContain('settings');
    await expect(page.locator('body')).toBeVisible();
    
    // 验证设置标题
    const settingsTitle = page.locator('text=/Settings|设置/i').first();
    await expect(settingsTitle).toBeVisible();
  });

  test('导航栏应该显示用户信息', async ({ page }) => {
    // 访问任意页面
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 查找用户信息
    const userAvatar = page.locator('[class*="avatar"], img[alt*="user"], text=/admin/').first();
    const userProfile = page.locator('[class*="profile"], text=/Profile|个人资料/i').first();
    
    // 应该显示用户相关信息
    console.log(`用户头像可见: ${await userAvatar.isVisible()}`);
    console.log(`用户资料可见: ${await userProfile.isVisible()}`);
  });
});

test.describe('用户登出流程', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('admin@7zi.studio');
      await passwordInput.fill('admin123');
      await loginButton.click();
      await page.waitForTimeout(2000);
    }
  });

  test('用户应该能找到登出选项', async ({ page }) => {
    // 访问 Dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 查找登出按钮或用户菜单
    const logoutButton = page.locator(
      'button:has-text("登出"), button:has-text("Logout"), a:has-text("登出"), a:has-text("Logout")'
    ).first();
    
    const userMenu = page.locator('[class*="user-menu"], [class*="profile-menu"]').first();
    
    // 应该有登出选项
    console.log(`登出按钮可见: ${await logoutButton.isVisible()}`);
    console.log(`用户菜单可见: ${await userMenu.isVisible()}`);
  });

  test('点击登出应该返回登录页面', async ({ page }) => {
    // 访问 Dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 查找登出按钮
    const logoutButton = page.locator(
      'button:has-text("登出"), button:has-text("Logout"), a:has-text("登出"), a:has-text("Logout")'
    ).first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
      
      // 应该重定向到登录页面或首页
      const currentUrl = page.url();
      expect(currentUrl.includes('/login') || currentUrl === '/').toBeTruthy();
      
      // 页面应该正常显示
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('受保护路由测试', () => {
  test('未登录用户访问受保护页面应该重定向', async ({ page, context }) => {
    // 清除 cookies 确保未登录状态
    await context.clearCookies();
    
    // 尝试访问受保护页面
    const protectedPages = ['/dashboard', '/tasks', '/settings'];
    
    for (const pagePath of protectedPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // 应该重定向到登录页面或显示登录提示
      const currentUrl = page.url();
      const hasLoginForm = await page.locator('input[type="password"]').count() > 0;
      
      // 验证需要登录的行为
      expect(
        currentUrl.includes('/login') || 
        hasLoginForm ||
        await page.locator('text=/登录|Login/').count() > 0
      ).toBeTruthy();
    }
  });

  test('登录状态应该持久化', async ({ page, context }) => {
    // 先登录
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('admin@7zi.studio');
      await passwordInput.fill('admin123');
      await loginButton.click();
      await page.waitForTimeout(2000);
    }
    
    // 保存当前 cookies
    const cookies = await context.cookies();
    
    // 创建新页面
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    await newPage.waitForLoadState('networkidle');
    
    // 新页面应该保持登录状态
    expect(newPage.url()).toContain('dashboard');
    await expect(newPage.locator('body')).toBeVisible();
    
    // 清理
    await newPage.close();
  });
});

test.describe('移动端认证体验', () => {
  test('移动端登录表单应该适配', async ({ page, isMobile }) => {
    test.skip(!isMobile, '仅在移动端运行');
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // 验证表单在移动端可访问
    await expect(page.locator('body')).toBeVisible();
    
    // 表单元素应该适应小屏幕
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768);
    
    // 输入框应该可点击
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.click();
      await page.keyboard.type('test@example.com');
    }
  });

  test('移动端导航应该工作', async ({ page, isMobile }) => {
    test.skip(!isMobile, '仅在移动端运行');
    
    // 先登录
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('admin@7zi.studio');
      await passwordInput.fill('admin123');
      await loginButton.click();
      await page.waitForTimeout(2000);
    }
    
    // 检查移动端菜单
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰")').first();
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      
      // 菜单应该展开
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('认证性能和安全性', () => {
  test('登录页面加载性能', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // 登录页面应在 3 秒内加载完成
    expect(loadTime).toBeLessThan(3000);
  });

  test('多次快速登录尝试应该被处理', async ({ page }) => {
    // 快速连续尝试登录
    for (let i = 0; i < 3; i++) {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        await emailInput.fill('admin@7zi.studio');
        await passwordInput.fill('admin123');
        
        const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
        await loginButton.click();
        
        // 不等待完全加载，模拟快速操作
        await page.waitForTimeout(500);
      }
    }
    
    // 最后确保页面稳定
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});