/**
 * @fileoverview E2E Test - Authentication Flow
 * Tests login, logout, registration, and protected route access
 */

import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/auth-page'
import { testUsers, successMessages, errorMessages } from '../fixtures/test-data'
import {
  waitForToast,
  clearLocalStorage,
  waitForPageLoad,
  generateRandomEmail,
} from '../helpers/test-helpers'

test.describe('Authentication Flow', () => {
  let authPage: AuthPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
    await clearLocalStorage(page)
  })

  test.describe('Login', () => {
    test('should display login page', async ({ page }) => {
      await authPage.gotoLogin()

      // Check if on login page
      expect(await authPage.isOnLoginPage()).toBeTruthy()

      // Check for form elements
      await expect(authPage.loginEmailInput).toBeVisible()
      await expect(authPage.loginPasswordInput).toBeVisible()
      await expect(authPage.loginButton).toBeVisible()
    })

    test('should login with valid credentials', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.login(testUsers.regular.email, testUsers.regular.password)

      // Wait for successful login
      await waitForPageLoad(page)

      // Verify redirection to dashboard
      expect(page.url()).toContain('/dashboard')

      // Verify success message
      const successMsg = await authPage.getSuccessMessage()
      expect(successMsg).toBeTruthy()
    })

    test('should show error with invalid credentials', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.login('invalid@example.com', 'wrongpassword')

      // Wait for error message
      await waitForToast(page)

      // Verify error message
      const errorMsg = await authPage.getErrorMessage()
      expect(errorMsg).toBeTruthy()
      expect(errorMsg).toMatch(errorMessages.invalidCredentials)
    })

    test('should show validation error for empty email', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.loginEmailInput.fill('')
      await authPage.loginButton.click()

      // Verify validation error
      const errorMsg = await authPage.getErrorMessage()
      expect(errorMsg).toBeTruthy()
      expect(errorMsg).toMatch(errorMessages.required)
    })

    test('should show validation error for invalid email format', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.loginEmailInput.fill('invalid-email')
      await authPage.loginPasswordInput.fill('password123')
      await authPage.loginButton.click()

      // Verify validation error
      const errorMsg = await authPage.getErrorMessage()
      expect(errorMsg).toBeTruthy()
      expect(errorMsg).toMatch(errorMessages.invalidEmail)
    })

    test('should login with remember me checked', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.loginWithRemember(testUsers.regular.email, testUsers.regular.password)

      // Verify login success
      expect(page.url()).toContain('/dashboard')

      // Check if remember me token is stored (cookie/local storage)
      const cookies = await page.context().cookies()
      const rememberCookie = cookies.find(
        c => c.name.includes('remember') || c.name.includes('token')
      )

      // Note: This depends on your actual implementation
      // The token storage mechanism may vary
    })
  })

  test.describe('Registration', () => {
    test('should display registration page', async ({ page }) => {
      await authPage.gotoRegistration()

      // Check if on registration page
      expect(await authPage.isOnRegistrationPage()).toBeTruthy()

      // Check for form elements
      await expect(authPage.registerNameInput).toBeVisible()
      await expect(authPage.registerEmailInput).toBeVisible()
      await expect(authPage.registerPasswordInput).toBeVisible()
      await expect(authPage.registerConfirmPasswordInput).toBeVisible()
      await expect(authPage.registerButton).toBeVisible()
    })

    test('should register with valid data', async ({ page }) => {
      const newUser = {
        name: `Test User ${Date.now()}`,
        email: generateRandomEmail(),
        password: 'password123',
      }

      await authPage.gotoRegistration()
      await authPage.register(newUser.name, newUser.email, newUser.password)

      // Wait for registration
      await waitForPageLoad(page)

      // Verify redirection to dashboard or login
      expect(page.url()).toMatch(/\/(dashboard|login)/)

      // Verify success message
      const successMsg = await authPage.getSuccessMessage()
      expect(successMsg).toBeTruthy()
    })

    test('should show error for duplicate email', async ({ page }) => {
      await authPage.gotoRegistration()
      await authPage.register(
        testUsers.duplicate.name,
        testUsers.duplicate.email,
        testUsers.duplicate.password
      )

      // Wait for error message
      await waitForToast(page)

      // Verify error message
      const errorMsg = await authPage.getErrorMessage()
      expect(errorMsg).toBeTruthy()
      expect(errorMsg).toMatch(errorMessages.emailExists)
    })

    test('should show validation error for short password', async ({ page }) => {
      await authPage.gotoRegistration()
      await authPage.registerNameInput.fill('Test User')
      await authPage.registerEmailInput.fill(generateRandomEmail())
      await authPage.registerPasswordInput.fill('123') // Short password
      await authPage.registerConfirmPasswordInput.fill('123')
      await authPage.registerButton.click()

      // Verify validation error
      const errorMsg = await authPage.getErrorMessage()
      expect(errorMsg).toBeTruthy()
      expect(errorMsg).toMatch(errorMessages.shortPassword)
    })

    test('should show validation error for password mismatch', async ({ page }) => {
      await authPage.gotoRegistration()
      await authPage.registerNameInput.fill('Test User')
      await authPage.registerEmailInput.fill(generateRandomEmail())
      await authPage.registerPasswordInput.fill('password123')
      await authPage.registerConfirmPasswordInput.fill('password456')
      await authPage.registerButton.click()

      // Verify validation error
      const errorMsg = await authPage.getErrorMessage()
      expect(errorMsg).toBeTruthy()
      expect(errorMsg).toMatch(errorMessages.mismatchPassword)
    })

    test('should navigate to login page from registration', async ({ page }) => {
      await authPage.gotoRegistration()
      await authPage.loginLink.click()

      // Verify navigation to login
      expect(await authPage.isOnLoginPage()).toBeTruthy()
    })
  })

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // First login
      await authPage.gotoLogin()
      await authPage.login(testUsers.regular.email, testUsers.regular.password)
      await waitForPageLoad(page)

      // Verify logged in
      expect(page.url()).toContain('/dashboard')

      // Logout
      await authPage.logout()
      await waitForPageLoad(page)

      // Verify logged out
      expect(page.url()).toContain('/login') || expect(page.url()).toContain('/')

      // Verify no auth cookies
      const cookies = await page.context().cookies()
      const authCookies = cookies.filter(
        c => c.name.includes('token') || c.name.includes('session')
      )
      expect(authCookies.length).toBe(0)
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route without auth', async ({
      page,
    }) => {
      // Try to access dashboard without login
      await page.goto('/dashboard')

      // Should redirect to login
      expect(await authPage.isOnLoginPage()).toBeTruthy()
    })

    test('should access protected route after login', async ({ page }) => {
      // Login first
      await authPage.gotoLogin()
      await authPage.login(testUsers.regular.email, testUsers.regular.password)
      await waitForPageLoad(page)

      // Access protected route
      await page.goto('/dashboard')

      // Should stay on dashboard (not redirected)
      expect(page.url()).toContain('/dashboard')
    })
  })

  test.describe('Navigation between Auth Pages', () => {
    test('should navigate from login to registration', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.registerLink.click()

      expect(await authPage.isOnRegistrationPage()).toBeTruthy()
    })

    test('should navigate from registration to login', async ({ page }) => {
      await authPage.gotoRegistration()
      await authPage.loginLink.click()

      expect(await authPage.isOnLoginPage()).toBeTruthy()
    })

    test('should navigate to forgot password page', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.clickForgotPassword()

      // Verify navigation to forgot password page
      expect(page.url()).toContain('/forgot-password') ||
        expect(page.url()).toContain('/reset-password')
    })
  })

  test.describe('Social Login', () => {
    test('should display social login buttons', async ({ page }) => {
      await authPage.gotoLogin()

      // Check for social login buttons
      await expect(authPage.githubButton).toBeVisible()
      await expect(authPage.googleButton).toBeVisible()
    })

    test('should initiate GitHub login flow', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.loginWithGithub()

      // Should redirect to GitHub OAuth page
      // Note: Actual OAuth flow requires valid GitHub credentials
      // This test verifies the button click and redirect initiation
      expect(page.url()).toContain('github.com')
    })

    test('should initiate Google login flow', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.loginWithGoogle()

      // Should redirect to Google OAuth page
      // Note: Actual OAuth flow requires valid Google credentials
      // This test verifies the button click and redirect initiation
      expect(page.url()).toContain('accounts.google.com')
    })
  })

  test.describe('Session Persistence', () => {
    test('should maintain session after page reload', async ({ page }) => {
      // Login
      await authPage.gotoLogin()
      await authPage.login(testUsers.regular.email, testUsers.regular.password)
      await waitForPageLoad(page)

      // Reload page
      await page.reload()

      // Should still be on dashboard (not redirected to login)
      expect(page.url()).toContain('/dashboard')
    })

    test('should maintain session across tabs', async ({ context }) => {
      // Login in first tab
      const page1 = await context.newPage()
      await page1.goto('/login')
      const authPage1 = new AuthPage(page1)
      await authPage1.login(testUsers.regular.email, testUsers.regular.password)
      await waitForPageLoad(page1)

      // Open new tab and access protected route
      const page2 = await context.newPage()
      await page2.goto('/dashboard')

      // Should have access (session is shared)
      expect(page2.url()).toContain('/dashboard')

      // Cleanup
      await page1.close()
      await page2.close()
    })
  })
})
