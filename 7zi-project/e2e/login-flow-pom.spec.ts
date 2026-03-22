/**
 * @fileoverview Login Flow E2E Tests with Page Object Model
 * Tests user authentication flow using POM pattern
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage, NavigationPage } from '../pages';
import { testData } from '../fixtures/test-data';

test.describe('Login Flow - POM', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    navigationPage = new NavigationPage(page);

    await page.goto('/');
  });

  test('should navigate to login page from home', async ({ page }) => {
    await loginPage.goto();
    await expect(page).toHaveURL(/\/zh\/login/);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
  });

  test('should display all login form elements', async () => {
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.rememberMeCheckbox).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await loginPage.goto();
    await loginPage.fillForm('invalid-email', 'password123');
    await loginPage.submit();

    await page.waitForTimeout(1000);
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
  });

  test('should show error for empty fields', async ({ page }) => {
    await loginPage.goto();
    await loginPage.submit();

    await page.waitForTimeout(1000);
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
  });

  test('should handle successful login and redirect to dashboard', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('test@7zi.com', 'test123456');

    // Wait for navigation or dashboard
    await page.waitForTimeout(2000);

    // Verify redirected to dashboard or showing logged-in state
    const url = page.url();
    const isDashboard = url.includes('/dashboard');
    const isLoggedIn = await navigationPage.isLoggedIn();

    expect(isDashboard || isLoggedIn).toBeTruthy();
  });

  test('should remember me functionality', async () => {
    await loginPage.goto();
    await loginPage.toggleRememberMe();
    await expect(loginPage.rememberMeCheckbox).toBeChecked();
  });

  test('should display social login options', async () => {
    await loginPage.goto();

    const hasGitHub = await loginPage.githubButton.isVisible();
    const hasGoogle = await loginPage.googleButton.isVisible();

    expect(hasGitHub || hasGoogle).toBeTruthy();
  });

  test('should show loading state during authentication', async ({ page }) => {
    await loginPage.goto();
    await loginPage.fillForm('test@7zi.com', 'test123456');

    const isDisabledBefore = await loginPage.submitButton.isDisabled();
    await loginPage.submit();

    const isDisabledAfter = await loginPage.submitButton.isDisabled();
    expect(isDisabledAfter).toBeTruthy();
  });

  test('should navigate to forgot password page', async () => {
    await loginPage.goto();
    await loginPage.clickForgotPassword();

    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/forgot-password|reset-password/i);
  });

  test('should navigate to registration page', async () => {
    await loginPage.goto();
    await loginPage.clickRegister();

    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/register|signup/i);
  });
});

test.describe('Session Management - POM', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    navigationPage = new NavigationPage(page);
  });

  test('should persist session across page refresh', async ({ page, context }) => {
    // Login
    await loginPage.goto();
    await loginPage.login('test@7zi.com', 'test123456');
    await page.waitForTimeout(2000);

    // Get cookies before refresh
    const cookiesBefore = await context.cookies();

    // Refresh page
    await page.reload();

    // Get cookies after refresh
    const cookiesAfter = await context.cookies();

    // Session should be preserved
    expect(cookiesAfter.length).toBeGreaterThan(0);
    expect(cookiesAfter.length).toBe(cookiesBefore.length);
  });

  test('should clear session on logout', async ({ page, context }) => {
    // Login
    await loginPage.goto();
    await loginPage.login('test@7zi.com', 'test123456');
    await page.waitForTimeout(2000);

    // Logout
    await navigationPage.logout();
    await page.waitForTimeout(1000);

    // Check auth cookies are cleared
    const cookies = await context.cookies();
    const authCookies = cookies.filter(c =>
      c.name.toLowerCase().includes('token') ||
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('auth')
    );

    expect(authCookies.length).toBe(0);
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard');

    // Check if redirected to login
    const url = page.url();
    const isLoginPage = url.includes('/login') || url.includes('/auth');

    expect(isLoginPage).toBeTruthy();
  });
});

test.describe('Login with Dashboard Access - POM', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    navigationPage = new NavigationPage(page);
  });

  test('should login and access dashboard', async ({ page }) => {
    // Login
    await loginPage.goto();
    await loginPage.login('test@7zi.com', 'test123456');

    // Wait for dashboard
    await dashboardPage.waitForLoad();

    // Verify on dashboard
    expect(await dashboardPage.isOnDashboard()).toBeTruthy();
  });

  test('should login and see dashboard elements', async ({ page }) => {
    // Login
    await loginPage.goto();
    await loginPage.login('test@7zi.com', 'test123456');

    // Wait for dashboard
    await dashboardPage.waitForLoad();

    // Verify dashboard elements
    await expect(dashboardPage.pageHeading).toBeVisible();
    await expect(dashboardPage.createTaskButton).toBeVisible();
    await expect(dashboardPage.taskList).toBeVisible();
  });

  test('should login and navigate to different pages', async ({ page }) => {
    // Login
    await loginPage.goto();
    await loginPage.login('test@7zi.com', 'test123456');
    await page.waitForTimeout(2000);

    // Navigate to team page
    await navigationPage.goToTeam();
    await navigationPage.waitForNavigation();
    expect(page.url()).toContain('/team');

    // Navigate to tasks page
    await navigationPage.goToTasks();
    await navigationPage.waitForNavigation();
    expect(page.url()).toContain('/tasks');

    // Navigate back to dashboard
    await navigationPage.goToDashboard();
    await navigationPage.waitForNavigation();
    expect(page.url()).toContain('/dashboard');
  });

  test('should login and toggle theme', async ({ page }) => {
    // Login
    await loginPage.goto();
    await loginPage.login('test@7zi.com', 'test123456');
    await page.waitForTimeout(2000);

    // Toggle to dark mode
    await navigationPage.toggleTheme();
    await page.waitForTimeout(500);

    const isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isDark).toBeTruthy();

    // Toggle back to light mode
    await navigationPage.toggleTheme();
    await page.waitForTimeout(500);

    const isLight = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isLight).toBeFalsy();
  });
});
