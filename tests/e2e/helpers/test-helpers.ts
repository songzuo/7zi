/**
 * @fileoverview Helper functions for E2E tests
 * Common utilities to simplify test operations
 */

import { Page, Locator, expect } from '@playwright/test'

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page, timeout: number = 30000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
  await page.waitForTimeout(500) // Wait for animations
}

/**
 * Wait for element to be visible and stable
 */
export async function waitForElementStable(
  locator: Locator,
  options: { timeout?: number; stableTime?: number } = {}
): Promise<void> {
  const { timeout = 5000, stableTime = 1000 } = options

  await locator.waitFor({ state: 'visible', timeout })
  await locator.waitFor({ state: 'stable', timeout })
}

/**
 * Fill form fields by name
 */
export async function fillForm(page: Page, fields: Record<string, string>): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    const input = page.locator(`input[name="${name}"], textarea[name="${name}"]`)
    if ((await input.count()) > 0) {
      await input.fill(value)
    }
  }
}

/**
 * Click element with retry
 */
export async function clickWithRetry(
  locator: Locator,
  retries: number = 3,
  timeout: number = 5000
): Promise<void> {
  let lastError: Error | null = null

  for (let i = 0; i < retries; i++) {
    try {
      await locator.click({ timeout })
      return
    } catch (error) {
      lastError = error as Error
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }

  throw lastError
}

/**
 * Take screenshot with filename
 */
export async function takeScreenshot(
  page: Page,
  filename: string,
  options: { fullPage?: boolean } = {}
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const screenshotPath = `tests/e2e/test-results/screenshots/${filename}-${timestamp}.png`

  await page.screenshot({
    path: screenshotPath,
    fullPage: options.fullPage || false,
  })

  console.log(`Screenshot saved: ${screenshotPath}`)
}

/**
 * Wait for toast/notification
 */
export async function waitForToast(
  page: Page,
  message?: string,
  timeout: number = 5000
): Promise<Locator | null> {
  const toastLocator = message
    ? page.locator(`.toast, .notification, [role="alert"]`).filter({ hasText: message })
    : page.locator('.toast, .notification, [role="alert"]')

  try {
    await toastLocator.first().waitFor({ state: 'visible', timeout })
    return toastLocator.first()
  } catch {
    return null
  }
}

/**
 * Get text content from multiple elements
 */
export async function getTextContents(locator: Locator): Promise<string[]> {
  const count = await locator.count()
  const texts: string[] = []

  for (let i = 0; i < count; i++) {
    const text = await locator.nth(i).textContent()
    if (text) {
      texts.push(text.trim())
    }
  }

  return texts
}

/**
 * Check if element contains text
 */
export async function containsText(locator: Locator, text: string): Promise<boolean> {
  const elementText = await locator.textContent()
  return elementText ? elementText.includes(text) : false
}

/**
 * Navigate to URL with retry
 */
export async function gotoWithRetry(
  page: Page,
  url: string,
  retries: number = 3,
  timeout: number = 30000
): Promise<void> {
  let lastError: Error | null = null

  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { timeout })
      return
    } catch (error) {
      lastError = error as Error
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  throw lastError
}

/**
 * Select option from dropdown by text
 */
export async function selectOptionByText(dropdown: Locator, optionText: string): Promise<void> {
  await dropdown.click()
  const option = dropdown
    .page()
    .locator(`option:has-text("${optionText}"), [role="option"]:has-text("${optionText}")`)
  await option.click()
}

/**
 * Upload file
 */
export async function uploadFile(input: Locator, filePath: string): Promise<void> {
  await input.setInputFiles(filePath)
}

/**
 * Mock API response
 */
export async function mockAPIResponse(page: Page, url: string, response: any): Promise<void> {
  await page.route(url, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
}

/**
 * Clear local storage
 */
export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => window.localStorage.clear())
}

/**
 * Get current URL
 */
export async function getCurrentURL(page: Page): Promise<string> {
  return page.url()
}

/**
 * Wait for URL to match pattern
 */
export async function waitForURL(
  page: Page,
  pattern: RegExp | string,
  timeout: number = 30000
): Promise<void> {
  await page.waitForURL(pattern, { timeout })
}

/**
 * Generate random test data
 */
export function generateRandomEmail(): string {
  return `test-${Date.now()}@example.com`
}

export function generateRandomName(): string {
  return `Test User ${Date.now()}`
}

export function generateRandomTitle(): string {
  return `Test Task ${Date.now()}`
}

/**
 * Format date for input
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get tomorrow's date
 */
export function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return formatDateForInput(tomorrow)
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded()
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(locator: Locator): Promise<boolean> {
  return await locator.isVisible()
}

/**
 * Hover over element
 */
export async function hoverOver(locator: Locator): Promise<void> {
  await locator.hover()
}

/**
 * Double click element
 */
export async function doubleClick(locator: Locator): Promise<void> {
  await locator.dblclick()
}

/**
 * Right click element
 */
export async function rightClick(locator: Locator): Promise<void> {
  await locator.click({ button: 'right' })
}

/**
 * Type with delay
 */
export async function typeWithDelay(
  locator: Locator,
  text: string,
  delay: number = 100
): Promise<void> {
  for (const char of text) {
    await locator.type(char)
    await locator.page().waitForTimeout(delay)
  }
}

/**
 * Get element attributes
 */
export async function getAttributes(
  locator: Locator,
  attributeNames: string[]
): Promise<Record<string, string | null>> {
  const attributes: Record<string, string | null> = {}

  for (const name of attributeNames) {
    attributes[name] = await locator.getAttribute(name)
  }

  return attributes
}

/**
 * Check if element has class
 */
export async function hasClass(locator: Locator, className: string): Promise<boolean> {
  const classes = await locator.getAttribute('class')
  return classes ? classes.includes(className) : false
}

/**
 * Wait for number of elements
 */
export async function waitForElementCount(
  locator: Locator,
  count: number,
  timeout: number = 10000
): Promise<void> {
  await locator.page().waitForFunction(
    (selector: string, expectedCount: number) => {
      return document.querySelectorAll(selector).length >= expectedCount
    },
    { timeout },
    await locator.evaluate(el => el.tagName + '.' + el.className),
    count
  )
}
