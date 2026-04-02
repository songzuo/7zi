/**
 * @fileoverview Tasks Page Object
 * Encapsulates tasks page interactions and locators
 */

import { Page, Locator } from '@playwright/test'

export class TasksPage {
  readonly page: Page
  readonly url: string = '/tasks'

  // Locators
  readonly heading: Locator
  readonly taskList: Locator
  readonly taskCards: Locator
  readonly createTaskButton: Locator
  readonly searchInput: Locator
  readonly filterButton: Locator
  readonly sortButton: Locator
  readonly viewToggle: Locator
  readonly boardView: Locator
  readonly listView: Locator
  readonly statusFilters: Locator
  readonly priorityFilters: Locator

  constructor(page: Page) {
    this.page = page

    // Initialize locators
    this.heading = page.locator('h1, .page-title').filter({ hasText: /任务|Tasks/i })
    this.taskList = page.locator('.task-list, .tasks-container, [data-section="tasks"]')
    this.taskCards = this.taskList.locator('.task, .task-card, .task-item, [data-task-id]')
    this.createTaskButton = page.locator(
      'button:has-text("新建任务"), button:has-text("Create Task"), button:has-text("Add Task")'
    )
    this.searchInput = page.locator(
      'input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]'
    )
    this.filterButton = page.locator('button:has-text("筛选"), button:has-text("Filter")')
    this.sortButton = page.locator('button:has-text("排序"), button:has-text("Sort")')
    this.viewToggle = page.locator('.view-toggle, .view-switcher')
    this.boardView = page.locator('button[aria-label*="Board"], .board-view')
    this.listView = page.locator('button[aria-label*="List"], .list-view')
    this.statusFilters = page.locator('.status-filters button, .filter-status button')
    this.priorityFilters = page.locator('.priority-filters button, .filter-priority button')
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.waitForLoad()
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
    await this.taskList.waitFor({ state: 'visible', timeout: 5000 })
  }

  async getPageTitle(): Promise<string | null> {
    return await this.heading.textContent()
  }

  async getTaskCount(): Promise<number> {
    await this.taskList.waitFor({ state: 'visible', timeout: 3000 })
    return await this.taskCards.count()
  }

  async getTaskTitle(index: number): Promise<string | null> {
    const task = this.taskCards.nth(index)
    if (await task.isVisible()) {
      const title = task.locator('.task-title, h3, h4')
      return await title.textContent()
    }
    return null
  }

  async getTaskStatus(index: number): Promise<string | null> {
    const task = this.taskCards.nth(index)
    if (await task.isVisible()) {
      const status = task.locator('.status, .task-status, .badge')
      return await status.textContent()
    }
    return null
  }

  async getTaskPriority(index: number): Promise<string | null> {
    const task = this.taskCards.nth(index)
    if (await task.isVisible()) {
      const priority = task.locator('.priority, .task-priority')
      return await priority.textContent()
    }
    return null
  }

  async getTaskAssignee(index: number): Promise<string | null> {
    const task = this.taskCards.nth(index)
    if (await task.isVisible()) {
      const assignee = task.locator('.assignee, .task-assignee')
      return await assignee.textContent()
    }
    return null
  }

  async clickCreateTask(): Promise<void> {
    if (await this.createTaskButton.isVisible()) {
      await this.createTaskButton.click()
    }
  }

  async clickTask(index: number): Promise<void> {
    const task = this.taskCards.nth(index)
    if (await task.isVisible()) {
      await task.click()
    }
  }

  async searchTasks(query: string): Promise<void> {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(query)
      await this.page.waitForTimeout(500) // Wait for debounce
    }
  }

  async clearSearch(): Promise<void> {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.clear()
      await this.page.waitForTimeout(500)
    }
  }

  async filterByStatus(status: string): Promise<void> {
    const filterButton = this.statusFilters.filter({ hasText: status }).first()
    if (await filterButton.isVisible()) {
      await filterButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async filterByPriority(priority: string): Promise<void> {
    const filterButton = this.priorityFilters.filter({ hasText: priority }).first()
    if (await filterButton.isVisible()) {
      await filterButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async clickFilterButton(): Promise<void> {
    if (await this.filterButton.isVisible()) {
      await this.filterButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async clickSortButton(): Promise<void> {
    if (await this.sortButton.isVisible()) {
      await this.sortButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async switchToBoardView(): Promise<void> {
    if (await this.boardView.isVisible()) {
      await this.boardView.click()
      await this.page.waitForTimeout(500)
    }
  }

  async switchToListView(): Promise<void> {
    if (await this.listView.isVisible()) {
      await this.listView.click()
      await this.page.waitForTimeout(500)
    }
  }

  async deleteTask(index: number): Promise<void> {
    const task = this.taskCards.nth(index)
    const deleteButton = task.locator(
      '.delete-button, button:has-text("删除"), button:has-text("Delete")'
    )
    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Confirm delete
      const confirmButton = this.page.locator('button:has-text("确认"), button:has-text("Confirm")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }
    }
  }

  async editTask(index: number): Promise<void> {
    const task = this.taskCards.nth(index)
    const editButton = task.locator(
      '.edit-button, button:has-text("编辑"), button:has-text("Edit")'
    )
    if (await editButton.isVisible()) {
      await editButton.click()
    }
  }

  async getTaskCountByStatus(status: string): Promise<number> {
    const tasks = this.taskCards.filter({ hasText: status })
    return await tasks.count()
  }

  async getTaskCountByPriority(priority: string): Promise<number> {
    const tasks = this.taskCards.filter({ hasText: priority })
    return await tasks.count()
  }

  async isOnTasksPage(): Promise<boolean> {
    const url = this.page.url()
    return url.includes('/tasks')
  }

  async refreshTasks(): Promise<void> {
    await this.page.reload()
    await this.waitForLoad()
  }

  async dragAndDropTask(sourceIndex: number, targetIndex: number): Promise<void> {
    const source = this.taskCards.nth(sourceIndex)
    const target = this.taskCards.nth(targetIndex)

    if ((await source.isVisible()) && (await target.isVisible())) {
      await source.dragTo(target)
      await this.page.waitForTimeout(500)
    }
  }
}
