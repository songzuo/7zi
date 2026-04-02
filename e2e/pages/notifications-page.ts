/**
 * @fileoverview Notifications Page Object
 * Encapsulates notifications and settings page interactions and locators
 */

import { Page, Locator, expect } from '@playwright/test'

export class NotificationsPage {
  readonly page: Page
  readonly url: string = '/notifications'

  // Locators
  readonly notificationBell: Locator
  readonly notificationList: Locator
  readonly notificationItems: Locator
  readonly markAllReadButton: Locator
  readonly clearAllButton: Locator
  readonly filterTabs: Locator
  readonly searchInput: Locator
  readonly toastNotifications: Locator

  constructor(page: Page) {
    this.page = page

    // Initialize locators
    this.notificationBell = page.locator(
      '.notification-bell, [aria-label*="通知"], button:has-text("通知")'
    )
    this.notificationList = page.locator('.notification-list, .notifications-dropdown')
    this.notificationItems = page.locator('.notification-item, .notification-card')
    this.markAllReadButton = page.locator(
      'button:has-text("全部已读"), button:has-text("Mark all as read")'
    )
    this.clearAllButton = page.locator('button:has-text("清空"), button:has-text("Clear all")')
    this.filterTabs = page.locator('.filter-tabs button, .notification-filters button')
    this.searchInput = page.locator('input[placeholder*="搜索"], input[name="search"]')
    this.toastNotifications = page.locator('.toast, .notification, [role="alert"]')
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.waitForLoad()
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  async openNotificationDropdown(): Promise<void> {
    await this.notificationBell.click()
    await this.page.waitForTimeout(500)
    await expect(this.notificationList).toBeVisible()
  }

  async closeNotificationDropdown(): Promise<void> {
    await this.notificationBell.click()
    await this.page.waitForTimeout(500)
  }

  async getNotificationCount(): Promise<number> {
    await this.openNotificationDropdown()
    const count = await this.notificationItems.count()
    await this.closeNotificationDropdown()
    return count
  }

  async getUnreadCount(): Promise<number> {
    await this.openNotificationDropdown()
    const unreadItems = this.notificationItems.filter({ hasClass: 'unread' })
    const count = await unreadItems.count()
    await this.closeNotificationDropdown()
    return count
  }

  async getBadgeCount(): Promise<number> {
    const badge = this.notificationBell.locator('.notification-badge, .badge')
    if (await badge.isVisible()) {
      const badgeText = await badge.textContent()
      return parseInt(badgeText || '0')
    }
    return 0
  }

  async markAllAsRead(): Promise<void> {
    await this.openNotificationDropdown()
    if (await this.markAllReadButton.isVisible()) {
      await this.markAllReadButton.click()
      await this.page.waitForTimeout(500)
    }
    await this.closeNotificationDropdown()
  }

  async clearAll(): Promise<void> {
    await this.openNotificationDropdown()
    if (await this.clearAllButton.isVisible()) {
      await this.clearAllButton.click()
      await this.page.waitForTimeout(500)

      // Confirm clear all
      const confirmButton = this.page.locator('button:has-text("确认"), button:has-text("Confirm")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
        await this.page.waitForTimeout(500)
      }
    }
    await this.closeNotificationDropdown()
  }

  async markAsRead(index: number): Promise<void> {
    await this.openNotificationDropdown()
    const notification = this.notificationItems.nth(index)
    await notification.click()
    await this.page.waitForTimeout(500)
    await this.closeNotificationDropdown()
  }

  async deleteNotification(index: number): Promise<void> {
    await this.openNotificationDropdown()
    const notification = this.notificationItems.nth(index)
    const deleteButton = notification.locator('.delete-button, button:has-text("删除")')
    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      await this.page.waitForTimeout(500)
    }
    await this.closeNotificationDropdown()
  }

  async filterByType(type: string): Promise<void> {
    const filterTab = this.filterTabs.filter({ hasText: type }).first()
    if (await filterTab.isVisible()) {
      await filterTab.click()
      await this.page.waitForTimeout(500)
    }
  }

