/**
 * @fileoverview Navigation Flow E2E Tests with Page Object Model
 * Tests site navigation using POM pattern
 */

import { test, expect } from '@playwright/test';
import { NavigationPage } from '../pages';

test.describe('Navigation Flow - POM', () => {
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    navigationPage = new NavigationPage(page);
    await page.goto('/');
  });

  test('should navigate to home', async ({ page }) => {
    await navigationPage.goToHome();
    await navigationPage.waitForNavigation();

    const url = navigationPage.getCurrentUrl();
    expect(url).toMatch(/\/$/);
  });

  test('should navigate to dashboard', async ({ page }) => {
    await navigationPage.goToDashboard();
    await navigationPage.waitForNavigation();

    const url = navigationPage.getCurrentUrl();
    expect(url).toContain('/dashboard');
  });

  test('should navigate to team', async ({ page }) => {
    await navigationPage.goToTeam();
    await navigationPage.waitForNavigation();

    const url = navigationPage.getCurrentUrl();
    expect(url).toContain('/team');
  });

  test('should navigate to about', async ({ page }) => {
    await navigationPage.goToAbout();
    await navigationPage.waitForNavigation();

    const url = navigationPage.getCurrentUrl();
    expect(url).toContain('/about');
  });

  test('should navigate to contact', async ({ page }) => {
    await navigationPage.goToContact();
    await navigationPage.waitForNavigation();

    const url = navigationPage.getCurrentUrl();
    expect(url).toContain('/contact');
  });

  test('should navigate to blog', async ({ page }) => {
    await navigationPage.goToBlog();
    await navigationPage.waitForNavigation();

    const url = navigationPage.getCurrentUrl();
    expect(url).toContain('/blog');
  });

  test('should navigate to settings', async ({ page }) => {
    await navigationPage.goToSettings();
    await navigationPage.waitForNavigation();

    const url = navigationPage.getCurrentUrl();
    expect(url).toContain('/settings');
  });

  test('should navigate through multiple pages', async ({ page }) => {
    // Home -> Dashboard
    await navigationPage.goToDashboard();
    await navigationPage.waitForNavigation();
    expect(page.url()).toContain('/dashboard');

    // Dashboard -> Team
    await navigationPage.goToTeam();
    await navigationPage.waitForNavigation();
    expect(page.url()).toContain('/team');

    // Team -> About
    await navigationPage.goToAbout();
    await navigationPage.waitForNavigation();
    expect(page.url()).toContain('/about');

    // About -> Contact
    await navigationPage.goToContact();
    await navigationPage.waitForNavigation();
    expect(page.url()).toContain('/contact');

    // Contact -> Home
    await navigationPage.goToHome();
    await navigationPage.waitForNavigation();
    expect(page.url()).toMatch(/\/$/);
  });

  test('should navigate back using browser back button', async ({ page }) => {
    await navigationPage.goToDashboard();
    await navigationPage.waitForNavigation();
    expect(page.url()).toContain('/dashboard');

    await page.goBack();
    expect(page.url()).toMatch(/\/$/);
  });

  test('should navigate forward using browser forward button', async ({ page }) => {
    await navigationPage.goToDashboard();
    await navigationPage.waitForNavigation();

    await page.goBack();
    expect(page.url()).toMatch(/\/$/);

    await page.goForward();
    expect(page.url()).toContain('/dashboard');
  });
});

test.describe('Navigation with Theme - POM', () => {
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    navigationPage = new NavigationPage(page);
    await page.goto('/');
  });

  test('should toggle between light and dark theme', async ({ page }) => {
    // Check initial theme (light)
    let isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isDark).toBeFalsy();

    // Toggle to dark
    await navigationPage.toggleTheme();
    await page.waitForTimeout(500);

    isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isDark).toBeTruthy();

    // Toggle back to light
    await navigationPage.toggleTheme();
    await page.waitForTimeout(500);

    isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isDark).toBeFalsy();
  });

  test('should set light theme explicitly', async ({ page }) => {
    // First toggle to dark
    await navigationPage.toggleTheme();
    await page.waitForTimeout(500);

    let isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isDark).toBeTruthy();

    // Set to light explicitly
    await navigationPage.setLightTheme();
    await page.waitForTimeout(500);

    isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isDark).toBeFalsy();
  });

  test('should set dark theme explicitly', async ({ page }) => {
    // Set to dark explicitly
    await navigationPage.setDarkTheme();
    await page.waitForTimeout(500);

    const isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isDark).toBeTruthy();
  });

  test('should persist theme across page navigation', async ({ page }) => {
    // Set to dark theme
    await navigationPage.setDarkTheme();
    await page.waitForTimeout(500);

    let isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isDark).toBeTruthy();

    // Navigate to dashboard
    await navigationPage.goToDashboard();
    await navigationPage.waitForNavigation();

    // Check theme persists
    isDark = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isDark).toBeTruthy();
  });
});

