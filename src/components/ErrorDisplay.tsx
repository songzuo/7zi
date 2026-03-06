'use client';

import { useState } from 'react';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  showReset?: boolean;
  onReset?: () => void;
  errorDigest?: string;
  variant?: 'default' | 'compact' | 'fullscreen';
}

/**
 * 友好的错误展示 UI 组件
 * 支持多种展示变体：默认、紧凑、全屏
 */
export function ErrorDisplay({
  title = '出现了一些问题',
  message = '发生了意外错误，请稍后重试',
  showReset = true,
  onReset,
  errorDigest,
  variant = 'default',
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-700 dark:text-red-300 truncate">{message}</p>
        </div>
        {showReset && onReset && (
          <button
            onClick={onReset}
            className="flex-shrink-0 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="max-w-md w-full mx-4 p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
            {title}
          </h1>
          
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            {message}
          </p>
          
          {errorDigest && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-6 font-mono">
              错误码: {errorDigest.slice(0, 8)}
            </p>
          )}
          
          {showReset && onReset && (
            <button
              onClick={onReset}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:-translate-y-0.5"
            >
              重新加载
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="max-w-lg w-full text-center">
        {/* Error Icon */}
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center animate-pulse">
          <svg
            className="w-12 h-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
          {title}
        </h2>

        {/* Message */}
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {message}
        </p>

        {/* Error Digest (collapsible) */}
        {errorDigest && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 mb-4 font-mono underline underline-offset-2"
          >
            {showDetails ? '隐藏' : '显示'}错误详情
          </button>
        )}

        {showDetails && errorDigest && (
          <div className="mb-6 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-left overflow-x-auto">
            <code className="text-xs text-zinc-600 dark:text-zinc-400 break-all">
              {errorDigest}
            </code>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showReset && onReset && (
            <button
              onClick={onReset}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:-translate-y-0.5"
            >
              重试
            </button>
          )}
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-3 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full font-semibold hover:border-cyan-500 hover:text-cyan-500 transition-all"
          >
            返回首页
          </button>
        </div>

        {/* Help Text */}
        <p className="mt-6 text-sm text-zinc-400 dark:text-zinc-500">
          如果问题持续存在，请联系{' '}
          <a
            href="mailto:support@7zi.studio"
            className="text-cyan-500 hover:text-cyan-600 underline underline-offset-2"
          >
            技术支持
          </a>
        </p>
      </div>
    </div>
  );
}

export default ErrorDisplay;
