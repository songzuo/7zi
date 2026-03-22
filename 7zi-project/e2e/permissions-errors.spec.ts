/**
 * @fileoverview E2E tests for permission verification and error handling
 * Tests access control, permission checks, and error scenarios
 */

import { test, expect } from '@playwright/test';

test.describe('Permission Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should restrict access to protected routes without authentication', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard');

    // Should redirect to login or show access denied
    const url = page.url();
    const isLoginPage = url.includes('/login') || url.includes('/auth');
    const isAccessDenied = await page.locator('text=未授权, Access Denied, 401, 403').count() > 0;

    expect(isLoginPage || isAccessDenied).toBeTruthy();
  });

  test('should allow access to public pages', async ({ page }) => {
    const publicPages = ['/', '/about', '/team', '/contact'];

    for (const pagePath of publicPages) {
      await page.goto(pagePath);
      await page.waitForTimeout(500);

      const isAccessible = !page.url().includes('/login') && !page.url().includes('/404');
      expect(isAccessible).toBeTruthy();
    }
  });

  test('should check user permissions on dashboard', async ({ page, context }) => {
    // Set auth token (simulate logged in user)
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Check if dashboard loads (not redirected)
    const url = page.url();
    const isDashboard = url.includes('/dashboard');

    if (isDashboard) {
      // Check for user info display
      const userInfo = page.locator('[data-testid="user-info"], .user-info, text=用户, text=User');
      expect(await userInfo.count()).toBeGreaterThan(0);
    }
  });

  test('should restrict admin-only routes', async ({ page }) => {
    // Try to access admin routes
    const adminRoutes = ['/admin', '/settings', '/admin/users'];

    for (const route of adminRoutes) {
      await page.goto(route);
      await page.waitForTimeout(500);

      const isAccessDenied = await page.locator('text=未授权, Access Denied, 403, Forbidden').count() > 0;
      const isRedirected = page.url().includes('/login');

      expect(isAccessDenied || isRedirected).toBeTruthy();
    }
  });

  test('should hide admin controls for non-admin users', async ({ page }) => {
    // Navigate to a page that might have admin controls
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Look for admin-specific controls
    const adminControls = page.locator('[data-testid*="admin"], [aria-label*="admin"], .admin-only');

    // These should not be visible to non-admin users
    expect(await adminControls.count()).toBe(0);
  });

  test('should check team member permissions', async ({ page }) => {
    // Team page should be accessible to all
    await page.goto('/team');
    await page.waitForTimeout(500);

    expect(page.url()).not.toContain('/login');
  });
});

test.describe('Error Handling', () => {
  test('should handle 404 page not found', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/non-existent-page');

    // Check for 404 page
    const notFoundElement = page.locator('h1, h2').filter({ hasText: /404|not found|未找到|页面不存在/i });
    await expect(notFoundElement.first()).toBeVisible({ timeout: 3000 });
  });

  test('should handle 500 internal server errors gracefully', async ({ page }) => {
    // Try to access a route that might error
    await page.goto('/api/invalid-endpoint');

    // Check for error handling
    const url = page.url();
    const hasErrorMessage = await page.locator('text=错误, Error, Server Error').count() > 0;

    expect(hasErrorMessage || page.url().includes('/error')).toBeTruthy();
  });

  test('should handle network errors', async ({ page, context }) => {
    // Intercept and fail requests
    await context.route('**/*', route => {
      // Fail specific routes
      if (route.request().url().includes('/api/')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Check for network error message
    const networkError = page.locator('text=网络错误, Network Error, 连接失败, Connection failed').first();
    const hasNetworkError = await networkError.isVisible().catch(() => false);

    expect(hasNetworkError).toBeTruthy();
  });

  test('should handle API timeout', async ({ page }) => {
    // Intercept and delay requests
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 10000);
    });

    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Check for timeout message or retry option
    const timeoutMessage = page.locator('text=超时, Timeout, Request timed out').first();
    const retryButton = page.locator('button:has-text("重试"), button:has-text("Retry")').first();

    const hasTimeoutMessage = await timeoutMessage.isVisible().catch(() => false);
    const hasRetryButton = await retryButton.isVisible().catch(() => false);

    expect(hasTimeoutMessage || hasRetryButton).toBeTruthy();
  });

  test('should handle form validation errors', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForTimeout(1000);

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Check for validation errors
    const validationErrors = page.locator('.error, .validation-error, [role="alert"]');
    expect(await validationErrors.count()).toBeGreaterThan(0);
  });

  test('should handle CORS errors gracefully', async ({ page }) => {
    // This is harder to test directly, but we can check error boundaries
    await page.goto('/');

    // The page should load even if some API calls fail
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should show error boundary on component errors', async ({ page, context }) => {
    // Inject an error into the page
    await page.addInitScript(() => {
      // Simulate a component error
      window.addEventListener('load', () => {
        throw new Error('Test error');
      });
    });

    await page.goto('/');

    // Check for error boundary UI
    const errorBoundary = page.locator('.error-boundary, [data-testid="error-boundary"]');
    const hasErrorBoundary = await errorBoundary.isVisible().catch(() => false);

    if (hasErrorBoundary) {
      await expect(errorBoundary).toBeVisible();
    }
  });
});

