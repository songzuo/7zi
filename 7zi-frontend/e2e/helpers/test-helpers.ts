/**
 * Helper functions for E2E tests
 */

import { Page, expect } from '@playwright/test'

/**
 * Wait for element to be visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout })
}

/**
 * Fill form fields
 */
export async function fillForm(page: Page, fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields)) {
    await page.getByLabel(label).fill(value)
  }
}

/**
 * Take screenshot on failure
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
}

/**
 * Wait for API response
 */
export async function waitForResponse(page: Page, url: string, timeout = 30000) {
  return await page.waitForResponse(response => response.url().includes(url), { timeout })
}

/**
 * Check if toast notification is visible
 */
export async function checkToast(page: Page, message: string) {
  const toast = page.getByRole('alert').filter({ hasText: message })
  await expect(toast).toBeVisible({ timeout: 5000 })
}

/**
 * Clear local storage
 */
export async function clearStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

/**
 * Set mock token in localStorage
 */
export async function setAuthToken(page: Page, token: string) {
  await page.evaluate(t => {
    localStorage.setItem('auth_token', t)
    localStorage.setItem(
      'user_session',
      JSON.stringify({
        token: t,
        userId: 'test-user-1',
      })
    )
  }, token)
}

/**
 * Get current timestamp
 */
export function getTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Generate unique email
 */
export function generateEmail(): string {
  return `test-${Date.now()}@example.com`
}

/**
 * Generate unique username
 */
export function generateUsername(): string {
  return `testuser${Date.now()}`
}

/**
 * Scroll element into view
 */
export async function scrollToElement(page: Page, selector: string) {
  const element = page.locator(selector)
  await element.scrollIntoViewIfNeeded()
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Mock WebSocket connection
 */
export async function mockWebSocket(page: Page, url: string) {
  await page.addInitScript(wsUrl => {
    // Mock WebSocket for testing
    ;(window as any).WebSocket = class MockWebSocket {
      constructor(url: string) {
        setTimeout(() => {
          if (this.onopen) this.onopen({ type: 'open' } as Event)
        }, 100)
      }
      send(data: string) {
        // Echo back
        if (this.onmessage) {
          setTimeout(() => {
            this.onmessage({ data } as MessageEvent)
          }, 50)
        }
      }
      close() {
        if (this.onclose) this.onclose({ type: 'close' } as Event)
      }
      onopen: ((event: Event) => void) | null = null
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onclose: ((event: Event) => void) | null = null
    }
  }, url)
}

/**
 * Check accessibility issues (basic)
 */
export async function checkAccessibility(page: Page, selector = 'body') {
  const violations = await page.evaluate(sel => {
    const element = document.querySelector(sel)
    if (!element) return []

    // Check for missing alt text on images
    const images = element.querySelectorAll('img')
    const missingAlt: string[] = []
    images.forEach((img, i) => {
      if (!img.alt || img.alt.trim() === '') {
        missingAlt.push(`Image ${i + 1} missing alt text`)
      }
    })

    // Check for form labels
    const inputs = element.querySelectorAll('input, select, textarea')
    const missingLabels: string[] = []
    inputs.forEach((input, i) => {
      const hasLabel =
        input.hasAttribute('aria-label') ||
        input.hasAttribute('aria-labelledby') ||
        input.closest('label') !== null
      if (!hasLabel && input.type !== 'hidden') {
        missingLabels.push(`Input ${i + 1} missing label`)
      }
    })

    return [...missingAlt, ...missingLabels]
  }, selector)

  return violations
}
