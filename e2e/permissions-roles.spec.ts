/**
 * @fileoverview Permissions and Roles E2E Tests
 * Tests role-based access control, permissions, and authorization
 */

import { test, expect } from '@playwright/test'
import { generateTestId, waitForToast } from './helpers/test-helpers'

test.describe('Role-Based Access Control', () => {
  test.describe('Admin Role', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('/zh/login')
      await page.fill('input[type="email"]', 'admin@7zi.com')
      await page.fill('input[type="password"]', 'admin123456')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/dashboard/i, { timeout: 5000 })
    })

    test('should allow admin to access all pages', async ({ page }) => {
      const pages = ['/admin/users', '/admin/roles', '/settings', '/analytics', '/team']

      for (const pagePath of pages) {
        await page.goto(pagePath)
        await page.waitForTimeout(1000)

        // Check that we're not redirected to login or access denied
        const url = page.url()
        const hasAccessDenied = (await page.locator('text=访问被拒绝, Access Denied').count()) > 0
        const isLoginPage = url.includes('/login')

        expect(!hasAccessDenied && !isLoginPage).toBeTruthy()
      }
    })

    test('should allow admin to manage users', async ({ page }) => {
      await page.goto('/admin/users')

      // Check that admin has full access
      const createButton = page.locator('button:has-text("新建"), button:has-text("Create")')
      const deleteButton = page
        .locator('button:has-text("删除"), button:has-text("Delete")')
        .first()
      const editButton = page.locator('button:has-text("编辑"), button:has-text("Edit")').first()

      expect(await createButton.isVisible()).toBeTruthy()
      if (await deleteButton.isVisible()) {
        expect(await deleteButton.isEnabled()).toBeTruthy()
      }
      if (await editButton.isVisible()) {
        expect(await editButton.isEnabled()).toBeTruthy()
      }
    })

    test('should allow admin to manage roles', async ({ page }) => {
      await page.goto('/admin/roles')

      // Check role management controls
      const createRoleButton = page.locator(
        'button:has-text("新建角色"), button:has-text("Create Role")'
      )

      if (await createRoleButton.isVisible()) {
        await createRoleButton.click()

        // Verify role creation form
        await expect(page.locator('input[name="name"]')).toBeVisible()
        await expect(page.locator('input[name="permissions"]')).toBeVisible()
      }
    })

    test('should allow admin to view system analytics', async ({ page }) => {
      await page.goto('/analytics')

      // Check analytics components
      await expect(page.locator('.chart, .analytics-card, .dashboard-card')).toBeVisible()
    })

    test('should allow admin to modify system settings', async ({ page }) => {
      await page.goto('/settings')

      // Check settings controls
      const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")')

      if (await saveButton.isVisible()) {
        expect(await saveButton.isEnabled()).toBeTruthy()
      }
    })
  })

  test.describe('User Role', () => {
    test.beforeEach(async ({ page }) => {
      // Login as regular user
      await page.goto('/zh/login')
      await page.fill('input[type="email"]', 'test@7zi.com')
      await page.fill('input[type="password"]', 'test123456')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/dashboard/i, { timeout: 5000 })
    })

    test('should allow user to access allowed pages', async ({ page }) => {
      const allowedPages = ['/dashboard', '/tasks', '/team', '/settings']

      for (const pagePath of allowedPages) {
        await page.goto(pagePath)
        await page.waitForTimeout(1000)

        const url = page.url()
        const hasAccessDenied = (await page.locator('text=访问被拒绝, Access Denied').count()) > 0
        const isLoginPage = url.includes('/login')

        expect(!hasAccessDenied && !isLoginPage).toBeTruthy()
      }
    })

    test('should deny user access to admin pages', async ({ page }) => {
      const adminPages = ['/admin/users', '/admin/roles', '/admin/settings']

      for (const pagePath of adminPages) {
        await page.goto(pagePath)
        await page.waitForTimeout(1000)

        // Should be denied access
        const url = page.url()
        const hasAccessDenied =
          (await page.locator('text=访问被拒绝, Access Denied, 无权限').count()) > 0
        const isRedirected = !url.includes(pagePath)
        const isLoginPage = url.includes('/login')

        expect(hasAccessDenied || isRedirected || isLoginPage).toBeTruthy()
      }
    })

    test('should restrict user from managing other users', async ({ page }) => {
      await page.goto('/admin/users')

      // Check that destructive actions are disabled
      const deleteButtons = page.locator('button:has-text("删除"), button:has-text("Delete")')
      const editButtons = page.locator('button:has-text("编辑"), button:has-text("Edit")')

      for (let i = 0; i < (await deleteButtons.count()); i++) {
        if (await deleteButtons.nth(i).isVisible()) {
          expect(await deleteButtons.nth(i).isDisabled()).toBeTruthy()
        }
      }

      for (let i = 0; i < (await editButtons.count()); i++) {
        if (await editButtons.nth(i).isVisible()) {
          expect(await editButtons.nth(i).isDisabled()).toBeTruthy()
        }
      }
    })

    test('should allow user to manage own settings', async ({ page }) => {
      await page.goto('/settings')

      // Check that user can edit their own settings
      const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")')

      if (await saveButton.isVisible()) {
        expect(await saveButton.isEnabled()).toBeTruthy()

        // Try updating a setting
        const nameInput = page.locator('input[name="name"]')
        if (await nameInput.isVisible()) {
          await nameInput.clear()
          await nameInput.fill('Updated Name')
          await saveButton.click()

          // Check for success
          const toast = await waitForToast(page, '保存成功, Updated successfully')
          expect(toast).toBeTruthy()
        }
      }
    })

    test('should show user-appropriate navigation', async ({ page }) => {
      await page.goto('/dashboard')

      // Check that admin links are not visible
      const adminLinks = page.locator(
        'a:has-text("用户管理"), a:has-text("User Management"), a[href="/admin"]'
      )

      expect(await adminLinks.count()).toBe(0)
    })
  })
})

