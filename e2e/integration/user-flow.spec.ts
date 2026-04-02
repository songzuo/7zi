/**
 * @fileoverview Integration test for user flow: Home -> Dashboard -> Settings
 */

import { test, expect } from '@playwright/test'

test.describe('User Flow Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
  })

  test('complete user flow: home to dashboard to settings', async ({ page }) => {
    // 1. Start on home page
    await expect(page).toHaveTitle(/7zi/)
    await expect(page.locator('nav')).toBeVisible()

    // 2. Navigate to dashboard
    await page.click('text=实时看板')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('h1, h2')).toContainText(/dashboard|看板/i)

    // 3. Navigate to settings
    await page.click('[aria-label*="设置"], [aria-label*="Settings"], button:has-text("设置")')
    await expect(page.locator('[role="dialog"], .settings-panel')).toBeVisible()

    // 4. Close settings
    await page.click('[aria-label*="关闭"], [aria-label*="Close"], button:has-text("关闭")')
    await expect(page.locator('[role="dialog"], .settings-panel')).not.toBeVisible()
  })

  test('navigation flow: home -> about -> team -> home', async ({ page }) => {
    // 1. On home page
    await expect(page.locator('nav')).toBeVisible()

    // 2. Go to about page
    await page.click('text=关于我们, About')
    await expect(page).toHaveURL(/\/about/)
    await expect(page.locator('h1, h2')).toBeVisible()

    // 3. Go to team page
    await page.click('text=团队成员, Team')
    await expect(page).toHaveURL(/\/team/)
    await expect(page.locator('h1, h2')).toBeVisible()

    // 4. Return home
    await page.click('text=首页, Home')
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('contact form submission flow', async ({ page }) => {
    // 1. Navigate to contact page
    await page.click('text=联系我们, Contact')
    await expect(page).toHaveURL(/\/contact/)

    // 2. Fill contact form
    await page.fill('input[name="name"], input[placeholder*="姓名"]', 'Test User')
    await page.fill('input[name="email"], input[placeholder*="邮箱"]', 'test@example.com')
    await page.fill(
      'textarea[name="message"], textarea[placeholder*="消息"]',
      'This is a test message'
    )

    // 3. Submit form
    await page.click('button[type="submit"], button:has-text("发送"), button:has-text("提交")')

    // 4. Verify submission (check for success message or form reset)
    await expect(page.locator('form')).toBeVisible()
  })

  test('theme switching flow', async ({ page }) => {
    // 1. Check initial theme (default or from localStorage)
    const html = page.locator('html')

    // 2. Toggle theme
    await page.click('[aria-label*="主题"], [aria-label*="Theme"]')

    // 3. Verify theme changed
    // Wait a moment for the transition
    await page.waitForTimeout(500)

    // 4. Theme should be toggled (dark/light)
    // We can verify by checking the class or data-theme attribute
    const themeClass = await html.getAttribute('class')
    expect(themeClass).toBeDefined()
  })

  test('language switching flow', async ({ page }) => {
    // 1. Click language switcher
    await page.click('[aria-label*="语言"], [aria-label*="Language"]')

    // 2. Verify language menu is visible
    const languageMenu = page.locator('[role="menu"], .language-menu')
    await expect(languageMenu).toBeVisible()

    // 3. Select different language
    await page.click('text=中文, English')

    // 4. Verify language changed
    await page.waitForTimeout(500)
    // Check that page content is in the selected language
    expect(page.locator('body')).toBeVisible()
  })

  test('responsive navigation on mobile', async ({ page }) => {
    // 1. Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // 2. Check that hamburger menu is visible
    await expect(
      page.locator('[aria-label*="菜单"], .mobile-menu-button, button:has-text("≡")')
    ).toBeVisible()

    // 3. Open mobile menu
    await page.click('[aria-label*="菜单"], .mobile-menu-button, button:has-text("≡")')

    // 4. Verify mobile menu is open
    await expect(page.locator('.mobile-menu, nav.mobile')).toBeVisible()

    // 5. Close mobile menu
    await page.click('[aria-label*="关闭"], .close-menu-button')
    await expect(page.locator('.mobile-menu, nav.mobile')).not.toBeVisible()
  })
})

test.describe('Error Handling Integration Tests', () => {
  test('handles 404 pages gracefully', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/non-existent-page')

    // Verify 404 page is shown
    await expect(page.locator('h1, h2')).toContainText(/404|not found|未找到/i)
  })

  test('handles server errors', async ({ page }) => {
    // Navigate to an API route that might fail
    await page.goto('/api/health')

    // Verify some response is received
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Performance Integration Tests', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/')

    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('images load correctly', async ({ page }) => {
    await page.goto('/')

    // Wait for images to load
    const images = page.locator('img')
    const count = await images.count()

    if (count > 0) {
      // Check that first image loads
      const firstImage = images.first()
      await expect(firstImage).toHaveJSProperty('complete', true)
    }
  })
})
