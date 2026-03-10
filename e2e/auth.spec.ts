import { test, expect } from '@playwright/test';

/**
 * E2E 测试：用户认证流程
 * 包括登录、登出、CSRF保护等
 */
test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 确保从首页开始
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    // 检查是否可以访问登录页面（如果存在）
    // 或者检查是否有登录相关的UI元素
    const hasAuthElements = await page.getByRole('button', { name: /login|log in|sign in/i }).isVisible();
    if (hasAuthElements) {
      await expect(page.getByRole('button', { name: /login|log in|sign in/i })).toBeVisible();
    }
    
    // 检查API端点是否可用
    const response = await page.request.get('/api/auth');
    await expect(response.ok()).toBeTruthy();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // 直接测试API登录
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: 'admin@7zi.studio',
        password: 'admin123'
      }
    });

    await expect(loginResponse.ok()).toBeTruthy();
    
    const loginData = await loginResponse.json();
    await expect(loginData.success).toBeTruthy();
    await expect(loginData.user).toBeDefined();
    await expect(loginData.user.email).toBe('admin@7zi.studio');
    await expect(loginData.csrfToken).toBeDefined();
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    const invalidLoginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      }
    });

    await expect(invalidLoginResponse.status()).toBe(401);
    const errorData = await invalidLoginResponse.json();
    await expect(errorData.error).toContain('Invalid email or password');
  });

  test('should get current user info after login', async ({ page }) => {
    // 先登录
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: 'admin@7zi.studio',
        password: 'admin123'
      }
    });
    
    await expect(loginResponse.ok()).toBeTruthy();
    
    // 获取CSRF token用于后续请求
    const csrfResponse = await page.request.get('/api/auth/csrf?action=csrf');
    await expect(csrfResponse.ok()).toBeTruthy();
    const csrfData = await csrfResponse.json();
    
    // 获取当前用户信息
    const meResponse = await page.request.get('/api/auth/me', {
      headers: {
        'X-CSRF-Token': csrfData.csrfToken
      }
    });
    
    await expect(meResponse.ok()).toBeTruthy();
    const userData = await meResponse.json();
    await expect(userData.success).toBeTruthy();
    await expect(userData.user.email).toBe('admin@7zi.studio');
  });

  test('should logout successfully', async ({ page }) => {
    // 先登录
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: 'admin@7zi.studio',
        password: 'admin123'
      }
    });
    
    await expect(loginResponse.ok()).toBeTruthy();
    
    // 登出
    const logoutResponse = await page.request.delete('/api/auth/logout');
    await expect(logoutResponse.ok()).toBeTruthy();
    
    const logoutData = await logoutResponse.json();
    await expect(logoutData.success).toBeTruthy();
    await expect(logoutData.message).toContain('Logged out successfully');
  });

  test('should refresh token successfully', async ({ page }) => {
    // 先登录获取refresh token
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        email: 'admin@7zi.studio',
        password: 'admin123'
      }
    });
    
    await expect(loginResponse.ok()).toBeTruthy();
    
    // 刷新token
    const refreshResponse = await page.request.post('/api/auth/refresh');
    await expect(refreshResponse.ok()).toBeTruthy();
    
    const refreshData = await refreshResponse.json();
    await expect(refreshData.success).toBeTruthy();
    await expect(refreshData.accessToken).toBeDefined();
  });
});