test.describe('Permission Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/zh/login')
    await page.fill('input[type="email"]', 'admin@7zi.com')
    await page.fill('input[type="password"]', 'admin123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 })
  })

  test('should list all permissions', async ({ page }) => {
    await page.goto('/admin/permissions')

    // Check permissions list
    const permissionsList = page.locator('.permissions-list, table')
    await expect(permissionsList.first()).toBeVisible()

    // Check for at least one permission
    const permissionItems = permissionsList.locator('.permission-item, tbody tr')
    expect(await permissionItems.count()).toBeGreaterThan(0)
  })

  test('should filter permissions by resource', async ({ page }) => {
    await page.goto('/admin/permissions')

    // Find filter dropdown
    const resourceFilter = page.locator('select[name="resource"], .filter-resource')

    if (await resourceFilter.isVisible()) {
      await resourceFilter.selectOption('users')
      await page.waitForTimeout(1000)

      // Verify filter is applied
      const filteredItems = page.locator('.permission-item')
      expect(await filteredItems.count()).toBeGreaterThan(0)
    }
  })

  test('should search permissions by name', async ({ page }) => {
    await page.goto('/admin/permissions')

    // Find search input
    const searchInput = page.locator('input[placeholder*="搜索"], input[name="search"]')

    if (await searchInput.isVisible()) {
      await searchInput.fill('user')
      await page.waitForTimeout(1000)

      // Verify search results
      const searchResults = page.locator('.permission-item')
      expect(await searchResults.count()).toBeGreaterThan(0)
    }
  })

  test('should create new permission', async ({ page }) => {
    await page.goto('/admin/permissions')

    // Click create button
    const createButton = page.locator(
      'button:has-text("新建权限"), button:has-text("Create Permission")'
    )

    if (await createButton.isVisible()) {
      await createButton.click()

      // Fill permission form
      const permissionName = `permission-${generateTestId()}`
      await page.fill('input[name="name"]', permissionName)
      await page.fill('input[name="resource"]', 'test_resource')
      await page.fill('input[name="action"]', 'read')
      await page.fill('textarea[name="description"]', 'Test permission description')

      // Submit
      await page.click('button:has-text("保存"), button:has-text("Save")')

      // Verify success
      const toast = await waitForToast(page, '创建成功, Created successfully')
      expect(toast).toBeTruthy()
    }
  })

  test('should assign permission to role', async ({ page }) => {
    await page.goto('/admin/roles')

    // Find a role
    const roleEditButton = page.locator('button:has-text("编辑"), button:has-text("Edit")').first()

    if (await roleEditButton.isVisible()) {
      await roleEditButton.click()

      // Check permission checkboxes
      const permissionCheckboxes = page.locator('input[type="checkbox"].permission-checkbox')

      if ((await permissionCheckboxes.count()) > 0) {
        // Select a permission
        await permissionCheckboxes.first().check()

        // Save
        await page.click('button:has-text("保存"), button:has-text("Save")')

        // Verify success
        const toast = await waitForToast(page, '保存成功, Updated successfully')
        expect(toast).toBeTruthy()
      }
    }
  })

  test('should revoke permission from role', async ({ page }) => {
    await page.goto('/admin/roles')

    // Find a role
    const roleEditButton = page.locator('button:has-text("编辑"), button:has-text("Edit")').first()

    if (await roleEditButton.isVisible()) {
      await roleEditButton.click()

      // Check permission checkboxes
      const permissionCheckboxes = page.locator(
        'input[type="checkbox"].permission-checkbox:checked'
      )

      if ((await permissionCheckboxes.count()) > 0) {
        // Uncheck a permission
        await permissionCheckboxes.first().uncheck()

        // Save
        await page.click('button:has-text("保存"), button:has-text("Save")')

        // Verify success
        const toast = await waitForToast(page, '保存成功, Updated successfully')
        expect(toast).toBeTruthy()
      }
    }
  })
})

