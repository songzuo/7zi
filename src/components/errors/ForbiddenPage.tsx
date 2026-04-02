'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

/**
 * 403 Forbidden 页面
 * 当用户没有权限访问资源时显示
 */
export default function ForbiddenPage() {
  const t = useTranslations('errors.forbidden')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-lg text-center">
        {/* 403 Number */}
        <div className="relative mb-8">
          <h1 className="bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 bg-clip-text text-[120px] leading-none font-bold text-transparent sm:text-[160px]">
            403
          </h1>
          <div className="absolute inset-0 -z-10 text-[120px] font-bold text-zinc-200 blur-sm sm:text-[160px] dark:text-zinc-800">
            403
          </div>
        </div>

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30">
          <svg
            className="h-10 w-10 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
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
            className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/25"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {t('backHome')}
          </Link>
          <a
            href="mailto:support@7zi.studio"
            className="flex items-center justify-center gap-2 rounded-full border-2 border-zinc-300 px-6 py-3 font-semibold text-zinc-700 transition-all hover:border-cyan-500 hover:text-cyan-500 dark:border-zinc-700 dark:text-zinc-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            {t('contactSupport')}
          </a>
        </div>

        {/* Help Text */}
        <div className="mt-12 rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900">
          <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">可能的原因：</h3>
          <ul className="space-y-2 text-left text-sm text-zinc-600 dark:text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">•</span>
              <span>您的账户权限不足，无法访问此页面</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">•</span>
              <span>此页面仅限团队成员或管理员访问</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">•</span>
              <span>您可能需要先登录或升级账户</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
