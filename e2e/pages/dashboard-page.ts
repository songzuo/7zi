/**
 * @fileoverview Page Object Model for Dashboard Page
 */

import { Page, Locator } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly pageHeading: Locator
  readonly createTaskButton: Locator
  readonly taskList: Locator
  readonly taskCards: Locator
  readonly searchInput: Locator
  readonly filterButton: Locator
  readonly statsContainer: Locator
  readonly exportButton: Locator
  readonly loadingSpinner: Locator

  constructor(page: Page) {
    this.page = page

    // Main elements
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /dashboard|看板/i })
    this.createTaskButton = page.locator(
      'button:has-text("新建任务"), button:has-text("New Task"), button:has-text("Create Task")'
    )
    this.taskList = page.locator('.task-list, .tasks, [role="list"]')
    this.taskCards = page.locator('.task, .task-item, [role="listitem"]')

    // Search and filter
    this.searchInput = page.locator(
      'input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]'
    )
    this.filterButton = page.locator('button:has-text("筛选"), button:has-text("Filter")')

    // Stats and export
    this.statsContainer = page.locator('.stats, .statistics, .dashboard-stats')
    this.exportButton = page.locator('button:has-text("导出"), button:has-text("Export")')

    // Loading state
    this.loadingSpinner = page.locator('.loading, .spinner, [aria-busy="true"]')
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await this.page.goto('/dashboard')
  }

  /**
   * Wait for dashboard to load
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle')
    await this.pageHeading.waitFor({ state: 'visible', timeout: 5000 })
  }

  /**
   * Check if on dashboard
   */
  async isOnDashboard(): Promise<boolean> {
    const url = this.page.url()
    return url.includes('/dashboard')
  }

  /**
   * Click create task button
   */
  async clickCreateTask() {
    await this.createTaskButton.first().click()
  }

  /**
   * Get task count
   */
  async getTaskCount(): Promise<number> {
    await this.taskCards.first().waitFor({ state: 'attached', timeout: 3000 })
    return await this.taskCards.count()
  }

  /**
   * Search for tasks
   */
  async searchTasks(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500) // Wait for debounce
  }

  /**
   * Click filter button
   */
  async clickFilter() {
    await this.filterButton.click()
  }

  /**
   * Filter tasks by status
   */
  async filterByStatus(status: string) {
    await this.clickFilter()
    const statusOption = this.page.locator(`text=${status}`).first()
    if (await statusOption.isVisible()) {
      await statusOption.click()
    }
  }

  /**
   * Get first task card
   */
  getFirstTaskCard() {
    return this.taskCards.first()
  }

  /**
   * Get task card by title
   */
  getTaskCardByTitle(title: string) {
    return this.taskCards.filter({ hasText: title })
  }

  /**
   * Click on task card
   */
  async clickTask(taskCard: Locator) {
    await taskCard.click()
  }

  /**
   * Check if stats are visible
   */
  async areStatsVisible(): Promise<boolean> {
    return await this.statsContainer.isVisible()
  }

  /**
   * Export tasks
   */
  async exportTasks(format: string = 'CSV') {
    await this.exportButton.click()
    const formatOption = this.page.locator(`text=${format}`).first()
    if (await formatOption.isVisible()) {
      await formatOption.click()
    }
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete() {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 })
  }

  /**
   * Refresh dashboard
   */
  async refresh() {
    await this.page.reload()
    await this.waitForLoad()
  }
}
