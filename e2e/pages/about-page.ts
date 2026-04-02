/**
 * @fileoverview About Page Object
 * Encapsulates about page interactions and locators
 */

import { Page, Locator } from '@playwright/test'

export class AboutPage {
  readonly page: Page
  readonly url: string = '/about'

  // Locators
  readonly heading: Locator
  readonly aboutSection: Locator
  readonly missionSection: Locator
  readonly teamSection: Locator
  readonly teamMembers: Locator
  readonly historySection: Locator
  readonly valuesSection: Locator
  readonly contactCTA: Locator

  constructor(page: Page) {
    this.page = page

    // Initialize locators
    this.heading = page.locator('h1, .page-title').filter({ hasText: /关于|About/i })
    this.aboutSection = page.locator('.about-section, [data-section="about"]')
    this.missionSection = page.locator('.mission, [data-section="mission"]')
    this.teamSection = page.locator('.team-section, [data-section="team"]')
    this.teamMembers = this.teamSection.locator('.team-member, .member-card')
    this.historySection = page.locator('.history, [data-section="history"]')
    this.valuesSection = page.locator('.values, [data-section="values"]')
    this.contactCTA = page.locator(
      'a:has-text("联系我们"), a:has-text("Contact Us"), a:has-text("联系")'
    )
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.waitForLoad()
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
    await this.heading.waitFor({ state: 'visible', timeout: 5000 })
  }

  async getPageTitle(): Promise<string | null> {
    return await this.heading.textContent()
  }

  async getMissionText(): Promise<string | null> {
    await this.missionSection.waitFor({ state: 'visible', timeout: 3000 })
    const textElement = this.missionSection.locator('p, .mission-text')
    return await textElement.textContent()
  }

  async getTeamMemberCount(): Promise<number> {
    await this.teamSection.waitFor({ state: 'visible', timeout: 3000 })
    return await this.teamMembers.count()
  }

  async getTeamMemberName(index: number): Promise<string | null> {
    const member = this.teamMembers.nth(index)
    if (await member.isVisible()) {
      const name = member.locator('.name, h3, h4')
      return await name.textContent()
    }
    return null
  }

  async getTeamMemberRole(index: number): Promise<string | null> {
    const member = this.teamMembers.nth(index)
    if (await member.isVisible()) {
      const role = member.locator('.role, .title')
      return await role.textContent()
    }
    return null
  }

  async clickTeamMember(index: number): Promise<void> {
    const member = this.teamMembers.nth(index)
    if (await member.isVisible()) {
      await member.click()
    }
  }

  async getValueCount(): Promise<number> {
    await this.valuesSection.waitFor({ state: 'visible', timeout: 3000 })
    const values = this.valuesSection.locator('.value, .value-item')
    return await values.count()
  }

  async getValueText(index: number): Promise<string | null> {
    const values = this.valuesSection.locator('.value, .value-item')
    const value = values.nth(index)
    if (await value.isVisible()) {
      const text = value.locator('h3, h4, .value-title')
      return await text.textContent()
    }
    return null
  }

  async clickContactCTA(): Promise<void> {
    if (await this.contactCTA.isVisible()) {
      await this.contactCTA.click()
    }
  }

  async isOnAboutPage(): Promise<boolean> {
    const url = this.page.url()
    return url.includes('/about')
  }
}
