'use client';

import { useEffect } from 'react';

/**
 * 根级别错误处理组件
 * 捕获整个应用的错误
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台
    console.error('🚨 Global Error Boundary 捕获到错误:', error);

    // 这里可以添加错误上报逻辑
    // 例如发送到 Sentry 或其他错误监控服务
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 px-4">
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
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">
              出现了一些问题
            </h1>

            {/* Message */}
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              抱歉，应用程序遇到了意外错误。
              <br />
              我们已经记录了此问题，请稍后重试。
            </p>

            {/* Error Code */}
            {error.digest && (
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-6 font-mono">
                错误码: {error.digest.slice(0, 8)}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重新加载
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-6 py-3 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full font-semibold hover:border-cyan-500 hover:text-cyan-500 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                返回首页
              </button>
            </div>

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 mb-2">
                  显示错误详情（仅开发环境）
                </summary>
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {error.message}
                    {'\n\n'}
                    {error.stack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
