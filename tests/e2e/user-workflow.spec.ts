/**
 * @fileoverview E2E Test - Complete User Workflow
 * Tests the complete user journey from registration to task management
 */

import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth-page'
import { DashboardPage } from '../pages/dashboard-page'
import { TasksPage } from '../pages/tasks-page'
import { testUsers, successMessages } from '../fixtures/test-data'
import {
  waitForPageLoad,
  clearLocalStorage,
  generateRandomEmail,
  generateRandomTitle,
} from '../helpers/test-helpers'

test.describe('Complete User Workflow', () => {
  test('should complete full user journey: register -> login -> dashboard -> create task', async ({
    page,
  }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)
    const tasksPage = new TasksPage(page)

    // Clear storage
    await clearLocalStorage(page)

    // ===== Step 1: User Registration =====
    console.log('Step 1: User Registration')

    const newUser = {
      name: `Workflow Test User ${Date.now()}`,
      email: generateRandomEmail(),
      password: 'workflow123',
    }

    await authPage.gotoRegistration()
    await authPage.register(newUser.name, newUser.email, newUser.password)
    await waitForPageLoad(page)

    // Verify registration success
    const registerSuccess = await authPage.getSuccessMessage()
    expect(registerSuccess).toBeTruthy()

    console.log(`✓ User registered: ${newUser.email}`)

    // ===== Step 2: User Login =====
    console.log('Step 2: User Login')

    await authPage.gotoLogin()
    await authPage.login(newUser.email, newUser.password)
    await waitForPageLoad(page)

    // Verify login success and redirection
    expect(page.url()).toContain('/dashboard')
    const loginSuccess = await authPage.getSuccessMessage()
    expect(loginSuccess).toBeTruthy()

    console.log('✓ User logged in successfully')

    // ===== Step 3: Explore Dashboard =====
    console.log('Step 3: Explore Dashboard')

    await dashboardPage.goto()
    await dashboardPage.waitForLoad()

    // Verify dashboard elements
    const welcomeMsg = await dashboardPage.getWelcomeMessage()
    expect(welcomeMsg).toBeTruthy()
    expect(welcomeMsg).toMatch(/欢迎|Welcome/i)

    const userName = await dashboardPage.getUserName()
    expect(userName).toContain(newUser.name)

    // Check statistics
    const statsCount = await dashboardPage.getStatsCardsCount()
    expect(statsCount).toBeGreaterThan(0)

    console.log('✓ Dashboard loaded successfully')
    console.log(`  - Welcome message: ${welcomeMsg}`)
    console.log(`  - User name: ${userName}`)
    console.log(`  - Stats cards: ${statsCount}`)

    // Take screenshot
    await dashboardPage.takeScreenshot('workflow-dashboard')

    // ===== Step 4: Navigate to Tasks =====
    console.log('Step 4: Navigate to Tasks')

    await dashboardPage.navigateToTasks()
    await waitForPageLoad(page)

    expect(page.url()).toContain('/tasks')
    expect(await tasksPage.isOnTasksPage()).toBeTruthy()

    console.log('✓ Navigated to tasks page')

    // ===== Step 5: Create First Task =====
    console.log('Step 5: Create First Task')

    const firstTaskTitle = generateRandomTitle()
    const firstTask = {
      title: firstTaskTitle,
      description: 'This is the first task created in the workflow',
      priority: 'high' as const,
      assignee: newUser.name,
      dueDate: '2024-12-31',
    }

    await tasksPage.createTask(firstTask)
    await waitForPageLoad(page)

    // Verify task creation
    expect(await tasksPage.taskExists(firstTaskTitle)).toBeTruthy()
    const createSuccess = await tasksPage.getSuccessMessage()
    expect(createSuccess).toBeTruthy()

    console.log(`✓ Task created: ${firstTaskTitle}`)

    // Take screenshot
    await tasksPage.takeScreenshot('workflow-first-task')

    // ===== Step 6: Create Multiple Tasks =====
    console.log('Step 6: Create Multiple Tasks')

    const taskTitles = []

    for (let i = 1; i <= 3; i++) {
      const taskTitle = `Task ${i} - ${generateRandomTitle()}`
      taskTitles.push(taskTitle)

      await tasksPage.createTask({
        title: taskTitle,
        description: `This is task number ${i}`,
        priority: i === 3 ? 'high' : ('medium' as const),
        assignee: newUser.name,
      })

      await waitForPageLoad(page)
      console.log(`  ✓ Created: ${taskTitle}`)
    }

    console.log(`✓ Created ${taskTitles.length} additional tasks`)

    // ===== Step 7: Search for Tasks =====
    console.log('Step 7: Search for Tasks')

    await tasksPage.searchTask('Task 1')
    await page.waitForLoadState('networkidle')

    // Verify search results
    expect(await tasksPage.taskExists(taskTitles[0])).toBeTruthy()

    console.log('✓ Search functionality works')

    // Clear search
    await tasksPage.searchInput.fill('')
    await page.keyboard.press('Enter')
    await page.waitForLoadState('networkidle')

    // ===== Step 8: Edit a Task =====
    console.log('Step 8: Edit a Task')

    const updatedTitle = `${firstTaskTitle} (Updated)`

    await tasksPage.editTask(firstTaskTitle, {
      title: updatedTitle,
      description: 'This task has been updated',
      priority: 'medium',
    })
    await waitForPageLoad(page)

    // Verify task is updated
    expect(await tasksPage.taskExists(updatedTitle)).toBeTruthy()
    expect(await tasksPage.taskExists(firstTaskTitle)).toBeFalsy()

    console.log(`✓ Task updated: ${firstTaskTitle} -> ${updatedTitle}`)

    // ===== Step 9: Complete a Task =====
    console.log('Step 9: Complete a Task')

    await tasksPage.completeTask(updatedTitle)
    await waitForPageLoad(page)

    // Verify completion
    const completeSuccess = await tasksPage.getSuccessMessage()
    expect(completeSuccess).toBeTruthy()

    console.log(`✓ Task completed: ${updatedTitle}`)

    // ===== Step 10: Navigate Back to Dashboard =====
    console.log('Step 10: Navigate Back to Dashboard')

    await dashboardPage.homeLink.click()
    await waitForPageLoad(page)

    expect(await dashboardPage.isOnDashboard()).toBeTruthy()

    // Verify updated stats on dashboard
    await dashboardPage.refresh()

    console.log('✓ Returned to dashboard')

    // ===== Step 11: Check Analytics =====
    console.log('Step 11: Check Analytics')

    await dashboardPage.navigateToAnalytics()
    await waitForPageLoad(page)

    expect(page.url()).toContain('/analytics')

    console.log('✓ Analytics page accessed')

    // ===== Step 12: Check Settings =====
    console.log('Step 12: Check Settings')

    await dashboardPage.navigateToSettings()
    await waitForPageState(page, 'networkidle')

    expect(page.url()).toContain('/settings')

    console.log('✓ Settings page accessed')

    // ===== Step 13: Logout =====
    console.log('Step 13: Logout')

    await authPage.logout()
    await waitForPageLoad(page)

    // Verify logout
    expect(page.url()).toContain('/login') || expect(page.url()).toContain('/')

    const cookies = await page.context().cookies()
    const authCookies = cookies.filter(c => c.name.includes('token') || c.name.includes('session'))
    expect(authCookies.length).toBe(0)

    console.log('✓ User logged out')

    // ===== Step 14: Try to Access Protected Route =====
    console.log('Step 14: Try to Access Protected Route')

    await page.goto('/dashboard')

    // Should redirect to login
    expect(await authPage.isOnLoginPage()).toBeTruthy()

    console.log('✓ Protected route access denied (as expected)')

    // ===== Final Summary =====
    console.log('\n=== Workflow Complete ===')
    console.log(`User: ${newUser.email}`)
    console.log(`Tasks Created: ${taskTitles.length + 1}`)
    console.log(`Total Steps Completed: 14`)
    console.log('========================\n')

    // Take final screenshot
    await page.screenshot({
      path: 'tests/e2e/test-results/screenshots/workflow-final.png',
      fullPage: true,
    })
  })

  test('should handle quick task creation from dashboard', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)
    const tasksPage = new TasksPage(page)

    // Login
    await authPage.gotoLogin()
    await authPage.login(testUsers.regular.email, testUsers.regular.password)
    await waitForPageLoad(page)

    // Go to dashboard
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()

    // Create task from dashboard
    await dashboardPage.clickNewTask()

    expect(page.url()).toContain('/tasks/new') || expect(page.url()).toContain('/tasks/create')

    // Create task
    const taskTitle = generateRandomTitle()
    await tasksPage.createTask({
      title: taskTitle,
      description: 'Quick task from dashboard',
      priority: 'high',
    })
    await waitForPageLoad(page)

    // Verify task created
    expect(await tasksPage.taskExists(taskTitle)).toBeTruthy()

    console.log('✓ Quick task creation from dashboard successful')
  })

  test('should navigate through all main pages', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login
    await authPage.gotoLogin()
    await authPage.login(testUsers.regular.email, testUsers.regular.password)
    await waitForPageLoad(page)

    // Navigate to each main page
    const pages = [
      { name: 'Dashboard', action: () => dashboardPage.goto(), url: '/dashboard' },
      { name: 'Tasks', action: () => dashboardPage.navigateToTasks(), url: '/tasks' },
      { name: 'Team', action: () => dashboardPage.navigateToTeam(), url: '/team' },
      { name: 'Analytics', action: () => dashboardPage.navigateToAnalytics(), url: '/analytics' },
      { name: 'Settings', action: () => dashboardPage.navigateToSettings(), url: '/settings' },
    ]

    for (const pageData of pages) {
      await pageData.action()
      await waitForPageLoad(page)

      expect(page.url()).toContain(pageData.url)
      console.log(`✓ Navigated to ${pageData.name}`)
    }

    console.log('✓ All main pages accessible')
  })

  test('should handle session persistence', async ({ page, context }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login
    await authPage.gotoLogin()
    await authPage.login(testUsers.regular.email, testUsers.regular.password)
    await waitForPageLoad(page)

    // Verify logged in
    expect(await dashboardPage.isOnDashboard()).toBeTruthy()

    // Store cookies before reload
    const cookiesBefore = await context.cookies()

    // Reload page
    await page.reload()
    await waitForPageLoad(page)

    // Verify still logged in
    expect(await dashboardPage.isOnDashboard()).toBeTruthy()

    // Store cookies after reload
    const cookiesAfter = await context.cookies()

    // Cookies should persist
    expect(cookiesAfter.length).toBeGreaterThanOrEqual(cookiesBefore.length)

    console.log('✓ Session persists after page reload')
  })

  test('should handle error scenarios gracefully', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)
    const tasksPage = new TasksPage(page)

    // Try to access protected route without login
    await page.goto('/dashboard')
    expect(await authPage.isOnLoginPage()).toBeTruthy()
    console.log('✓ Protected route redirects to login')

    // Login with invalid credentials
    await authPage.login('invalid@example.com', 'wrongpassword')
    const errorMsg = await authPage.getErrorMessage()
    expect(errorMsg).toBeTruthy()
    console.log('✓ Invalid login shows error')

    // Login with valid credentials
    await authPage.login(testUsers.regular.email, testUsers.regular.password)
    await waitForPageLoad(page)

    // Try to create task with invalid data
    await dashboardPage.navigateToTasks()
    await tasksPage.waitForLoad()

    await tasksPage.clickNewTask()
    await tasksPage.submitTaskButton.click() // Submit without filling

    const taskError = await tasksPage.getErrorMessage()
    expect(taskError).toBeTruthy()
    console.log('✓ Invalid task data shows error')

    console.log('✓ Error scenarios handled gracefully')
  })

  test('should verify responsive design across viewports', async ({ page }) => {
    const authPage = new AuthPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login
    await authPage.gotoLogin()
    await authPage.login(testUsers.regular.email, testUsers.regular.password)
    await waitForPageLoad(page)

    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Laptop', width: 1366, height: 768 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      await dashboardPage.goto()
      await dashboardPage.waitForLoad()

      // Verify key elements are visible
      await expect(dashboardPage.pageTitle).toBeVisible()
      await expect(dashboardPage.statsCards.first()).toBeVisible()

      console.log(
        `✓ ${viewport.name} (${viewport.width}x${viewport.height}): Dashboard renders correctly`
      )

      await page.screenshot({
        path: `tests/e2e/test-results/screenshots/responsive-${viewport.name.toLowerCase()}.png`,
        fullPage: true,
      })
    }

    console.log('✓ Responsive design verified across all viewports')
  })
})

/**
 * Helper function to wait for specific page state
 */
async function waitForPageState(
  page: Page,
  state: 'load' | 'domcontentloaded' | 'networkidle',
  timeout: number = 30000
): Promise<void> {
  await page.waitForLoadState(state, { timeout })
}
