/**
 * @fileoverview Team Page Object
 * Encapsulates team page interactions and locators
 */

import { Page, Locator } from '@playwright/test'

export class TeamPage {
  readonly page: Page
  readonly url: string = '/team'

  // Locators
  readonly heading: Locator
  readonly teamMembers: Locator
  readonly memberCards: Locator
  readonly filterOptions: Locator
  readonly searchInput: Locator
  readonly addMemberButton: Locator
  readonly modal: Locator
  readonly nameInput: Locator
  readonly roleInput: Locator
  readonly providerSelect: Locator
  readonly saveButton: Locator

  constructor(page: Page) {
    this.page = page

    // Initialize locators
    this.heading = page.locator('h1, .page-title').filter({ hasText: /团队|Team/i })
    this.teamMembers = page.locator('.team-members, .members-list')
    this.memberCards = this.teamMembers.locator('.team-member, .member-card, [data-member-id]')
    this.filterOptions = page.locator('.filter-options button, .filter-tabs button')
    this.searchInput = page.locator(
      'input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]'
    )
    this.addMemberButton = page.locator(
      'button:has-text("添加成员"), button:has-text("Add Member"), button:has-text("新建")'
    )

    // Modal locators
    this.modal = page.locator('[role="dialog"], .modal, .dialog')
    this.nameInput = this.modal.locator(
      'input[name="name"], input[placeholder*="名称"], input[placeholder*="Name"]'
    )
    this.roleInput = this.modal.locator(
      'input[name="role"], input[placeholder*="角色"], input[placeholder*="Role"]'
    )
    this.providerSelect = this.modal.locator('select[name="provider"], [role="combobox"]')
    this.saveButton = this.modal.locator(
      'button[type="submit"], button:has-text("保存"), button:has-text("Save")'
    )
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.waitForLoad()
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
    await this.teamMembers.waitFor({ state: 'visible', timeout: 5000 })
  }

  async getPageTitle(): Promise<string | null> {
    return await this.heading.textContent()
  }

  async getMemberCount(): Promise<number> {
    await this.teamMembers.waitFor({ state: 'visible', timeout: 3000 })
    return await this.memberCards.count()
  }

  async getMemberName(index: number): Promise<string | null> {
    const member = this.memberCards.nth(index)
    if (await member.isVisible()) {
      const name = member.locator('.name, h3, h4, .member-name')
      return await name.textContent()
    }
    return null
  }

  async getMemberRole(index: number): Promise<string | null> {
    const member = this.memberCards.nth(index)
    if (await member.isVisible()) {
      const role = member.locator('.role, .title, .member-role')
      return await role.textContent()
    }
    return null
  }

  async getMemberProvider(index: number): Promise<string | null> {
    const member = this.memberCards.nth(index)
    if (await member.isVisible()) {
      const provider = member.locator('.provider, .badge')
      return await provider.textContent()
    }
    return null
  }

  async getMemberStatus(index: number): Promise<string | null> {
    const member = this.memberCards.nth(index)
    if (await member.isVisible()) {
      const status = member.locator('.status, .member-status')
      return await status.textContent()
    }
    return null
  }

  async searchMembers(query: string): Promise<void> {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(query)
      await this.page.waitForTimeout(500) // Wait for debounce
    }
  }

  async clearSearch(): Promise<void> {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.clear()
      await this.page.waitForTimeout(500)
    }
  }

  async filterByStatus(status: string): Promise<void> {
    const filterButton = this.filterOptions.filter({ hasText: status }).first()
    if (await filterButton.isVisible()) {
      await filterButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async filterByProvider(provider: string): Promise<void> {
    const filterButton = this.filterOptions.filter({ hasText: provider }).first()
    if (await filterButton.isVisible()) {
      await filterButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async clickAddMember(): Promise<void> {
    if (await this.addMemberButton.isVisible()) {
      await this.addMemberButton.click()
      await this.modal.first().waitFor({ state: 'visible', timeout: 3000 })
    }
  }

  async fillMemberForm(data: { name: string; role?: string; provider?: string }): Promise<void> {
    if (data.name) await this.nameInput.fill(data.name)
    if (data.role) await this.roleInput.fill(data.role)
    if (data.provider) {
      await this.providerSelect.click()
      const option = this.page.locator(`text=${data.provider}`).first()
      if (await option.isVisible()) {
        await option.click()
      }
    }
  }

  async saveMember(): Promise<void> {
    await this.saveButton.click()
    await this.modal.first().waitFor({ state: 'hidden', timeout: 3000 })
  }

  async addMember(data: { name: string; role?: string; provider?: string }): Promise<void> {
    await this.clickAddMember()
    await this.fillMemberForm(data)
    await this.saveMember()
  }

  async clickMember(index: number): Promise<void> {
    const member = this.memberCards.nth(index)
    if (await member.isVisible()) {
      await member.click()
    }
  }

  async deleteMember(index: number): Promise<void> {
    const member = this.memberCards.nth(index)
    const deleteButton = member.locator(
      '.delete-button, button:has-text("删除"), button:has-text("Delete")'
    )
    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Confirm delete
      const confirmButton = this.page.locator('button:has-text("确认"), button:has-text("Confirm")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }
    }
  }

  async editMember(index: number): Promise<void> {
    const member = this.memberCards.nth(index)
    const editButton = member.locator(
      '.edit-button, button:has-text("编辑"), button:has-text("Edit")'
    )
    if (await editButton.isVisible()) {
      await editButton.click()
    }
  }

  async getActiveMemberCount(): Promise<number> {
    const activeMembers = this.memberCards.filter({ hasText: /活跃|Active|在线|Online/i })
    return await activeMembers.count()
  }

  async isOnTeamPage(): Promise<boolean> {
    const url = this.page.url()
    return url.includes('/team')
  }
}
