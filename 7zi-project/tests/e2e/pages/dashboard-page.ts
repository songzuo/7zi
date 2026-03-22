/**
 * @fileoverview Page Object Model for Dashboard Page
 * Encapsulates dashboard-related interactions
 */

import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  // Page title and headers
  readonly pageTitle: Locator;
  readonly pageHeader: Locator;

  // Navigation elements
  readonly sidebar: Locator;
  readonly navigationMenu: Locator;
  readonly homeLink: Locator;
  readonly tasksLink: Locator;
  readonly teamLink: Locator;
  readonly analyticsLink: Locator;
  readonly settingsLink: Locator;

  // Dashboard elements
  readonly statsCards: Locator;
  readonly recentActivity: Locator;
  readonly taskList: Locator;
  overdueTasksCount: Locator;

  // Search and filter
  readonly searchInput: Locator;
  readonly filterDropdown: Locator;

  // Actions
  readonly newTaskButton: Locator;
  readonly refreshButton: Locator;

  // User profile
  readonly userAvatar: Locator;
  readonly userName: Locator;
  readonly userDropdown: Locator;

  // Messages
  readonly welcomeMessage: Locator;
  readonly noDataMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page elements
    this.pageTitle = page.locator('h1, h2').filter({ hasText: /仪表盘|Dashboard/i });
    this.pageHeader = page.locator('header, .page-header');

    // Navigation
    this.sidebar = page.locator('aside, .sidebar, nav[class*="sidebar"]');
    this.navigationMenu = page.locator('nav, [role="navigation"]');
    this.homeLink = page.locator('a[href*="/"], a[href*="dashboard"]').filter({ hasText: /首页|仪表盘|Dashboard|Home/i });
    this.tasksLink = page.locator('a[href*="task"]').filter({ hasText: /任务|Tasks/i });
    this.teamLink = page.locator('a[href*="team"]').filter({ hasText: /团队|Team/i });
    this.analyticsLink = page.locator('a[href*="analytics"]').filter({ hasText: /分析|Analytics/i });
    this.settingsLink = page.locator('a[href*="settings"]').filter({ hasText: /设置|Settings/i });

    // Dashboard content
    this.statsCards = page.locator('[class*="stat"], [class*="card"]');
    this.recentActivity = page.locator('[class*="activity"], [class*="recent"]');
    this.taskList = page.locator('[class*="task-list"], table, [role="list"]');
    this.overdueTasksCount = page.locator('[class*="overdue"], [data-overdue]');

    // Search and filter
    this.searchInput = page.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]');
    this.filterDropdown = page.locator('select, [role="combobox"]');

    // Actions
    this.newTaskButton = page.locator('button').filter({ hasText: /新建|创建|New|Create/i });
    this.refreshButton = page.locator('button').filter({ hasText: /刷新|Refresh/i });

    // User profile
    this.userAvatar = page.locator('img[alt*="avatar"], [class*="avatar"]');
    this.userName = page.locator('[class*="user-name"], [data-user-name]');
    this.userDropdown = page.locator('[class*="user-dropdown"], [role="button"][aria-haspopup]');

    // Messages
    this.welcomeMessage = page.locator('[class*="welcome"], h1, h2').filter({ hasText: /欢迎|Welcome/i });
    this.noDataMessage = page.locator('[class*="no-data"], [class*="empty"]').filter({ hasText: /暂无|No data|Empty/i });
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
  }

  /**
   * Wait for dashboard to load
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.pageTitle.waitFor({ state: 'visible' });
  }

  /**
   * Check if on dashboard
   */
  async isOnDashboard(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/dashboard') || (await this.pageTitle.isVisible());
  }

  /**
   * Get welcome message
   */
  async getWelcomeMessage(): Promise<string | null> {
    if (await this.welcomeMessage.count() > 0) {
      return await this.welcomeMessage.first().textContent();
    }
    return null;
  }

  /**
   * Get user name
   */
  async getUserName(): Promise<string | null> {
    if (await this.userName.count() > 0) {
      return await this.userName.first().textContent();
    }
    return null;
  }

  /**
   * Navigate to tasks
   */
  async navigateToTasks() {
    await this.tasksLink.click();
  }

  /**
   * Navigate to team
   */
  async navigateToTeam() {
    await this.teamLink.click();
  }

  /**
   * Navigate to analytics
   */
  async navigateToAnalytics() {
    await this.analyticsLink.click();
  }

  /**
   * Navigate to settings
   */
  async navigateToSettings() {
    await this.settingsLink.click();
  }

  /**
   * Search for content
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Click new task button
   */
  async clickNewTask() {
    await this.newTaskButton.click();
  }

  /**
   * Refresh dashboard
   */
  async refresh() {
    await this.refreshButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get stats cards count
   */
  async getStatsCardsCount(): Promise<number> {
    return await this.statsCards.count();
  }

  /**
   * Get task list items count
   */
  async getTaskListItemsCount(): Promise<number> {
    return await this.taskList.locator('li, tr').count();
  }

  /**
   * Click user dropdown
   */
  async clickUserDropdown() {
    await this.userDropdown.click();
  }

  /**
   * Check if sidebar is visible
   */
  async isSidebarVisible(): Promise<boolean> {
    return await this.sidebar.isVisible();
  }

  /**
   * Take screenshot of dashboard
   */
  async takeScreenshot(filename: string) {
    await this.page.screenshot({
      path: `tests/e2e/test-results/screenshots/${filename}.png`,
      fullPage: true,
    });
  }
}
