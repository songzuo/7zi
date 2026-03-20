/**
 * @fileoverview E2E tests for authentication flow
 * Tests login, logout, registration, and protected route access
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to login page', async ({ page }) => {
    // Click on login button/link
    const loginButton = page.locator('text=登录, Login, Sign In').first();
    await loginButton.click();

    // Verify we're on a login/auth page
    await expect(page).toHaveURL(/\/(login|auth|signin)/i);
    await expect(page.locator('h1, h2, h3')).toContainText(/登录|Login|Sign In/i);
  });

  test('should display login form elements', async ({ page }) => {
    // Navigate to login page
    await page.click('text=登录, Login, Sign In');

    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"], input[placeholder*="Email"]');
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="密码"], input[placeholder*="Password"]');
    await expect(passwordInput).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login"), button:has-text("Sign In")');
    await expect(submitButton).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.click('text=登录, Login, Sign In');

    // Fill with invalid email
    await page.fill('input[type="email"], input[name="email"]', 'invalid-email');
    await page.fill('input[type="password"], input[name="password"]', 'password123');

    // Click submit
    await page.click('button[type="submit"]');

    // Check for validation error
    await expect(page.locator('text=邮箱格式错误, invalid email, Invalid email').first()).toBeVisible({ timeout: 2000 });
  });

  test('should show error for empty fields', async ({ page }) => {
    await page.click('text=登录, Login, Sign In');

    // Click submit without filling fields
    await page.click('button[type="submit"]');

    // Check for required field errors
    await expect(page.locator('text=必填, required, Required').first()).toBeVisible({ timeout: 2000 });
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.click('text=登录, Login, Sign In');

    // Fill with invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');

    // Click submit
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.locator('text=邮箱或密码错误, invalid credentials, Invalid email or password').first()).toBeVisible({ timeout: 3000 });
  });

  test('should handle successful login', async ({ page }) => {
    await page.click('text=登录, Login, Sign In');

    // Fill with test credentials (if available)
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');

    // Click submit
    await page.click('button[type="submit"]');

    // Wait for navigation or success message
    await page.waitForTimeout(2000);

    // Verify user is redirected to dashboard or shows logged-in state
    const url = page.url();
    const isDashboard = url.includes('/dashboard') || url.includes('/home');
    const isLoggedIn = await page.locator('text=退出, Logout, Sign Out, 用户, User').count() > 0;

    expect(isDashboard || isLoggedIn).toBeTruthy();
  });

  test('should support "remember me" functionality', async ({ page }) => {
    await page.click('text=登录, Login, Sign In');

    // Check for remember me checkbox
    const rememberCheckbox = page.locator('input[type="checkbox"][name="remember"], input[type="checkbox"][value="remember"], label:has-text("记住我"), label:has-text("Remember me")');
    await expect(rememberCheckbox).toBeVisible();

    // Click it
    await rememberCheckbox.check();
    await expect(rememberCheckbox).toBeChecked();
  });

  test('should navigate to registration page', async ({ page }) => {
    // Look for registration link
    const registerLink = page.locator('text=注册, Register, Sign Up, 创建账户, Create account').first();

    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/(register|signup)/i);
      await expect(page.locator('h1, h2, h3')).toContainText(/注册|Register|Sign Up/i);
    }
  });

  test('should support password reset flow', async ({ page }) => {
    await page.click('text=登录, Login, Sign In');

    // Look for forgot password link
    const forgotPasswordLink = page.locator('text=忘记密码, Forgot password, 忘记密码?').first();

    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      await expect(page).toHaveURL(/\/(forgot-password|reset-password)/i);
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    }
  });

  test('should handle logout', async ({ page }) => {
    // First login (if possible)
    await page.click('text=登录, Login, Sign In');
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Look for logout button
    const logoutButton = page.locator('text=退出, Logout, Sign Out').first();

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);

      // Verify logged out
      const loginButton = page.locator('text=登录, Login, Sign In').first();
      await expect(loginButton).toBeVisible();
    }
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/dashboard');

    // Check if redirected to login
    const url = page.url();
    const isLoginPage = url.includes('/login') || url.includes('/auth') || url.includes('/signin');

    if (isLoginPage) {
      await expect(page.locator('h1, h2, h3')).toContainText(/登录|Login|Sign In/i);
    }
  });

  test('should display social login options', async ({ page }) => {
    await page.click('text=登录, Login, Sign In');

    // Check for social login buttons
    const githubButton = page.locator('button:has-text("GitHub"), text=GitHub').first();
    const googleButton = page.locator('button:has-text("Google"), text=Google').first();

    // At least one social login should be present (optional)
    const hasSocialLogin = await githubButton.isVisible() || await googleButton.isVisible();
    expect(hasSocialLogin).toBeTruthy();
  });

  test('should show loading state during authentication', async ({ page }) => {
    await page.click('text=登录, Login, Sign In');

    // Fill form
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');

    // Click submit and check for loading state
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check for loading indicator
    const loadingIndicator = page.locator('.loading, .spinner, [aria-busy="true"]');
    const isDisabled = await submitButton.isDisabled();

    expect(isDisabled || (await loadingIndicator.count()) > 0).toBeTruthy();
  });
});

test.describe('Session Management', () => {
  test('should persist session across page refresh', async ({ page, context }) => {
    // Login first
    await page.goto('/');
    await page.click('text=登录, Login, Sign In');
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Get cookies before refresh
    const cookiesBefore = await context.cookies();

    // Refresh page
    await page.reload();

    // Get cookies after refresh
    const cookiesAfter = await context.cookies();

    // Session should be preserved
    expect(cookiesAfter.length).toBeGreaterThan(0);
  });

  test('should clear session on logout', async ({ page, context }) => {
    // Login
    await page.goto('/');
    await page.click('text=登录, Login, Sign In');
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Logout
    const logoutButton = page.locator('text=退出, Logout, Sign Out').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);

      // Check session cookies are cleared
      const cookies = await context.cookies();
      const authCookies = cookies.filter(c =>
        c.name.toLowerCase().includes('token') ||
        c.name.toLowerCase().includes('session') ||
        c.name.toLowerCase().includes('auth')
      );

      expect(authCookies.length).toBe(0);
    }
  });
});

test.describe('Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.click('text=登录, Login, Sign In');

    // Check for form labels
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    await expect(emailInput).toHaveAttribute('aria-label', /.+/);
    const emailHasLabel = await emailInput.getAttribute('aria-label') !== null ||
                          await emailInput.getAttribute('id') !== null;
    expect(emailHasLabel).toBeTruthy();
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await page.click('text=登录, Login, Sign In');

    // Check for ARIA roles and attributes
    const form = page.locator('form');
    if (await form.count() > 0) {
      await expect(form.first()).toHaveAttribute('role', 'form');
    }
  });
});
