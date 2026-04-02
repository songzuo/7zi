/**
 * @fileoverview Page Object Model for Task Creation Modal/Page
 */

import { Page, Locator } from '@playwright/test'

export class TaskCreationPage {
  readonly page: Page
  readonly modal: Locator
  readonly titleInput: Locator
  readonly descriptionTextarea: Locator
  readonly prioritySelect: Locator
  readonly assigneeSelect: Locator
  readonly dueDateInput: Locator
  readonly submitButton: Locator
  readonly cancelButton: Locator
  readonly tagsInput: Locator

  constructor(page: Page) {
    this.page = page

    // Modal container
    this.modal = page.locator('[role="dialog"], .modal, .dialog')

    // Form fields
    this.titleInput = page.locator(
      'input[name="title"], input[placeholder*="标题"], input[placeholder*="Title"]'
    )
    this.descriptionTextarea = page.locator(
      'textarea[name="description"], textarea[placeholder*="描述"], textarea[placeholder*="Description"]'
    )
    this.prioritySelect = page.locator('select[name="priority"], [role="combobox"]')
    this.assigneeSelect = page.locator('select[name="assignee"], input[name="assignee"]')
    this.dueDateInput = page.locator(
      'input[type="date"], input[name="dueDate"], input[name="deadline"]'
    )
    this.tagsInput = page.locator(
      'input[name="tags"], input[placeholder*="标签"], input[placeholder*="Tags"]'
    )

    // Buttons
    this.submitButton = page.locator('button[type="submit"]')
    this.cancelButton = page.locator(
      'button:has-text("取消"), button:has-text("Cancel"), button[aria-label*="close"]'
    )
  }

  /**
   * Wait for modal to be visible
   */
  async waitForModal() {
    await this.modal.first().waitFor({ state: 'visible', timeout: 5000 })
  }

  /**
   * Check if modal is open
   */
  async isModalOpen(): Promise<boolean> {
    return await this.modal.first().isVisible()
  }

  /**
   * Fill task title
   */
  async fillTitle(title: string) {
    await this.titleInput.fill(title)
  }

  /**
   * Fill task description
   */
  async fillDescription(description: string) {
    await this.descriptionTextarea.fill(description)
  }

  /**
   * Select priority
   */
  async selectPriority(priority: string) {
    await this.prioritySelect.selectOption(priority)
  }

  /**
   * Select assignee
   */
  async selectAssignee(assignee: string) {
    await this.assigneeSelect.click()
    const option = this.page.locator(`text=${assignee}`).first()
    if (await option.isVisible()) {
      await option.click()
    }
  }

  /**
   * Set due date
   */
  async setDueDate(date: string) {
    await this.dueDateInput.fill(date)
  }

  /**
   * Add tags
   */
  async addTags(tags: string[]) {
    for (const tag of tags) {
      await this.tagsInput.fill(tag)
      await this.page.keyboard.press('Enter')
    }
  }

  /**
   * Submit task form
   */
  async submit() {
    await this.submitButton.click()
  }

  /**
   * Cancel task creation
   */
  async cancel() {
    await this.cancelButton.click()
  }

  /**
   * Fill complete task form
   */
  async fillForm(data: {
    title: string
    description?: string
    priority?: string
    assignee?: string
    dueDate?: string
    tags?: string[]
  }) {
    if (data.title) await this.fillTitle(data.title)
    if (data.description) await this.fillDescription(data.description)
    if (data.priority) await this.selectPriority(data.priority)
    if (data.assignee) await this.selectAssignee(data.assignee)
    if (data.dueDate) await this.setDueDate(data.dueDate)
    if (data.tags) await this.addTags(data.tags)
  }

  /**
   * Create task with full form
   */
  async createTask(data: {
    title: string
    description?: string
    priority?: string
    assignee?: string
    dueDate?: string
    tags?: string[]
  }) {
    await this.fillForm(data)
    await this.submit()
  }

  /**
   * Get validation error for field
   */
  async getValidationError(field: string): Promise<string | null> {
    const errorLocator = this.page.locator(
      `input[name="${field}"] ~ .error, input[name="${field}"] ~ [role="alert"]`
    )
    if ((await errorLocator.count()) > 0) {
      return await errorLocator.textContent()
    }
    return null
  }

  /**
   * Wait for modal to close
   */
  async waitForModalClose() {
    await this.modal.first().waitFor({ state: 'hidden', timeout: 5000 })
  }
}
