/**
 * @fileoverview Page Object Model for Tasks Page
 * Encapsulates task management interactions
 */

import { Page, Locator } from '@playwright/test'

export interface TaskData {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
  assignee?: string
  dueDate?: string
  tags?: string[]
}

export class TasksPage {
  readonly page: Page

  // Page elements
  readonly pageTitle: Locator
  readonly pageHeader: Locator

  // Task list
  readonly taskList: Locator
  readonly taskItems: Locator
  readonly emptyState: Locator

  // Task creation form
  readonly newTaskButton: Locator
  readonly taskForm: Locator
  readonly taskTitleInput: Locator
  readonly taskDescriptionInput: Locator
  readonly prioritySelect: Locator
  readonly assigneeInput: Locator
  readonly dueDateInput: Locator
  readonly submitTaskButton: Locator
  readonly cancelTaskButton: Locator

  // Task filtering and sorting
  readonly filterButton: Locator
  readonly sortButton: Locator
  readonly searchInput: Locator
  readonly filterDropdown: Locator

  // Task item elements
  readonly taskTitle: Locator
  readonly taskDescription: Locator
  readonly taskPriority: Locator
  readonly taskAssignee: Locator
  readonly taskDueDate: Locator
  readonly taskStatus: Locator

  // Task actions
  readonly editTaskButton: Locator
  readonly deleteTaskButton: Locator
  readonly completeTaskButton: Locator

  // Messages
  readonly successMessage: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page

    // Page elements
    this.pageTitle = page.locator('h1, h2').filter({ hasText: /任务|Tasks/i })
    this.pageHeader = page.locator('header, .page-header')

    // Task list
    this.taskList = page.locator('[class*="task-list"], [role="list"]')
    this.taskItems = page.locator('[class*="task-item"], [class*="task-card"], li, tr')
    this.emptyState = page.locator('[class*="empty"], [class*="no-data"]')

    // Task creation
    this.newTaskButton = page.locator('button').filter({ hasText: /新建|创建|New|Create/i })
    this.taskForm = page.locator('form, [role="form"]')
    this.taskTitleInput = page.locator(
      'input[name*="title"], input[placeholder*="标题"], input[placeholder*="Title"]'
    )
    this.taskDescriptionInput = page.locator(
      'textarea[name*="description"], textarea[placeholder*="描述"]'
    )
    this.prioritySelect = page.locator(
      'select[name*="priority"], [role="combobox"][aria-label*="priority"]'
    )
    this.assigneeInput = page.locator('input[name*="assignee"], input[placeholder*="负责人"]')
    this.dueDateInput = page.locator('input[type="date"], input[type="datetime-local"]')
    this.submitTaskButton = page.locator('button[type="submit"]')
    this.cancelTaskButton = page.locator('button').filter({ hasText: /取消|Cancel/i })

    // Filter and sort
    this.filterButton = page.locator('button').filter({ hasText: /筛选|Filter/i })
    this.sortButton = page.locator('button').filter({ hasText: /排序|Sort/i })
    this.searchInput = page.locator(
      'input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]'
    )
    this.filterDropdown = page.locator('[role="listbox"], .dropdown-menu')

    // Task item details
    this.taskTitle = page.locator('[class*="task-title"], [data-task-title]')
    this.taskDescription = page.locator('[class*="task-description"]')
    this.taskPriority = page.locator('[class*="priority"], [data-priority]')
    this.taskAssignee = page.locator('[class*="assignee"], [data-assignee]')
    this.taskDueDate = page.locator('[class*="due-date"], [data-due-date]')
    this.taskStatus = page.locator('[class*="status"], [data-status]')

    // Task actions
    this.editTaskButton = page.locator('button').filter({ hasText: /编辑|Edit/i })
    this.deleteTaskButton = page.locator('button').filter({ hasText: /删除|Delete/i })
    this.completeTaskButton = page.locator('button').filter({ hasText: /完成|Complete|Done/i })

    // Messages
    this.successMessage = page.locator(
      '.success, .toast-success, [role="status"]:has-text("成功"), [role="alert"]:has-text("成功")'
    )
    this.errorMessage = page.locator('.error, .toast-error, [role="alert"], [class*="error"]')
  }

  /**
   * Navigate to tasks page
   */
  async goto() {
    await this.page.goto('/tasks')
  }

  /**
   * Wait for tasks page to load
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle')
    await this.pageTitle.waitFor({ state: 'visible' })
  }

  /**
   * Check if on tasks page
   */
  async isOnTasksPage(): Promise<boolean> {
    const url = this.page.url()
    return url.includes('/tasks') || (await this.pageTitle.isVisible())
  }

  /**
   * Click new task button
   */
  async clickNewTask() {
    await this.newTaskButton.click()
    await this.taskForm.waitFor({ state: 'visible' })
  }

  /**
   * Create a new task
   */
  async createTask(task: TaskData) {
    await this.clickNewTask()

    await this.taskTitleInput.fill(task.title)

    if (task.description) {
      await this.taskDescriptionInput.fill(task.description)
    }

    if (task.priority) {
      await this.prioritySelect.selectOption(task.priority)
    }

    if (task.assignee) {
      await this.assigneeInput.fill(task.assignee)
    }

    if (task.dueDate) {
      await this.dueDateInput.fill(task.dueDate)
    }

    await this.submitTaskButton.click()
  }

  /**
   * Edit a task
   */
  async editTask(taskTitle: string, updates: Partial<TaskData>) {
    const taskLocator = this.findTaskByTitle(taskTitle)
    await taskLocator.locator(this.editTaskButton).click()

    if (updates.title) {
      await this.taskTitleInput.fill(updates.title)
    }

    if (updates.description) {
      await this.taskDescriptionInput.fill(updates.description)
    }

    if (updates.priority) {
      await this.prioritySelect.selectOption(updates.priority)
    }

    await this.submitTaskButton.click()
  }

  /**
   * Delete a task
   */
  async deleteTask(taskTitle: string) {
    const taskLocator = this.findTaskByTitle(taskTitle)
    await taskLocator.locator(this.deleteTaskButton).click()

    // Confirm deletion if dialog appears
    const confirmButton = this.page.locator('button').filter({ hasText: /确认|Confirm/i })
    if ((await confirmButton.count()) > 0) {
      await confirmButton.click()
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskTitle: string) {
    const taskLocator = this.findTaskByTitle(taskTitle)
    await taskLocator.locator(this.completeTaskButton).click()
  }

  /**
   * Search for a task
   */
  async searchTask(query: string) {
    await this.searchInput.fill(query)
    await this.page.keyboard.press('Enter')
  }

  /**
   * Find task by title
   */
  findTaskByTitle(title: string): Locator {
    return this.taskItems.filter({ hasText: title }).first()
  }

  /**
   * Check if task exists
   */
  async taskExists(title: string): Promise<boolean> {
    const taskLocator = this.findTaskByTitle(title)
    return (await taskLocator.count()) > 0
  }

  /**
   * Get task count
   */
  async getTaskCount(): Promise<number> {
    return await this.taskItems.count()
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string | null> {
    if ((await this.successMessage.count()) > 0) {
      return await this.successMessage.first().textContent()
    }
    return null
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string | null> {
    if ((await this.errorMessage.count()) > 0) {
      return await this.errorMessage.first().textContent()
    }
    return null
  }

  /**
   * Check if empty state is shown
   */
  async isEmptyStateShown(): Promise<boolean> {
    return await this.emptyState.isVisible()
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(filename: string) {
    await this.page.screenshot({
      path: `tests/e2e/test-results/screenshots/${filename}.png`,
      fullPage: true,
    })
  }
}
