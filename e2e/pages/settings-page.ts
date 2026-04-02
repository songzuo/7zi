/**
 * @fileoverview Settings Page Object
 * Encapsulates settings page interactions and locators
 */

import { Page, Locator } from '@playwright/test'

export class SettingsPage {
  readonly page: Page
  readonly url: string = '/settings'

  // Locators
  readonly heading: Locator
  readonly settingsNav: Locator
  readonly settingsSections: Locator
  readonly profileSection: Locator
  readonly accountSection: Locator
  readonly notificationsSection: Locator
  readonly appearanceSection: Locator
  readonly securitySection: Locator
  readonly languageSection: Locator

  // Profile form locators
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly bioTextarea: Locator
  readonly avatarUpload: Locator
  readonly saveProfileButton: Locator

  // Theme locators
  readonly themeToggle: Locator
  readonly darkModeSwitch: Locator
  readonly lightModeSwitch: Locator

  // Language locators
  readonly languageSelect: Locator
  readonly languageOptions: Locator

  constructor(page: Page) {
    this.page = page

    // Initialize locators
    this.heading = page.locator('h1, .page-title').filter({ hasText: /设置|Settings/i })
    this.settingsNav = page.locator('.settings-nav, .settings-sidebar')
    this.settingsSections = page.locator('.settings-section, .settings-panel')
    this.profileSection = page.locator('[data-section="profile"], .profile-section')
    this.accountSection = page.locator('[data-section="account"], .account-section')
    this.notificationsSection = page.locator(
      '[data-section="notifications"], .notifications-section'
    )
    this.appearanceSection = page.locator('[data-section="appearance"], .appearance-section')
    this.securitySection = page.locator('[data-section="security"], .security-section')
    this.languageSection = page.locator('[data-section="language"], .language-section')

    // Profile form
    this.nameInput = this.profileSection.locator(
      'input[name="name"], input[placeholder*="姓名"], input[placeholder*="Name"]'
    )
    this.emailInput = this.profileSection.locator('input[type="email"], input[name="email"]')
    this.bioTextarea = this.profileSection.locator(
      'textarea[name="bio"], textarea[placeholder*="简介"], textarea[placeholder*="Bio"]'
    )
    this.avatarUpload = this.profileSection.locator('input[type="file"], .avatar-upload')
    this.saveProfileButton = this.profileSection.locator(
      'button:has-text("保存"), button:has-text("Save")'
    )

    // Theme
    this.themeToggle = page.locator('.theme-toggle, [aria-label*="Theme"]')
    this.darkModeSwitch = page.locator('input[value="dark"], .dark-mode')
    this.lightModeSwitch = page.locator('input[value="light"], .light-mode')

    // Language
    this.languageSelect = page.locator('select[name="language"], [role="combobox"]')
    this.languageOptions = page.locator('.language-option, [data-language]')
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

  async navigateToSection(section: string): Promise<void> {
    const navItem = this.settingsNav
      .locator(`a:has-text("${section}"), button:has-text("${section}")`)
      .first()
    if (await navItem.isVisible()) {
      await navItem.click()
      await this.page.waitForTimeout(500)
    }
  }

  async fillName(name: string): Promise<void> {
    if (await this.nameInput.isVisible()) {
      await this.nameInput.fill(name)
    }
  }

  async fillEmail(email: string): Promise<void> {
    if (await this.emailInput.isVisible()) {
      await this.emailInput.fill(email)
    }
  }

  async fillBio(bio: string): Promise<void> {
    if (await this.bioTextarea.isVisible()) {
      await this.bioTextarea.fill(bio)
    }
  }

  async uploadAvatar(filePath: string): Promise<void> {
    if (await this.avatarUpload.isVisible()) {
      await this.avatarUpload.setInputFiles(filePath)
    }
  }

  async saveProfile(): Promise<void> {
    if (await this.saveProfileButton.isVisible()) {
      await this.saveProfileButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  async toggleTheme(): Promise<void> {
    if (await this.themeToggle.isVisible()) {
      await this.themeToggle.click()
      await this.page.waitForTimeout(500)
    }
  }

  async selectDarkMode(): Promise<void> {
    if (await this.darkModeSwitch.isVisible()) {
      await this.darkModeSwitch.click()
      await this.page.waitForTimeout(500)
    }
  }

  async selectLightMode(): Promise<void> {
    if (await this.lightModeSwitch.isVisible()) {
      await this.lightModeSwitch.click()
      await this.page.waitForTimeout(500)
    }
  }

  async selectLanguage(language: string): Promise<void> {
    if (await this.languageSelect.isVisible()) {
      await this.languageSelect.click()
      await this.page.waitForTimeout(300)

      const option = this.languageOptions.filter({ hasText: language }).first()
      if (await option.isVisible()) {
        await option.click()
        await this.page.waitForTimeout(500)
      }
    }
  }

  async getCurrentLanguage(): Promise<string | null> {
    const currentOption = this.languageSelect.locator('option:checked, [aria-selected="true"]')
    if (await currentOption.isVisible()) {
      return await currentOption.textContent()
    }
    return null
  }

  async getCurrentTheme(): Promise<'light' | 'dark' | null> {
    const html = this.page.locator('html')
    const classList = (await html.getAttribute('class')) || ''

    if (classList.includes('dark')) return 'dark'
    if (classList.includes('light')) return 'light'
    return null
  }

  async isDarkMode(): Promise<boolean> {
    const theme = await this.getCurrentTheme()
    return theme === 'dark'
  }

  async enableEmailNotifications(): Promise<void> {
    await this.navigateToSection('通知' || 'Notifications')
    const toggle = this.notificationsSection.locator(
      'input[type="checkbox"][name="email"], .toggle.email-notifications'
    )
    if (await toggle.isVisible()) {
      await toggle.click()
    }
  }

  async enablePushNotifications(): Promise<void> {
    await this.navigateToSection('通知' || 'Notifications')
    const toggle = this.notificationsSection.locator(
      'input[type="checkbox"][name="push"], .toggle.push-notifications'
    )
    if (await toggle.isVisible()) {
      await toggle.click()
    }
  }

  async setNotificationFrequency(frequency: string): Promise<void> {
    await this.navigateToSection('通知' || 'Notifications')
    const select = this.notificationsSection.locator('select[name="frequency"]')
    if (await select.isVisible()) {
      await select.selectOption(frequency)
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.navigateToSection('安全' || 'Security')

    const currentPassInput = this.securitySection.locator(
      'input[name="currentPassword"], input[placeholder*="当前"]'
    )
    const newPassInput = this.securitySection.locator(
      'input[name="newPassword"], input[placeholder*="新密码"]'
    )
    const confirmPassInput = this.securitySection.locator(
      'input[name="confirmPassword"], input[placeholder*="确认"]'
    )
    const saveButton = this.securitySection.locator(
      'button:has-text("修改密码"), button:has-text("Change Password")'
    )

    if (await currentPassInput.isVisible()) {
      await currentPassInput.fill(currentPassword)
      await newPassInput.fill(newPassword)
      await confirmPassInput.fill(newPassword)
      await saveButton.click()
    }
  }

  async enableTwoFactorAuth(): Promise<void> {
    await this.navigateToSection('安全' || 'Security')

    const toggle = this.securitySection.locator(
      'input[type="checkbox"][name="2fa"], .toggle.two-factor'
    )
    if (await toggle.isVisible()) {
      await toggle.click()
    }
  }

  async isOnSettingsPage(): Promise<boolean> {
    const url = this.page.url()
    return url.includes('/settings')
  }

  async getActiveSection(): Promise<string | null> {
    const activeNav = this.settingsNav.locator('.active, [aria-selected="true"]')
    if (await activeNav.isVisible()) {
      return await activeNav.textContent()
    }
    return null
  }

  async saveAllSettings(): Promise<void> {
    const saveButtons = this.page.locator('button:has-text("保存"), button:has-text("Save")')
    const count = await saveButtons.count()

    for (let i = 0; i < count; i++) {
      const button = saveButtons.nth(i)
      if (await button.isVisible()) {
        await button.click()
        await this.page.waitForTimeout(300)
      }
    }
  }

  async resetSettings(): Promise<void> {
    const resetButton = this.page.locator('button:has-text("重置"), button:has-text("Reset")')
    if (await resetButton.isVisible()) {
      await resetButton.click()

      // Confirm reset
      const confirmButton = this.page.locator('button:has-text("确认"), button:has-text("Confirm")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }
    }
  }
}
