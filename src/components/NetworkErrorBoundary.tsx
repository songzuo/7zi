'use client'

import { useCallback, useEffect, useState } from 'react'

interface NetworkErrorBoundaryProps {
  children: React.ReactNode
  onRetry?: () => Promise<void> | void
  /** 网络检测 URL */
  pingUrl?: string
  /** 自动检测网络状态 */
  autoDetect?: boolean
  /** 检测间隔（毫秒） */
  detectInterval?: number
  /** 检测超时（毫秒） */
  timeout?: number
}

interface NetworkStatus {
  isOnline: boolean
  isChecking: boolean
  lastChecked: Date | null
}

/**
 * 网络错误边界组件
 *
 * 专门处理网络相关的错误，提供网络状态检测和重连功能。
 *
 * 判定规则（与测试契约一致）：
 * - 初始状态取 `navigator.onLine`
 * - 浏览器 online / offline 事件会立即更新状态
 * - 主动检测（点「重试」）时：
 *   - 2xx / 3xx / 4xx 都认为**在线** —— 4xx 只说明资源不存在，
 *     服务器本身是通的（鉴权失败、404 都不该把用户踢到错误页）
 *   - 5xx、网络错误、超时 → **离线**
 * - 只有在「之前确实是离线」且检测成功时才调用 `onRetry`
 */
export function NetworkErrorBoundary({
  children,
  onRetry,
  pingUrl = '/api/health',
  autoDetect = false,
  detectInterval = 30000,
  timeout = 5000,
}: NetworkErrorBoundaryProps) {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isChecking: false,
    lastChecked: null,
  }))

  const checkNetwork = useCallback(async (): Promise<boolean> => {
    setStatus(prev => ({ ...prev, isChecking: true }))

    let isOnline = false
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // 4xx 也算在线 —— 服务器活着，只是这个资源不对
      isOnline = response.status < 500
    } catch {
      // 超时 / 网络错误 → 离线
      isOnline = false
    }

    setStatus(_prev => ({
      isOnline,
      isChecking: false,
      lastChecked: new Date(),
    }))

    return isOnline
  }, [pingUrl, timeout])

  const handleRetry = useCallback(async () => {
    const wasOffline = !status.isOnline
    const nowOnline = await checkNetwork()

    // 之前离线、现在在线 → 通知上层重试
    if (wasOffline && nowOnline && onRetry) {
      try {
        await onRetry()
      } catch (error) {
        // onRetry 失败不应该把用户踢回错误页 —— 网络状态已经是好的
        console.error('NetworkErrorBoundary: onRetry failed', error)
      }
    }
  }, [status.isOnline, checkNetwork, onRetry])

  // 浏览器 online / offline 事件
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }))
    }
    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 自动检测
  useEffect(() => {
    if (!autoDetect) return

    const timer = setInterval(() => {
      void checkNetwork()
    }, detectInterval)

    return () => clearInterval(timer)
  }, [autoDetect, detectInterval, checkNetwork])

  if (!status.isOnline) {
    return (
      <div
        role="alert"
        data-testid="network-error"
        className="flex flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <h2 className="text-xl font-semibold">网络连接失败</h2>
        <p className="text-sm text-zinc-500">
          {status.isChecking ? '正在检测网络连接...' : '请检查您的网络连接后重试'}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void handleRetry()}
            disabled={status.isChecking}
            className="rounded border px-4 py-2 text-sm"
          >
            重试
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/'
              }
            }}
            className="rounded border px-4 py-2 text-sm"
          >
            返回首页
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload()
              }
            }}
            className="rounded border px-4 py-2 text-sm"
          >
            刷新页面
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default NetworkErrorBoundary
