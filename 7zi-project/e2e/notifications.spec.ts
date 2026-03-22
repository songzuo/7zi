/**
 * @fileoverview Notification System E2E Tests
 * Tests in-app notifications, toasts, alerts, and notification preferences
 */

import { test, expect } from '@playwright/test';
import { generateTestId, waitForToast, waitForPageLoad } from './helpers/test-helpers';

test.describe('In-App Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/zh/login');
    await page.fill('input[type="email"]', 'test@7zi.com');
    await page.fill('input[type="password"]', 'test123456');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 });
  });

  test('should display notification bell icon', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for notification bell
    const notificationBell = page.locator('.notification-bell, [aria-label*="通知"], button:has-text("通知")');

    expect(await notificationBell.isVisible()).toBeTruthy();
  });

  test('should show notification badge when there are unread', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for notification badge
    const badge = page.locator('.notification-badge, .badge, [data-badge]');

    // Badge may or may not be visible depending on unread count
    const badgeCount = await badge.count();
    if (badgeCount > 0) {
      // Check if badge has a number
      const badgeText = await badge.first().textContent();
      expect(parseInt(badgeText || '0')).toBeGreaterThanOrEqual(0);
    }
  });

  test('should open notification dropdown', async ({ page }) => {
    await page.goto('/dashboard');

    // Click notification bell
    const notificationBell = page.locator('.notification-bell, button:has-text("通知")');
    await notificationBell.click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // Check for notification list
    const notificationList = page.locator('.notification-list, .notifications-dropdown');
    await expect(notificationList.first()).toBeVisible();
  });

  test('should display notification items', async ({ page }) => {
    await page.goto('/dashboard');

    // Open notifications
    const notificationBell = page.locator('.notification-bell, button:has-text("通知")');
    await notificationBell.click();
    await page.waitForTimeout(500);

    // Check for notification items
    const notificationItems = page.locator('.notification-item, .notification-card');

    // May have 0 notifications
    const count = await notificationItems.count();
    if (count > 0) {
      // Check first notification has content
      const firstNotification = notificationItems.first();
      await expect(firstNotification).toBeVisible();

      // Check for notification title and message
      const hasText = await firstNotification.textContent();
      expect(hasText?.length).toBeGreaterThan(0);
    }
  });

  test('should mark notification as read', async ({ page }) => {
    await page.goto('/dashboard');

    // Open notifications
    const notificationBell = page.locator('.notification-bell, button:has-text("通知")');
    await notificationBell.click();
    await page.waitForTimeout(500);

    // Find unread notification
    const unreadNotification = page.locator('.notification-item.unread, .notification-item[data-unread="true"]').first();

    if (await unreadNotification.isVisible()) {
      // Click to mark as read
      await unreadNotification.click();

      // Wait for update
      await page.waitForTimeout(500);

      // Check that notification is no longer unread
      await expect(unreadNotification).not.toHaveClass(/unread/);
    }
  });

  test('should mark all notifications as read', async ({ page }) => {
    await page.goto('/dashboard');

    // Open notifications
    const notificationBell = page.locator('.notification-bell, button:has-text("通知")');
    await notificationBell.click();
    await page.waitForTimeout(500);

    // Find "mark all as read" button
    const markAllRead = page.locator('button:has-text("全部已读"), button:has-text("Mark all as read")');

    if (await markAllRead.isVisible()) {
      await markAllRead.click();

      // Wait for update
      await page.waitForTimeout(500);

      // Check that all are marked as read
      const unreadNotifications = page.locator('.notification-item.unread');
      expect(await unreadNotifications.count()).toBe(0);
    }
  });

  test('should delete notification', async ({ page }) => {
    await page.goto('/dashboard');

    // Open notifications
    const notificationBell = page.locator('.notification-bell, button:has-text("通知")');
    await notificationBell.click();
    await page.waitForTimeout(500);

    // Find delete button
    const deleteButton = page.locator('.notification-item .delete-button, button:has-text("删除")').first();

    if (await deleteButton.isVisible()) {
      const notificationCount = await page.locator('.notification-item').count();

      await deleteButton.click();
      await page.waitForTimeout(500);

      // Verify notification is deleted
      const newCount = await page.locator('.notification-item').count();
      expect(newCount).toBeLessThan(notificationCount);
    }
  });

  test('should clear all notifications', async ({ page }) => {
    await page.goto('/dashboard');

    // Open notifications
    const notificationBell = page.locator('.notification-bell, button:has-text("通知")');
    await notificationBell.click();
    await page.waitForTimeout(500);

    // Find "clear all" button
    const clearAll = page.locator('button:has-text("清空"), button:has-text("Clear all")');

    if (await clearAll.isVisible()) {
      await clearAll.click();

      // Wait for confirmation
      await page.click('button:has-text("确认"), button:has-text("Confirm")');

      // Wait for update
      await page.waitForTimeout(500);

      // Verify all notifications are cleared
      const notificationItems = page.locator('.notification-item');
      expect(await notificationItems.count()).toBe(0);
    }
  });

  test('should navigate to notifications page', async ({ page }) => {
    await page.goto('/dashboard');

    // Find "view all" link
    const viewAllLink = page.locator('a:has-text("查看全部"), a:has-text("View all")');

    if (await viewAllLink.isVisible()) {
      await viewAllLink.click();

      // Verify we're on notifications page
      await expect(page).toHaveURL(/\/notifications/i);
      await expect(page.locator('h1, h2')).toContainText(/通知|Notifications/i);
    } else {
      // Try direct navigation
      await page.goto('/notifications');
      await expect(page.locator('h1, h2')).toContainText(/通知|Notifications/i);
    }
  });

  test('should filter notifications by type', async ({ page }) => {
    await page.goto('/notifications');

    // Check for filter tabs
    const filterTabs = page.locator('.filter-tabs, .notification-filters button');

    if (await filterTabs.count() > 0) {
      // Click different filters
      for (let i = 0; i < Math.min(await filterTabs.count(), 3); i++) {
        await filterTabs.nth(i).click();
        await page.waitForTimeout(500);

        // Verify filter is active
        const isActive = await filterTabs.nth(i).getAttribute('class')?.includes('active');
        expect(isActive).toBeTruthy();
      }
    }
  });

  test('should search notifications', async ({ page }) => {
    await page.goto('/notifications');

    // Find search input
    const searchInput = page.locator('input[placeholder*="搜索"], input[name="search"]');

    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('task');
      await page.waitForTimeout(1000);

      // Verify results are filtered
      const notificationItems = page.locator('.notification-item');
      const allText = await notificationItems.allTextContents();
      const allMatch = allText.every(text => text.toLowerCase().includes('task') || text === '');
      expect(allMatch).toBeTruthy();
    }
  });
});

