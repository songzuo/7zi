/**
 * GDPR Cookie Consent Banner - Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import CookieConsentBanner from './CookieConsentBanner'
import {
  COOKIE_CONSENT_KEY,
  DEFAULT_CONSENT,
  COOKIE_CATEGORIES,
  type CookieConsent,
} from '@/types/cookie-consent'

// Mock ThemeContext from @/lib/theme
vi.mock('@/lib/theme', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    mode: 'light' as const,
    setMode: vi.fn(),
    toggle: vi.fn(),
  }),
}))

// Helper to reset localStorage and DOM
function setupLocalStorage() {
  const store: Record<string, string> = {}
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value },
      removeItem: (key: string) => { delete store[key] },
      clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    },
    writable: true,
  })
  return store
}

describe('CookieConsentBanner', () => {
  let store: Record<string, string>

  beforeEach(() => {
    vi.clearAllMocks()
    store = setupLocalStorage()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Initial render', () => {
    it('shows banner on first visit (no stored consent)', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('我们使用 Cookie 来改善您的体验')).toBeInTheDocument()
    })

    it('does NOT show banner when consent is already stored', async () => {
      const existingConsent: CookieConsent = { necessary: true, analytics: true, marketing: false }
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(existingConsent))

      await act(async () => {
        render(<CookieConsentBanner />)
      })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows all three action buttons', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })
      expect(screen.getByRole('button', { name: '接受全部' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '仅必要' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '自定义' })).toBeInTheDocument()
    })
  })

  describe('Accept All', () => {
    it('saves full consent to localStorage', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '接受全部' }))
      })

      const saved = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY)!)
      expect(saved).toEqual({ necessary: true, analytics: true, marketing: true })
    })

    it('hides banner after accepting all', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '接受全部' }))
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('dispatches cookie-consent-change event', async () => {
      const eventListener = vi.fn()
      window.addEventListener('cookie-consent-change', eventListener)

      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '接受全部' }))
      })

      expect(eventListener).toHaveBeenCalledTimes(1)
      const event = eventListener.mock.calls[0][0] as CustomEvent<CookieConsent>
      expect(event.detail).toEqual({ necessary: true, analytics: true, marketing: true })

      window.removeEventListener('cookie-consent-change', eventListener)
    })
  })

  describe('Accept Necessary Only', () => {
    it('saves minimal consent to localStorage', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '仅必要' }))
      })

      const saved = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY)!)
      expect(saved).toEqual({ necessary: true, analytics: false, marketing: false })
    })

    it('hides banner after accepting necessary only', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '仅必要' }))
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Customize Panel', () => {
    it('opens customize panel when "自定义" is clicked', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '自定义' }))
      })

      expect(screen.getByText('Cookie 分类设置')).toBeInTheDocument()
      expect(screen.getByText('必要 Cookie')).toBeInTheDocument()
      expect(screen.getByText('分析 Cookie')).toBeInTheDocument()
      expect(screen.getByText('营销 Cookie')).toBeInTheDocument()
    })

    it('shows all three cookie category switches in customize panel', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '自定义' }))
      })

      const switches = screen.getAllByRole('switch')
      expect(switches).toHaveLength(3)
    })

    it('does not allow disabling necessary cookies', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '自定义' }))
      })

      const necessarySwitch = document.getElementById('cookie-necessary')
      expect(necessarySwitch).toBeInTheDocument()
      expect(necessarySwitch).toHaveAttribute('aria-checked', 'true')
      expect(necessarySwitch).toBeDisabled()
    })

    it('allows toggling analytics cookies', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '自定义' }))
      })

      const switches = screen.getAllByRole('switch')
      // First switch is "necessary" (disabled), second is "analytics"
      const analyticsSwitch = switches[1]
      expect(analyticsSwitch).not.toBeDisabled()

      await act(async () => {
        fireEvent.click(analyticsSwitch)
      })

      expect(analyticsSwitch).toHaveAttribute('aria-checked', 'true')
    })

    it('saves custom preferences when "保存设置" is clicked', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '自定义' }))
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '保存设置' }))
      })

      const saved = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY)!)
      expect(saved.necessary).toBe(true) // necessary always true
      expect(typeof saved.analytics).toBe('boolean')
      expect(typeof saved.marketing).toBe('boolean')
    })

    it('hides banner after saving custom preferences', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '自定义' }))
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '保存设置' }))
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('closes customize panel when close button is clicked', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '自定义' }))
      })

      expect(screen.getByText('Cookie 分类设置')).toBeInTheDocument()

      const closeButton = screen.getByRole('button', { name: '关闭自定义面板' })

      await act(async () => {
        fireEvent.click(closeButton)
      })

      expect(screen.queryByText('Cookie 分类设置')).not.toBeInTheDocument()
    })
  })

  describe('Consent persistence', () => {
    it('reads and applies stored consent on mount', async () => {
      const storedConsent: CookieConsent = { necessary: true, analytics: false, marketing: true }
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(storedConsent))

      await act(async () => {
        render(<CookieConsentBanner />)
      })

      // Banner should NOT show because consent already exists
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('GDPR badge is visible in banner', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      expect(screen.getByText('GDPR')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('dialog has aria-modal attribute', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('dialog has aria-label', async () => {
      await act(async () => {
        render(<CookieConsentBanner />)
      })

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Cookie 同意管理')
    })
  })
})