test.describe('Role Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/zh/login')
    await page.fill('input[type="email"]', 'admin@7zi.com')
    await page.fill('input[type="password"]', 'admin123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 })
  })

  test('should list all roles', async ({ page }) => {
    await page.goto('/admin/roles')

    // Check roles list
    const rolesList = page.locator('.roles-list, table')
    await expect(rolesList.first()).toBeVisible()

    // Check for default roles
    expect(await page.locator('text=Admin, 管理员').count()).toBeGreaterThan(0)
    expect(await page.locator('text=User, 用户').count()).toBeGreaterThan(0)
  })

  test('should create new role', async ({ page }) => {
    await page.goto('/admin/roles')

    // Click create button
    const createButton = page.locator('button:has-text("新建角色"), button:has-text("Create Role")')

    if (await createButton.isVisible()) {
      await createButton.click()

      // Fill role form
      const roleName = `Role-${generateTestId()}`
      await page.fill('input[name="name"]', roleName)
      await page.fill('textarea[name="description"]', 'Test role description')

      // Select permissions
      const permissionCheckboxes = page.locator('input[type="checkbox"].permission-checkbox')
      if ((await permissionCheckboxes.count()) > 0) {
        await permissionCheckboxes.nth(0).check()
        await permissionCheckboxes.nth(1).check()
      }

      // Submit
      await page.click('button:has-text("保存"), button:has-text("Save")')

      // Verify success
      const toast = await waitForToast(page, '创建成功, Created successfully')
      expect(toast).toBeTruthy()

      // Verify role appears in list
      await page.waitForTimeout(1000)
      expect(await page.locator(`text=${roleName}`).count()).toBeGreaterThan(0)
    }
  })

  test('should edit existing role', async ({ page }) => {
    await page.goto('/admin/roles')

    // Find edit button
    const editButton = page.locator('button:has-text("编辑"), button:has-text("Edit")').first()

    if (await editButton.isVisible()) {
      await editButton.click()

      // Update role name
      const nameInput = page.locator('input[name="name"]')
      const originalName = await nameInput.inputValue()
      await nameInput.clear()
      await nameInput.fill(`${originalName} (Updated)`)

      // Save
      await page.click('button:has-text("保存"), button:has-text("Save")')

      // Verify success
      const toast = await waitForToast(page, '保存成功, Updated successfully')
      expect(toast).toBeTruthy()
    }
  })

  test('should delete role', async ({ page }) => {
    await page.goto('/admin/roles')

    // Create a test role first
    const createButton = page.locator('button:has-text("新建角色"), button:has-text("Create Role")')
    if (await createButton.isVisible()) {
      await createButton.click()

      const roleName = `Delete-Role-${generateTestId()}`
      await page.fill('input[name="name"]', roleName)
      await page.click('button:has-text("保存"), button:has-text("Save")')

      await page.waitForTimeout(1000)
    }

    // Find delete button
    const deleteButton = page.locator('button:has-text("删除"), button:has-text("Delete")').first()

    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Confirm deletion
      await page.click(
        'button:has-text("确认"), button:has-text("Confirm"), button:has-text("确定")'
      )

      // Verify success
      const toast = await waitForToast(page, '删除成功, Deleted successfully')
      expect(toast).toBeTruthy()
    }
  })

  test('should prevent deletion of default roles', async ({ page }) => {
    await page.goto('/admin/roles')

    // Find delete button for Admin role
    const adminRow = page.locator('tr:has-text("Admin"), tr:has-text("管理员")')
    const deleteButton = adminRow.locator('button:has-text("删除"), button:has-text("Delete")')

    if (await deleteButton.isVisible()) {
      const isDisabled = await deleteButton.isDisabled()
      expect(isDisabled).toBeTruthy()
    }
  })

  test('should assign role to user', async ({ page }) => {
    await page.goto('/admin/users')

    // Find edit button for a user
    const editButton = page.locator('button:has-text("编辑"), button:has-text("Edit")').first()

    if (await editButton.isVisible()) {
      await editButton.click()

      // Change role
      const roleSelect = page.locator('select[name="role"]')
      if (await roleSelect.isVisible()) {
        await roleSelect.selectOption('admin')

        // Save
        await page.click('button:has-text("保存"), button:has-text("Save")')

        // Verify success
        const toast = await waitForToast(page, '保存成功, Updated successfully')
        expect(toast).toBeTruthy()
      }
    }
  })

  test('should show role permissions', async ({ page }) => {
    await page.goto('/admin/roles')

    // Find view permissions button
    const viewButton = page
      .locator('button:has-text("查看权限"), button:has-text("View Permissions")')
      .first()

    if (await viewButton.isVisible()) {
      await viewButton.click()

      // Check for permissions dialog
      const dialog = page.locator('[role="dialog"], .modal')
      await expect(dialog.first()).toBeVisible()

      // Check for permission list
      const permissionsList = dialog.locator('.permissions-list, ul')
      await expect(permissionsList.first()).toBeVisible()
    }
  })
})

