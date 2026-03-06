'use client';

import { useState, useCallback } from 'react';

export type ErrorVariant = 'default' | 'compact' | 'fullscreen';
export type ErrorType = 'generic' | 'network' | 'not-found' | 'unauthorized' | 'forbidden' | 'server';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  showReset?: boolean;
  onReset?: () => void;
  errorDigest?: string;
  variant?: ErrorVariant;
  errorType?: ErrorType;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showRefreshButton?: boolean;
  showCopyError?: boolean;
  onGoHome?: () => void;
  onGoBack?: () => void;
}

/**
 * 获取错误类型对应的图标和颜色
 */
function getErrorStyle(type: ErrorType) {
  switch (type) {
    case 'network':
      return {
        icon: (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        ),
        bgColor: 'from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30',
        iconColor: 'text-orange-500',
      };
    case 'not-found':
      return {
        icon: (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: 'from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30',
        iconColor: 'text-blue-500',
      };
    case 'unauthorized':
    case 'forbidden':
      return {
        icon: (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ),
        bgColor: 'from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30',
        iconColor: 'text-amber-500',
      };
    case 'server':
      return {
        icon: (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        ),
        bgColor: 'from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30',
        iconColor: 'text-purple-500',
      };
    default:
      return {
        icon: (
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        bgColor: 'from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30',
        iconColor: 'text-red-500',
      };
  }
}

/**
 * 友好的错误展示 UI 组件
 * 支持多种展示变体：默认、紧凑、全屏
 * 支持错误类型区分和丰富的恢复操作
 */
export function ErrorDisplay({
  title = '出现了一些问题',
  message = '发生了意外错误，请稍后重试',
  showReset = true,
  onReset,
  errorDigest,
  variant = 'default',
  errorType = 'generic',
  showHomeButton = true,
  showBackButton = true,
  showRefreshButton = false,
  showCopyError = true,
  onGoHome,
  onGoBack,
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorStyle = getErrorStyle(errorType);

  const handleReset = useCallback(async () => {
    if (onReset) {
      setIsRetrying(true);
      try {
        await onReset();
      } finally {
        setIsRetrying(false);
      }
    }
  }, [onReset]);

  const handleGoHome = useCallback(() => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  }, [onGoHome]);

  const handleGoBack = useCallback(() => {
    if (onGoBack) {
      onGoBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      handleGoHome();
    }
  }, [onGoBack, handleGoHome]);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const handleCopyError = useCallback(async () => {
    const errorInfo = {
      title,
      message,
      digest: errorDigest,
      type: errorType,
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 静默失败
    }
  }, [title, message, errorDigest, errorType]);

  // 紧凑变体
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className={`flex-shrink-0 w-5 h-5 ${errorStyle.iconColor}`}>
          {errorStyle.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-700 dark:text-red-300 truncate">{message}</p>
        </div>
        {showReset && onReset && (
          <button
            onClick={handleReset}
            disabled={isRetrying}
            className="flex-shrink-0 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? '重试中...' : '重试'}
          </button>
        )}
      </div>
    );
  }

  // 全屏变体
  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="max-w-md w-full mx-4 p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl text-center">
          {/* 错误图标 */}
          <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${errorStyle.bgColor} rounded-full flex items-center justify-center`}>
            <div className={`w-10 h-10 ${errorStyle.iconColor}`}>
              {errorStyle.icon}
            </div>
          </div>
          
          {/* 标题 */}
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
            {title}
          </h1>
          
          {/* 消息 */}
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            {message}
          </p>
          
          {/* 错误码 */}
          {errorDigest && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-6 font-mono">
              错误码: {errorDigest.slice(0, 8)}
            </p>
          )}
          
          {/* 操作按钮 */}
          <div className="space-y-3">
            {showReset && onReset && (
              <button
                onClick={handleReset}
                disabled={isRetrying}
                className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isRetrying ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    处理中...
                  </span>
                ) : '重新加载'}
              </button>
            )}
            {showHomeButton && (
              <button
                onClick={handleGoHome}
                className="w-full px-6 py-3 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full font-semibold hover:border-cyan-500 hover:text-cyan-500 transition-all"
              >
                返回首页
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 默认变体
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="max-w-lg w-full text-center">
        {/* 错误图标 */}
        <div className={`w-24 h-24 mx-auto mb-6 bg-gradient-to-br ${errorStyle.bgColor} rounded-full flex items-center justify-center animate-pulse`}>
          <div className={`w-12 h-12 ${errorStyle.iconColor}`}>
            {errorStyle.icon}
          </div>
        </div>

        {/* 标题 */}
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
          {title}
        </h2>

        {/* 消息 */}
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {message}
        </p>

        {/* 错误详情（可折叠） */}
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

        {/* 主操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          {showReset && onReset && (
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
                  重试中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重试
                </>
              )}
            </button>
          )}
          {showHomeButton && (
            <button
              onClick={handleGoHome}
              className="px-6 py-3 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full font-semibold hover:border-cyan-500 hover:text-cyan-500 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              返回首页
            </button>
          )}
        </div>

        {/* 次要操作 */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {showBackButton && (
            <button
              onClick={handleGoBack}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回上一页
            </button>
          )}
          {showRefreshButton && (
            <button
              onClick={handleRefresh}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新页面
            </button>
          )}
          {showCopyError && errorDigest && (
            <button
              onClick={handleCopyError}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  已复制
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  复制错误信息
                </>
              )}
            </button>
          )}
        </div>

        {/* 帮助文本 */}
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
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