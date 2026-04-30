'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Globe } from 'lucide-react'

interface NavLink {
  href: string
  label: string
  labelEn: string
}

const navLinks: NavLink[] = [
  { href: '/', label: '首页', labelEn: 'Home' },
  { href: '/pricing', label: '定价', labelEn: 'Pricing' },
  { href: '/feedback', label: '反馈', labelEn: 'Feedback' },
]

interface NavigationProps {
  language?: 'zh' | 'en'
  onLanguageChange?: (lang: 'zh' | 'en') => void
}

export function Navigation({ language = 'zh', onLanguageChange }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleLanguage = () => {
    onLanguageChange?.(language === 'zh' ? 'en' : 'zh')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">7zi</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
              >
                {language === 'zh' ? link.label : link.labelEn}
              </Link>
            ))}

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              aria-label={language === 'zh' ? '切换到英文' : 'Switch to Chinese'}
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium">{language === 'zh' ? 'EN' : '中文'}</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleLanguage}
              className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700"
            >
              <Globe className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="border-t border-gray-200 py-4 md:hidden dark:border-gray-700">
            <div className="flex flex-col gap-4">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-2 py-1 text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                  onClick={() => setIsOpen(false)}
                >
                  {language === 'zh' ? link.label : link.labelEn}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
