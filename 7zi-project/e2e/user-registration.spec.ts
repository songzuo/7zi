/**
 * @fileoverview User Registration E2E Tests
 * Tests complete user registration flow including validation, email verification, and onboarding
 */

import { test, expect } from '@playwright/test';
import { generateTestId, waitForToast, waitForPageLoad } from './helpers/test-helpers';

test.describe('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to registration page', async ({ page }) => {
    // Navigate to registration
    const registerLink = page.locator('text=注册, Register, Sign Up, 创建账户').first();

    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/(register|signup)/i);
    } else {
      // Try direct navigation
      await page.goto('/zh/register');
    }

    // Verify we're on registration page
    await expect(page.locator('h1, h2, h3')).toContainText(/注册|Register|Sign Up/i);
  });

  test('should display all registration form fields', async ({ page }) => {
    await page.goto('/zh/register');

    // Check for required fields
    const nameInput = page.locator('input[name="name"], input[placeholder*="姓名"], input[placeholder*="Name"]');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="password_confirmation"]');

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
  });

  test('should validate email format during registration', async ({ page }) => {
    await page.goto('/zh/register');

    // Fill form with invalid email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"], input[name="email"]', 'invalid-email');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"], input[name="password_confirmation"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Check for validation error
    const emailError = page.locator('text=邮箱格式错误, invalid email, 请输入有效的邮箱');
    await expect(emailError.first()).toBeVisible({ timeout: 2000 });
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/zh/register');

    // Fill form with weak password
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', '123'); // Weak password
    await page.fill('input[name="confirmPassword"], input[name="password_confirmation"]', '123');

    // Submit form
    await page.click('button[type="submit"]');

    // Check for password strength error
    const passwordError = page.locator('text=密码强度不够, password too weak, 至少8位');
    await expect(passwordError.first()).toBeVisible({ timeout: 2000 });
  });

  test('should validate password confirmation', async ({ page }) => {
    await page.goto('/zh/register');

    // Fill form with mismatched passwords
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"], input[name="password_confirmation"]', 'password456');

    // Submit form
    await page.click('button[type="submit"]');

    // Check for password mismatch error
    const mismatchError = page.locator('text=密码不匹配, passwords do not match, 确认密码不一致');
    await expect(mismatchError.first()).toBeVisible({ timeout: 2000 });
  });

  test('should show required field errors', async ({ page }) => {
    await page.goto('/zh/register');

    // Submit empty form
    await page.click('button[type="submit"]');

    // Check for required field errors
    const requiredErrors = page.locator('text=必填, required, 不能为空');
    await expect(requiredErrors.first()).toBeVisible({ timeout: 2000 });
  });

  test('should handle duplicate email registration', async ({ page }) => {
    await page.goto('/zh/register');

    // Try to register with existing email
    await page.fill('input[name="name"]', 'Duplicate User');
    await page.fill('input[type="email"], input[name="email"]', 'admin@7zi.com'); // Existing email
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"], input[name="password_confirmation"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Check for duplicate email error
    const duplicateError = page.locator('text=邮箱已被注册, email already exists, 该邮箱已使用');
    await expect(duplicateError.first()).toBeVisible({ timeout: 3000 });
  });

  test('should complete successful registration', async ({ page }) => {
    await page.goto('/zh/register');

    // Generate unique test data
    const uniqueEmail = `test-${generateTestId()}@example.com`;
    const testName = `Test User ${generateTestId()}`;

    // Fill registration form
    await page.fill('input[name="name"]', testName);
    await page.fill('input[type="email"], input[name="email"]', uniqueEmail);
    await page.fill('input[type="password"], input[name="password"]', 'Test123456!');
    await page.fill('input[name="confirmPassword"], input[name="password_confirmation"]', 'Test123456!');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation or success message
    await page.waitForTimeout(3000);

    // Check for success message or redirect
    const successMessage = page.locator('text=注册成功, Registration successful, 账户已创建');
    const isOnDashboard = page.url().includes('/dashboard');

    expect(await successMessage.isVisible() || isOnDashboard).toBeTruthy();
  });

  test('should handle registration with social login', async ({ page }) => {
    await page.goto('/zh/register');

    // Check for social login options
    const githubButton = page.locator('button:has-text("GitHub"), text=GitHub').first();
    const googleButton = page.locator('button:has-text("Google"), text=Google').first();

    // Test GitHub login button (if present)
    if (await githubButton.isVisible()) {
      await githubButton.click();

      // Verify redirect to GitHub OAuth
      await expect(page).toHaveURL(/github\.com/i);
      await page.goto('/zh/register'); // Go back for other tests
    }

    // Test Google login button (if present)
    if (await googleButton.isVisible()) {
      await googleButton.click();

      // Verify redirect to Google OAuth
      await expect(page).toHaveURL(/accounts\.google\.com/i);
    }
  });

  test('should show password strength indicator', async ({ page }) => {
    await page.goto('/zh/register');

    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    // Type weak password
    await passwordInput.fill('123');
    await page.waitForTimeout(500);

    // Check for weak indicator
    const weakIndicator = page.locator('.password-strength-weak, [data-strength="weak"]');
    expect(await weakIndicator.isVisible()).toBeTruthy();

    // Type strong password
    await passwordInput.fill('Test123456!');
    await page.waitForTimeout(500);

    // Check for strong indicator
    const strongIndicator = page.locator('.password-strength-strong, [data-strength="strong"]');
    expect(await strongIndicator.isVisible()).toBeTruthy();
  });

  test('should handle terms and conditions checkbox', async ({ page }) => {
    await page.goto('/zh/register');

    // Check for terms checkbox
    const termsCheckbox = page.locator('input[type="checkbox"][name="terms"], input[type="checkbox"][name="agree"]');

    if (await termsCheckbox.isVisible()) {
      // Try to submit without accepting terms
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
      await page.fill('input[type="password"], input[name="password"]', 'Test123456!');
      await page.fill('input[name="confirmPassword"], input[name="password_confirmation"]', 'Test123456!');
      await page.click('button[type="submit"]');

      // Check for terms error
      const termsError = page.locator('text=请同意条款, 请接受服务条款, 必须同意');
      await expect(termsError.first()).toBeVisible({ timeout: 2000 });

      // Accept terms
      await termsCheckbox.check();
      await expect(termsCheckbox).toBeChecked();

      // Submit again
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);

      // Should proceed without terms error
      await expect(termsError).not.toBeVisible();
    }
  });

  test('should navigate to login page from registration', async ({ page }) => {
    await page.goto('/zh/register');

    // Check for login link
    const loginLink = page.locator('text=已有账户, Login, 已有账号').first();

    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/(login|signin)/i);
    }
  });

  test('should show loading state during registration', async ({ page }) => {
    await page.goto('/zh/register');

    // Fill form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"], input[name="email"]', `test-${generateTestId()}@example.com`);
    await page.fill('input[type="password"], input[name="password"]', 'Test123456!');
    await page.fill('input[name="confirmPassword"], input[name="password_confirmation"]', 'Test123456!');

    // Submit and check loading state
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check for loading indicator
    const loadingIndicator = page.locator('.loading, .spinner, [aria-busy="true"]');
    const isDisabled = await submitButton.isDisabled();

    expect(isDisabled || (await loadingIndicator.count()) > 0).toBeTruthy();
  });

  test('should handle registration errors gracefully', async ({ page }) => {
    await page.goto('/zh/register');

    // Mock network error
    await page.route('**/api/auth/register', async (route) => {
      await route.abort('failed');
    });

    // Fill and submit form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'Test123456!');
    await page.fill('input[name="confirmPassword"], input[name="password_confirmation"]', 'Test123456!');

    await page.click('button[type="submit"]');

    // Check for error message
    const errorMessage = page.locator('text=网络错误, 连接失败, 注册失败, 请求失败');
    await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Registration Accessibility', () => {
  test('should have proper form labels and ARIA attributes', async ({ page }) => {
    await page.goto('/zh/register');

    // Check for form labels
    const nameInput = page.locator('input[name="name"]');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(nameInput).toHaveAttribute('aria-label', /.+/);
    await expect(emailInput).toHaveAttribute('aria-label', /.+/);
    await expect(passwordInput).toHaveAttribute('aria-label', /.+/);

    // Check for proper ARIA roles
    const form = page.locator('form');
    if (await form.count() > 0) {
      await expect(form.first()).toHaveAttribute('role', 'form');
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/zh/register');

    // Test Tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBe('INPUT');

    // Test Enter key on form
    await page.fill('input[name="name"]', 'Test User');
    await page.keyboard.press('Enter');

    // Should trigger form validation or submission
    await page.waitForTimeout(1000);
  });
});

test.describe('Registration Flow Integration', () => {
  test('should complete registration and redirect to dashboard', async ({ page }) => {
    await page.goto('/zh/register');

    // Register new user
    const uniqueEmail = `test-${generateTestId()}@example.com`;
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"], input[name="email"]', uniqueEmail);
    await page.fill('input[type="password"], input[name="password"]', 'Test123456!');
    await page.fill('input[name="confirmPassword"], input[name="password_confirmation"]', 'Test123456!');

    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/i, { timeout: 10000 });

    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/i);
    await expect(page.locator('h1, h2')).toContainText(/Dashboard|仪表板/i);
  });

  test('should auto-login after successful registration', async ({ page, context }) => {
    await page.goto('/zh/register');

    // Register new user
    const uniqueEmail = `test-${generateTestId()}@example.com`;
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"], input[name="email"]', uniqueEmail);
    await page.fill('input[type="password"], input[name="password"]', 'Test123456!');
    await page.fill('input[name="confirmPassword"], input[name="password_confirmation"]', 'Test123456!');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Check for authentication cookies
    const cookies = await context.cookies();
    const authCookies = cookies.filter(c =>
      c.name.toLowerCase().includes('token') ||
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('auth')
    );

    expect(authCookies.length).toBeGreaterThan(0);
  });
});
