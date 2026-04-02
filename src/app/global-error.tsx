'use client'

import { useEffect } from 'react'

/**
 * 根级别错误处理组件
 * 捕获整个应用的错误
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 记录错误到控制台
    console.error('🚨 Global Error Boundary 捕获到错误:', error)

    // 这里可以添加错误上报逻辑
    // 例如发送到 Sentry 或其他错误监控服务
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 dark:from-zinc-950 dark:to-zinc-900">
          <div className="w-full max-w-lg text-center">
            {/* Error Icon */}
            <div className="mx-auto mb-6 flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30">
              <svg
                className="h-12 w-12 text-red-500"
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
            <h1 className="mb-3 text-3xl font-bold text-zinc-900 dark:text-white">
              出现了一些问题
            </h1>

            {/* Message */}
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              抱歉，应用程序遇到了意外错误。
              <br />
              我们已经记录了此问题，请稍后重试。
            </p>

            {/* Error Code */}
            {error.digest && (
              <p className="mb-6 font-mono text-sm text-zinc-400 dark:text-zinc-500">
                错误码: {error.digest.slice(0, 8)}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={reset}
                className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/25"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                重新加载
              </button>
              <button
                onClick={() => (window.location.href = '/')}
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
                返回首页
              </button>
            </div>

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8 text-left">
                <summary className="mb-2 cursor-pointer text-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                  显示错误详情（仅开发环境）
                </summary>
                <div className="overflow-x-auto rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
                  <pre className="text-xs whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
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
  )
}
