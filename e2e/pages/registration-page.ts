/**
 * @fileoverview Registration Page Object
 * Encapsulates user registration page interactions and locators
 */

import { Page, Locator, expect } from '@playwright/test'

export class RegistrationPage {
  readonly page: Page
  readonly url: string = '/zh/register'

  // Locators
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly submitButton: Locator
  readonly loginLink: Locator
  readonly termsCheckbox: Locator
  readonly socialLoginButtons: {
    github: Locator
    google: Locator
  }
  readonly passwordStrengthIndicator: Locator

  constructor(page: Page) {
    this.page = page

    // Initialize locators
    this.nameInput = page.locator(
      'input[name="name"], input[placeholder*="姓名"], input[placeholder*="Name"]'
    )
    this.emailInput = page.locator('input[type="email"], input[name="email"]')
    this.passwordInput = page.locator('input[type="password"], input[name="password"]')
    this.confirmPasswordInput = page.locator(
      'input[name="confirmPassword"], input[name="password_confirmation"]'
    )
    this.submitButton = page.locator(
      'button[type="submit"], button:has-text("注册"), button:has-text("Register")'
    )
    this.loginLink = page.locator('a:has-text("登录"), a:has-text("Login"), a:has-text("已有账户")')
    this.termsCheckbox = page.locator(
      'input[type="checkbox"][name="terms"], input[type="checkbox"][name="agree"]'
    )
    this.socialLoginButtons = {
      github: page.locator('button:has-text("GitHub"), text=GitHub'),
      google: page.locator('button:has-text("Google"), text=Google'),
    }
    this.passwordStrengthIndicator = page.locator('.password-strength, [data-strength]')
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url)
    await this.waitForLoad()
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
    await expect(this.nameInput).toBeVisible()
  }

  async register(data: {
    name: string
    email: string
    password: string
    confirmPassword?: string
    acceptTerms?: boolean
  }): Promise<void> {
    await this.nameInput.fill(data.name)
    await this.emailInput.fill(data.email)
    await this.passwordInput.fill(data.password)

    const confirmPassword = data.confirmPassword || data.password
    await this.confirmPasswordInput.fill(confirmPassword)

    if (data.acceptTerms && (await this.termsCheckbox.isVisible())) {
      await this.termsCheckbox.check()
    }

    await this.submitButton.click()
  }

  async acceptTerms(): Promise<void> {
    if (await this.termsCheckbox.isVisible()) {
      await this.termsCheckbox.check()
    }
  }

  async clickLoginLink(): Promise<void> {
    await this.loginLink.click()
  }

  async clickSocialLogin(provider: 'github' | 'google'): Promise<void> {
    await this.socialLoginButtons[provider].click()
  }

  async getPasswordStrength(): Promise<string | null> {
    if (await this.passwordStrengthIndicator.isVisible()) {
      return await this.passwordStrengthIndicator.getAttribute('data-strength')
    }
    return null
  }

  async isOnRegistrationPage(): Promise<boolean> {
    const url = this.page.url()
    return url.includes('/register') || url.includes('/signup')
  }

  async getErrorMessage(field: string): Promise<string | null> {
    const errorLocator = this.page.locator(`[data-error="${field}"], .${field}-error`).first()
    if (await errorLocator.isVisible()) {
      return await errorLocator.textContent()
    }
    return null
  }

  async hasValidationError(): Promise<boolean> {
    const errorLocator = this.page.locator('.error, .validation-error, text=必填, text=invalid')
    return (await errorLocator.count()) > 0
  }

  async waitForRegistrationSuccess(): Promise<void> {
    await this.page.waitForURL(/\/(dashboard|home|login)/i, { timeout: 10000 })
  }

  async waitForError(): Promise<void> {
    await expect(this.page.locator('.error, .toast.error, .alert.error')).toBeVisible({
      timeout: 5000,
    })
  }
}
