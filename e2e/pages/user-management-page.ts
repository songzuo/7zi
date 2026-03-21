/**
 * @fileoverview User Management Page Object
 * Encapsulates user management page interactions and locators
 */

import { Page, Locator, expect } from '@playwright/test';

export class UserManagementPage {
  readonly page: Page;
  readonly url: string = '/admin/users';

  // Locators
  readonly userTable: Locator;
  readonly searchInput: Locator;
  readonly createButton: Locator;
  readonly filterDropdown: {
    role: Locator;
    status: Locator;
  };
  readonly pagination: {
    next: Locator;
    previous: Locator;
    pageInfo: Locator;
  };

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.userTable = page.locator('table, [role="grid"]');
    this.searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"], input[name="search"]');
    this.createButton = page.locator('button:has-text("新建用户"), button:has-text("Create User"), button:has-text("添加用户")');
    this.filterDropdown = {
      role: page.locator('select[name="role"], .filter-role'),
      status: page.locator('select[name="status"], .filter-status'),
    };
    this.pagination = {
      next: page.locator('button:has-text("下一页"), button:has-text("Next")'),
      previous: page.locator('button:has-text("上一页"), button:has-text("Previous")'),
      pageInfo: page.locator('.pagination-info, .page-info'),
    };
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await expect(this.userTable).toBeVisible();
  }

  async searchUsers(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(1000); // Wait for search results
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(1000);
  }

  async filterByRole(role: string): Promise<void> {
    const roleFilter = this.filterDropdown.role;
    if (await roleFilter.isVisible()) {
      await roleFilter.selectOption(role);
      await this.page.waitForTimeout(1000);
    }
  }

  async filterByStatus(status: string): Promise<void> {
    const statusFilter = this.filterDropdown.status;
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption(status);
      await this.page.waitForTimeout(1000);
    }
  }

  async clickCreateUser(): Promise<void> {
    await this.createButton.click();
    await expect(this.page.locator('[role="dialog"], .modal')).toBeVisible();
  }

  async clickEditUser(userEmail: string): Promise<void> {
    const userRow = this.userTable.locator(`tr:has-text("${userEmail}")`);
    const editButton = userRow.locator('button:has-text("编辑"), button:has-text("Edit")');
    await editButton.click();
    await expect(this.page.locator('[role="dialog"], .modal')).toBeVisible();
  }

  async clickDeleteUser(userEmail: string): Promise<void> {
    const userRow = this.userTable.locator(`tr:has-text("${userEmail}")`);
    const deleteButton = userRow.locator('button:has-text("删除"), button:has-text("Delete")');
    await deleteButton.click();
  }

  async confirmDelete(): Promise<void> {
    const confirmButton = this.page.locator('button:has-text("确认"), button:has-text("Confirm"), button:has-text("确定")');
    await confirmButton.click();
  }

  async cancelDelete(): Promise<void> {
    const cancelButton = this.page.locator('button:has-text("取消"), button:has-text("Cancel")');
    await cancelButton.click();
  }

  async goToNextPage(): Promise<void> {
    await this.pagination.next.click();
    await this.page.waitForTimeout(500);
  }

  async goToPreviousPage(): Promise<void> {
    await this.pagination.previous.click();
    await this.page.waitForTimeout(500);
  }

  async getUserCount(): Promise<number> {
    const userRows = this.userTable.locator('tbody tr, [role="rowgroup"] > [role="row"]');
    return await userRows.count();
  }

  async findUserByEmail(email: string): Promise<Locator | null> {
    const userRow = this.userTable.locator(`tr:has-text("${email}")`);
    if (await userRow.count() > 0) {
      return userRow;
    }
    return null;
  }

  async userExists(email: string): Promise<boolean> {
    const userRow = await this.findUserByEmail(email);
    return userRow !== null;
  }

  async getUserRole(email: string): Promise<string | null> {
    const userRow = await this.findUserByEmail(email);
    if (userRow) {
      const roleCell = userRow.locator('td').nth(2); // Assuming role is in 3rd column
      return await roleCell.textContent();
    }
    return null;
  }

  async getUserStatus(email: string): Promise<string | null> {
    const userRow = await this.findUserByEmail(email);
    if (userRow) {
      const statusBadge = userRow.locator('.status-badge, .user-status');
      if (await statusBadge.isVisible()) {
        return await statusBadge.textContent();
      }
    }
    return null;
  }

  async isOnUserManagementPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/admin/users') || url.includes('/users');
  }

  async hasAccessToUserManagement(): Promise<boolean> {
    const isDenied = await this.page.locator('text=访问被拒绝, Access Denied').count() > 0;
    return !isDenied && await this.isOnUserManagementPage();
  }

  async exportUsers(format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<void> {
    const exportButton = this.page.locator(`button:has-text("导出${format.toUpperCase()}"), button:has-text("Export as ${format}")`);
    if (await exportButton.isVisible()) {
      await exportButton.click();
    }
  }

  async selectMultipleUsers(userEmails: string[]): Promise<void> {
    for (const email of userEmails) {
      const userRow = this.userTable.locator(`tr:has-text("${email}")`);
      const checkbox = userRow.locator('input[type="checkbox"]');
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
  }

  async bulkDelete(): Promise<void> {
    const bulkDeleteButton = this.page.locator('button:has-text("批量删除"), button:has-text("Bulk Delete")');
    if (await bulkDeleteButton.isVisible()) {
      await bulkDeleteButton.click();
      await this.confirmDelete();
    }
  }

  async sortUsersBy(column: string): Promise<void> {
    const header = this.userTable.locator(`th:has-text("${column}")`).first();
    if (await header.isVisible()) {
      await header.click();
      await this.page.waitForTimeout(500);
    }
  }

  async viewUserDetails(userEmail: string): Promise<void> {
    const userRow = this.userTable.locator(`tr:has-text("${email}")`);
    const viewButton = userRow.locator('button:has-text("查看"), button:has-text("View"), button:has-text("详情")');
    if (await viewButton.isVisible()) {
      await viewButton.click();
    }
  }

  async closeUserDetails(): Promise<void> {
    const closeButton = this.page.locator('button:has-text("关闭"), button:has-text("Close"), [aria-label="Close"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }
}
