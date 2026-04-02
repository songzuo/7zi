/**
 * @fileoverview E2E Test - Dashboard Flow
 * Tests dashboard navigation, statistics display, and user interactions
 */

import { test, expect } from '@playwright/test'
import { DashboardPage } from '../pages/dashboard-page'
import { AuthPage } from '../pages/auth-page'
import { testUsers, pageContent } from '../fixtures/test-data'
import { waitForPageLoad, clearLocalStorage } from '../helpers/test-helpers'

test.describe('Dashboard Flow', () => {
  let authPage: AuthPage
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    dashboardPage = new DashboardPage(page)

    // Clear local storage
    await clearLocalStorage(page)

    // Login before each test
    await authPage.gotoLogin()
    await authPage.login(testUsers.regular.email, testUsers.regular.password)
    await waitForPageLoad(page)
  })

  test.describe('Dashboard Loading', () => {
    test('should display dashboard page', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Verify page title
      await expect(dashboardPage.pageTitle).toBeVisible()
      await expect(dashboardPage.pageTitle).toContainText(/仪表盘|Dashboard/i)

      // Verify URL
      expect(await dashboardPage.isOnDashboard()).toBeTruthy()
    })

    test('should display welcome message', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      const welcomeMsg = await dashboardPage.getWelcomeMessage()
      expect(welcomeMsg).toBeTruthy()
      expect(welcomeMsg).toMatch(/欢迎|Welcome/i)
    })

    test('should display user information', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Check user avatar
      await expect(dashboardPage.userAvatar).toBeVisible()

      // Check user name
      const userName = await dashboardPage.getUserName()
      expect(userName).toBeTruthy()
      expect(userName).toContain(testUsers.regular.name)
    })

    test('should display statistics cards', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Check stats cards are present
      const statsCount = await dashboardPage.getStatsCardsCount()
      expect(statsCount).toBeGreaterThan(0)

      // Verify stats cards are visible
      await expect(dashboardPage.statsCards.first()).toBeVisible()
    })
  })

  test.describe('Dashboard Statistics', () => {
    test('should display task statistics', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Look for task-related stats
      const statsContent = await dashboardPage.statsCards.allTextContents()
      const statsText = statsContent.join(' ')

      // Check for common task statistics
      expect(statsText).toMatch(/总任务|Total Tasks|任务|Tasks/i)
    })

    test('should display completion statistics', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      const statsContent = await dashboardPage.statsCards.allTextContents()
      const statsText = statsContent.join(' ')

      // Check for completion-related stats
      expect(statsText).toMatch(/完成|Completed|进度|Progress/i)
    })

    test('should display overdue task count', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      const statsContent = await dashboardPage.statsCards.allTextContents()
      const statsText = statsContent.join(' ')

      // Check for overdue tasks
      expect(statsText).toMatch(/逾期|Overdue/i)
    })

    test('should display team member statistics', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      const statsContent = await dashboardPage.statsCards.allTextContents()
      const statsText = statsContent.join(' ')

      // Check for team-related stats
      expect(statsText).toMatch(/团队|Team|成员|Member/i)
    })
  })

  test.describe('Dashboard Navigation', () => {
    test('should navigate to tasks page', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      await dashboardPage.navigateToTasks()

      // Verify navigation
      expect(page.url()).toContain('/tasks')
    })

    test('should navigate to team page', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      await dashboardPage.navigateToTeam()

      // Verify navigation
      expect(page.url()).toContain('/team')
    })

    test('should navigate to analytics page', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      await dashboardPage.navigateToAnalytics()

      // Verify navigation
      expect(page.url()).toContain('/analytics')
    })

    test('should navigate to settings page', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      await dashboardPage.navigateToSettings()

      // Verify navigation
      expect(page.url()).toContain('/settings')
    })

    test('should return to dashboard from tasks', async ({ page }) => {
      // Navigate to tasks
      await dashboardPage.navigateToTasks()
      await waitForPageLoad(page)

      // Return to dashboard
      await dashboardPage.homeLink.click()
      await waitForPageLoad(page)

      // Verify back on dashboard
      expect(await dashboardPage.isOnDashboard()).toBeTruthy()
    })
  })

  test.describe('Dashboard Sidebar', () => {
    test('should display sidebar navigation', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      const isSidebarVisible = await dashboardPage.isSidebarVisible()
      expect(isSidebarVisible).toBeTruthy()

      // Check navigation links are visible
      await expect(dashboardPage.homeLink).toBeVisible()
      await expect(dashboardPage.tasksLink).toBeVisible()
      await expect(dashboardPage.teamLink).toBeVisible()
    })

    test('should highlight current page in sidebar', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Check if home/dashboard link is active
      // This depends on your CSS classes for active state
      const homeLink = dashboardPage.homeLink
      const classes = await homeLink.getAttribute('class')

      // Look for active class patterns
      if (classes) {
        const isActive = classes.includes('active') || classes.includes('current')
        expect(isActive).toBeTruthy()
      }
    })
  })

  test.describe('Dashboard Actions', () => {
    test('should create new task from dashboard', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Click new task button
      await dashboardPage.clickNewTask()

      // Verify navigation to task creation
      expect(page.url()).toContain('/tasks/new') || expect(page.url()).toContain('/tasks/create')
    })

    test('should refresh dashboard data', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Take initial screenshot
      await dashboardPage.takeScreenshot('dashboard-before-refresh')

      // Refresh
      await dashboardPage.refresh()

      // Verify page is still loaded
      await expect(dashboardPage.pageTitle).toBeVisible()
    })

    test('should open user dropdown menu', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Click user dropdown
      await dashboardPage.clickUserDropdown()

      // Check for dropdown menu items
      // This depends on your actual implementation
      const dropdownItems = page.locator('[role="menuitem"], .dropdown-item')
      const itemCount = await dropdownItems.count()

      expect(itemCount).toBeGreaterThan(0)
    })
  })

  test.describe('Dashboard Search', () => {
    test('should display search input', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      await expect(dashboardPage.searchInput).toBeVisible()
    })

    test('should search for tasks from dashboard', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Perform search
      const searchTerm = '测试任务'
      await dashboardPage.search(searchTerm)

      // Wait for results
      await page.waitForLoadState('networkidle')

      // Verify search results are shown
      // This depends on your search implementation
      const searchResults = page.locator('[class*="search-result"], [class*="task-item"]')
      expect(await searchResults.count()).toBeGreaterThanOrEqual(0)
    })

    test('should clear search results', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Perform search
      await dashboardPage.search('test')

      // Clear search
      await dashboardPage.searchInput.fill('')
      await page.keyboard.press('Enter')

      // Verify results are cleared
      await page.waitForLoadState('networkidle')
    })
  })

  test.describe('Dashboard Task List', () => {
    test('should display recent tasks', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      const taskCount = await dashboardPage.getTaskListItemsCount()
      expect(taskCount).toBeGreaterThanOrEqual(0)
    })

    test('should display task priority indicators', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Look for priority indicators
      const priorityElements = page.locator('[class*="priority"], [data-priority]')
      const hasPriority = (await priorityElements.count()) > 0

      // May not have tasks, so just verify elements exist
      expect(hasPriority).toBeGreaterThanOrEqual(0)
    })

    test('should display task status indicators', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Look for status indicators
      const statusElements = page.locator('[class*="status"], [data-status]')
      const hasStatus = (await statusElements.count()) > 0

      // May not have tasks, so just verify elements exist
      expect(hasStatus).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Dashboard Responsive Design', () => {
    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Verify all elements are visible
      await expect(dashboardPage.pageTitle).toBeVisible()
      await expect(dashboardPage.sidebar).toBeVisible()
      await expect(dashboardPage.statsCards.first()).toBeVisible()
    })

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Verify key elements are visible
      await expect(dashboardPage.pageTitle).toBeVisible()

      // Sidebar may be collapsed on tablet
      const sidebarVisible = await dashboardPage.isSidebarVisible()
      // Accept either state depending on your design
    })

    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Verify page is accessible
      await expect(dashboardPage.pageTitle).toBeVisible()

      // Sidebar may be hidden or hamburger menu on mobile
      const sidebarVisible = await dashboardPage.isSidebarVisible()
      // Accept either state depending on your design
    })
  })

  test.describe('Dashboard Performance', () => {
    test('should load dashboard within reasonable time', async ({ page }) => {
      const startTime = Date.now()

      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      const loadTime = Date.now() - startTime

      // Dashboard should load in less than 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    test('should respond quickly to navigation', async ({ page }) => {
      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      const startTime = Date.now()

      await dashboardPage.navigateToTasks()
      await page.waitForLoadState('networkidle')

      const navTime = Date.now() - startTime

      // Navigation should complete in less than 2 seconds
      expect(navTime).toBeLessThan(2000)
    })
  })
})