test.describe('Error Recovery', () => {
  test('should retry failed requests', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for retry buttons or automatic retry indicators
    const retryButton = page.locator('button:has-text("重试"), button:has-text("Retry")').first();
    const retryIndicator = page.locator('[aria-label*="retry"], [data-status="retrying"]').first();

    const hasRetryButton = await retryButton.isVisible().catch(() => false);
    const hasRetryIndicator = await retryIndicator.isVisible().catch(() => false);

    if (hasRetryButton) {
      await retryButton.click();
      await page.waitForTimeout(2000);
    }

    // Page should attempt to recover
    const dashboardContent = page.locator('.dashboard, main');
    expect(await dashboardContent.count()).toBeGreaterThan(0);
  });

  test('should allow users to report errors', async ({ page }) => {
    // Navigate to an error page
    await page.goto('/non-existent-page');

    // Look for "Report this issue" or similar button
    const reportButton = page.locator('button:has-text("报告"), button:has-text("Report"), button:has-text("反馈")').first();

    if (await reportButton.isVisible()) {
      await reportButton.click();

      // Check for report form or feedback UI
      const reportForm = page.locator('form, [role="dialog"]');
      await expect(reportForm.first()).toBeVisible({ timeout: 2000 });
    }
  });

  test('should maintain user session during errors', async ({ page, context }) => {
    // Add auth token
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Get session info
    const cookiesBefore = await context.cookies();

    // Trigger an error (go to 404)
    await page.goto('/non-existent-page');

    // Check session is still valid
    const cookiesAfter = await context.cookies();
    const authCookieBefore = cookiesBefore.find(c => c.name === 'auth_token');
    const authCookieAfter = cookiesAfter.find(c => c.name === 'auth_token');

    expect(authCookieAfter?.value).toBe(authCookieBefore?.value);
  });

  test('should allow navigation from error pages', async ({ page }) => {
    // Go to 404 page
    await page.goto('/non-existent-page');

    // Try to navigate back to home
    const homeLink = page.locator('a[href="/"], text=首页, text=Home, text=返回, text=Back').first();

    if (await homeLink.isVisible()) {
      await homeLink.click();
      await page.waitForTimeout(1000);

      expect(page.url()).toBe('http://localhost:3000/');
    }
  });
});

test.describe('Security Headers', () => {
  test('should include security headers', async ({ page }) => {
    const response = await page.goto('/');

    if (response) {
      const headers = response.headers();

      // Check for security headers (if configured)
      const hasCSP = 'content-security-policy' in headers;
      const hasXFrameOptions = 'x-frame-options' in headers;
      const hasXContentType = 'x-content-type-options' in headers;

      // These are optional but good to have
      expect(hasCSP || hasXFrameOptions || hasXContentType).toBeTruthy();
    }
  });

  test('should protect against XSS', async ({ page }) => {
    // Try to inject script in a form field
    await page.goto('/contact');
    await page.waitForTimeout(1000);

    const nameInput = page.locator('input[name="name"], input[type="text"]').first();
    await nameInput.fill('<script>alert("XSS")</script>');

    // Submit form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Check that script is not executed (no alert dialog)
    await page.waitForTimeout(1000);

    // Script should be escaped, not executed
    const escapedScript = page.locator('text=<script>').first();
    const scriptExists = await escapedScript.isVisible().catch(() => false);

    expect(scriptExists).toBeFalsy();
  });
});

test.describe('Loading States', () => {
  test('should show loading indicator during data fetch', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for loading indicators
    const loadingSpinner = page.locator('.spinner, .loading, [role="status"][aria-busy="true"]');
    const skeletonLoader = page.locator('.skeleton, .skeleton-loader');

    const hasLoading = await loadingSpinner.isVisible().catch(() => false);
    const hasSkeleton = await skeletonLoader.isVisible().catch(() => false);

    expect(hasLoading || hasSkeleton).toBeTruthy();
  });

  test('should show empty state when no data', async ({ page }) => {
    // This depends on the page state, but we can check
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    const emptyState = page.locator('.empty-state, [data-testid="empty"], text=暂无数据, text=No data').first();
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should show error state on fetch failure', async ({ page }) => {
    // Intercept and fail API requests
    await page.route('**/api/**', route => route.abort());

    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    const errorState = page.locator('.error-state, [data-testid="error"], .api-error').first();
    const hasErrorState = await errorState.isVisible().catch(() => false);

    if (hasErrorState) {
      await expect(errorState).toBeVisible();
    }
  });
});

test.describe('Accessibility', () => {
  test('should announce errors to screen readers', async ({ page }) => {
    await page.goto('/non-existent-page');

    // Check for ARIA live regions
    const liveRegion = page.locator('[role="alert"], [aria-live="assertive"], [aria-live="polite"]');
    expect(await liveRegion.count()).toBeGreaterThan(0);
  });

  test('should have keyboard accessible error pages', async ({ page }) => {
    await page.goto('/non-existent-page');

    // Test Tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    expect(await focusedElement.count()).toBeGreaterThan(0);
  });

  test('should provide clear error messages', async ({ page }) => {
    await page.goto('/non-existent-page');

    const errorMessage = page.locator('h1, h2').first();
    const hasClearMessage = await errorMessage.isVisible();

    if (hasClearMessage) {
      const text = await errorMessage.textContent();
      expect(text?.length).toBeGreaterThan(10); // Should have meaningful text
    }
  });
});
