/**
 * @fileoverview E2E tests for Project Management
 * Tests project creation, editing, deletion, and team assignment
 */

import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/login-page'
import { DashboardPage } from './pages/dashboard-page'

test.describe('Project Management', () => {
  let loginPage: LoginPage
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    dashboardPage = new DashboardPage(page)

    // Login before each test
    await loginPage.goto()
    await loginPage.login('admin@7zi.com', 'admin123456')

    // Navigate to dashboard
    await dashboardPage.goto()
  })

  test('should display projects list', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('[data-testid="project-list"]', { timeout: 10000 })

    // Verify projects section is visible
    const projectsSection = page.locator('[data-testid="projects-section"]')
    await expect(projectsSection).toBeVisible()

    // Verify at least one project is displayed (if data exists)
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()
    console.log(`Found ${count} project cards`)

    if (count > 0) {
      await expect(projectCards.first()).toBeVisible()
    }
  })

  test('should navigate to create project page', async ({ page }) => {
    // Click on "Create Project" button
    const createButton = page.getByRole('button', { name: /创建项目|Create Project|New Project/i })
    await createButton.click()

    // Verify we're on create project page
    await expect(page).toHaveURL(/\/(projects\/new|create-project)/i)

    // Check for form elements
    const titleInput = page.getByLabel(/项目名称|Project Name|Title/i)
    const descriptionInput = page.getByLabel(/描述|Description/i)
    const submitButton = page.getByRole('button', { name: /创建|Create|Submit/i })

    await expect(titleInput).toBeVisible()
    await expect(descriptionInput).toBeVisible()
    await expect(submitButton).toBeVisible()
  })

  test('should create a new project', async ({ page }) => {
    // Navigate to create project
    await page.getByRole('button', { name: /创建项目|Create Project/i }).click()

    // Fill project details
    const projectTitle = `测试项目-${Date.now()}`
    const projectDescription = '这是一个自动化测试创建的项目'

    await page.getByLabel(/项目名称|Project Name/i).fill(projectTitle)
    await page.getByLabel(/描述|Description/i).fill(projectDescription)

    // Select priority (if available)
    const prioritySelect = page.locator('[data-testid="priority-select"]')
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption('high')
    }

    // Submit form
    await page.getByRole('button', { name: /创建|Create/i }).click()

    // Verify success message
    await expect(page.getByText(/项目创建成功|Project created successfully/i)).toBeVisible()

    // Verify redirection to project detail page
    await expect(page).toHaveURL(/\/projects\/.+/)

    // Verify project title is displayed
    await expect(page.getByText(projectTitle)).toBeVisible()
  })

  test('should validate required project fields', async ({ page }) => {
    // Navigate to create project
    await page.getByRole('button', { name: /创建项目|Create Project/i }).click()

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /创建|Create/i }).click()

    // Verify validation errors
    const errorMessage = page.locator(
      '[data-testid="error-message"], .error-message, .text-red-500'
    )

    // Check for required field errors
    await expect(errorMessage).toBeVisible()

    // Verify specific validation messages
    const titleError = page.getByText(/项目名称.*必填|Project name.*required/i)
    const descriptionError = page.getByText(/描述.*必填|Description.*required/i)

    const hasTitleError = (await titleError.count()) > 0
    const hasDescriptionError = (await descriptionError.count()) > 0

    // At least one validation error should be present
    expect(hasTitleError || hasDescriptionError).toBeTruthy()
  })

  test('should edit an existing project', async ({ page }) => {
    // Navigate to projects list
    await page.goto('/projects')

    // Find first project (if exists)
    const firstProject = page.locator('[data-testid="project-card"]').first()
    const projectExists = (await firstProject.count()) > 0

    if (!projectExists) {
      test.skip()
      return
    }

    // Click on project to view details
    await firstProject.click()

    // Wait for project detail page
    await page.waitForURL(/\/projects\/.+/)

    // Click edit button
    const editButton = page.getByRole('button', { name: /编辑|Edit/i })
    await editButton.click()

    // Wait for edit form
    await page.waitForSelector('[data-testid="edit-project-form"]', { timeout: 5000 })

    // Update project title
    const newTitle = `更新后的项目-${Date.now()}`
    const titleInput = page.getByLabel(/项目名称|Project Name/i)
    await titleInput.clear()
    await titleInput.fill(newTitle)

    // Save changes
    await page.getByRole('button', { name: /保存|Save/i }).click()

    // Verify success message
    await expect(page.getByText(/项目更新成功|Project updated successfully/i)).toBeVisible()

    // Verify updated title is displayed
    await expect(page.getByText(newTitle)).toBeVisible()
  })

  test('should delete a project', async ({ page }) => {
    // Navigate to projects list
    await page.goto('/projects')

    // Find first project
    const firstProject = page.locator('[data-testid="project-card"]').first()
    const projectExists = (await firstProject.count()) > 0

    if (!projectExists) {
      test.skip()
      return
    }

    // Store project title for verification
    const projectTitle = await firstProject.getByTestId('project-title').textContent()

    // Click on project to view details
    await firstProject.click()

    // Wait for project detail page
    await page.waitForURL(/\/projects\/.+/)

    // Click delete button (may need to click menu first)
    const menuButton = page.getByRole('button', { name: /更多|More|\.\.\./i })
    if (await menuButton.isVisible({ timeout: 3000 })) {
      await menuButton.click()
    }

    const deleteButton = page.getByRole('button', { name: /删除|Delete/i })
    await deleteButton.click()

    // Confirm deletion
    const confirmButton = page.getByRole('button', { name: /确认|Confirm|Yes/i }).first()
    await confirmButton.click()

    // Verify success message
    await expect(page.getByText(/项目删除成功|Project deleted successfully/i)).toBeVisible()

    // Verify project is removed from list
    await page.goto('/projects')
    await page.waitForSelector('[data-testid="project-list"]')

    // Try to find the deleted project
    const deletedProject = page.getByText(projectTitle || '')
    await expect(deletedProject).not.toBeVisible()
  })

  test('should search projects', async ({ page }) => {
    // Navigate to projects list
    await page.goto('/projects')

    // Find search input
    const searchInput = page.getByPlaceholder(/搜索|Search/i).first()
    await expect(searchInput).toBeVisible()

    // Type search query
    await searchInput.fill('测试')

    // Wait for search results
    await page.waitForTimeout(500)

    // Verify results are filtered
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count > 0) {
      // At least one result card should be visible
      await expect(projectCards.first()).toBeVisible()
    }
  })

  test('should filter projects by status', async ({ page }) => {
    // Navigate to projects list
    await page.goto('/projects')

    // Find status filter
    const statusFilter = page.locator('[data-testid="status-filter"]')
    if (!(await statusFilter.isVisible({ timeout: 3000 }))) {
      test.skip()
      return
    }

    // Select a status
    await statusFilter.selectOption('active')

    // Wait for filtered results
    await page.waitForTimeout(500)

    // Verify results
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count > 0) {
      await expect(projectCards.first()).toBeVisible()
    }
  })

  test('should assign team members to project', async ({ page }) => {
    // Navigate to a project detail page
    await page.goto('/projects')

    const firstProject = page.locator('[data-testid="project-card"]').first()
    const projectExists = (await firstProject.count()) > 0

    if (!projectExists) {
      test.skip()
      return
    }

    await firstProject.click()
    await page.waitForURL(/\/projects\/.+/)

    // Navigate to team/assignee section
    const teamSection = page.getByRole('tab', { name: /团队|Team/i })
    if (await teamSection.isVisible({ timeout: 3000 })) {
      await teamSection.click()
    }

    // Click "Add Team Member" button
    const addMemberButton = page.getByRole('button', { name: /添加成员|Add Member/i })
    if (!(await addMemberButton.isVisible({ timeout: 3000 }))) {
      test.skip()
      return
    }

    await addMemberButton.click()

    // Select a team member
    const memberSelect = page.locator('[data-testid="team-member-select"]')
    await memberSelect.selectOption({ index: 1 }) // Select first available member

    // Confirm assignment
    const confirmButton = page.getByRole('button', { name: /确认|Confirm/i })
    await confirmButton.click()

    // Verify member is assigned
    await expect(page.getByText(/成员添加成功|Member added successfully/i)).toBeVisible()
  })

  test('should view project analytics', async ({ page }) => {
    // Navigate to a project detail page
    await page.goto('/projects')

    const firstProject = page.locator('[data-testid="project-card"]').first()
    const projectExists = (await firstProject.count()) > 0

    if (!projectExists) {
      test.skip()
      return
    }

    await firstProject.click()
    await page.waitForURL(/\/projects\/.+/)

    // Navigate to analytics section
    const analyticsTab = page.getByRole('tab', { name: /分析|Analytics/i })
    if (!(await analyticsTab.isVisible({ timeout: 3000 }))) {
      test.skip()
      return
    }

    await analyticsTab.click()

    // Verify analytics elements are displayed
    await expect(page.locator('[data-testid="analytics-charts"]')).toBeVisible()

    // Verify charts or metrics are present
    const charts = page.locator('[data-testid="chart"], canvas')
    const chartCount = await charts.count()
    expect(chartCount).toBeGreaterThan(0)
  })
})
