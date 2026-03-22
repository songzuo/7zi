'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 通用错误页面 - 国际化版本
 * 捕获服务器错误和其他意外错误
 */
export default function Error({ error, reset }: ErrorPageProps) {
  const t = useTranslations('errors.serverError');
  const [isRetrying, setIsRetrying] = useState(false);
  const [hasRecovered, setHasRecovered] = useState(false);

  const handleReset = useCallback(async () => {
    setIsRetrying(true);
    try {
      await reset();
      setHasRecovered(true);
    } catch (e) {
      console.error('重试失败:', e);
    } finally {
      setIsRetrying(false);
    }
  }, [reset]);

  const handleGoHome = useCallback(() => {
    window.location.href = '/';
  }, []);

  useEffect(() => {
    // 开发环境输出错误详情
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error Page 捕获到错误');
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
      if (error.digest) {
        console.error('错误摘要:', error.digest);
      }
    }
  }, [error]);

  if (hasRecovered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-500"
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
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
            恢复成功
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            问题已解决，页面正在重新加载...
          </p>
          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:-translate-y-0.5"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 px-4">
      <div className="max-w-lg w-full text-center">
        {/* 500 Number */}
        <div className="relative mb-8">
          <h1 className="text-[120px] sm:text-[160px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 leading-none">
            500
          </h1>
          <div className="absolute inset-0 text-[120px] sm:text-[160px] font-bold text-zinc-200 dark:text-zinc-800 -z-10 blur-sm">
            500
          </div>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-purple-500"
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
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-3">
          {t('title')}
        </h2>

        {/* Message */}
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          {t('description')}
          <br />
          {t('solution')}
        </p>

        {/* Error Code */}
        {error.digest && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-6 font-mono">
            {t('errorCode', { code: error.digest.slice(0, 8) })}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleReset}
            disabled={isRetrying}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {isRetrying ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                处理中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('retry')}
              </>
            )}
          </button>
          <button
            onClick={handleGoHome}
            className="px-6 py-3 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full font-semibold hover:border-cyan-500 hover:text-cyan-500 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {t('backHome')}
          </button>
        </div>
      </div>
    </div>
  );
}
