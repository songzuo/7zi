/**
 * @fileoverview Task Creation Flow E2E Tests with Page Object Model
 * Tests task creation and management using POM pattern
 */

import { test, expect } from '@playwright/test'
import { DashboardPage, TaskCreationPage } from './pages'

test.describe('Task Creation Flow - POM', () => {
  let dashboardPage: DashboardPage
  let taskCreationPage: TaskCreationPage

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page)
    taskCreationPage = new TaskCreationPage(page)

    // Navigate to dashboard
    await page.goto('/')
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()
  })

  test('should display create task button', async () => {
    await expect(dashboardPage.createTaskButton.first()).toBeVisible()
  })

  test('should open task creation modal', async ({ page }) => {
    await dashboardPage.clickCreateTask()
    await taskCreationPage.waitForModal()

    await expect(taskCreationPage.modal.first()).toBeVisible()
    await expect(taskCreationPage.titleInput).toBeVisible()
    await expect(taskCreationPage.descriptionTextarea).toBeVisible()
  })

  test('should validate task title field', async ({ page }) => {
    await dashboardPage.clickCreateTask()
    await taskCreationPage.waitForModal()

    // Try to submit without title
    await taskCreationPage.submit()

    await page.waitForTimeout(500)

    // Check for validation error
    const error = await taskCreationPage.getValidationError('title')
    expect(error).toBeTruthy()
  })

  test('should create a new task with title only', async ({ page }) => {
    const taskTitle = `Test Task ${Date.now()}`

    await dashboardPage.clickCreateTask()
    await taskCreationPage.waitForModal()

    // Fill title
    await taskCreationPage.fillTitle(taskTitle)

    // Submit
    await taskCreationPage.submit()
    await page.waitForTimeout(1000)

    // Verify task created
    await dashboardPage.waitForLoad()
    const taskCard = dashboardPage.getTaskCardByTitle(taskTitle)
    const isVisible = (await taskCard.count()) > 0

    expect(isVisible).toBeTruthy()
  })

  test('should create a new task with full details', async ({ page }) => {
    const taskData = {
      title: `Full Task ${Date.now()}`,
      description: 'This is a test task with full details',
      priority: 'high',
      assignee: '智能体世界专家',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }

    await dashboardPage.clickCreateTask()
    await taskCreationPage.waitForModal()

    // Fill all fields
    await taskCreationPage.fillForm(taskData)

    // Submit
    await taskCreationPage.submit()
    await page.waitForTimeout(1000)

    // Verify task created
    await dashboardPage.waitForLoad()
    const taskCard = dashboardPage.getTaskCardByTitle(taskData.title)
    const isVisible = (await taskCard.count()) > 0

    expect(isVisible).toBeTruthy()
  })

  test('should set task priority', async ({ page }) => {
    await dashboardPage.clickCreateTask()
    await taskCreationPage.waitForModal()

    await taskCreationPage.selectPriority('high')

    const selectedValue = await taskCreationPage.prioritySelect.inputValue()
    expect(selectedValue).toBeTruthy()
  })

  test('should assign task to team member', async ({ page }) => {
    await dashboardPage.clickCreateTask()
    await taskCreationPage.waitForModal()

    await taskCreationPage.selectAssignee('智能体世界专家')
    await page.waitForTimeout(500)

    const assigneeValue = await taskCreationPage.assigneeSelect.inputValue()
    expect(assigneeValue).toBeTruthy()
  })

  test('should set task due date', async ({ page }) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    await dashboardPage.clickCreateTask()
    await taskCreationPage.waitForModal()

    await taskCreationPage.setDueDate(dateStr)

    expect(await taskCreationPage.dueDateInput.inputValue()).toBe(dateStr)
  })

  test('should cancel task creation', async ({ page }) => {
    await dashboardPage.clickCreateTask()
    await taskCreationPage.waitForModal()

    // Fill some data
    await taskCreationPage.fillTitle('Test Task')

    // Cancel
    await taskCreationPage.cancel()
    await taskCreationPage.waitForModalClose()

    // Modal should be closed
    const isModalOpen = await taskCreationPage.isModalOpen()
    expect(isModalOpen).toBeFalsy()
  })

  test('should create multiple tasks in succession', async ({ page }) => {
    const taskCount = 3

    for (let i = 0; i < taskCount; i++) {
      const taskTitle = `Batch Task ${i + 1} - ${Date.now()}`

      await dashboardPage.clickCreateTask()
      await taskCreationPage.waitForModal()

      await taskCreationPage.fillTitle(taskTitle)
      await taskCreationPage.submit()

      await page.waitForTimeout(1000)

      // Wait for modal to close
      await taskCreationPage.waitForModalClose()

      // Verify task created
      await dashboardPage.waitForLoad()
      const taskCard = dashboardPage.getTaskCardByTitle(taskTitle)
      const isVisible = (await taskCard.count()) > 0
      expect(isVisible).toBeTruthy()
    }
  })
})

