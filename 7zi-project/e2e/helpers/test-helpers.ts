/**
 * @fileoverview Test helper functions for E2E tests
 * Utility functions to simplify common test operations
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page, timeout: number = 30000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForTimeout(500); // Wait for animations
}

/**
 * Wait for element to be visible and stable
 */
export async function waitForElementStable(
  locator: Locator,
  options: { timeout?: number; stableTime?: number } = {}
): Promise<void> {
  const { timeout = 5000, stableTime = 1000 } = options;

  await locator.waitFor({ state: 'visible', timeout });
  await locator.waitFor({ state: 'stable', timeout });
}

/**
 * Fill form fields by name
 */
export async function fillForm(page: Page, fields: Record<string, string>): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    const input = page.locator(`input[name="${name}"], textarea[name="${name}"]`);
    if (await input.count() > 0) {
      await input.fill(value);
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
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      await locator.click({ timeout });
      return;
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError;
}

/**
 * Take screenshot with filename
 */
export async function takeScreenshot(
  page: Page,
  filename: string,
  options: { fullPage?: boolean } = {}
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = `test-results/screenshots/${filename}-${timestamp}.png`;

  await page.screenshot({
    path: screenshotPath,
    fullPage: options.fullPage || false,
  });

  console.log(`Screenshot saved: ${screenshotPath}`);
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
    : page.locator('.toast, .notification, [role="alert"]');

  try {
    await toastLocator.first().waitFor({ state: 'visible', timeout });
    return toastLocator.first();
  } catch {
    return null;
  }
}

/**
 * Check if element has text
 */
export async function hasText(locator: Locator, text: string): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout: 3000 });
    const elementText = await locator.textContent();
    return elementText?.includes(text) ?? false;
  } catch {
    return false;
  }
}

/**
 * Get current viewport size
 */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Set viewport size
 */
export async function setViewportSize(page: Page, size: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(size);
  await page.waitForTimeout(500); // Wait for layout to settle
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Wait for loading to complete
 */
export async function waitForLoading(page: Page, timeout: number = 10000): Promise<void> {
  const loadingSelector = '.loading, .spinner, [aria-busy="true"]';

  try {
    await page.waitForSelector(loadingSelector, { state: 'attached', timeout: 1000 });
    await page.waitForSelector(loadingSelector, { state: 'hidden', timeout });
  } catch {
    // Loading element might not exist
  }
}

/**
 * Generate unique test data
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if element is visible
 */
export async function isVisible(locator: Locator): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if element is hidden
 */
export async function isHidden(locator: Locator): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'hidden', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all cookies as object
 */
export async function getCookiesAsObject(page: Page): Promise<Record<string, string>> {
  const cookies = await page.context().cookies();
  return cookies.reduce((acc, cookie) => {
    if (cookie.name && cookie.value) {
      acc[cookie.name] = cookie.value;
    }
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Set cookie
 */
export async function setCookie(page: Page, name: string, value: string): Promise<void> {
  await page.context().addCookies([{ name, value, domain: 'localhost', path: '/' }]);
}

/**
 * Clear all cookies
 */
export async function clearCookies(page: Page): Promise<void> {
  await page.context().clearCookies();
}

/**
 * Clear local storage
 */
export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => window.localStorage.clear());
}

/**
 * Clear session storage
 */
export async function clearSessionStorage(page: Page): Promise<void> {
  await page.evaluate(() => window.sessionStorage.clear());
}

/**
 * Get local storage item
 */
export async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
  return await page.evaluate((k) => window.localStorage.getItem(k), key);
}

/**
 * Set local storage item
 */
export async function setLocalStorageItem(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(({ k, v }) => window.localStorage.setItem(k, v), { k: key, v: value });
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  url: string,
  response: Record<string, unknown> | unknown[],
  status: number = 200
): Promise<void> {
  await page.route(url, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Wait for network response
 */
export async function waitForNetworkResponse(
  page: Page,
  url: string,
  timeout: number = 30000
): Promise<Record<string, unknown> | unknown[]> {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes(url), { timeout }),
    // Page action that triggers the request
  ]);

  return await response.json() as Record<string, unknown> | unknown[];
}

/**
 * Check if page has console errors
 */
export async function hasConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  return errors;
}

/**
 * Get all console messages
 */
export async function getConsoleMessages(page: Page): Promise<string[]> {
  const messages: string[] = [];

  page.on('console', (msg) => {
    messages.push(`[${msg.type()}] ${msg.text()}`);
  });

  return messages;
}

/**
 * Type with human-like delays
 */
export async function humanType(locator: Locator, text: string, delayMs: number = 50): Promise<void> {
  await locator.click();
  await locator.clear();

  for (const char of text) {
    await locator.type(char, { delay: delayMs });
  }
}

/**
 * Hover element
 */
export async function hoverElement(locator: Locator): Promise<void> {
  await locator.hover();
  await new Promise(resolve => setTimeout(resolve, 300)); // Wait for hover effect
}

/**
 * Double click element
 */
export async function doubleClick(locator: Locator): Promise<void> {
  await locator.dblclick();
}

/**
 * Right click element
 */
export async function rightClick(locator: Locator): Promise<void> {
  await locator.click({ button: 'right' });
}

/**
 * Select option from dropdown
 */
export async function selectOption(locator: Locator, option: string): Promise<void> {
  await locator.selectOption(option);
}

/**
 * Upload file
 */
export async function uploadFile(locator: Locator, filePath: string): Promise<void> {
  await locator.setInputFiles(filePath);
}

/**
 * Get element text
 */
export async function getText(locator: Locator): Promise<string> {
  await locator.waitFor({ state: 'visible', timeout: 5000 });
  return (await locator.textContent()) || '';
}

/**
 * Get element attribute
 */
export async function getAttribute(locator: Locator, attribute: string): Promise<string | null> {
  await locator.waitFor({ state: 'visible', timeout: 5000 });
  return await locator.getAttribute(attribute);
}

/**
 * Check if element has class
 */
export async function hasClass(locator: Locator, className: string): Promise<boolean> {
  await locator.waitFor({ state: 'visible', timeout: 5000 });
  const classList = await locator.getAttribute('class') || '';
  return classList.split(' ').includes(className);
}

/**
 * Count elements
 */
export async function countElements(locator: Locator): Promise<number> {
  return await locator.count();
}

/**
 * Get all elements
 */
export async function getAllElements(locator: Locator): Promise<Locator[]> {
  const count = await locator.count();
  const elements: Locator[] = [];

  for (let i = 0; i < count; i++) {
    elements.push(locator.nth(i));
  }

  return elements;
}

/**
 * Retry function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 1000 } = options;
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
