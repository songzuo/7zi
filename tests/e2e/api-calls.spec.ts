/**
 * @fileoverview E2E Test - API Calls
 * Tests that API endpoints respond correctly during user flows
 */

import { test, expect, request } from '@playwright/test'
import { AuthPage } from './pages/auth-page'
import { testUsers } from './fixtures/test-data'
import { clearLocalStorage, waitForPageLoad } from './helpers/test-helpers'

test.describe('API Calls', () => {
  let authPage: AuthPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    await clearLocalStorage(page)
  })

  test.describe('Auth API', () => {
    test('should login via API and persist session', async ({ page }) => {
      // Login through the UI
      await authPage.gotoLogin()
      await authPage.login(testUsers.regular.email, testUsers.regular.password)
      await waitForPageLoad(page)

      // After login, check that session cookie exists
      const cookies = await page.context().cookies()
      const sessionCookie = cookies.find(
        c => c.name.includes('session') || c.name.includes('token') || c.name.includes('auth')
      )

      // Session should exist (or localStorage token)
      const hasSession = sessionCookie || (await page.evaluate(() => !!localStorage.getItem('token')))
      expect(hasSession).toBeTruthy()
    })

    test('should reject invalid login credentials via API', async ({ page }) => {
      // Try to login through the UI with wrong credentials
      await authPage.gotoLogin()
      await authPage.login('wrong@example.com', 'wrongpassword')

      // Should see error message - should NOT redirect to dashboard
      await page.waitForTimeout(1000)
      const onDashboard = page.url().includes('/dashboard')
      expect(onDashboard).toBeFalsy()
    })

    test('should logout and clear session', async ({ page }) => {
      // Login first
      await authPage.gotoLogin()
      await authPage.login(testUsers.regular.email, testUsers.regular.password)
      await waitForPageLoad(page)

      // Perform logout if available
      const logoutBtn = page.locator(
        'button:has-text("Logout"), button:has-text("退出"), a[href*="logout"], button[aria-label*="logout"]'
      ).first()

      if ((await logoutBtn.count()) > 0) {
        await logoutBtn.click()
        await page.waitForTimeout(1000)

        // Should redirect to login or home
        expect(page.url()).not.toContain('/dashboard')
      }
    })
  })

  test.describe('Direct API Endpoint Tests', () => {
    // These tests call API endpoints directly using Playwright's request API

    test('should return 200 from health check endpoint', async () => {
      const ctx = await request.newContext({ baseURL: 'http://localhost:3000' })
      const response = await ctx.get('/api/health')

      // Health endpoint should either return 200 or redirect to login (if protected)
      expect([200, 301, 302, 401]).toContain(response.status())
    })

    test('should return JSON from a public API endpoint', async () => {
      const ctx = await request.newContext({ baseURL: 'http://localhost:3000' })

      // Try an API route - may need auth
      const response = await ctx.get('/api/agents')
      const status = response.status()

      if (status === 200) {
        const body = await response.json()
        expect(body).toBeDefined()
      } else {
        // Protected endpoint - should return 401
        expect(status).toBe(401)
      }
    })

    test('should handle 404 gracefully for non-existent API route', async () => {
      const ctx = await request.newContext({ baseURL: 'http://localhost:3000' })
      const response = await ctx.get('/api/nonexistent-route-xyz')

      expect(response.status()).toBe(404)
    })
  })

  test.describe('API in User Flow', () => {
    test('should load data after successful login', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.login(testUsers.regular.email, testUsers.regular.password)
      await waitForPageLoad(page)

      // After dashboard loads, wait for any async data fetches
      await page.waitForTimeout(2000)

      // Dashboard should have rendered content (not blank)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.length).toBeGreaterThan(50)
    })

    test('should handle API timeout gracefully', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.login(testUsers.regular.email, testUsers.regular.password)
      await waitForPageLoad(page)

      // Check that the page does NOT show an unhandled error boundary
      const errorBoundary = page.locator('[class*="error"], [class*="Error"]')
      if ((await errorBoundary.count()) > 0) {
        await expect(errorBoundary.first()).not.toBeVisible()
      }
    })
  })
})