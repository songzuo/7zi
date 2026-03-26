"use client";

/**
 * Footer Component - i18n 集成示例
 *
 * 本文件展示如何将 Footer 组件集成 i18n
 * 请参考此示例修改 src/components/Footer.tsx
 */

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "@/i18n/hooks";
import { SocialLinks } from "./SocialLinks";

export function FooterWithI18n() {
  const t = useTranslations('footer');
  const locale = useLocale();

  // Memoize currentYear to prevent recalculation on every render
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer className="bg-zinc-50 dark:bg-zinc-950 text-zinc-300 dark:text-zinc-400 pb-safe-bottom">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="inline-block">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                7zi<span className="text-cyan-500">Studio</span>
              </h2>
            </Link>
            <p className="text-sm sm:text-base max-w-md">
              {t('description')}
            </p>
            <div className="hidden sm:block">
              <h3 className="text-sm font-semibold text-white mb-3">{t('followUs')}</h3>
              <SocialLinks variant="horizontal" size="sm" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{t('quickLinks.title')}</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('quickLinks.home')}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('quickLinks.about')}
                </Link>
              </li>
              <li>
                <Link
                  href="/team"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('quickLinks.team')}
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('quickLinks.blog')}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('quickLinks.contact')}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('quickLinks.dashboard')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{t('services.title')}</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link
                  href="#services"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('services.webDevelopment')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('services.brandDesign')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('services.seoOptimization')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('services.marketing')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('services.uiux')}
                </Link>
              </li>
              <li>
                <Link
                  href="#services"
                  className="text-sm block py-1 hover:text-cyan-400 transition-colors duration-200 min-h-[44px] flex items-center"
                >
                  {t('services.aiSolutions')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{t('contact.title')}</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:business@7zi.studio"
                  className="flex items-center gap-3 text-sm hover:text-cyan-400 transition-colors min-h-[44px]"
                >
                  <span className="text-lg" aria-hidden="true">📧</span>
                  <span>{t('contact.email')}</span>
                </a>
              </li>
              <li>
                <a
                  href="https://7zi.studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-cyan-400 transition-colors min-h-[44px]"
                >
                  <span className="text-lg" aria-hidden="true">🌐</span>
                  <span>{t('contact.website')}</span>
                </a>
              </li>
              <li>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-lg" aria-hidden="true">📍</span>
                  <span>{t('contact.address')}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-zinc-400">
              © {currentYear} {t('copyright')}
            </p>
            <div className="flex gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-zinc-400 hover:text-cyan-400 transition-colors min-h-[44px] flex items-center"
              >
                {t('privacyPolicy')}
              </Link>
              <Link
                href="/terms"
                className="text-zinc-400 hover:text-cyan-400 transition-colors min-h-[44px] flex items-center"
              >
                {t('termsOfService')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
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
