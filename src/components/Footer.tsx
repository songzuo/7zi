'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { SocialLinks } from './SocialLinks'
import { useTranslations } from '@/i18n/client'

export function Footer() {
  const t = useTranslations('footer')

  const quickLinks = [
    { name: t('quickLinks.home'), href: '/' },
    { name: t('quickLinks.about'), href: '/about' },
    { name: t('quickLinks.team'), href: '/team' },
    { name: t('quickLinks.blog'), href: '/blog' },
    { name: t('quickLinks.contact'), href: '/contact' },
    { name: t('quickLinks.dashboard'), href: '/dashboard' },
  ]

  const services = [
    { name: t('services.webDevelopment'), href: '#services' },
    { name: t('services.brandDesign'), href: '#services' },
    { name: t('services.seoOptimization'), href: '#services' },
    { name: t('services.marketing'), href: '#services' },
    { name: t('services.uiuxDesign'), href: '#services' },
    { name: t('services.aiSolutions'), href: '#services' },
  ]

  const contactInfo = [
    {
      icon: '📧',
      label: t('contact.email'),
      value: 'business@7zi.studio',
      href: 'mailto:business@7zi.studio',
    },
    { icon: '🌐', label: t('contact.website'), value: '7zi.studio', href: 'https://7zi.studio' },
    { icon: '📍', label: t('contact.address'), value: 'Global', href: '#' },
  ]

  // Memoize currentYear to prevent recalculation on every render
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  return (
    <footer className="pb-safe-bottom bg-zinc-50 text-zinc-300 dark:bg-zinc-950 dark:text-zinc-400">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-12">
          {/* Brand Section */}
          <div className="space-y-6 lg:col-span-2">
            <Link href="/" className="inline-block">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                7zi<span className="text-cyan-500">Studio</span>
              </h2>
            </Link>
            <p className="max-w-md text-sm sm:text-base">{t('brandDescription')}</p>
            <div className="hidden sm:block">
              <h3 className="mb-3 text-sm font-semibold text-white">{t('followUs')}</h3>
              <SocialLinks variant="horizontal" size="sm" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">{t('quickLinks.title')}</h3>
            <ul className="space-y-2 sm:space-y-3">
              {quickLinks.map(link => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">{t('services.title')}</h3>
            <ul className="space-y-2 sm:space-y-3">
              {services.map(service => (
                <li key={service.name}>
                  <Link
                    href={service.href}
                    className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">{t('contact.title')}</h3>
            <ul className="space-y-3 sm:space-y-4">
              {contactInfo.map(info => (
                <li key={info.label}>
                  <a
                    href={info.href}
                    className="flex min-h-[44px] items-center gap-2 py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                  >
                    <span className="text-lg">{info.icon}</span>
                    <span className="break-all">{info.value}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile-only Social Links */}
        <div className="mt-8 sm:hidden">
          <h3 className="mb-3 text-sm font-semibold text-white">{t('followUs')}</h3>
          <SocialLinks variant="grid" size="sm" />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-zinc-800 dark:border-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            {/* Copyright */}
            <div className="text-center text-sm sm:text-left">
              <p>© {currentYear} 7zi Studio. All rights reserved.</p>
              <p className="mt-1 text-xs text-zinc-500">{t('aiPowered')}</p>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap justify-center gap-3 text-sm sm:gap-4">
              <Link
                href="/privacy"
                className="inline-flex min-h-[44px] items-center py-2 transition-colors duration-200 hover:text-cyan-400"
              >
                {t('legal.privacyPolicy')}
              </Link>
              <Link
                href="/terms"
                className="inline-flex min-h-[44px] items-center py-2 transition-colors duration-200 hover:text-cyan-400"
              >
                {t('legal.termsOfService')}
              </Link>
              <Link
                href="/cookies"
                className="inline-flex min-h-[44px] items-center py-2 transition-colors duration-200 hover:text-cyan-400"
              >
                {t('legal.cookiePolicy')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
