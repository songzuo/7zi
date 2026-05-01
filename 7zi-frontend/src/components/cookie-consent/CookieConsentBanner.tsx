'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/lib/theme'
import {
  COOKIE_CONSENT_KEY,
  DEFAULT_CONSENT,
  COOKIE_CATEGORIES,
  type CookieConsent,
  type CookieCategory,
} from '@/types/cookie-consent'

function getStoredConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) return null
    return JSON.parse(stored) as CookieConsent
  } catch {
    return null
  }
}

function saveConsent(consent: CookieConsent): void {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent))
}

function ConsentSwitch({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <label htmlFor={id} className={`text-sm font-medium cursor-pointer ${disabled ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
          {label}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        id={id}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? 'bg-indigo-600'
            : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [consent, setConsent] = useState<CookieConsent>(DEFAULT_CONSENT)
  const [animateIn, setAnimateIn] = useState(false)
  const { resolvedTheme } = useTheme()

  // Check if dark mode
  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    setMounted(true)
    const stored = getStoredConsent()
    if (stored === null) {
      // First visit - show banner
      setShowBanner(true)
      // Small delay for animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true)
        })
      })
    } else {
      setConsent(stored)
      setShowBanner(false)
    }
  }, [])

  const handleAcceptAll = useCallback(() => {
    const fullConsent: CookieConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
    }
    saveConsent(fullConsent)
    setConsent(fullConsent)
    setShowBanner(false)
    window.dispatchEvent(new CustomEvent('cookie-consent-change', { detail: fullConsent }))
  }, [])

  const handleAcceptNecessary = useCallback(() => {
    const minimalConsent: CookieConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
    }
    saveConsent(minimalConsent)
    setConsent(minimalConsent)
    setShowBanner(false)
    window.dispatchEvent(new CustomEvent('cookie-consent-change', { detail: minimalConsent }))
  }, [])

  const handleCustomChange = useCallback((category: CookieCategory, value: boolean) => {
    const updated = { ...consent, [category]: value }
    setConsent(updated)
  }, [consent])

  const handleSaveCustom = useCallback(() => {
    const finalConsent = { ...consent, necessary: true } // ensure necessary is always true
    saveConsent(finalConsent)
    setShowBanner(false)
    setShowCustomize(false)
    window.dispatchEvent(new CustomEvent('cookie-consent-change', { detail: finalConsent }))
  }, [consent])

  const handleOpenCustomize = useCallback(() => {
    setShowCustomize(true)
  }, [])

  const handleCloseCustomize = useCallback(() => {
    setShowCustomize(false)
  }, [])

  // Don't render anything on server or before mount
  if (!mounted) return null

  // Don't show if user already made a choice
  if (!showBanner) return null

  return (
    <>
      {/* Backdrop for customize panel on mobile */}
      {showCustomize && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={handleCloseCustomize}
          aria-hidden="true"
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cookie 同意管理"
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col items-stretch transition-all duration-300 ease-out ${
          animateIn
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0'
        }`}
      >
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            showCustomize
              ? 'max-h-[90vh]'
              : 'max-h-[500px]'
          }`}
        >
          {/* Main Banner */}
          <div
            className={`mx-auto w-full shadow-2xl ${
              isDark
                ? 'bg-gray-900 border-gray-800'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex flex-col gap-4 p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🍪</span>
                  <h2 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    我们使用 Cookie 来改善您的体验
                  </h2>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-medium whitespace-nowrap">
                  GDPR
                </span>
              </div>

              {/* Description */}
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                我们使用 Cookie 来增强您的浏览体验、分析网站流量和提供个性化内容。
                您可以随时在设置中修改您的偏好。
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={handleAcceptNecessary}
                  className={`order-2 sm:order-1 w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isDark
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  仅必要
                </button>
                <button
                  type="button"
                  onClick={handleOpenCustomize}
                  className={`order-1 sm:order-2 w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isDark
                      ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  自定义
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="order-0 sm:order-3 w-full sm:w-auto px-4 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  接受全部
                </button>
              </div>

              {/* Customize Panel */}
              {showCustomize && (
                <div
                  className={`mt-4 rounded-xl p-4 ${
                    isDark ? 'bg-gray-800' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Cookie 分类设置
                    </h3>
                    <button
                      type="button"
                      onClick={handleCloseCustomize}
                      className={`p-1 rounded-lg transition-colors ${
                        isDark
                          ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                          : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                      }`}
                      aria-label="关闭自定义面板"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-1">
                    {COOKIE_CATEGORIES.map((category) => (
                      <ConsentSwitch
                        key={category.id}
                        id={`cookie-${category.id}`}
                        label={category.label}
                        description={category.description}
                        checked={consent[category.id]}
                        disabled={category.required}
                        onChange={(value) => handleCustomChange(category.id, value)}
                      />
                    ))}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveCustom}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      保存设置
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile-friendly bottom safe area padding */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </>
  )
}
