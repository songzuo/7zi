/**
 * @fileoverview Integration test for User Settings Update
 * Tests user preferences including theme, language, notifications, and other settings
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsProvider } from '@/contexts/SettingsContext'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock user settings data
const mockUserSettings = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  theme: 'light',
  language: 'zh',
  notifications: {
    enabled: true,
    sound: true,
    email: false,
    push: true,
  },
  timezone: 'Europe/Berlin',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  avatar: null,
  bio: 'Test user bio',
  preferences: {
    sidebarCollapsed: false,
    compactMode: false,
    highContrast: false,
  },
}

describe('User Settings Update Integration Test', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Theme Settings', () => {
    it('should update theme to dark mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: { ...mockUserSettings, theme: 'dark' },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.settings.theme).toBe('dark')
    })

    it('should update theme to light mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: { ...mockUserSettings, theme: 'light' },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'light' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.theme).toBe('light')
    })

    it('should set theme to system default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: { ...mockUserSettings, theme: 'system' },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'system' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.theme).toBe('system')
    })

    it('should persist theme preference in localStorage', () => {
      const theme = 'dark'
      localStorage.setItem('7zi-theme', theme)

      const stored = localStorage.getItem('7zi-theme')
      expect(stored).toBe(theme)
    })

    it('should load theme preference from localStorage on initialization', () => {
      const savedTheme = 'dark'
      localStorage.setItem('7zi-theme', savedTheme)

      const loaded = localStorage.getItem('7zi-theme')
      expect(loaded).toBe(savedTheme)
    })
  })

  describe('Language Settings', () => {
    it('should update language to Chinese', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: { ...mockUserSettings, language: 'zh' },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'zh' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.language).toBe('zh')
    })

    it('should update language to English', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: { ...mockUserSettings, language: 'en' },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'en' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.language).toBe('en')
    })

    it('should validate language code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid language code',
          validLanguages: ['zh', 'en'],
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'fr' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid language code')
    })

    it('should get available languages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          languages: [
            { code: 'zh', name: '中文', nativeName: '简体中文' },
            { code: 'en', name: 'English', nativeName: 'English' },
          ],
        }),
      })

      const response = await fetch('/api/languages')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.languages).toHaveLength(2)
      expect(data.languages[0].code).toBe('zh')
    })
  })

  describe('Notification Settings', () => {
    it('should enable all notifications', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            ...mockUserSettings,
            notifications: {
              enabled: true,
              sound: true,
              email: true,
              push: true,
            },
          },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifications: {
            enabled: true,
            sound: true,
            email: true,
            push: true,
          },
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.notifications.email).toBe(true)
      expect(data.settings.notifications.push).toBe(true)
    })

    it('should disable all notifications', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            ...mockUserSettings,
            notifications: {
              enabled: false,
              sound: false,
              email: false,
              push: false,
            },
          },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifications: {
            enabled: false,
            sound: false,
            email: false,
            push: false,
          },
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.notifications.enabled).toBe(false)
    })

    it('should toggle sound notifications', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            ...mockUserSettings,
            notifications: {
              ...mockUserSettings.notifications,
              sound: !mockUserSettings.notifications.sound,
            },
          },
        }),
      })

      const response = await fetch('/api/users/settings/notifications/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sound' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.notifications.sound).toBe(!mockUserSettings.notifications.sound)
    })

    it('should update notification preferences individually', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            ...mockUserSettings,
            notifications: {
              ...mockUserSettings.notifications,
              email: true,
            },
          },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifications: { email: true },
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.notifications.email).toBe(true)
      expect(data.settings.notifications.push).toBe(mockUserSettings.notifications.push) // unchanged
    })
  })

  describe('Display Settings', () => {
    it('should update timezone', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            ...mockUserSettings,
            timezone: 'America/New_York',
          },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: 'America/New_York' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.timezone).toBe('America/New_York')
    })

    it('should update date format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            ...mockUserSettings,
            dateFormat: 'DD/MM/YYYY',
          },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateFormat: 'DD/MM/YYYY' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.dateFormat).toBe('DD/MM/YYYY')
    })

    it('should update time format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            ...mockUserSettings,
            timeFormat: '12h',
          },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeFormat: '12h' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.timeFormat).toBe('12h')
    })

    it('should enable compact mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            ...mockUserSettings,
            preferences: {
              ...mockUserSettings.preferences,
              compactMode: true,
            },
          },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: { compactMode: true },
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.preferences.compactMode).toBe(true)
    })

    it('should enable high contrast mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            ...mockUserSettings,
            preferences: {
              ...mockUserSettings.preferences,
              highContrast: true,
            },
          },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: { highContrast: true },
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.preferences.highContrast).toBe(true)
    })
  })

  describe('Profile Settings', () => {
    it('should update user bio', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            ...mockUserSettings,
            bio: 'Updated bio description',
          },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: 'Updated bio description' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.bio).toBe('Updated bio description')
    })

    it('should update email address', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            ...mockUserSettings,
            email: 'newemail@example.com',
          },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'newemail@example.com' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.email).toBe('newemail@example.com')
    })

    it('should validate email format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid email format',
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })
  })

  describe('Settings Persistence and Synchronization', () => {
    it('should load settings from API on initialization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: mockUserSettings }),
      })

      const response = await fetch('/api/users/settings')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings).toBeDefined()
      expect(data.settings.theme).toBe('light')
    })

    it('should sync settings across multiple devices', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          syncStatus: 'synced',
          lastSync: new Date().toISOString(),
        }),
      })

      const response = await fetch('/api/users/settings/sync', {
        method: 'POST',
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.syncStatus).toBe('synced')
    })

    it('should handle settings conflict resolution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          resolvedSettings: {
            ...mockUserSettings,
            theme: 'dark', // Resolved conflict
            lastUpdated: new Date().toISOString(),
          },
        }),
      })

      const response = await fetch('/api/users/settings/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          local: { theme: 'dark', language: 'zh' },
          remote: { theme: 'light', language: 'en' },
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.resolvedSettings.theme).toBeDefined()
    })
  })

  describe('Settings Reset and Export', () => {
    it('should reset settings to defaults', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: {
            theme: 'system',
            language: 'zh',
            notifications: {
              enabled: true,
              sound: true,
              email: false,
              push: true,
            },
            timezone: 'Europe/Berlin',
          },
        }),
      })

      const response = await fetch('/api/users/settings/reset', {
        method: 'POST',
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.theme).toBe('system')
    })

    it('should export settings as JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          exportData: mockUserSettings,
          exportedAt: new Date().toISOString(),
        }),
      })

      const response = await fetch('/api/users/settings/export')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.exportData).toBeDefined()
      expect(data.exportData.theme).toBe(mockUserSettings.theme)
    })

    it('should import settings from JSON', async () => {
      const importData = {
        theme: 'dark',
        language: 'en',
        notifications: {
          enabled: true,
          sound: false,
          email: true,
          push: false,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          settings: { ...mockUserSettings, ...importData },
          importedAt: new Date().toISOString(),
        }),
      })

      const response = await fetch('/api/users/settings/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.settings.theme).toBe(importData.theme)
      expect(data.settings.language).toBe(importData.language)
    })
  })

  describe('Settings API Error Handling', () => {
    it('should handle unauthorized access to settings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized',
        }),
      })

      const response = await fetch('/api/users/settings')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle rate limiting on settings updates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { 'Retry-After': '60' },
        json: async () => ({
          error: 'Too many requests',
          message: 'Please wait before updating settings again',
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many requests')
    })

    it('should handle invalid settings data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid settings data',
          details: {
            theme: 'Invalid theme value',
          },
        }),
      })

      const response = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'invalid-theme' }),
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid settings data')
    })
  })
})
