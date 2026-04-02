/**
 * 首页 - 重定向到图片优化示例
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '7zi Frontend - Next.js 图片优化示例',
  description: 'Next.js 图片优化最佳实践展示，包含 WebP/AVIF 自动转换、响应式图片、懒加载等特性',
  keywords: ['Next.js', 'Image Optimization', 'WebP', 'AVIF', 'Performance', 'React', '图片优化'],
  openGraph: {
    title: '7zi Frontend - Next.js 图片优化示例',
    description: 'Next.js 图片优化最佳实践展示',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">7zi Frontend</h1>
        <p className="mb-8 text-gray-600 dark:text-gray-400">Next.js 图片优化示例项目</p>

        <div className="space-y-4">
          <Link
            href="/image-optimization-demo"
            className="block rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
          >
            图片优化示例
          </Link>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Link
              href="/pricing"
              className="rounded bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              定价方案
            </Link>
            <Link
              href="/notification-demo"
              className="rounded bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              通知示例
            </Link>
            <Link
              href="/websocket-status-demo"
              className="rounded bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              WebSocket 状态
            </Link>
          </div>
        </div>

        <div className="mt-12 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <h2 className="mb-2 font-semibold">✨ 图片优化特性</h2>
          <ul className="space-y-1 text-left text-sm text-gray-600 dark:text-gray-400">
            <li>✅ WebP/AVIF 自动格式转换</li>
            <li>✅ 响应式图片策略</li>
            <li>✅ 懒加载 + 占位符</li>
            <li>✅ LCP 性能优化</li>
            <li>✅ 错误处理和回退</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
