/**
 * @fileoverview Page Object Model for Navigation
 */

import { Page, Locator } from '@playwright/test'

export class NavigationPage {
  readonly page: Page
  readonly mainNav: Locator
  readonly homeLink: Locator
  readonly dashboardLink: Locator
  readonly tasksLink: Locator
  readonly teamLink: Locator
  readonly settingsLink: Locator
  readonly aboutLink: Locator
  readonly contactLink: Locator
  readonly blogLink: Locator
  readonly userMenu: Locator
  readonly logoutButton: Locator
  readonly themeToggle: Locator
  readonly languageSelector: Locator
  readonly mobileMenuToggle: Locator

  constructor(page: Page) {
    this.page = page

    // Main navigation
    this.mainNav = page.locator('nav')

    // Navigation links
    this.homeLink = page.locator('a:has-text("首页"), a:has-text("Home")')
    this.dashboardLink = page.locator('a:has-text("实时看板"), a:has-text("Dashboard")')
    this.tasksLink = page.locator('a:has-text("任务"), a:has-text("Tasks")')
    this.teamLink = page.locator('a:has-text("团队"), a:has-text("Team")')
    this.settingsLink = page.locator('a:has-text("设置"), a:has-text("Settings")')
    this.aboutLink = page.locator('a:has-text("关于"), a:has-text("About")')
    this.contactLink = page.locator('a:has-text("联系"), a:has-text("Contact")')
    this.blogLink = page.locator('a:has-text("博客"), a:has-text("Blog")')

    // User menu
    this.userMenu = page.locator('[class*="user-menu"], [aria-label*="user"]')
    this.logoutButton = page.locator(
      'button:has-text("退出"), button:has-text("Logout"), button:has-text("Sign Out")'
    )

    // Theme and language
    this.themeToggle = page.locator(
      'button[aria-label*="theme"], button[aria-label*="mode"], .theme-toggle'
    )
    this.languageSelector = page.locator('select[name="lang"], .language-selector')

    // Mobile menu
    this.mobileMenuToggle = page.locator('button[aria-label*="menu"], .mobile-menu-toggle')
  }

  /**
   * Navigate to home
   */
  async goToHome() {
    await this.homeLink.click()
  }

  /**
   * Navigate to dashboard
   */
  async goToDashboard() {
    await this.dashboardLink.click()
  }

  /**
   * Navigate to tasks
   */
  async goToTasks() {
    await this.tasksLink.click()
  }

  /**
   * Navigate to team
   */
  async goToTeam() {
    await this.teamLink.click()
  }

  /**
   * Navigate to settings
   */
  async goToSettings() {
    await this.settingsLink.click()
  }

  /**
   * Navigate to about
   */
  async goToAbout() {
    await this.aboutLink.click()
  }

  /**
   * Navigate to contact
   */
  async goToContact() {
    await this.contactLink.click()
  }

  /**
   * Navigate to blog
   */
  async goToBlog() {
    await this.blogLink.click()
  }

  /**
   * Open user menu
   */
  async openUserMenu() {
    await this.userMenu.click()
  }

  /**
   * Logout
   */
  async logout() {
    await this.openUserMenu()
    await this.logoutButton.click()
  }

  /**
   * Toggle theme (light/dark)
   */
  async toggleTheme() {
    await this.themeToggle.click()
  }

  /**
   * Set theme to light
   */
  async setLightTheme() {
    const currentTheme = await this.page.evaluate(() => {
      return document.documentElement.classList.contains('dark')
    })

    if (currentTheme) {
      await this.themeToggle.click()
    }
  }

  /**
   * Set theme to dark
   */
  async setDarkTheme() {
    const currentTheme = await this.page.evaluate(() => {
      return document.documentElement.classList.contains('dark')
    })

    if (!currentTheme) {
      await this.themeToggle.click()
    }
  }

  /**
   * Change language
   */
  async changeLanguage(lang: string) {
    await this.languageSelector.selectOption(lang)
  }

  /**
   * Toggle mobile menu
   */
  async toggleMobileMenu() {
    await this.mobileMenuToggle.click()
  }

  /**
   * Check if link is active
   */
  async isLinkActive(link: Locator): Promise<boolean> {
    const className = (await link.getAttribute('class')) || ''
    return className.includes('active') || className.includes('selected')
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    return await this.userMenu.isVisible()
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url()
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle')
  }
}
