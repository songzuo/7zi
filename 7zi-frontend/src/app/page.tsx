/**
 * 首页 - 重定向到图片优化示例
 */

import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          7zi Frontend
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Next.js 图片优化示例项目
        </p>
        
        <div className="space-y-4">
          <Link
            href="/image-optimization-demo"
            className="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            图片优化示例
          </Link>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Link
              href="/notification-demo"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              通知示例
            </Link>
            <Link
              href="/websocket-status-demo"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              WebSocket 状态
            </Link>
          </div>
        </div>
        
        <div className="mt-12 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="font-semibold mb-2">✨ 图片优化特性</h2>
          <ul className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-1">
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