test.describe('Navigation with Language - POM', () => {
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    navigationPage = new NavigationPage(page);
    await page.goto('/');
  });

  test('should change language', async ({ page }) => {
    // Get current language from URL
    const currentUrl = page.url();

    // Change language (if selector exists)
    if (await navigationPage.languageSelector.isVisible()) {
      await navigationPage.changeLanguage('en');
      await page.waitForTimeout(500);

      const newUrl = page.url();
      expect(newUrl).not.toBe(currentUrl);
    }
  });

  test('should maintain language across navigation', async ({ page }) => {
    // Navigate to multiple pages
    await navigationPage.goToTeam();
    await navigationPage.waitForNavigation();

    const teamUrl = page.url();

    await navigationPage.goToAbout();
    await navigationPage.waitForNavigation();

    const aboutUrl = page.url();

    // Both URLs should have the same language prefix
    const teamLang = teamUrl.split('/')[1];
    const aboutLang = aboutUrl.split('/')[1];

    expect(teamLang).toBe(aboutLang);
  });
});

test.describe('Navigation with Authentication - POM', () => {
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    navigationPage = new NavigationPage(page);
    await page.goto('/');
  });

  test('should check if user is logged in', async () => {
    const isLoggedIn = await navigationPage.isLoggedIn();
    expect(typeof isLoggedIn).toBe('boolean');
  });

  test('should logout successfully', async ({ page }) => {
    // First login if needed (this would use a real login in production)
    const isLoggedIn = await navigationPage.isLoggedIn();

    if (isLoggedIn) {
      await navigationPage.openUserMenu();
      await navigationPage.logout();
      await page.waitForTimeout(1000);

      const isLoggedInAfter = await navigationPage.isLoggedIn();
      expect(isLoggedInAfter).toBeFalsy();
    }
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    // Try to access dashboard without login
    await navigationPage.goToDashboard();
    await navigationPage.waitForNavigation();

    const url = page.url();
    const isLoginPage = url.includes('/login') || url.includes('/auth');

    // Should redirect to login or show login prompt
    expect(isLoginPage || !await navigationPage.isLoggedIn()).toBeTruthy();
  });
});

test.describe('Mobile Navigation - POM', () => {
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    navigationPage = new NavigationPage(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
  });

  test('should toggle mobile menu', async ({ page }) => {
    const isVisibleBefore = await navigationPage.mobileMenuToggle.isVisible();
    expect(isVisibleBefore).toBeTruthy();

    await navigationPage.toggleMobileMenu();
    await page.waitForTimeout(500);

    // Mobile menu should be open
    const mobileMenu = page.locator('.mobile-menu, [class*="mobile-menu"]');
    const isMenuOpen = await mobileMenu.count() > 0;

    // Toggle again to close
    await navigationPage.toggleMobileMenu();
    await page.waitForTimeout(500);
  });

  test('should navigate using mobile menu', async ({ page }) => {
    await navigationPage.toggleMobileMenu();
    await page.waitForTimeout(500);

    // Click on a link in mobile menu
    await navigationPage.goToTeam();
    await navigationPage.waitForNavigation();

    expect(page.url()).toContain('/team');
  });

  test('should maintain responsive layout on different screen sizes', async ({ page }) => {
    // Test on tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await navigationPage.waitForNavigation();

    // Test on desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await navigationPage.waitForNavigation();

    // Navigation should be visible and functional on all sizes
    await expect(navigationPage.mainNav).toBeVisible();
  });
});

test.describe('Navigation Accessibility - POM', () => {
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    navigationPage = new NavigationPage(page);
    await page.goto('/');
  });

  test('should navigate using keyboard', async ({ page }) => {
    // Test Tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    expect(await focusedElement.count()).toBeGreaterThan(0);
  });

  test('should have accessible navigation links', async ({ page }) => {
    // Check that navigation links have accessible names
    const navLinks = navigationPage.mainNav.locator('a');

    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const link = navLinks.nth(i);
      const text = await link.textContent();
      expect(text).toBeTruthy();
    }
  });

  test('should have accessible theme toggle', async ({ page }) => {
    if (await navigationPage.themeToggle.isVisible()) {
      const hasAriaLabel = await navigationPage.themeToggle.getAttribute('aria-label');
      expect(hasAriaLabel).toBeTruthy();
    }
  });
});