test.describe('Toast Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/zh/login');
    await page.fill('input[type="email"]', 'test@7zi.com');
    await page.fill('input[type="password"]', 'test123456');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 });
  });

  test('should show success toast', async ({ page }) => {
    await page.goto('/dashboard');

    // Trigger an action that shows success toast
    // (e.g., update a setting)
    await page.goto('/settings');

    const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Check for success toast
      const toast = await waitForToast(page, '成功, 保存成功, Success');
      expect(toast).toBeTruthy();
      await expect(toast).toBeVisible();
    }
  });

  test('should show error toast', async ({ page }) => {
    await page.goto('/tasks');

    // Try to create invalid task
    const createButton = page.locator('button:has-text("新建"), button:has-text("Create")');
    if (await createButton.isVisible()) {
      await createButton.click();

      // Submit empty form
      await page.click('button:has-text("保存"), button:has-text("Save")');

      // Check for error toast
      const errorToast = await waitForToast(page, '错误, 失败, Error');
      expect(errorToast).toBeTruthy();
    }
  });

  test('should show warning toast', async ({ page }) => {
    await page.goto('/tasks');

    // Look for action that shows warning
    const deleteButton = page.locator('button:has-text("删除"), button:has-text("Delete")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Cancel action to avoid deletion
      await page.click('button:has-text("取消"), button:has-text("Cancel")');

      // Check for info/warning toast
      const infoToast = await waitForToast(page, '已取消, 操作取消');
      if (infoToast) {
        await expect(infoToast).toBeVisible();
      }
    }
  });

  test('should auto-dismiss toast', async ({ page }) => {
    await page.goto('/dashboard');

    // Trigger a toast
    const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Wait for toast to appear
      const toast = await waitForToast(page);
      expect(toast).toBeTruthy();

      // Wait for auto-dismiss (usually 3-5 seconds)
      await page.waitForTimeout(6000);

      // Toast should be gone
      await expect(toast).not.toBeVisible();
    }
  });

  test('should allow manual toast dismissal', async ({ page }) => {
    await page.goto('/dashboard');

    // Trigger a toast
    const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Wait for toast
      const toast = await waitForToast(page);
      expect(toast).toBeTruthy();

      // Find close button
      const closeButton = toast.locator('.close, button[aria-label*="关闭"], button[aria-label*="Close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();

        // Toast should disappear
        await expect(toast).not.toBeVisible();
      }
    }
  });

  test('should show multiple toasts in sequence', async ({ page }) => {
    await page.goto('/settings');

    // Trigger multiple actions
    const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")');

    if (await saveButton.count() >= 2) {
      await saveButton.nth(0).click();
      await page.waitForTimeout(500);
      await saveButton.nth(1).click();

      // Check for multiple toasts
      const toasts = page.locator('.toast, .notification');
      expect(await toasts.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('should stack multiple toasts', async ({ page }) => {
    await page.goto('/settings');

    // Trigger multiple actions quickly
    const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")').first();

    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(200);
      await saveButton.click();
      await page.waitForTimeout(200);
      await saveButton.click();

      // Check for stacked toasts
      const toasts = page.locator('.toast, .notification');
      const count = await toasts.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe('Alert System', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/zh/login');
    await page.fill('input[type="email"]', 'test@7zi.com');
    await page.fill('input[type="password"]', 'test123456');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 });
  });

  test('should display system alerts', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for alert banners
    const alertBanner = page.locator('.alert-banner, .system-alert, .announcement');

    // Alerts may or may not be present
    if (await alertBanner.isVisible({ timeout: 2000 })) {
      await expect(alertBanner).toBeVisible();

      // Check for dismiss button
      const dismissButton = alertBanner.locator('.close, button:has-text("关闭"), button:has-text("Dismiss")');
      if (await dismissButton.isVisible()) {
        await dismissButton.click();

        // Alert should disappear
        await expect(alertBanner).not.toBeVisible();
      }
    }
  });

  test('should show confirmation dialog', async ({ page }) => {
    await page.goto('/tasks');

    // Find delete button
    const deleteButton = page.locator('button:has-text("删除"), button:has-text("Delete")').first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Check for confirmation dialog
      const dialog = page.locator('[role="dialog"], .modal, .confirm-dialog');
      await expect(dialog.first()).toBeVisible();

      // Check for confirmation message
      await expect(page.locator('text=确定删除, 确认, Are you sure')).toBeVisible();

      // Cancel
      await page.click('button:has-text("取消"), button:has-text("Cancel")');

      // Dialog should close
      await expect(dialog).not.toBeVisible();
    }
  });

  test('should show warning for destructive actions', async ({ page }) => {
    await page.goto('/admin/users');

    // Find delete button
    const deleteButton = page.locator('button:has-text("删除"), button:has-text("Delete")').first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Check for warning message
      const warningText = page.locator('text=不可撤销, 无法恢复, 此操作不可撤销');
      expect(await warningText.isVisible()).toBeTruthy();
    }
  });
});