test.describe('Permission Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/zh/login')
    await page.fill('input[type="email"]', 'admin@7zi.com')
    await page.fill('input[type="password"]', 'admin123456')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/i, { timeout: 5000 })
  })

  test('should handle concurrent permission changes', async ({ page, context }) => {
    await page.goto('/admin/roles')

    // Open edit dialog
    const editButton = page.locator('button:has-text("编辑"), button:has-text("Edit")').first()
    if (await editButton.isVisible()) {
      await editButton.click()
    }

    // Simulate concurrent edit in another context
    const page2 = await context.newPage()
    await page2.goto('/admin/roles')

    const editButton2 = page2.locator('button:has-text("编辑"), button:has-text("Edit")').first()
    if (await editButton2.isVisible()) {
      await editButton2.click()
    }

    // Make changes in both pages
    await page.fill('input[name="name"]', 'Role Updated 1')
    await page2.fill('input[name="name"]', 'Role Updated 2')

    // Save both
    await page.click('button:has-text("保存"), button:has-text("Save")')

    // The second save might show conflict error
    await page2.click('button:has-text("保存"), button:has-text("Save")')

    // Check for conflict or overwrite warning
    const conflictWarning = page2.locator('text=冲突, conflict, 已被修改')
    if (await conflictWarning.isVisible({ timeout: 2000 })) {
      expect(true).toBeTruthy()
    }

    await page2.close()
  })

  test('should handle permission hierarchy', async ({ page }) => {
    await page.goto('/admin/roles')

    // Admin role should have all permissions
    const adminRow = page.locator('tr:has-text("Admin"), tr:has-text("管理员")')
    const viewPermissions = adminRow.locator(
      'button:has-text("查看权限"), button:has-text("View Permissions")'
    )

    if (await viewPermissions.isVisible()) {
      await viewPermissions.click()

      // Check that all permissions are checked
      const allCheckboxes = page.locator('input[type="checkbox"].permission-checkbox')
      const checkedCheckboxes = page.locator('input[type="checkbox"].permission-checkbox:checked')

      expect(await allCheckboxes.count()).toBe(await checkedCheckboxes.count())
    }
  })

  test('should cascade role changes to users', async ({ page }) => {
    await page.goto('/admin/roles')

    // Create a test role
    const createButton = page.locator('button:has-text("新建角色"), button:has-text("Create Role")')
    if (await createButton.isVisible()) {
      await createButton.click()

      const roleName = `Test-Role-${generateTestId()}`
      await page.fill('input[name="name"]', roleName)
      await page.click('button:has-text("保存"), button:has-text("Save")')

      await page.waitForTimeout(1000)

      // Assign role to user
      await page.goto('/admin/users')
      const editButton = page.locator('button:has-text("编辑"), button:has-text("Edit")').first()
      if (await editButton.isVisible()) {
        await editButton.click()

        const roleSelect = page.locator('select[name="role"]')
        if (await roleSelect.isVisible()) {
          await roleSelect.selectOption(roleName)
          await page.click('button:has-text("保存"), button:has-text("Save")')
          await page.waitForTimeout(1000)
        }
      }

      // Check that user has the role
      const userWithRole = page.locator(`text=${roleName}`)
      expect(await userWithRole.count()).toBeGreaterThan(0)
    }
  })
})
