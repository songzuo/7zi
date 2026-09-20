'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { SettingsButton } from './SettingsButton'
import { LanguageSwitcherCompact } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'

interface NavItem {
  href: string
  icon: string
  labelKey: string
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    icon: '🏠',
    labelKey: 'home',
  },
  {
    href: '/dashboard',
    icon: '📊',
    labelKey: 'dashboard',
  },
  {
    href: '/subagents',
    icon: '🤖',
    labelKey: 'subagents',
  },
  {
    href: '/tasks',
    icon: '📋',
    labelKey: 'tasks',
  },
  {
    href: '/memory',
    icon: '🧠',
    labelKey: 'memory',
  },
]

export function Navigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const prevPathnameRef = React.useRef(pathname)
  const t = useTranslations('nav')

  // Memoize class name generators to prevent function recreation on every render
  const getNavLinkClasses = useCallback(
    (itemHref: string) => {
      const isActive = pathname === itemHref || pathname?.startsWith(`${itemHref}/`)
      return `
      px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300
      flex items-center gap-2 relative overflow-hidden
      min-h-[44px] min-w-[44px]  /* Touch-friendly minimum sizes */
      ${
        isActive
          ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 shadow-sm ring-1 ring-cyan-500 dark:ring-cyan-400'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
      }
      hover:scale-105 active:scale-95
      touch-active
    `
    },
    [pathname]
  )

  const getMobileNavLinkClasses = useCallback(
    (itemHref: string) => {
      const isActive = pathname === itemHref || pathname?.startsWith(`${itemHref}/`)
      return `
      flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200
      min-h-[56px] w-full text-left relative overflow-hidden
      ${
        isActive
          ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700'
      }
      hover:translate-x-1 active:scale-[0.98]
      touch-active
    `
    },
    [pathname]
  )

  // Route change: close menu - use useLayoutEffect to avoid cascading renders
  React.useLayoutEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname
      setIsMobileMenuOpen(false)
    }
  }, [pathname])

  // Prevent background scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }

    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
  }, [isMobileMenuOpen])

  // ESC key to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMobileMenuOpen])

  const toggleMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
  }, [])

  const closeMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Large touch target */}
          <Link
            href="/"
            className="touch-active flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-lg p-2 transition-transform active:scale-95"
          >
            <span className="text-2xl" aria-hidden="true">
              🤖
            </span>
            <span className="hidden font-bold text-zinc-900 sm:inline dark:text-white">
              {t('siteNameShort')}
            </span>
          </Link>

          {/* Navigation Links - Desktop Only */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={getNavLinkClasses(item.href)}
                aria-label={t(item.labelKey)}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </Link>
            ))}
          </div>

          {/* Right Actions + Hamburger Menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcherCompact className="hidden sm:flex" />
            <SettingsButton compact className="hidden sm:flex" />

            {/* Mobile Hamburger Menu Button - Optimized Touch Target */}
            <button
              onClick={toggleMenu}
              className="touch-active flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl p-3 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:scale-95 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label={isMobileMenuOpen ? t('mobileMenu.close') : t('mobileMenu.open')}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-haspopup="true"
            >
              <div className="flex h-6 w-6 flex-col items-center justify-center gap-1.5">
                <span
                  className={`h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
                    isMobileMenuOpen ? 'translate-y-2 rotate-45' : ''
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
                    isMobileMenuOpen ? 'scale-0 opacity-0' : ''
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
                    isMobileMenuOpen ? '-translate-y-2 -rotate-45' : ''
                  }`}
                  aria-hidden="true"
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Out Menu - Full Screen */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 z-50 transition-all duration-300 ease-out md:hidden ${
          isMobileMenuOpen ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="导航菜单"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={closeMenu}
          aria-hidden="true"
        />

        {/* Menu Panel - Improved mobile width */}
        <div
          className={`absolute top-0 right-0 flex h-full w-[min(300px,85vw)] transform flex-col bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-zinc-900 ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{
            paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            paddingTop: 'max(0px, env(safe-area-inset-top))',
          }}
        >
          {/* Header */}
          <div className="flex-shrink-0 border-b border-zinc-200 p-4 sm:p-6 dark:border-zinc-700">
            <Link
              href="/"
              className="touch-active inline-block min-h-[44px] rounded-lg py-2 text-xl font-bold text-zinc-900 sm:text-2xl dark:text-white"
              onClick={closeMenu}
            >
              🤖 <span className="text-cyan-500">{t('siteNameShort')}</span>
            </Link>
          </div>

          {/* Navigation Items - Scrollable Area */}
          <nav className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4" aria-label="主导航">
            <ul className="space-y-1" role="menu">
              {NAV_ITEMS.map((item, index) => (
                <li key={item.href} role="none">
                  <Link
                    href={item.href}
                    className={getMobileNavLinkClasses(item.href)}
                    onClick={closeMenu}
                    role="menuitem"
                    tabIndex={isMobileMenuOpen ? 0 : -1}
                    style={{
                      animationDelay: isMobileMenuOpen ? `${index * 30}ms` : '0ms',
                    }}
                  >
                    <span className="flex-shrink-0 text-xl sm:text-2xl" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium sm:text-base">{t(item.labelKey)}</span>
                    {pathname === item.href && (
                      <span
                        className="ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-cyan-500"
                        aria-label="当前页面"
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Bottom Settings Area */}
          <div className="flex-shrink-0 space-y-2 border-t border-zinc-200 p-3 sm:space-y-3 sm:p-4 dark:border-zinc-700">
            <div className="flex min-h-[52px] items-center justify-between rounded-xl bg-zinc-50 px-3 py-3 sm:px-4 dark:bg-zinc-800">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('language')}</span>
              <LanguageSwitcherCompact />
            </div>
            <div className="flex min-h-[52px] items-center justify-between rounded-xl bg-zinc-50 px-3 py-3 sm:px-4 dark:bg-zinc-800">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('theme')}</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
