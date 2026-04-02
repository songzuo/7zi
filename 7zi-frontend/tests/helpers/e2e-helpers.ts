/**
 * E2E Test Helpers (v1.5.0)
 *
 * Common helper functions for E2E tests
 */

import { Page, Locator, expect } from '@playwright/test'

// ===== Auth Helpers =====

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', password)
  await page.click('[data-testid="login-btn"]')
  await page.waitForURL('/', { timeout: 10000 })
}

export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu-btn"]')
  await page.click('[data-testid="logout-btn"]')
  await page.waitForURL('/login', { timeout: 5000 })
}

// ===== Navigation Helpers =====

export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<Locator> {
  return await page.waitForSelector(selector, { timeout })
}

// ===== Form Helpers =====

export async function fillForm(page: Page, fields: Record<string, string>): Promise<void> {
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(selector, value)
  }
}

export async function submitForm(page: Page, selector = '[type="submit"]'): Promise<void> {
  await page.click(selector)
}

// ===== Assertion Helpers =====

export async function expectVisible(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeVisible()
}

export async function expectText(page: Page, selector: string, text: string): Promise<void> {
  await expect(page.locator(selector)).toHaveText(text)
}

export async function expectCount(page: Page, selector: string, count: number): Promise<void> {
  await expect(page.locator(selector)).toHaveCount(count)
}

// ===== Network Helpers =====

export async function waitForNetworkIdle(page: Page, timeout = 10000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
}

export async function mockResponse(page: Page, url: string, response: unknown): Promise<void> {
  await page.route(url, route =>
    route.fulfill({
      status: 200,
      body: JSON.stringify(response),
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

// ===== WebSocket Helpers =====

export async function waitForWebSocketMessage(
  page: Page,
  eventType: string,
  timeout = 5000
): Promise<unknown> {
  return await page.evaluate(
    ({ eventType, timeout }) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(
          () => reject(new Error(`WebSocket message timeout: ${eventType}`)),
          timeout
        )

        const handler = (event: CustomEvent) => {
          clearTimeout(timeoutId)
          window.removeEventListener(eventType, handler)
          resolve(event.detail)
        }

        window.addEventListener(eventType, handler)
      })
    },
    { eventType, timeout }
  )
}

// ===== Storage Helpers =====

export async function getLocalStorage(page: Page, key: string): Promise<unknown> {
  return await page.evaluate(k => localStorage.getItem(k), key)
}

export async function setLocalStorage(page: Page, key: string, value: unknown): Promise<void> {
  await page.evaluate((k, v) => localStorage.setItem(k, JSON.stringify(v)), key, value)
}

export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

// ===== Toast Notification Helpers =====

export async function checkToast(page: Page, message?: string, timeout = 5000): Promise<void> {
  const toast = page.locator('[data-testid="toast-notification"]')
  await expect(toast).toBeVisible({ timeout })
  if (message) {
    await expect(toast).toContainText(message)
  }
}

// ===== Screenshot Helpers =====

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true })
}

// ===== Animation Helpers =====

export async function waitForAnimations(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const animated = Array.from(document.querySelectorAll('.animate, .transitioning'))
    return animated.length === 0
  })
}

// ===== Retry Helpers =====

export async function retry<T>(fn: () => Promise<T>, maxAttempts = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxAttempts - 1) throw error
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Retry failed')
}

// ===== Date/Time Helpers =====

export async function setSystemTime(page: Page, date: Date): Promise<void> {
  const isoString = date.toISOString()
  await page.addInitScript(`{
    const Date = window.Date;
    const originalNow = Date.now;
    const originalGetTime = Date.prototype.getTime;
    
    Date.now = () => new Date('${isoString}').getTime();
    Date.prototype.getTime = function() {
      if (this === Date) return Date.now();
      return originalGetTime.call(this);
    };
  }`)
}

// ===== Random Data Helpers =====

export function randomEmail(): string {
  return `test-${Date.now()}@example.com`
}

export function randomString(length = 10): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
}

export function randomId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2)}`
}

// ===== Performance Helpers =====

export async function measurePageLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now()
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  return Date.now() - startTime
}

export async function measureActionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now()
  const result = await fn()
  const duration = Date.now() - startTime
  return { result, duration }
}

// ===== Mobile Helpers =====

export async function setMobileViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 375, height: 667 })
}

export async function setTabletViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 768, height: 1024 })
}

export async function setDesktopViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1920, height: 1080 })
}

// ===== Accessibility Helpers =====

export async function checkAccessibility(page: Page): Promise<void> {
  // TODO: Integrate with axe-core
  // For now, check basic accessibility
  const imagesWithoutAlt = await page.locator('img:not([alt])').count()
  const emptyLinks = await page.locator('a[href=""]').count()

  expect(imagesWithoutAlt).toBe(0)
  expect(emptyLinks).toBe(0)
}

// ===== Console Helpers =====

export async function captureConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = []

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  return errors
}

// ===== Service Worker Helpers =====

export async function waitForServiceWorker(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null
    },
    { timeout: 5000 }
  )
}