  async searchNotifications(query: string): Promise<void> {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(query)
      await this.page.waitForTimeout(1000)
    }
  }

  async clearSearch(): Promise<void> {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.clear()
      await this.page.waitForTimeout(1000)
    }
  }

  async getNotificationText(index: number): Promise<string | null> {
    await this.openNotificationDropdown()
    const notification = this.notificationItems.nth(index)
    const text = await notification.textContent()
    await this.closeNotificationDropdown()
    return text || null
  }

  async hasNotificationWithText(text: string): Promise<boolean> {
    await this.openNotificationDropdown()
    const notification = this.notificationItems.filter({ hasText: text }).first()
    const hasIt = await notification.isVisible()
    await this.closeNotificationDropdown()
    return hasIt
  }

  async waitForToast(message?: string): Promise<Locator | null> {
    if (message) {
      const toast = this.toastNotifications.filter({ hasText: message }).first()
      await toast.waitFor({ state: 'visible', timeout: 5000 })
      return toast
    } else {
      const toast = this.toastNotifications.first()
      await toast.waitFor({ state: 'visible', timeout: 5000 })
      return toast
    }
  }

  async dismissToast(index: number): Promise<void> {
    const toast = this.toastNotifications.nth(index)
    const closeButton = toast.locator(
      '.close, button[aria-label*="关闭"], button[aria-label*="Close"]'
    )
    if (await closeButton.isVisible()) {
      await closeButton.click()
    }
  }

  async getToastCount(): Promise<number> {
    return await this.toastNotifications.count()
  }

  async isOnNotificationsPage(): Promise<boolean> {
    const url = this.page.url()
    return url.includes('/notifications')
  }

  async goToNotificationsSettings(): Promise<void> {
    const settingsLink = this.page.locator('a:has-text("设置"), a:has-text("Settings")')
    if (await settingsLink.isVisible()) {
      await settingsLink.click()
    } else {
      await this.page.goto('/settings/notifications')
    }
  }

  // Settings methods
  async toggleEmailNotifications(): Promise<void> {
    await this.goToNotificationsSettings()
    const toggle = this.page.locator(
      'input[type="checkbox"][name="email-notifications"], .toggle.email-notifications'
    )
    if (await toggle.isVisible()) {
      await toggle.click()
    }
  }

  async togglePushNotifications(): Promise<void> {
    await this.goToNotificationsSettings()
    const toggle = this.page.locator(
      'input[type="checkbox"][name="push-notifications"], .toggle.push-notifications'
    )
    if (await toggle.isVisible()) {
      await toggle.click()
    }
  }

  async setNotificationFrequency(frequency: 'instant' | 'daily' | 'weekly'): Promise<void> {
    await this.goToNotificationsSettings()
    const select = this.page.locator('select[name="frequency"], .notification-frequency')
    if (await select.isVisible()) {
      await select.selectOption(frequency)
    }
  }

  async setQuietHours(start: string, end: string): Promise<void> {
    await this.goToNotificationsSettings()
    const quietHoursSection = this.page.locator('text=免打扰, Quiet Hours, 勿扰模式')

    if (await quietHoursSection.isVisible()) {
      const startTime = this.page.locator('input[name="quiet-hours-start"], .quiet-hours-start')
      const endTime = this.page.locator('input[name="quiet-hours-end"], .quiet-hours-end')

      if (await startTime.isVisible()) {
        await startTime.fill(start)
      }
      if (await endTime.isVisible()) {
        await endTime.fill(end)
      }

      // Save settings
      const saveButton = this.page.locator('button:has-text("保存"), button:has-text("Save")')
      if (await saveButton.isVisible()) {
        await saveButton.click()
      }
    }
  }

  async configureNotificationType(type: string, enabled: boolean): Promise<void> {
    await this.goToNotificationsSettings()
    const checkbox = this.page.locator(
      `input[type="checkbox"][value="${type}"], .notification-type[data-type="${type}"]`
    )

    if (await checkbox.isVisible()) {
      const isChecked = await checkbox.isChecked()
      if (isChecked !== enabled) {
        await checkbox.click()
      }

      // Save settings
      const saveButton = this.page.locator('button:has-text("保存"), button:has-text("Save")')
      if (await saveButton.isVisible()) {
        await saveButton.click()
      }
    }
  }

  async isEmailNotificationEnabled(): Promise<boolean> {
    await this.goToNotificationsSettings()
    const toggle = this.page.locator('input[type="checkbox"][name="email-notifications"]')
    if (await toggle.isVisible()) {
      return await toggle.isChecked()
    }
    return false
  }

  async isPushNotificationEnabled(): Promise<boolean> {
    await this.goToNotificationsSettings()
    const toggle = this.page.locator('input[type="checkbox"][name="push-notifications"]')
    if (await toggle.isVisible()) {
      return await toggle.isChecked()
    }
    return false
  }
}
