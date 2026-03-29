/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from '@playwright/test';
import { User, PageObjectModel } from './types';

/**
 * Extended test fixture with custom helpers
 */
type TestFixtures = {
  authenticatedPage: PageObjectModel;
  user: User;
  mockAPI: (endpoint: string, response: Record<string, unknown>) => Promise<void>;
};

export const test = base.extend<TestFixtures>({
  // Create authenticated page
  authenticatedPage: async ({ page }, use) => {
    // Perform login
    await page.goto('/');
    await page.getByLabel('用户名或邮箱').fill('test@example.com');
    await page.getByLabel('密码', { exact: true }).fill('Test123456!');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/dashboard|home/);
    await use(page);
  },

  // Mock user data
  user: async ({}, use) => {
    const user: User = {
      id: 'test-user-1',
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123456!',
      role: 'user',
    };
    await use(user);
  },

  // API mock helper
  mockAPI: async ({ page }, use) => {
    const mockAPI = async (endpoint: string, response: Record<string, unknown>) => {
      await page.route(endpoint, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      });
    };
    await use(mockAPI);
  },
});

export { expect };
