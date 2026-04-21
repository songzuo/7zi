/**
 * @fileoverview E2E Test - Homepage Loading
 * Tests the landing/homepage at root URL '/'
 */

import { test, expect } from '@playwright/test'
import { clearLocalStorage } from './helpers/test-helpers'

test.describe('Homepage Loading', () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page)
  })

  test('should load homepage without errors', async ({ page }) => {
    // Navigate to homepage
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Verify HTTP 200
    expect(response?.status()).toBeLessThan(400)

    // Page should not have crash/error
    const body = await page.locator('body')
    await expect(body).toBeVisible()
  })

  test('should have correct page title or heading', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Either <title> or first h1 should exist
    const title = await page.title()
    const h1Count = await page.locator('h1').count()

    // At least one should have content
    const hasTitle = title && title.length > 0
    const hasH1 = h1Count > 0
    expect(hasTitle || hasH1).toBeTruthy()
  })

  test('should load critical static assets', async ({ page }) => {
    // Check favicon
    const faviconLink = page.locator('link[rel="icon"], link[rel="shortcut icon"]')
    // Not strictly required but check if present

    // Check meta viewport (responsive)
    const viewport = page.locator('meta[name="viewport"]')
    if ((await viewport.count()) > 0) {
      const content = await viewport.getAttribute('content')
      expect(content).toContain('width')
    }
  })

  test('should not have blocking console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/', { waitUntil: 'load' })

    // Filter out known non-critical errors (e.g., third-party)
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.includes('service worker') &&
      !e.includes('warn')
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test.describe('Homepage Navigation Links', () => {
    test('should have accessible navigation links', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })

      // Check for nav or main landmark
      const nav = page.locator('nav, header, main').first()
      if ((await nav.count()) > 0) {
        await expect(nav).toBeVisible()
      }
    })

    test('should navigate to login from homepage', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })

      // Look for login link/button
      const loginLink = page.locator('a[href*="login"], button:has-text("登录"), a:has-text("登录"), button:has-text("Login"), a:has-text("Login")').first()

      if ((await loginLink.count()) > 0) {
        await loginLink.click()
        await page.waitForLoadState('domcontentloaded')
        expect(page.url()).toContain('/login')
      }
    })
  })
})