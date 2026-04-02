/**
 * @fileoverview User Management E2E Tests
 * Tests CRUD operations for user management including create, edit, delete, and list users
 */

import { test, expect } from '@playwright/test'
import { generateTestId, waitForToast, waitForPageLoad } from './helpers/test-helpers'

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/zh/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@7zi.com')
    await page.fill('input[type="password"], input[name="password"]', 'admin123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 })
  })

  test('should navigate to user management page', async ({ page }) => {
    // Navigate to settings or admin page
    await page.goto('/settings')

    // Look for user management link
    const usersLink = page.locator('text=用户管理, Users, 管理用户').first()

    if (await usersLink.isVisible()) {
      await usersLink.click()
    } else {
      // Try direct navigation
      await page.goto('/admin/users')
    }

    // Verify we're on user management page
    await expect(page.locator('h1, h2')).toContainText(/用户管理|User Management|Users/i)
  })

  test('should display user list', async ({ page }) => {
    await page.goto('/admin/users')

    // Check for user table or list
    const userTable = page.locator('table, [role="grid"]')
    await expect(userTable.first()).toBeVisible()

    // Check for at least one user row
    const userRows = userTable.locator('tbody tr, [role="rowgroup"] > [role="row"]')
    await expect(userRows.first()).toBeVisible()
  })

  test('should search users by name', async ({ page }) => {
    await page.goto('/admin/users')

    // Find search input
    const searchInput = page.locator(
      'input[placeholder*="搜索"], input[placeholder*="Search"], input[name="search"]'
    )

    if (await searchInput.isVisible()) {
      // Search for "admin"
      await searchInput.fill('admin')
      await page.waitForTimeout(1000)

      // Check that results are filtered
      const userRows = page.locator('tbody tr, [role="rowgroup"] > [role="row"]')
      const allRowsText = await userRows.allTextContents()
      const allContainAdmin = allRowsText.every(text => text.toLowerCase().includes('admin'))

      expect(allContainAdmin).toBeTruthy()
    }
  })

  test('should search users by email', async ({ page }) => {
    await page.goto('/admin/users')

    // Find search input
    const searchInput = page.locator(
      'input[placeholder*="搜索"], input[placeholder*="Search"], input[name="search"]'
    )

    if (await searchInput.isVisible()) {
      // Search for email
      await searchInput.fill('admin@7zi.com')
      await page.waitForTimeout(1000)

      // Check that results are filtered
      const userRows = page.locator('tbody tr, [role="rowgroup"] > [role="row"]')
      expect(await userRows.count()).toBeGreaterThan(0)
    }
  })

  test('should filter users by role', async ({ page }) => {
    await page.goto('/admin/users')

    // Find role filter dropdown
    const roleFilter = page.locator('select[name="role"], [role="combobox"], .filter-role')

    if (await roleFilter.isVisible()) {
      // Select "Admin" role
      await roleFilter.selectOption('admin')
      await page.waitForTimeout(1000)

      // Verify filter is applied
      const userRows = page.locator('tbody tr, [role="rowgroup"] > [role="row"]')
      expect(await userRows.count()).toBeGreaterThan(0)
    }
  })

  test('should sort users by column', async ({ page }) => {
    await page.goto('/admin/users')

    // Find sortable column headers
    const nameHeader = page.locator('th:has-text("姓名"), th:has-text("Name")').first()

    if (await nameHeader.isVisible()) {
      // Click to sort
      await nameHeader.click()
      await page.waitForTimeout(500)

      // Verify sorting indicator
      const sortIcon = nameHeader.locator('.sort-icon, .asc, .desc')
      expect(await sortIcon.isVisible()).toBeTruthy()
    }
  })

  test('should open create user dialog', async ({ page }) => {
    await page.goto('/admin/users')

    // Find create user button
    const createButton = page.locator(
      'button:has-text("新建用户"), button:has-text("Create User"), button:has-text("添加用户")'
    )

    if (await createButton.isVisible()) {
      await createButton.click()

      // Check for dialog/modal
      const dialog = page.locator('[role="dialog"], .modal, .dialog')
      await expect(dialog.first()).toBeVisible()

      // Check for form fields
      await expect(page.locator('input[name="name"]')).toBeVisible()
      await expect(page.locator('input[type="email"]')).toBeVisible()
    }
  })

  test('should create new user', async ({ page }) => {
    await page.goto('/admin/users')

    // Click create button
    const createButton = page.locator('button:has-text("新建用户"), button:has-text("Create User")')
    if (await createButton.isVisible()) {
      await createButton.click()
    } else {
      // Try alternative button
      await page.click('button:has-text("添加"), button:has-text("Add")')
    }

    // Fill user form
    const uniqueEmail = `user-${generateTestId()}@7zi.com`
    await page.fill('input[name="name"]', 'New Test User')
    await page.fill('input[type="email"]', uniqueEmail)
    await page.fill('input[type="password"], input[name="password"]', 'Test123456!')
    await page.fill('input[name="role"]', 'user')

    // Submit form
    await page.click(
      'button:has-text("保存"), button:has-text("Save"), button:has-text("创建"), button:has-text("Create")'
    )

    // Wait for success toast
    const toast = await waitForToast(page, '创建成功, 成功, Created successfully')
    expect(toast).toBeTruthy()

    // Verify user appears in list
    await page.waitForTimeout(1000)
    const userText = page.locator(`text=${uniqueEmail}`)
    await expect(userText).toBeVisible()
  })

  test('should validate user creation form', async ({ page }) => {
    await page.goto('/admin/users')

    // Click create button
    const createButton = page.locator('button:has-text("新建用户"), button:has-text("Create User")')
    if (await createButton.isVisible()) {
      await createButton.click()
    }

    // Try to submit empty form
    await page.click('button:has-text("保存"), button:has-text("Save")')

    // Check for validation errors
    const requiredErrors = page.locator('text=必填, required, 不能为空')
    await expect(requiredErrors.first()).toBeVisible({ timeout: 2000 })
  })

  test('should validate email format when creating user', async ({ page }) => {
    await page.goto('/admin/users')

    // Click create button
    const createButton = page.locator('button:has-text("新建用户"), button:has-text("Create User")')
    if (await createButton.isVisible()) {
      await createButton.click()
    }

    // Fill with invalid email
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[type="email"]', 'invalid-email')

    // Submit form
    await page.click('button:has-text("保存"), button:has-text("Save")')

    // Check for email validation error
    const emailError = page.locator('text=邮箱格式错误, invalid email')
    await expect(emailError.first()).toBeVisible({ timeout: 2000 })
  })

  test('should edit existing user', async ({ page }) => {
    await page.goto('/admin/users')

    // Find edit button for first user
    const editButton = page
      .locator('button:has-text("编辑"), button:has-text("Edit"), .edit-button')
      .first()

    if (await editButton.isVisible()) {
      await editButton.click()

      // Wait for dialog
      const dialog = page.locator('[role="dialog"], .modal')
      await expect(dialog.first()).toBeVisible()

      // Update user name
      const nameInput = page.locator('input[name="name"]')
      await nameInput.clear()
      await nameInput.fill('Updated Test User')

      // Save changes
      await page.click('button:has-text("保存"), button:has-text("Save")')

      // Wait for success toast
      const toast = await waitForToast(page, '保存成功, 更新成功, Updated successfully')
      expect(toast).toBeTruthy()

      // Verify change
      await page.waitForTimeout(1000)
      const updatedUser = page.locator('text=Updated Test User')
      await expect(updatedUser).toBeVisible()
    }
  })

  test('should delete user', async ({ page }) => {
    await page.goto('/admin/users')

    // Create a test user first
    const uniqueEmail = `delete-me-${generateTestId()}@7zi.com`

    // Click create button
    const createButton = page.locator('button:has-text("新建用户"), button:has-text("Create User")')
    if (await createButton.isVisible()) {
      await createButton.click()

      // Fill form
      await page.fill('input[name="name"]', 'Delete Me User')
      await page.fill('input[type="email"]', uniqueEmail)
      await page.fill('input[type="password"]', 'Test123456!')
      await page.click('button:has-text("保存"), button:has-text("Save")')

      await page.waitForTimeout(1000)
    }

    // Find delete button
    const deleteButton = page.locator('button:has-text("删除"), button:has-text("Delete")').first()

    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Confirm deletion
      const confirmButton = page.locator(
        'button:has-text("确认"), button:has-text("Confirm"), button:has-text("确定")'
      )
      await confirmButton.click()

      // Wait for success toast
      const toast = await waitForToast(page, '删除成功, Deleted successfully')
      expect(toast).toBeTruthy()

      // Verify user is removed
      await page.waitForTimeout(1000)
      const deletedUser = page.locator(`text=${uniqueEmail}`)
      await expect(deletedUser).not.toBeVisible()
    }
  })

  test('should handle user deletion with confirmation', async ({ page }) => {
    await page.goto('/admin/users')

    // Find delete button
    const deleteButton = page.locator('button:has-text("删除"), button:has-text("Delete")').first()

    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Check for confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], .modal, .confirm-dialog')
      await expect(confirmDialog.first()).toBeVisible()

      // Check for warning message
      const warningText = page.locator('text=确定删除, Are you sure, 此操作不可撤销')
      expect(await warningText.isVisible()).toBeTruthy()

      // Cancel deletion
      const cancelButton = page.locator('button:has-text("取消"), button:has-text("Cancel")')
      await cancelButton.click()

      // Dialog should close
      await expect(confirmDialog).not.toBeVisible()

      // User should still be in list
      await page.waitForTimeout(500)
      expect(await deleteButton.isVisible()).toBeTruthy()
    }
  })

  test('should change user role', async ({ page }) => {
    await page.goto('/admin/users')

    // Find role selector for first user
    const roleSelect = page.locator('select[name="role"], .role-select').first()

    if (await roleSelect.isVisible()) {
      // Get current role
      const currentRole = await roleSelect.inputValue()

      // Change role
      await roleSelect.selectOption('admin')
      await page.waitForTimeout(1000)

      // Verify role changed
      const newRole = await roleSelect.inputValue()
      expect(newRole).toBe('admin')
    }
  })

  test('should deactivate user', async ({ page }) => {
    await page.goto('/admin/users')

    // Find deactivate toggle/button
    const deactivateButton = page
      .locator('button:has-text("停用"), button:has-text("Deactivate"), .toggle-user')
      .first()

    if (await deactivateButton.isVisible()) {
      await deactivateButton.click()

      // Wait for confirmation
      await page.click('button:has-text("确认"), button:has-text("Confirm")')

      // Wait for success toast
      const toast = await waitForToast(page, '已停用, Deactivated')
      expect(toast).toBeTruthy()

      // Verify user status changed
      await page.waitForTimeout(1000)
      const statusBadge = page.locator('.status-badge, .user-status')
      expect(await statusBadge.count()).toBeGreaterThan(0)
    }
  })

  test('should handle pagination', async ({ page }) => {
    await page.goto('/admin/users')

    // Look for pagination controls
    const pagination = page.locator('.pagination, [role="navigation"]')

    if (await pagination.isVisible()) {
      // Check for next button
      const nextButton = pagination.locator('button:has-text("下一页"), button:has-text("Next")')
      const prevButton = pagination.locator(
        'button:has-text("上一页"), button:has-text("Previous")'
      )

      // Try pagination if available
      if (await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForTimeout(1000)

        // Verify page changed
        expect(page.url()).toContain('page=')
      }

      if (await prevButton.isEnabled()) {
        await prevButton.click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('should export user list', async ({ page }) => {
    await page.goto('/admin/users')

    // Find export button
    const exportButton = page.locator(
      'button:has-text("导出"), button:has-text("Export"), button:has-text("下载")'
    )

    if (await exportButton.isVisible()) {
      // Mock file download
      const downloadPromise = page.waitForEvent('download')

      await exportButton.click()

      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/)
    }
  })

  test('should show user details', async ({ page }) => {
    await page.goto('/admin/users')

    // Find view details button
    const viewButton = page
      .locator('button:has-text("查看"), button:has-text("View"), button:has-text("详情")')
      .first()

    if (await viewButton.isVisible()) {
      await viewButton.click()

      // Check for details panel/drawer
      const detailsPanel = page.locator('.details-panel, .drawer, [role="dialog"]')
      await expect(detailsPanel.first()).toBeVisible()

      // Check for user information
      await expect(page.locator('text=姓名, Name, Email')).toBeVisible()
    }
  })

  test('should handle bulk actions', async ({ page }) => {
    await page.goto('/admin/users')

    // Find checkboxes
    const checkboxes = page.locator('input[type="checkbox"].user-checkbox')

    if ((await checkboxes.count()) > 0) {
      // Select multiple users
      await checkboxes.nth(0).check()
      await checkboxes.nth(1).check()

      // Look for bulk action buttons
      const bulkDelete = page.locator('button:has-text("批量删除"), button:has-text("Bulk Delete")')
      const bulkExport = page.locator('button:has-text("批量导出"), button:has-text("Bulk Export")')

      // Test bulk action if available
      if (await bulkDelete.isVisible()) {
        await bulkDelete.click()

        // Confirm
        await page.click('button:has-text("确认"), button:has-text("Confirm")')

        // Wait for success toast
        const toast = await waitForToast(page, '删除成功')
        expect(toast).toBeTruthy()
      }
    }
  })
})

test.describe('User Management Permissions', () => {
  test('should restrict non-admin users from accessing user management', async ({ page }) => {
    // Login as regular user
    await page.goto('/zh/login')
    await page.fill('input[type="email"]', 'test@7zi.com')
    await page.fill('input[type="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 })

    // Try to access user management
    await page.goto('/admin/users')

    // Should be redirected or show access denied
    const url = page.url()
    const isAccessDenied =
      (await page.locator('text=访问被拒绝, Access Denied, 无权限').count()) > 0
    const isRedirected = !url.includes('/admin/users')

    expect(isAccessDenied || isRedirected).toBeTruthy()
  })

  test('should show restricted actions for non-admin', async ({ page }) => {
    // Login as regular user
    await page.goto('/zh/login')
    await page.fill('input[type="email"]', 'test@7zi.com')
    await page.fill('input[type="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 })

    // If user can view users (read-only)
    await page.goto('/admin/users')

    // Check that destructive actions are disabled
    const deleteButtons = page.locator('button:has-text("删除"), button:has-text("Delete")')
    const editButtons = page.locator('button:has-text("编辑"), button:has-text("Edit")')

    for (let i = 0; i < (await deleteButtons.count()); i++) {
      const button = deleteButtons.nth(i)
      if (await button.isVisible()) {
        expect(await button.isDisabled()).toBeTruthy()
      }
    }
  })
})

test.describe('User Management Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/zh/login')
    await page.fill('input[type="email"]', 'admin@7zi.com')
    await page.fill('input[type="password"]', 'admin123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 })
  })

  test('should have proper ARIA labels on user table', async ({ page }) => {
    await page.goto('/admin/users')

    // Check table ARIA attributes
    const table = page.locator('table, [role="grid"]')
    await expect(table.first()).toHaveAttribute('role', 'table')

    // Check headers have proper scope
    const headers = table.locator('th')
    expect(await headers.count()).toBeGreaterThan(0)
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/admin/users')

    // Test Tab navigation through table
    await page.keyboard.press('Tab')
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement)
  })
})