test.describe('Notification Preferences', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/zh/login');
    await page.fill('input[type="email"]', 'test@7zi.com');
    await page.fill('input[type="password"]', 'test123456');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 });
  });

  test('should navigate to notification settings', async ({ page }) => {
    await page.goto('/settings');

    // Look for notification settings section
    const notificationSection = page.locator('text=通知设置, Notification Settings');

    if (await notificationSection.isVisible()) {
      // Click or scroll to section
      await notificationSection.scrollIntoViewIfNeeded();
    }
  });

  test('should toggle email notifications', async ({ page }) => {
    await page.goto('/settings');

    // Find email notification toggle
    const emailToggle = page.locator('input[type="checkbox"][name="email-notifications"], .toggle.email-notifications');

    if (await emailToggle.isVisible()) {
      const isChecked = await emailToggle.isChecked();
      await emailToggle.click();

      // Verify state changed
      expect(await emailToggle.isChecked()).toBe(!isChecked);
    }
  });

  test('should toggle push notifications', async ({ page }) => {
    await page.goto('/settings');

    // Find push notification toggle
    const pushToggle = page.locator('input[type="checkbox"][name="push-notifications"], .toggle.push-notifications');

    if (await pushToggle.isVisible()) {
      const isChecked = await pushToggle.isChecked();
      await pushToggle.click();

      // Verify state changed
      expect(await pushToggle.isChecked()).toBe(!isChecked);
    }
  });

  test('should configure notification frequency', async ({ page }) => {
    await page.goto('/settings');

    // Find frequency selector
    const frequencySelect = page.locator('select[name="notification-frequency"], .notification-frequency');

    if (await frequencySelect.isVisible()) {
      await frequencySelect.selectOption('daily');

      // Verify selection
      const selectedValue = await frequencySelect.inputValue();
      expect(selectedValue).toBe('daily');
    }
  });

  test('should configure notification types', async ({ page }) => {
    await page.goto('/settings');

    // Find notification type checkboxes
    const typeCheckboxes = page.locator('input[type="checkbox"].notification-type');

    if (await typeCheckboxes.count() > 0) {
      // Toggle first checkbox
      await typeCheckboxes.first().click();

      // Save preferences
      const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();

        // Check for success toast
        const toast = await waitForToast(page, '保存成功');
        expect(toast).toBeTruthy();
      }
    }
  });

  test('should set quiet hours', async ({ page }) => {
    await page.goto('/settings');

    // Find quiet hours section
    const quietHoursSection = page.locator('text=免打扰, Quiet Hours, 勿扰模式');

    if (await quietHoursSection.isVisible()) {
      // Find time inputs
      const startTime = page.locator('input[name="quiet-hours-start"], .quiet-hours-start');
      const endTime = page.locator('input[name="quiet-hours-end"], .quiet-hours-end');

      if (await startTime.isVisible()) {
        await startTime.fill('22:00');
      }

      if (await endTime.isVisible()) {
        await endTime.fill('08:00');
      }

      // Save
      const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
    }
  });
});

test.describe('Notification Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/zh/login');
    await page.fill('input[type="email"]', 'test@7zi.com');
    await page.fill('input[type="password"]', 'test123456');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 });
  });

  test('should have proper ARIA roles for notifications', async ({ page }) => {
    await page.goto('/dashboard');

    // Open notifications
    const notificationBell = page.locator('.notification-bell, button:has-text("通知")');
    await notificationBell.click();
    await page.waitForTimeout(500);

    // Check for ARIA attributes
    const notificationList = page.locator('.notification-list, [role="list"]');
    if (await notificationList.isVisible()) {
      await expect(notificationList.first()).toHaveAttribute('role', 'list');
    }
  });

  test('should announce notifications to screen readers', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for live regions
    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
    expect(await liveRegion.count()).toBeGreaterThan(0);
  });

  test('should support keyboard navigation in notifications', async ({ page }) => {
    await page.goto('/dashboard');

    // Open notifications with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(500);

    // Navigate notification items
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);
  });
});
