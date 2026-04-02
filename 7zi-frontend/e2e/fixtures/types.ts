import { Page, Locator } from '@playwright/test'

/**
 * User interface
 */
export interface User {
  id: string
  username: string
  email: string
  password: string
  role: 'admin' | 'user' | 'guest'
}

/**
 * Notification interface
 */
export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
}

/**
 * PageObjectModel - type alias for Page
 */
export type PageObjectModel = Page

/**
 * Login page object
 */
export class LoginPage {
  readonly page: Page
  readonly usernameInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.usernameInput = page.getByLabel(/用户名|邮箱/)
    this.passwordInput = page.getByLabel('密码', { exact: true })
    this.submitButton = page.getByRole('button', { name: /登录|Login/ })
    this.errorMessage = page.getByRole('alert')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async expectError(message: string) {
    await this.errorMessage.waitFor({ state: 'visible' })
    await expect(this.errorMessage).toContainText(message)
  }
}

/**
 * Notification page object
 */
export class NotificationPage {
  readonly page: Page
  readonly notificationBell: Locator
  readonly notificationCenter: Locator
  readonly notificationList: Locator
  readonly clearAllButton: Locator

  constructor(page: Page) {
    this.page = page
    this.notificationBell = page.getByRole('button', { name: /通知|notification/i })
    this.notificationCenter = page.getByTestId('notification-center')
    this.notificationList = page.getByTestId('notification-list')
    this.clearAllButton = page.getByRole('button', { name: /清除全部|clear all/i })
  }

  async openNotificationCenter() {
    await this.notificationBell.click()
    await this.notificationCenter.waitFor({ state: 'visible' })
  }

  async getNotificationCount() {
    const badge = this.notificationBell.locator('[data-testid="notification-badge"]')
    const count = await badge.textContent()
    return parseInt(count || '0', 10)
  }

  async markAsRead(notificationId: string) {
    const notification = this.notificationList.locator(`[data-notification-id="${notificationId}"]`)
    await notification.getByRole('button', { name: /标记已读/i }).click()
  }

  async clearAll() {
    await this.clearAllButton.click()
  }
}

/**
 * WebSocket page object
 */
export class WebSocketPage {
  readonly page: Page
  readonly connectionStatus: Locator
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly messageList: Locator

  constructor(page: Page) {
    this.page = page
    this.connectionStatus = page.getByTestId('ws-connection-status')
    this.messageInput = page.getByLabel(/消息|message/i)
    this.sendButton = page.getByRole('button', { name: /发送|send/i })
    this.messageList = page.getByTestId('message-list')
  }

  async sendMessage(message: string) {
    await this.messageInput.fill(message)
    await this.sendButton.click()
  }

  async expectConnected() {
    await expect(this.connectionStatus).toContainText(/已连接|connected/i)
  }

  async expectDisconnected() {
    await expect(this.connectionStatus).toContainText(/已断开|disconnected/i)
  }
}
