'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * 401 Unauthorized 页面
 * 当用户未登录或token过期时显示
 */
export default function UnauthorizedPage() {
  const t = useTranslations('errors.unauthorized');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 px-4">
      <div className="max-w-lg w-full text-center">
        {/* 401 Number */}
        <div className="relative mb-8">
          <h1 className="text-[120px] sm:text-[160px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 leading-none">
            401
          </h1>
          <div className="absolute inset-0 text-[120px] sm:text-[160px] font-bold text-zinc-200 dark:text-zinc-800 -z-10 blur-sm">
            401
          </div>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-amber-500"
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
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-3">
          {t('title')}
        </h2>

        {/* Message */}
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          {t('description')}
          <br />
          {t('solution')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/signin"
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            {t('login')}
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full font-semibold hover:border-cyan-500 hover:text-cyan-500 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {t('backHome')}
          </Link>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-zinc-400 dark:text-zinc-500">
          {t('solution')}{' '}
          <a
            href="mailto:support@7zi.studio"
            className="text-cyan-500 hover:text-cyan-600 underline underline-offset-2"
          >
            support@7zi.studio
          </a>
        </p>
      </div>
    </div>
  );
}
