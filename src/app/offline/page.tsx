'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, WifiOff, Home } from 'lucide-react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className={`rounded-full p-6 ${isOnline ? 'bg-cyan-100 dark:bg-cyan-900/30' : 'bg-zinc-200 dark:bg-zinc-700'}`}
          >
            {isOnline ? (
              <RefreshCw className="h-16 w-16 animate-spin text-cyan-600 dark:text-cyan-400" />
            ) : (
              <WifiOff className="h-16 w-16 text-zinc-600 dark:text-zinc-400" />
            )}
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {isOnline ? '正在重新连接...' : '您离线了'}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {isOnline ? '请稍等，我们正在努力恢复连接' : '请检查您的网络连接，稍后再试'}
          </p>
        </div>

        {/* Cached Content Info */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">离线可用功能</h2>
          <ul className="space-y-1 text-left text-sm text-zinc-600 dark:text-zinc-400">
            <li>✓ 浏览已缓存的项目和代理信息</li>
            <li>✓ 查看之前加载的页面内容</li>
            <li>✓ 基本的页面导航</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            disabled={isOnline}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            <RefreshCw className="h-4 w-4" />
            重新加载页面
          </button>

          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Home className="h-4 w-4" />
            返回首页
          </Link>
        </div>

        {/* Network Status */}
        <div className="text-xs text-zinc-500 dark:text-zinc-500">
          网络状态: {isOnline ? '🟢 在线' : '🔴 离线'}
        </div>
      </div>
    </div>
  )
}
