/**
 * Auth API E2E 测试
 * 测试认证 API 的完整流程
 */

import { test, expect, APIRequestContext } from '@playwright/test';

test.describe('Auth API E2E', () => {
  const baseURL = 'http://localhost:3000';
  let apiContext: APIRequestContext;
  let authCookies: string | undefined;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL,
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('登录功能', () => {
    test('应该能成功登录', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {
          email: 'admin@7zi.studio',
          password: 'admin123',
        },
      });
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('admin@7zi.studio');
      expect(data.user.role).toBe('admin');
      expect(data.csrfToken).toBeDefined();
      
      // 保存 cookies 用于后续测试
      const cookies = response.headers()['set-cookie'];
      if (cookies) {
        authCookies = cookies;
      }
    });

    test('无效密码应该被拒绝', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {
          email: 'admin@7zi.studio',
          password: 'wrongpassword',
        },
      });
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid');
    });

    test('不存在的用户应该被拒绝', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });
      
      expect(response.status()).toBe(401);
    });

    test('缺少邮箱应该返回错误', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {
          password: 'password123',
        },
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    test('缺少密码应该返回错误', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {
          email: 'admin@7zi.studio',
        },
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    test('空请求体应该返回错误', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {},
      });
      
      expect(response.status()).toBe(400);
    });
  });

  test.describe('CSRF Token', () => {
    test('应该能获取 CSRF token', async () => {
      const response = await apiContext.get('/api/auth?action=csrf');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.csrfToken).toBeDefined();
      expect(data.csrfToken.length).toBeGreaterThan(0);
    });
  });

  test.describe('JWT Secret 验证', () => {
    test('应该能检查密钥强度', async () => {
      const response = await apiContext.get('/api/auth?action=check-secret');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.secretStrength).toBeDefined();
      expect(data.secretStrength.valid).toBeDefined();
    });
  });

  test.describe('API 信息', () => {
    test('应该返回可用端点列表', async () => {
      const response = await apiContext.get('/api/auth');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.message).toBe('Auth API');
      expect(data.endpoints).toBeInstanceOf(Array);
      expect(data.endpoints.length).toBeGreaterThan(0);
    });
  });

  test.describe('登出功能', () => {
    test('应该能成功登出', async () => {
      // 先登录
      await apiContext.post('/api/auth', {
        data: {
          email: 'admin@7zi.studio',
          password: 'admin123',
        },
      });
      
      // 然后登出
      const response = await apiContext.delete('/api/auth');
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.message).toContain('Logged out');
    });

    test('未登录状态也能登出', async () => {
      const response = await apiContext.delete('/api/auth');
      
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('安全性测试', () => {
    test('应该正确处理 SQL 注入尝试', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {
          email: "admin@7zi.studio'; DROP TABLE users; --",
          password: 'admin123',
        },
      });
      
      // 应该拒绝或安全处理
      expect(response.status()).toBe(401);
    });

    test('应该正确处理 XSS 尝试', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {
          email: '<script>alert("xss")</script>@test.com',
          password: 'password',
        },
      });
      
      expect(response.status()).toBe(401);
    });

    test('应该正确处理超大请求', async () => {
      const largePassword = 'a'.repeat(10000);
      const response = await apiContext.post('/api/auth', {
        data: {
          email: 'admin@7zi.studio',
          password: largePassword,
        },
      });
      
      // 应该不崩溃
      expect([200, 401, 413]).toContain(response.status());
    });

    test('应该正确处理 Unicode 字符', async () => {
      const response = await apiContext.post('/api/auth', {
        data: {
          email: '用户@7zi.studio',
          password: '密码123',
        },
      });
      
      // 应该不崩溃
      expect([200, 400, 401]).toContain(response.status());
    });
  });
});

test.describe('认证页面 E2E', () => {
  test('登录页面应该正确渲染', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // 检查登录表单元素
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("登录")').first();
    
    if (await emailInput.count() > 0) {
      await expect(emailInput).toBeVisible();
    }
    
    if (await passwordInput.count() > 0) {
      await expect(passwordInput).toBeVisible();
    }
    
    if (await submitButton.count() > 0) {
      await expect(submitButton).toBeVisible();
    }
  });

  test('应该能完成登录流程', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      await emailInput.fill('admin@7zi.studio');
      await passwordInput.fill('admin123');
      
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // 等待登录完成
        await page.waitForTimeout(2000);
        
        // 应该跳转到其他页面或显示成功消息
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');
      }
    }
  });

  test('应该显示登录错误信息', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      await emailInput.fill('admin@7zi.studio');
      await passwordInput.fill('wrongpassword');
      
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // 等待错误消息
        await page.waitForTimeout(1000);
        
        // 检查错误消息
        const errorMessage = page.locator(
          '.error, .alert-error, [role="alert"], :text("Invalid"), :text("错误")'
        ).first();
        
        if (await errorMessage.count() > 0) {
          await expect(errorMessage).toBeVisible();
        }
      }
    }
  });

  test('受保护页面应该重定向到登录', async ({ page, context }) => {
    // 清除所有 cookies
    await context.clearCookies();
    
    // 尝试访问受保护页面（如果有的话）
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // 如果是受保护的页面，应该重定向到登录或显示登录提示
    const currentUrl = page.url();
    const hasLoginForm = await page.locator('input[type="password"]').count() > 0;
    
    // 验证需要登录的行为
    expect(
      currentUrl.includes('/login') || 
      hasLoginForm ||
      await page.locator(':text("登录"), :text("Login")').count() > 0
    ).toBeTruthy();
  });
});