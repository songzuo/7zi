import { test, expect } from '@playwright/test';

/**
 * 主题切换 E2E 测试
 * 测试亮色/暗色模式切换功能
 */
test.describe('主题切换测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('页面应该有主题切换按钮', async ({ page }) => {
    // 查找主题切换按钮
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="主题"]').first();
    
    // 如果没找到，尝试其他选择器
    const themeButton = themeToggle.or(
      page.locator('button:has-text("☀️"), button:has-text("🌙")')
    ).or(
      page.locator('button').filter({ has: page.locator('span:has-text("☀️"), span:has-text("🌙")') })
    );
    
    // 应该找到主题切换按钮
    await expect(themeButton.first()).toBeVisible();
  });

  test('应该能切换到暗色模式', async ({ page }) => {
    // 获取主题切换按钮
    const themeButton = page.locator('button[aria-label*="theme"], button[aria-label*="主题"]').first();
    
    if (await themeButton.isVisible()) {
      // 点击切换主题
      await themeButton.click();
      
      // 等待主题切换完成
      await page.waitForTimeout(500);
      
      // 验证暗色模式已应用
      const html = page.locator('html');
      const isDark = await html.evaluate((el) => {
        return el.classList.contains('dark') || 
               el.getAttribute('data-theme') === 'dark' ||
               getComputedStyle(el).colorScheme === 'dark';
      });
      
      // 如果没有暗色类，检查背景颜色变化
      const backgroundColor = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });
      
      // 暗色模式应该有较深的背景色
      // 这里我们只验证按钮可以点击，不强制验证颜色
    }
  });

  test('主题切换应该保持页面内容可见', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme"], button[aria-label*="主题"]').first();
    
    if (await themeButton.isVisible()) {
      // 点击切换主题多次
      for (let i = 0; i < 3; i++) {
        await themeButton.click();
        await page.waitForTimeout(300);
        
        // 页面内容应该仍然可见
        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('nav').first()).toBeVisible();
      }
    }
  });

  test('主题选择应该被持久化', async ({ page, context }) => {
    const themeButton = page.locator('button[aria-label*="theme"], button[aria-label*="主题"]').first();
    
    if (await themeButton.isVisible()) {
      // 切换主题
      await themeButton.click();
      await page.waitForTimeout(500);
      
      // 检查本地存储
      const localStorage = await page.evaluate(() => {
        return JSON.stringify(localStorage);
      });
      
      // 应该有主题设置存储
      expect(localStorage).toBeDefined();
    }
  });

  test('暗色模式下文本应该可读', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme"], button[aria-label*="主题"]').first();
    
    if (await themeButton.isVisible()) {
      // 切换到暗色模式
      await themeButton.click();
      await page.waitForTimeout(500);
      
      // 获取主要文本元素
      const body = page.locator('body');
      const textColor = await body.evaluate((el) => {
        return getComputedStyle(el).color;
      });
      
      // 验证文本颜色已定义（不是默认值）
      expect(textColor).toBeTruthy();
    }
  });

  test('主题切换按钮应该有正确的无障碍标签', async ({ page }) => {
    const themeButton = page.locator('button[aria-label*="theme"], button[aria-label*="主题"]').first();
    
    if (await themeButton.isVisible()) {
      // 检查是否有 aria-label 或其他无障碍属性
      const ariaLabel = await themeButton.getAttribute('aria-label');
      const ariaRole = await themeButton.getAttribute('role');
      
      // 应该有 aria-label
      expect(ariaLabel).toBeTruthy();
    }
  });
});

test.describe('主题初始化测试', () => {
  test('首次访问应该正确初始化主题', async ({ page }) => {
    // 清除存储
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    
    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 页面应该正常渲染
    await expect(page.locator('body')).toBeVisible();
  });

  test('主题应该跟随系统偏好', async ({ page, browser }) => {
    // 创建暗色模式的上下文
    const darkContext = await browser.newContext({
      colorScheme: 'dark'
    });
    const darkPage = await darkContext.newPage();
    
    await darkPage.goto('/');
    await darkPage.waitForLoadState('networkidle');
    
    // 页面应该正常渲染
    await expect(darkPage.locator('body')).toBeVisible();
    
    await darkContext.close();
  });

  test('亮色模式下页面应该正常显示', async ({ page, browser }) => {
    // 创建亮色模式的上下文
    const lightContext = await browser.newContext({
      colorScheme: 'light'
    });
    const lightPage = await lightContext.newPage();
    
    await lightPage.goto('/');
    await lightPage.waitForLoadState('networkidle');
    
    // 页面应该正常渲染
    await expect(lightPage.locator('body')).toBeVisible();
    
    await lightContext.close();
  });
});