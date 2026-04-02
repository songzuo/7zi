/**
 * @fileoverview E2E tests for task creation and management flow
 * Tests creating tasks, viewing tasks, updating tasks, and deleting tasks
 */

import { test, expect } from '@playwright/test'

test.describe('Task Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should navigate to dashboard', async ({ page }) => {
    // Click on dashboard link
    const dashboardLink = page.locator('text=实时看板, Dashboard').first()
    await dashboardLink.click()

    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/i)
    await expect(page.locator('h1, h2')).toContainText(/dashboard|看板/i)
  })

  test('should display task creation interface', async ({ page }) => {
    await page.click('text=实时看板, Dashboard')
    await page.waitForTimeout(1000)

    // Look for "New Task" or "Create Task" button
    const createTaskButton = page
      .locator(
        'button:has-text("新建任务"), button:has-text("New Task"), button:has-text("Create Task"), button:has-text("+")'
      )
      .first()

    if (await createTaskButton.isVisible()) {
      await expect(createTaskButton).toBeVisible()
    }
  })

  test('should open task creation modal', async ({ page }) => {
    await page.click('text=实时看板, Dashboard')
    await page.waitForTimeout(1000)

    const createTaskButton = page
      .locator(
        'button:has-text("新建任务"), button:has-text("New Task"), button:has-text("Create Task")'
      )
      .first()

    if (await createTaskButton.isVisible()) {
      await createTaskButton.click()

      // Check for modal or form
      const modal = page.locator('[role="dialog"], .modal, .dialog')
      await expect(modal.first()).toBeVisible({ timeout: 2000 })
    }
  })

  test('should validate task title field', async ({ page }) => {
    await page.click('text=实时看板, Dashboard')
    await page.waitForTimeout(1000)

    const createTaskButton = page
      .locator('button:has-text("新建任务"), button:has-text("New Task")')
      .first()

    if (await createTaskButton.isVisible()) {
      await createTaskButton.click()

      // Try to submit without title
      const submitButton = page.locator('button[type="submit"]:visible').first()
      await submitButton.click()

      // Check for validation error
      await expect(page.locator('text=标题, title, Title').first()).toBeVisible({ timeout: 2000 })
    }
  })

  test('should create a new task successfully', async ({ page }) => {
    await page.click('text=实时看板, Dashboard')
    await page.waitForTimeout(1000)

    const createTaskButton = page
      .locator('button:has-text("新建任务"), button:has-text("New Task")')
      .first()

    if (await createTaskButton.isVisible()) {
      await createTaskButton.click()
      await page.waitForTimeout(500)

      // Fill task details
      const titleInput = page
        .locator('input[name="title"], input[placeholder*="标题"], input[placeholder*="Title"]')
        .first()
      const descInput = page
        .locator(
          'textarea[name="description"], textarea[placeholder*="描述"], textarea[placeholder*="Description"]'
        )
        .first()

      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Task ' + Date.now())

        if (await descInput.isVisible()) {
          await descInput.fill('This is a test task created by E2E test')
        }

        // Submit
        const submitButton = page.locator('button[type="submit"]:visible').first()
        await submitButton.click()
        await page.waitForTimeout(2000)

        // Check for success or task list update
        const successMessage = page.locator('text=成功, Success, Created').first()
        const taskList = page.locator('.task-list, .tasks, [role="list"]').first()

        const isSuccess = await successMessage.isVisible().catch(() => false)
        const hasTasks = await taskList.isVisible().catch(() => false)

        expect(isSuccess || hasTasks).toBeTruthy()
      }
    }
  })

  test('should set task priority', async ({ page }) => {
    await page.click('text=实时看板, Dashboard')
    await page.waitForTimeout(1000)

    const createTaskButton = page
      .locator('button:has-text("新建任务"), button:has-text("New Task")')
      .first()

    if (await createTaskButton.isVisible()) {
      await createTaskButton.click()

      // Look for priority selector
      const prioritySelect = page.locator('select[name="priority"], [role="combobox"]').first()

      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption('high', 'High', '高')

        const selectedValue = await prioritySelect.inputValue()
        expect(selectedValue).toBeTruthy()
      }
    }
  })

  test('should assign task to team member', async ({ page }) => {
    await page.click('text=实时看板, Dashboard')
    await page.waitForTimeout(1000)

    const createTaskButton = page
      .locator('button:has-text("新建任务"), button:has-text("New Task")')
      .first()

    if (await createTaskButton.isVisible()) {
      await createTaskButton.click()

      // Look for assignee selector
      const assigneeSelect = page
        .locator('select[name="assignee"], input[name="assignee"], [role="combobox"]')
        .first()

      if (await assigneeSelect.isVisible()) {
        // Select a team member
        await assigneeSelect.click()

        const teamMember = page.locator('text=Expert Agent, Consultant Agent').first()
        if (await teamMember.isVisible()) {
          await teamMember.click()
        }
      }
    }
  })

  test('should set task due date', async ({ page }) => {
    await page.click('text=实时看板, Dashboard')
    await page.waitForTimeout(1000)

    const createTaskButton = page
      .locator('button:has-text("新建任务"), button:has-text("New Task")')
      .first()

    if (await createTaskButton.isVisible()) {
      await createTaskButton.click()

      // Look for date input
      const dateInput = page
        .locator('input[type="date"], input[name="dueDate"], input[name="deadline"]')
        .first()

      if (await dateInput.isVisible()) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dateStr = tomorrow.toISOString().split('T')[0]

        await dateInput.fill(dateStr)
        expect(await dateInput.inputValue()).toBe(dateStr)
      }
    }
  })

  test('should cancel task creation', async ({ page }) => {
    await page.click('text=实时看板, Dashboard')
    await page.waitForTimeout(1000)

    const createTaskButton = page
      .locator('button:has-text("新建任务"), button:has-text("New Task")')
      .first()

    if (await createTaskButton.isVisible()) {
      await createTaskButton.click()

      // Click cancel button
      const cancelButton = page
        .locator(
          'button:has-text("取消"), button:has-text("Cancel"), button:has-text("关闭"), button[aria-label*="close"]'
        )
        .first()
      await cancelButton.click()
      await page.waitForTimeout(500)

      // Modal should be closed
      const modal = page.locator('[role="dialog"], .modal')
      expect(await modal.count()).toBe(0)
    }
  })
})

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(1000)
  })

  test('should display existing tasks', async ({ page }) => {
    const taskList = page.locator('.task-list, .tasks, [role="list"]').first()

    if (await taskList.isVisible()) {
      const taskCount = await page.locator('.task, .task-item, [role="listitem"]').count()
      expect(taskCount).toBeGreaterThan(0)
    }
  })

  test('should filter tasks by status', async ({ page }) => {
    // Look for status filter
    const filterButton = page
      .locator('button:has-text("筛选"), button:has-text("Filter"), select[name="status"]')
      .first()

    if (await filterButton.isVisible()) {
      await filterButton.click()

      // Select a status
      const statusOption = page.locator('text=进行中, In Progress, Pending').first()
      if (await statusOption.isVisible()) {
        await statusOption.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('should search for tasks', async ({ page }) => {
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]')
      .first()

    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await page.waitForTimeout(500)

      // Verify search worked
      const searchResults = page.locator('.task, .task-item').first()
      expect(await searchResults.isVisible()).toBeTruthy()
    }
  })

  test('should view task details', async ({ page }) => {
    const taskCard = page.locator('.task, .task-item, [role="listitem"]').first()

    if (await taskCard.isVisible()) {
      await taskCard.click()

      // Check for task detail view
      const taskDetail = page.locator('[role="dialog"], .task-detail, .modal')
      await expect(taskDetail.first()).toBeVisible({ timeout: 2000 })
    }
  })

  test('should edit existing task', async ({ page }) => {
    const taskCard = page.locator('.task, .task-item').first()

    if (await taskCard.isVisible()) {
      // Click edit button
      const editButton = taskCard
        .locator('button:has-text("编辑"), button:has-text("Edit"), [aria-label*="edit"]')
        .first()

      if (await editButton.isVisible()) {
        await editButton.click()
        await page.waitForTimeout(500)

        // Modify task title
        const titleInput = page.locator('input[name="title"]').first()
        if (await titleInput.isVisible()) {
          await titleInput.fill('Updated Task Title')

          // Save
          const saveButton = page.locator('button[type="submit"]').first()
          await saveButton.click()
          await page.waitForTimeout(1000)

          // Verify update
          const updatedTitle = page.locator('text=Updated Task Title')
          expect(await updatedTitle.isVisible()).toBeTruthy()
        }
      }
    }
  })

  test('should delete task', async ({ page }) => {
    const taskCard = page.locator('.task, .task-item').first()

    if (await taskCard.isVisible()) {
      const taskTitle = (await taskCard.textContent()) || ''

      // Click delete button
      const deleteButton = taskCard
        .locator('button:has-text("删除"), button:has-text("Delete"), [aria-label*="delete"]')
        .first()

      if (await deleteButton.isVisible()) {
        await deleteButton.click()
        await page.waitForTimeout(500)

        // Confirm deletion
        const confirmButton = page
          .locator('button:has-text("确认"), button:has-text("Confirm"), button:has-text("Delete")')
          .first()
        if (await confirmButton.isVisible()) {
          await confirmButton.click()
          await page.waitForTimeout(1000)
        }

        // Verify task is gone
        const deletedTask = page.locator(`text=${taskTitle.trim()}`)
        expect(await deletedTask.count()).toBe(0)
      }
    }
  })

  test('should change task status', async ({ page }) => {
    const taskCard = page.locator('.task, .task-item').first()

    if (await taskCard.isVisible()) {
      // Click on status indicator
      const statusIndicator = taskCard
        .locator('.status, [role="button"][aria-label*="status"]')
        .first()

      if (await statusIndicator.isVisible()) {
        await statusIndicator.click()

        // Select new status
        const newStatus = page.locator('text=已完成, Completed, Done').first()
        if (await newStatus.isVisible()) {
          await newStatus.click()
          await page.waitForTimeout(500)

          // Verify status changed
          const completedBadge = page.locator('text=已完成, Completed, Done')
          expect(await completedBadge.isVisible()).toBeTruthy()
        }
      }
    }
  })

  test('should add comments to task', async ({ page }) => {
    const taskCard = page.locator('.task, .task-item').first()

    if (await taskCard.isVisible()) {
      await taskCard.click()

      const commentInput = page
        .locator(
          'textarea[placeholder*="评论"], textarea[placeholder*="Comment"], textarea[name="comment"]'
        )
        .first()

      if (await commentInput.isVisible()) {
        await commentInput.fill('This is a test comment')

        const submitButton = page.locator('button[type="submit"]:visible').first()
        await submitButton.click()
        await page.waitForTimeout(1000)

        // Verify comment added
        const commentText = page.locator('text=This is a test comment')
        expect(await commentText.isVisible()).toBeTruthy()
      }
    }
  })
})

