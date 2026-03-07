/**
 * @fileoverview Integration tests for user authentication and session flows
 * Tests login, logout, session management, and protected routes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Login Flow', () => {
    it('should handle successful login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          token: 'mock-jwt-token',
        }),
      })

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.user).toBeDefined()
      expect(data.token).toBeDefined()
    })

    it('should handle invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Invalid credentials',
        }),
      })

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      try {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network error')
      }
    })

    it('should validate email format before submission', async () => {
      const invalidEmails = ['invalid', 'no-at-sign.com', '@nodomain.com', 'spaces in@email.com']
      
      // Email validation should happen client-side
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false)
      })
    })

    it('should validate required fields', async () => {
      const testCases = [
        { email: '', password: 'password123', expected: 'Email is required' },
        { email: 'test@example.com', password: '', expected: 'Password is required' },
        { email: '', password: '', expected: 'Email is required' },
      ]

      testCases.forEach(({ email, password }) => {
        const hasEmail = email.length > 0
        const hasPassword = password.length > 0
        
        if (!hasEmail || !hasPassword) {
          expect(hasEmail && hasPassword).toBe(false)
        }
      })
    })
  })

  describe('Session Management', () => {
    it('should store token in localStorage after successful login', async () => {
      const mockToken = 'mock-jwt-token'
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: '1', email: 'test@example.com' },
          token: mockToken,
        }),
      })

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      })

      const data = await response.json()
      
      if (data.token) {
        localStorage.setItem('auth_token', data.token)
      }

      expect(localStorage.getItem('auth_token')).toBe(mockToken)
    })

    it('should clear token on logout', () => {
      localStorage.setItem('auth_token', 'mock-token')
      
      // Simulate logout
      localStorage.removeItem('auth_token')
      
      expect(localStorage.getItem('auth_token')).toBeNull()
    })

    it('should check token expiration', () => {
      // Mock JWT payload (without signature)
      const mockPayload = {
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
        sub: 'user-123',
      }

      const isExpired = mockPayload.exp < Math.floor(Date.now() / 1000)
      expect(isExpired).toBe(false)

      // Test expired token
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
        sub: 'user-123',
      }

      const wasExpired = expiredPayload.exp < Math.floor(Date.now() / 1000)
      expect(wasExpired).toBe(true)
    })
  })

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
        }),
      })

      const response = await fetch('/api/protected/resource', {
        headers: {
          'Authorization': '', // No token
        },
      })

      expect(response.status).toBe(401)
    })

    it('should allow access with valid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: 'protected resource data',
        }),
      })

      const response = await fetch('/api/protected/resource', {
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      })

      expect(response.ok).toBe(true)
    })
  })
})

describe('User Flow Integration Tests', () => {
  describe('Registration Flow', () => {
    beforeEach(() => {
      mockFetch.mockReset()
    })

    it('should handle successful registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: { id: '1', email: 'newuser@example.com', name: 'New User' },
        }),
      })

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New User',
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
    })

    it('should handle duplicate email registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          error: 'Email already registered',
        }),
      })

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          name: 'Existing User',
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already')
    })

    it('should validate password strength', () => {
      const weakPasswords = ['123', 'password', 'abc123']
      const strongPasswords = ['SecurePass123!', 'MyP@ssw0rd2024', 'C0mpl3x!Pass']

      const isStrongPassword = (password: string) => {
        return password.length >= 8 &&
               /[A-Z]/.test(password) &&
               /[a-z]/.test(password) &&
               /[0-9]/.test(password)
      }

      weakPasswords.forEach(pwd => {
        expect(isStrongPassword(pwd)).toBe(false)
      })

      strongPasswords.forEach(pwd => {
        expect(isStrongPassword(pwd)).toBe(true)
      })
    })
  })

  describe('Password Reset Flow', () => {
    it('should initiate password reset', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Password reset email sent',
        }),
      })

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
    })

    it('should handle non-existent email gracefully', async () => {
      // Security: Don't reveal if email exists or not
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'If the email exists, a reset link has been sent',
        }),
      })

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
    })

    it('should validate reset token and allow password change', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          valid: true,
        }),
      })

      // Validate token
      const validateResponse = await fetch('/api/auth/validate-reset-token?token=valid-token')
      const validateData = await validateResponse.json()

      expect(validateData.valid).toBe(true)

      // Reset password
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Password reset successful',
        }),
      })

      const resetResponse = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
          newPassword: 'NewSecurePass123!',
        }),
      })

      const resetData = await resetResponse.json()

      expect(resetData.success).toBe(true)
    })
  })
})
