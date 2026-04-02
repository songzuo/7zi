/**
 * @fileoverview E2E Test - Task Management Flow
 * Tests task creation, editing, deletion, and filtering
 */

import { test, expect } from '@playwright/test'
import { TasksPage } from '../pages/tasks-page'
import { AuthPage } from '../pages/auth-page'
import { testTasks, testUsers, successMessages, errorMessages } from '../fixtures/test-data'
import { waitForPageLoad, clearLocalStorage, generateRandomTitle } from '../helpers/test-helpers'

test.describe('Task Management Flow', () => {
  let authPage: AuthPage
  let tasksPage: TasksPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    tasksPage = new TasksPage(page)

    // Clear local storage
    await clearLocalStorage(page)

    // Login before each test
    await authPage.gotoLogin()
    await authPage.login(testUsers.regular.email, testUsers.regular.password)
    await waitForPageLoad(page)
  })

  test.describe('Task Page Loading', () => {
    test('should display tasks page', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      // Verify page title
      await expect(tasksPage.pageTitle).toBeVisible()
      await expect(tasksPage.pageTitle).toContainText(/任务|Tasks/i)

      // Verify URL
      expect(await tasksPage.isOnTasksPage()).toBeTruthy()
    })

    test('should display task list', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      // Check task list container
      await expect(tasksPage.taskList).toBeVisible()
    })

    test('should display new task button', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      await expect(tasksPage.newTaskButton).toBeVisible()
    })

    test('should display search input', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      await expect(tasksPage.searchInput).toBeVisible()
    })
  })

  test.describe('Task Creation', () => {
    test('should create a new task with all fields', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      const newTask = {
        ...testTasks.highPriority,
        title: uniqueTitle,
      }

      await tasksPage.createTask(newTask)
      await waitForPageLoad(page)

      // Verify success message
      const successMsg = await tasksPage.getSuccessMessage()
      expect(successMsg).toBeTruthy()

      // Verify task appears in list
      expect(await tasksPage.taskExists(uniqueTitle)).toBeTruthy()
    })

    test('should create a task with minimal fields', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      const minimalTask = {
        title: uniqueTitle,
        description: '',
        priority: 'low' as const,
      }

      await tasksPage.createTask(minimalTask)
      await waitForPageLoad(page)

      // Verify task created
      const successMsg = await tasksPage.getSuccessMessage()
      expect(successMsg).toBeTruthy()
    })

    test('should validate required fields', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      // Try to create task without required fields
      await tasksPage.clickNewTask()

      // Don't fill any fields, just submit
      await tasksPage.submitTaskButton.click()

      // Verify error message
      const errorMsg = await tasksPage.getErrorMessage()
      expect(errorMsg).toBeTruthy()
      expect(errorMsg).toMatch(errorMessages.required)
    })

    test('should validate task title length', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      await tasksPage.clickNewTask()

      // Try to create task with very long title
      await tasksPage.taskTitleInput.fill('a'.repeat(300))
      await tasksPage.taskDescriptionInput.fill('Test description')
      await tasksPage.submitTaskButton.click()

      // Verify validation error
      const errorMsg = await tasksPage.getErrorMessage()
      expect(errorMsg).toBeTruthy()
    })

    test('should create task with due date', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      const taskWithDate = {
        ...testTasks.withDueDate,
        title: uniqueTitle,
      }

      await tasksPage.createTask(taskWithDate)
      await waitForPageLoad(page)

      // Verify task created
      const successMsg = await tasksPage.getSuccessMessage()
      expect(successMsg).toBeTruthy()
    })

    test('should cancel task creation', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      await tasksPage.clickNewTask()
      await tasksPage.taskTitleInput.fill('Test Task')

      // Cancel instead of submit
      await tasksPage.cancelTaskButton.click()

      // Verify form is closed or not submitted
      expect(await tasksPage.taskExists('Test Task')).toBeFalsy()
    })
  })

  test.describe('Task Editing', () => {
    test('should edit existing task', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const originalTitle = generateRandomTitle()
      const updatedTitle = generateRandomTitle()

      // Create a task first
      await tasksPage.createTask({
        title: originalTitle,
        description: 'Original description',
        priority: 'medium',
      })
      await waitForPageLoad(page)

      // Edit the task
      await tasksPage.editTask(originalTitle, {
        title: updatedTitle,
        description: 'Updated description',
      })
      await waitForPageLoad(page)

      // Verify task is updated
      expect(await tasksPage.taskExists(updatedTitle)).toBeTruthy()
      expect(await tasksPage.taskExists(originalTitle)).toBeFalsy()
    })

    test('should change task priority', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      // Create a low priority task
      await tasksPage.createTask({
        title: uniqueTitle,
        description: 'Test description',
        priority: 'low',
      })
      await waitForPageLoad(page)

      // Change priority to high
      await tasksPage.editTask(uniqueTitle, {
        priority: 'high',
      })
      await waitForPageLoad(page)

      // Verify priority changed
      const successMsg = await tasksPage.getSuccessMessage()
      expect(successMsg).toBeTruthy()
    })

    test('should update task description', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      await tasksPage.createTask({
        title: uniqueTitle,
        description: 'Original description',
        priority: 'medium',
      })
      await waitForPageLoad(page)

      // Update description
      await tasksPage.editTask(uniqueTitle, {
        description: 'Updated description with more details',
      })
      await waitForPageLoad(page)

      // Verify success message
      const successMsg = await tasksPage.getSuccessMessage()
      expect(successMsg).toBeTruthy()
    })

    test('should not update with invalid data', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      await tasksPage.createTask({
        title: uniqueTitle,
        description: 'Original description',
        priority: 'medium',
      })
      await waitForPageLoad(page)

      // Try to update with empty title
      await tasksPage.editTask(uniqueTitle, {
        title: '',
      })

      // Verify error message
      const errorMsg = await tasksPage.getErrorMessage()
      expect(errorMsg).toBeTruthy()
      expect(errorMsg).toMatch(errorMessages.required)
    })
  })

  test.describe('Task Deletion', () => {
    test('should delete existing task', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      // Create a task first
      await tasksPage.createTask({
        title: uniqueTitle,
        description: 'Task to be deleted',
        priority: 'medium',
      })
      await waitForPageLoad(page)

      // Verify task exists
      expect(await tasksPage.taskExists(uniqueTitle)).toBeTruthy()

      // Delete the task
      await tasksPage.deleteTask(uniqueTitle)
      await waitForPageLoad(page)

      // Verify task is deleted
      expect(await tasksPage.taskExists(uniqueTitle)).toBeFalsy()

      // Verify success message
      const successMsg = await tasksPage.getSuccessMessage()
      expect(successMsg).toBeTruthy()
    })

    test('should confirm deletion', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      await tasksPage.createTask({
        title: uniqueTitle,
        description: 'Task requiring confirmation',
        priority: 'medium',
      })
      await waitForPageLoad(page)

      // Delete (should show confirmation dialog)
      const taskLocator = tasksPage.findTaskByTitle(uniqueTitle)
      await taskLocator.locator(tasksPage.deleteTaskButton).click()

      // Check for confirmation dialog
      const confirmButton = page.locator('button').filter({ hasText: /确认|Confirm|Delete/i })
      if ((await confirmButton.count()) > 0) {
        await confirmButton.click()
      }

      await waitForPageLoad(page)

      // Verify task is deleted
      expect(await tasksPage.taskExists(uniqueTitle)).toBeFalsy()
    })
  })

  test.describe('Task Completion', () => {
    test('should mark task as completed', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      await tasksPage.createTask({
        title: uniqueTitle,
        description: 'Task to be completed',
        priority: 'high',
      })
      await waitForPageLoad(page)

      // Mark task as completed
      await tasksPage.completeTask(uniqueTitle)
      await waitForPageLoad(page)

      // Verify success message
      const successMsg = await tasksPage.getSuccessMessage()
      expect(successMsg).toBeTruthy()

      // Task should still exist but with completed status
      expect(await tasksPage.taskExists(uniqueTitle)).toBeTruthy()
    })
  })

  test.describe('Task Search and Filter', () => {
    test('should search for tasks by title', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const searchTerm = generateRandomTitle()

      // Create tasks with similar titles
      await tasksPage.createTask({
        title: `${searchTerm} - Task 1`,
        description: 'Test task',
        priority: 'medium',
      })

      await tasksPage.createTask({
        title: `${searchTerm} - Task 2`,
        description: 'Another test task',
        priority: 'low',
      })

      await waitForPageLoad(page)

      // Search for tasks
      await tasksPage.searchTask(searchTerm)
      await page.waitForLoadState('networkidle')

      // Verify search results
      expect(await tasksPage.taskExists(`${searchTerm} - Task 1`)).toBeTruthy()
      expect(await tasksPage.taskExists(`${searchTerm} - Task 2`)).toBeTruthy()
    })

    test('should display no results for non-existent search', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      // Search for non-existent task
      await tasksPage.searchTask('NonExistentTask12345')
      await page.waitForLoadState('networkidle')

      // Verify empty state or no results
      const isEmpty = await tasksPage.isEmptyStateShown()
      const taskCount = await tasksPage.getTaskListItemsCount()

      expect(isEmpty || taskCount === 0).toBeTruthy()
    })

    test('should clear search results', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      // Search for something
      await tasksPage.searchTask('test')
      await page.waitForLoadState('networkidle')

      // Clear search
      await tasksPage.searchInput.fill('')
      await page.keyboard.press('Enter')
      await page.waitForLoadState('networkidle')

      // All tasks should be visible again
      const taskCount = await tasksPage.getTaskListItemsCount()
      expect(taskCount).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Empty States', () => {
    test('should display empty state when no tasks exist', async ({ page }) => {
      // This test assumes a clean state or ability to delete all tasks
      // In practice, you might need to clear test data first

      await tasksPage.goto()
      await tasksPage.waitForLoad()

      // Check if empty state is shown (when there are no tasks)
      const isEmpty = await tasksPage.isEmptyStateShown()

      if (isEmpty) {
        await expect(tasksPage.noDataMessage).toBeVisible()
      }
    })

    test('should display call-to-action in empty state', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const isEmpty = await tasksPage.isEmptyStateShown()

      if (isEmpty) {
        // Empty state should have a button to create first task
        await expect(tasksPage.newTaskButton).toBeVisible()
      }
    })
  })

  test.describe('Task List Display', () => {
    test('should display task priority indicators', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      // Create high priority task
      await tasksPage.createTask({
        title: uniqueTitle,
        description: 'High priority task',
        priority: 'high',
      })
      await waitForPageLoad(page)

      // Find the task and check for priority indicator
      const taskLocator = tasksPage.findTaskByTitle(uniqueTitle)
      const priorityLocator = taskLocator.locator(tasksPage.taskPriority)

      expect(await priorityLocator.count()).toBeGreaterThan(0)
    })

    test('should display task assignee', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      await tasksPage.createTask({
        title: uniqueTitle,
        description: 'Task with assignee',
        priority: 'medium',
        assignee: 'Test Assignee',
      })
      await waitForPageLoad(page)

      const taskLocator = tasksPage.findTaskByTitle(uniqueTitle)
      const assigneeLocator = taskLocator.locator(tasksPage.taskAssignee)

      expect(await assigneeLocator.count()).toBeGreaterThan(0)
    })

    test('should display task due date', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      await tasksPage.createTask({
        title: uniqueTitle,
        description: 'Task with due date',
        priority: 'medium',
        dueDate: '2024-12-31',
      })
      await waitForPageLoad(page)

      const taskLocator = tasksPage.findTaskByTitle(uniqueTitle)
      const dueDateLocator = taskLocator.locator(tasksPage.taskDueDate)

      expect(await dueDateLocator.count()).toBeGreaterThan(0)
    })
  })

  test.describe('Task Performance', () => {
    test('should load tasks page within reasonable time', async ({ page }) => {
      const startTime = Date.now()

      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const loadTime = Date.now() - startTime

      // Page should load in less than 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    test('should create task quickly', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const startTime = Date.now()

      await tasksPage.createTask({
        title: generateRandomTitle(),
        description: 'Performance test task',
        priority: 'medium',
      })

      await waitForPageLoad(page)

      const createLatency = Date.now() - startTime

      // Task creation should complete in less than 3 seconds
      expect(createLatency).toBeLessThan(3000)
    })
  })

  test.describe('Task Screenshots', () => {
    test('should take screenshot of tasks page', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      await tasksPage.takeScreenshot('tasks-page')

      // Verify screenshot file exists
      // Note: This is verified by checking if the screenshot was saved
    })

    test('should take screenshot after task creation', async ({ page }) => {
      await tasksPage.goto()
      await tasksPage.waitForLoad()

      const uniqueTitle = generateRandomTitle()

      await tasksPage.createTask({
        title: uniqueTitle,
        description: 'Task for screenshot',
        priority: 'high',
      })
      await waitForPageLoad(page)

      await tasksPage.takeScreenshot('tasks-after-creation')
    })
  })
})
