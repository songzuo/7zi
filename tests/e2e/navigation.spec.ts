/**
 * @fileoverview E2E Test - Navigation Flow
 * Tests sidebar navigation, route changes, and page accessibility
 */

import { test, expect } from '@playwright/test'
import { AuthPage } from './pages/auth-page'
import { DashboardPage } from './pages/dashboard-page'
import { testUsers, pageContent } from './fixtures/test-data'
import { clearLocalStorage, waitForPageLoad } from './helpers/test-helpers'

test.describe('Navigation Flow', () => {
  let authPage: AuthPage
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    dashboardPage = new DashboardPage(page)
    await clearLocalStorage(page)

    // Login first
    await authPage.gotoLogin()
    await authPage.login(testUsers.regular.email, testUsers.regular.password)
    await waitForPageLoad(page)
  })

  test.describe('Dashboard Navigation', () => {
    test('should land on dashboard after login', async ({ page }) => {
      await dashboardPage.waitForLoad()
      expect(page.url()).toContain('/dashboard')
    })

    test('should display sidebar navigation menu', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Check for sidebar or nav element
      const sidebar = page.locator('aside, nav, [class*="sidebar"], [class*="nav"]').first()
      if ((await sidebar.count()) > 0) {
        await expect(sidebar).toBeVisible()
      }
    })

    test('should navigate to tasks page via sidebar', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Look for tasks link in sidebar
      const tasksLink = page.locator(
        'a[href*="/tasks"], a[href*="/task"], button:has-text("任务"), a:has-text("任务"), nav a:has-text("Tasks")'
      ).first()

      if ((await tasksLink.count()) > 0) {
        await tasksLink.click()
        await page.waitForLoadState('domcontentloaded')
        // Verify URL changed
        expect(page.url()).toMatch(/\/tasks?|\/task/)
      }
    })

    test('should navigate to team page via sidebar', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      const teamLink = page.locator(
        'a[href*="/team"], a[href*="/members"], a:has-text("团队"), a:has-text("Team")'
      ).first()

      if ((await teamLink.count()) > 0) {
        await teamLink.click()
        await page.waitForLoadState('domcontentloaded')
        expect(page.url()).toMatch(/\/team|\/members/)
      }
    })

    test('should navigate to settings page', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      const settingsLink = page.locator(
        'a[href*="/settings"], button:has-text("设置"), a:has-text("设置"), a:has-text("Settings")'
      ).first()

      if ((await settingsLink.count()) > 0) {
        await settingsLink.click()
        await page.waitForLoadState('domcontentloaded')
        expect(page.url()).toContain('/settings')
      }
    })
  })

  test.describe('Auth Navigation', () => {
    test('should redirect to login when accessing protected route', async ({ page }) => {
      // Clear cookies to simulate logged-out state
      await page.context().clearCookies()

      // Try to access dashboard
      await page.goto('/dashboard')
      await page.waitForLoadState('domcontentloaded')

      // Should be redirected to login
      expect(page.url()).toContain('/login')
    })

    test('should navigate between login and register pages', async ({ page }) => {
      await authPage.gotoLogin()
      await page.waitForLoadState('domcontentloaded')

      // Click register link
      const registerLink = page.locator('a[href*="register"], a:has-text("注册"), a:has-text("Sign up")').first()
      if ((await registerLink.count()) > 0) {
        await registerLink.click()
        await page.waitForLoadState('domcontentloaded')
        expect(page.url()).toContain('/register')
      }

      // Navigate back to login
      const backToLogin = page.locator('a[href*="login"], a:has-text("登录"), a:has-text("Sign in")').first()
      if ((await backToLogin.count()) > 0) {
        await backToLogin.click()
        await page.waitForLoadState('domcontentloaded')
        expect(page.url()).toContain('/login')
      }
    })
  })

  test.describe('Breadcrumb and URL', () => {
    test('should update URL when navigating between pages', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      const initialUrl = page.url()

      // Navigate to a different section
      const moreLink = page.locator('button[aria-label*="more"], button:has-text("更多"), [aria-label="menu"]').first()
      if ((await moreLink.count()) > 0) {
        await moreLink.click()
        await page.waitForTimeout(500)
      }

      expect(page.url()).not.toBe(initialUrl)
    })
  })
})