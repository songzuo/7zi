'use client'

/**
 * Footer Component - i18n 集成示例
 *
 * 本文件展示如何将 Footer 组件集成 i18n
 * 请参考此示例修改 src/components/Footer.tsx
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from '@/i18n/hooks'
import { SocialLinks } from './SocialLinks'

export function FooterWithI18n() {
  const t = useTranslations('footer')
  const locale = useLocale()

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
            <p className="max-w-md text-sm sm:text-base">{t('description')}</p>
            <div className="hidden sm:block">
              <h3 className="mb-3 text-sm font-semibold text-white">{t('followUs')}</h3>
              <SocialLinks variant="horizontal" size="sm" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">{t('quickLinks.title')}</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link
                  href="/"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('quickLinks.home')}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('quickLinks.about')}
                </Link>
              </li>
              <li>
                <Link
                  href="/team"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('quickLinks.team')}
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('quickLinks.blog')}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('quickLinks.contact')}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('quickLinks.dashboard')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">{t('services.title')}</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link
                  href="#services"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('services.webDevelopment')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('services.brandDesign')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('services.seoOptimization')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('services.marketing')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('services.uiux')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="block flex min-h-[44px] items-center py-1 text-sm transition-colors duration-200 hover:text-cyan-400"
                >
                  {t('services.aiSolutions')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-white">{t('contact.title')}</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:business@7zi.studio"
                  className="flex min-h-[44px] items-center gap-3 text-sm transition-colors hover:text-cyan-400"
                >
                  <span className="text-lg" aria-hidden="true">
                    📧
                  </span>
                  <span>{t('contact.email')}</span>
                </a>
              </li>
              <li>
                <a
                  href="https://7zi.studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center gap-3 text-sm transition-colors hover:text-cyan-400"
                >
                  <span className="text-lg" aria-hidden="true">
                    🌐
                  </span>
                  <span>{t('contact.website')}</span>
                </a>
              </li>
              <li>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-lg" aria-hidden="true">
                    📍
                  </span>
                  <span>{t('contact.address')}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-zinc-400">
              © {currentYear} {t('copyright')}
            </p>
            <div className="flex gap-6 text-sm">
              <Link
                href="/privacy"
                className="flex min-h-[44px] items-center text-zinc-400 transition-colors hover:text-cyan-400"
              >
                {t('privacyPolicy')}
              </Link>
              <Link
                href="/terms"
                className="flex min-h-[44px] items-center text-zinc-400 transition-colors hover:text-cyan-400"
              >
                {t('termsOfService')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

/**
 * 需要添加到翻译文件的键值对
 *
 * 在 src/i18n/messages/zh.json 中添加：
 * {
 *   "footer": {
 *     "description": "由 11 位专业 AI 代理组成的创新数字工作室，提供网站开发、品牌设计、营销推广等全方位数字化服务。",
 *     "followUs": "关注我们",
 *     "quickLinks": {
 *       "title": "快速链接",
 *       "home": "首页",
 *       "about": "关于我们",
 *       "team": "团队成员",
 *       "blog": "博客",
 *       "contact": "联系我们",
 *       "dashboard": "Dashboard"
 *     },
 *     "services": {
 *       "title": "服务项目",
 *       "webDevelopment": "网站开发",
 *       "brandDesign": "品牌设计",
 *       "seoOptimization": "SEO 优化",
 *       "marketing": "营销推广",
 *       "uiux": "UI/UX 设计",
 *       "aiSolutions": "AI 解决方案"
 *     },
 *     "contact": {
 *       "title": "联系方式",
 *       "email": "business@7zi.studio",
 *       "website": "7zi.studio",
 *       "address": "中国"
 *     },
 *     "copyright": "7zi Studio. All rights reserved.",
 *     "privacyPolicy": "隐私政策",
 *     "termsOfService": "服务条款"
 *   }
 * }
 *
 * 在 src/i18n/messages/en.json 中添加：
 * {
 *   "footer": {
 *     "description": "An innovative digital studio powered by 11 professional AI agents, providing comprehensive digital services including web development, brand design, and marketing.",
 *     "followUs": "Follow Us",
 *     "quickLinks": {
 *       "title": "Quick Links",
 *       "home": "Home",
 *       "about": "About Us",
 *       "team": "Team",
 *       "blog": "Blog",
 *       "contact": "Contact",
 *       "dashboard": "Dashboard"
 *     },
 *     "services": {
 *       "title": "Services",
 *       "webDevelopment": "Web Development",
 *       "brandDesign": "Brand Design",
 *       "seoOptimization": "SEO Optimization",
 *       "marketing": "Marketing",
 *       "uiux": "UI/UX Design",
 *       "aiSolutions": "AI Solutions"
 *     },
 *     "contact": {
 *       "title": "Contact",
 *       "email": "business@7zi.studio",
 *       "website": "7zi.studio",
 *       "address": "China"
 *     },
 *     "copyright": "7zi Studio. All rights reserved.",
 *     "privacyPolicy": "Privacy Policy",
 *     "termsOfService": "Terms of Service"
 *   }
 * }
 */
