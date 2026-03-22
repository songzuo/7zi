/**
 * @fileoverview Page Object Model for Authentication Page
 * Encapsulates authentication-related interactions
 */

import { Page, Locator } from '@playwright/test';

export class AuthPage {
  readonly page: Page;

  // Login form elements
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginButton: Locator;
  readonly rememberMeCheckbox: Locator;

  // Registration form elements
  readonly registerNameInput: Locator;
  readonly registerEmailInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly registerConfirmPasswordInput: Locator;
  readonly registerButton: Locator;

  // Navigation elements
  readonly loginLink: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  // Social login buttons
  readonly githubButton: Locator;
  readonly googleButton: Locator;

  // Messages
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Login form
    this.loginEmailInput = page.locator('input[type="email"][name*="email"], input[placeholder*="邮箱"], input[placeholder*="Email"]');
    this.loginPasswordInput = page.locator('input[type="password"][name*="password"], input[placeholder*="密码"], input[placeholder*="Password"]');
    this.loginButton = page.locator('button[type="submit"]:has-text("登录"), button:has-text("Login"), button:has-text("Sign In")');
    this.rememberMeCheckbox = page.locator('input[type="checkbox"][name*="remember"]');

    // Registration form
    this.registerNameInput = page.locator('input[name*="name"], input[placeholder*="姓名"], input[placeholder*="Name"]');
    this.registerEmailInput = page.locator('input[type="email"][name*="email"]');
    this.registerPasswordInput = page.locator('input[type="password"][name*="password"]').first();
    this.registerConfirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.registerButton = page.locator('button[type="submit"]:has-text("注册"), button:has-text("Register"), button:has-text("Sign Up")');

    // Navigation
    this.loginLink = page.locator('a:has-text("登录"), a:has-text("Login"), a:has-text("Sign In")');
    this.registerLink = page.locator('a:has-text("注册"), a:has-text("Register"), a:has-text("Sign Up")');
    this.forgotPasswordLink = page.locator('a:has-text("忘记密码"), a:has-text("Forgot password")');

    // Social login
    this.githubButton = page.locator('button:has-text("GitHub"), [aria-label*="GitHub"]');
    this.googleButton = page.locator('button:has-text("Google"), [aria-label*="Google"]');

    // Messages
    this.successMessage = page.locator('.success, .toast-success, [role="status"]:has-text("成功"), [role="alert"]:has-text("成功")');
    this.errorMessage = page.locator('.error, .toast-error, [role="alert"], [class*="error"]');
  }

  /**
   * Navigate to login page
   */
  async gotoLogin() {
    await this.page.goto('/login');
  }

  /**
   * Navigate to registration page
   */
  async gotoRegistration() {
    await this.page.goto('/register');
  }

  /**
   * Login with credentials
   */
  async login(email: string, password: string) {
    await this.gotoLogin();
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Login with remember me
   */
  async loginWithRemember(email: string, password: string) {
    await this.gotoLogin();
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
    await this.rememberMeCheckbox.check();
    await this.loginButton.click();
  }

  /**
   * Register a new user
   */
  async register(name: string, email: string, password: string) {
    await this.gotoRegistration();
    await this.registerNameInput.fill(name);
    await this.registerEmailInput.fill(email);
    await this.registerPasswordInput.fill(password);
    await this.registerConfirmPasswordInput.fill(password);
    await this.registerButton.click();
  }

  /**
   * Logout
   */
  async logout() {
    await this.page.click('button:has-text("退出"), button:has-text("Logout"), [aria-label*="logout"]');
  }

  /**
   * Click forgot password
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string | null> {
    if (await this.successMessage.count() > 0) {
      return await this.successMessage.first().textContent();
    }
    return null;
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.count() > 0) {
      return await this.errorMessage.first().textContent();
    }
    return null;
  }

  /**
   * Check if on login page
   */
  async isOnLoginPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/login') || url.includes('/signin') || url.includes('/auth/login');
  }

  /**
   * Check if on registration page
   */
  async isOnRegistrationPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/register') || url.includes('/signup') || url.includes('/auth/register');
  }
}