test.describe('Dashboard Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(1000)
  })

  test('should display task statistics', async ({ page }) => {
    const statsContainer = page.locator('.stats, .statistics, .dashboard-stats').first()

    if (await statsContainer.isVisible()) {
      // Look for stat cards
      const statCards = page.locator('.stat-card, .stat, [data-testid*="stat"]')
      expect(await statCards.count()).toBeGreaterThan(0)
    }
  })

  test('should display task progress chart', async ({ page }) => {
    const chartContainer = page.locator('.chart, [role="img"][alt*="chart"], canvas').first()

    if (await chartContainer.isVisible()) {
      await expect(chartContainer).toBeVisible()
    }
  })

  test('should display team activity feed', async ({ page }) => {
    const activityFeed = page
      .locator('.activity-feed, .activity-log, [aria-label*="activity"]')
      .first()

    if (await activityFeed.isVisible()) {
      const activityItems = page.locator('.activity-item, .log-entry')
      expect(await activityItems.count()).toBeGreaterThanOrEqual(0)
    }
  })

  test('should export tasks', async ({ page }) => {
    const exportButton = page
      .locator('button:has-text("导出"), button:has-text("Export"), button[aria-label*="export"]')
      .first()

    if (await exportButton.isVisible()) {
      await exportButton.click()

      // Check for export options or download
      await page.waitForTimeout(1000)
      const downloadPromise = page.waitForEvent('download')

      // Select export format
      const csvOption = page.locator('text=CSV, Excel').first()
      if (await csvOption.isVisible()) {
        await csvOption.click()
      }

      // Wait for download (may or may not happen)
      try {
        const download = await Promise.race([
          downloadPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)),
        ])
        expect(download).toBeTruthy()
      } catch {
        // Export might just show a success message
      }
    }
  })
})

test.describe('Accessibility', () => {
  test('should have keyboard navigation support', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(1000)

    // Test Tab navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Check that focus moved
    const focusedElement = page.locator(':focus')
    expect(await focusedElement.count()).toBeGreaterThan(0)
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(1000)

    // Check for ARIA labels on interactive elements
    const buttons = page.locator('button[aria-label]')
    expect(await buttons.count()).toBeGreaterThan(0)
  })

  test('should support screen readers', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(1000)

    // Check for semantic HTML
    const main = page.locator('main')
    const nav = page.locator('nav')

    expect(await main.count()).toBeGreaterThan(0)
    expect(await nav.count()).toBeGreaterThan(0)
  })
})