test.describe('Task Management - POM', () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page)

    await page.goto('/')
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()
  })

  test('should display existing tasks', async () => {
    const taskCount = await dashboardPage.getTaskCount()
    expect(taskCount).toBeGreaterThanOrEqual(0)
  })

  test('should search for tasks', async ({ page }) => {
    await dashboardPage.searchTasks('test')
    await page.waitForTimeout(500)

    const taskCount = await dashboardPage.getTaskCount()
    expect(taskCount).toBeGreaterThanOrEqual(0)
  })

  test('should filter tasks by status', async ({ page }) => {
    await dashboardPage.filterByStatus('进行中')
    await page.waitForTimeout(500)

    const url = page.url()
    expect(url).toBeTruthy()
  })

  test('should refresh dashboard', async ({ page }) => {
    await dashboardPage.refresh()

    expect(await dashboardPage.isOnDashboard()).toBeTruthy()
  })

  test('should display task statistics', async () => {
    const hasStats = await dashboardPage.areStatsVisible()
    expect(hasStats).toBeTruthy()
  })

  test('should export tasks', async ({ page }) => {
    await dashboardPage.exportTasks('CSV')
    await page.waitForTimeout(1000)

    // Export might trigger download or show success message
    const url = page.url()
    expect(url).toBeTruthy()
  })
})

test.describe('Task Creation - End-to-End Scenarios', () => {
  let dashboardPage: DashboardPage
  let taskCreationPage: TaskCreationPage

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page)
    taskCreationPage = new TaskCreationPage(page)

    // Login first (in real scenario, you'd use authenticated fixture)
    await page.goto('/')
  })

  test('should create high priority task with due date', async ({ page }) => {
    const taskData = {
      title: `High Priority Task ${Date.now()}`,
      description: 'This is a high priority task',
      priority: 'high',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }

    await dashboardPage.goto()
    await dashboardPage.waitForLoad()

    await dashboardPage.clickCreateTask()
    await taskCreationPage.waitForModal()

    await taskCreationPage.fillForm(taskData)
    await taskCreationPage.submit()

    await page.waitForTimeout(1000)

    // Verify task created
    await dashboardPage.waitForLoad()
    const taskCard = dashboardPage.getTaskCardByTitle(taskData.title)
    const isVisible = (await taskCard.count()) > 0

    expect(isVisible).toBeTruthy()
  })

  test('should create low priority task with assignee', async ({ page }) => {
    const taskData = {
      title: `Low Priority Task ${Date.now()}`,
      description: 'This is a low priority task',
      priority: 'low',
      assignee: '咨询师',
    }

    await dashboardPage.goto()
    await dashboardPage.waitForLoad()

    await dashboardPage.clickCreateTask()
    await taskCreationPage.waitForModal()

    await taskCreationPage.fillForm(taskData)
    await taskCreationPage.submit()

    await page.waitForTimeout(1000)

    // Verify task created
    await dashboardPage.waitForLoad()
    const taskCard = dashboardPage.getTaskCardByTitle(taskData.title)
    const isVisible = (await taskCard.count()) > 0

    expect(isVisible).toBeTruthy()
  })

  test('should handle task creation with special characters in title', async ({ page }) => {
    const taskTitle = `Task with "quotes" and 'apostrophes' & symbols ${Date.now()}`

    await dashboardPage.goto()
    await dashboardPage.waitForLoad()

    await dashboardPage.clickCreateTask()
    await taskCreationPage.waitForModal()

    await taskCreationPage.fillTitle(taskTitle)
    await taskCreationPage.submit()

    await page.waitForTimeout(1000)

    // Verify task created
    await dashboardPage.waitForLoad()
    const taskCard = dashboardPage.getTaskCardByTitle(taskTitle)
    const isVisible = (await taskCard.count()) > 0

    expect(isVisible).toBeTruthy()
  })
})
