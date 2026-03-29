/**
 * E2E Test: Visual Regression
 * 
 * 视觉回归测试
 * - 截图比对
 * - UI 组件快照测试
 */

import { test, expect } from '../fixtures/test.fixtures';

test.describe('视觉回归测试', () => {
  test('首页截图应该匹配基线', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage.png', {
      maxDiffPixels: 100,
    });
  });

  test('登录页面截图应该匹配基线', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixels: 100,
    });
  });

  test('图片优化页面截图应该匹配基线', async ({ page }) => {
    await page.goto('/image-optimization-demo');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('image-optimization.png', {
      maxDiffPixels: 100,
    });
  });

  test('通知示例页面截图应该匹配基线', async ({ page }) => {
    await page.goto('/notification-demo');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('notification-demo.png', {
      maxDiffPixels: 100,
    });
  });

  test('WebSocket 状态页面截图应该匹配基线', async ({ page }) => {
    await page.goto('/websocket-status-demo');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('websocket-status.png', {
      maxDiffPixels: 100,
    });
  });
});

test.describe('移动端视觉回归测试', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('移动端首页截图应该匹配基线', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      maxDiffPixels: 100,
    });
  });

  test('移动端登录页面截图应该匹配基线', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-page-mobile.png', {
      maxDiffPixels: 100,
    });
  });
});

test.describe('组件快照测试', () => {
  test('按钮组件快照', async ({ page }) => {
    await page.goto('/design-system');
    
    const button = page.getByRole('button').first();
    if (await button.count() > 0) {
      await expect(button).toHaveScreenshot('button-component.png');
    }
  });

  test('输入框组件快照', async ({ page }) => {
    await page.goto('/design-system');
    
    const input = page.getByRole('textbox').first();
    if (await input.count() > 0) {
      await expect(input).toHaveScreenshot('input-component.png');
    }
  });
});
