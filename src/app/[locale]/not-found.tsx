'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * 404 Not Found 页面 - 国际化版本
 * 当访问不存在的路由时显示
 */
export default function NotFound() {
  const t = useTranslations('errors.notFound');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 px-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Number */}
        <div className="relative mb-8">
          <h1 className="text-[120px] sm:text-[160px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 leading-none">
            404
          </h1>
          <div className="absolute inset-0 text-[120px] sm:text-[160px] font-bold text-zinc-200 dark:text-zinc-800 -z-10 blur-sm">
            404
          </div>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-blue-500"
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
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:-translate-y-0.5"
          >
            {t('backHome')}
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full font-semibold hover:border-cyan-500 hover:text-cyan-500 transition-all"
          >
            {t('contactSupport')}
          </Link>
        </div>

        {/* Suggestions */}
        <div className="mt-12 p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
            {t('suggestions.title')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/', label: t('suggestions.home') },
              { href: '/about', label: t('suggestions.about') },
              { href: '/team', label: t('suggestions.team') },
              { href: '/blog', label: t('suggestions.blog') },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors"
              >
                <span>→</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
