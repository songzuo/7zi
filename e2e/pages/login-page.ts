/**
 * @fileoverview Page Object Model for Login Page
 */

import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly githubButton: Locator;
  readonly googleButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form elements
    this.emailInput = page.locator('input[type="email"], input[name="email"]');
    this.passwordInput = page.locator('input[type="password"], input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.rememberMeCheckbox = page.locator('input[type="checkbox"][name="remember"]');

    // Links and buttons
    this.forgotPasswordLink = page.locator('text=忘记密码, Forgot password');
    this.registerLink = page.locator('text=注册, Register, Sign Up');
    this.githubButton = page.locator('button:has-text("GitHub"), [aria-label*="GitHub"]');
    this.googleButton = page.locator('button:has-text("Google"), [aria-label*="Google"]');

    // Messages
    this.errorMessage = page.locator('[role="alert"], .error, [class*="error"]');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/zh/login');
  }

  /**
   * Fill login form
   */
  async fillForm(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Login with credentials
   */
  async login(email: string, password: string) {
    await this.fillForm(email, password);
    await this.submit();
  }

  /**
   * Toggle remember me
   */
  async toggleRememberMe() {
    await this.rememberMeCheckbox.check();
  }

  /**
   * Check if on login page
   */
  async isOnLoginPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/login') || url.includes('/auth');
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.count() > 0) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Click forgot password
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * Click register link
   */
  async clickRegister() {
    await this.registerLink.click();
  }

  /**
   * Login with GitHub
   */
  async loginWithGithub() {
    await this.githubButton.click();
  }

  /**
   * Login with Google
   */
  async loginWithGoogle() {
    await this.googleButton.click();
  }
}
