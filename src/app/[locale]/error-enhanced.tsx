'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * 通用错误页面 - 国际化版本
 * 捕获服务器错误和其他意外错误
 */
export default function Error({ error, reset }: ErrorPageProps) {
  const t = useTranslations('errors.serverError')
  const [isRetrying, setIsRetrying] = useState(false)
  const [hasRecovered, setHasRecovered] = useState(false)

  const handleReset = useCallback(async () => {
    setIsRetrying(true)
    try {
      await reset()
      setHasRecovered(true)
    } catch (e) {
      console.error('重试失败:', e)
    } finally {
      setIsRetrying(false)
    }
  }, [reset])

  const handleGoHome = useCallback(() => {
    window.location.href = '/'
  }, [])

  useEffect(() => {
    // 开发环境输出错误详情
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error Page 捕获到错误')
      console.error('错误信息:', error.message)
      console.error('错误堆栈:', error.stack)
      if (error.digest) {
        console.error('错误摘要:', error.digest)
      }
    }
  }, [error])

  if (hasRecovered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 dark:from-zinc-950 dark:to-zinc-900">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
            <svg
              className="h-10 w-10 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-white">恢复成功</h2>
          <p className="mb-6 text-zinc-600 dark:text-zinc-400">问题已解决，页面正在重新加载...</p>
          <button
            onClick={handleGoHome}
            className="rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/25"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-lg text-center">
        {/* 500 Number */}
        <div className="relative mb-8">
          <h1 className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-[120px] leading-none font-bold text-transparent sm:text-[160px]">
            500
          </h1>
          <div className="absolute inset-0 -z-10 text-[120px] font-bold text-zinc-200 blur-sm sm:text-[160px] dark:text-zinc-800">
            500
          </div>
        </div>

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
          <svg
            className="h-10 w-10 text-purple-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
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

        {/* Error Code */}
        {error.digest && (
          <p className="mb-6 font-mono text-sm text-zinc-400 dark:text-zinc-500">
            {t('errorCode', { code: error.digest.slice(0, 8) })}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={handleReset}
            disabled={isRetrying}
            className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isRetrying ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                处理中...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {t('retry')}
              </>
            )}
          </button>
          <button
            onClick={handleGoHome}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-zinc-300 px-6 py-3 font-semibold text-zinc-700 transition-all hover:border-cyan-500 hover:text-cyan-500 dark:border-zinc-700 dark:text-zinc-300"
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
          </button>
        </div>
      </div>
    </div>
  )
}
