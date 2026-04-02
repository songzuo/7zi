/**
 * 404 Not Found 页面 - 国际化版本
 * 当访问不存在的路由时显示
 */
import Link from 'next/link'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { Locale, locales, defaultLocale } from '@/i18n/config'

type Params = Promise<{ locale: string }>

export default async function NotFound({ params }: { params: Params }) {
  const { locale } = await params

  // Use default locale if invalid
  const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale

  setRequestLocale(validLocale)

  const t = await getTranslations({ locale: validLocale, namespace: 'errors.notFound' })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-lg text-center">
        {/* 404 Number */}
        <div className="relative mb-8">
          <h1 className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 bg-clip-text text-[120px] leading-none font-bold text-transparent sm:text-[160px]">
            404
          </h1>
          <div className="absolute inset-0 -z-10 text-[120px] font-bold text-zinc-200 blur-sm sm:text-[160px] dark:text-zinc-800">
            404
          </div>
        </div>

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
          <svg
            className="h-10 w-10 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="mb-3 text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-white">
          {t('title')}
        </h2>

        {/* Message */}
        <p className="mb-8 text-zinc-600 dark:text-zinc-400">
          {t('description')}
          <br />
          {t('solution')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/25"
          >
            {t('backHome')}
          </Link>
          <Link
            href="/contact"
            className="rounded-full border-2 border-zinc-300 px-6 py-3 font-semibold text-zinc-700 transition-all hover:border-cyan-500 hover:text-cyan-500 dark:border-zinc-700 dark:text-zinc-300"
          >
            {t('contactSupport')}
          </Link>
        </div>

        {/* Suggestions */}
        <div className="mt-12 rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900">
          <h3 className="mb-4 font-semibold text-zinc-900 dark:text-white">
            {t('suggestions.title')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/', label: t('suggestions.home') },
              { href: '/about', label: t('suggestions.about') },
              { href: '/team', label: t('suggestions.team') },
              { href: '/blog', label: t('suggestions.blog') },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 text-zinc-600 transition-colors hover:text-cyan-500 dark:text-zinc-400"
              >
                <span>→</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Force this page to be dynamic
export const dynamic = 'force-dynamic'
