'use client'

import { MobileLayout } from '@/components/navigation'
import Link from 'next/link'

export default function HomePage() {
  return (
    <MobileLayout>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl">7zi Frontend</h1>
          <p className="mb-8 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            Next.js 图片优化示例项目
          </p>

          <div className="space-y-4">
            <Link
              href="/image-optimization-demo"
              className="block w-full rounded-lg bg-blue-600 px-6 py-4 text-white transition hover:bg-blue-700"
            >
              图片优化示例
            </Link>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Link
                href="/pricing"
                className="rounded-lg bg-gray-200 px-4 py-3 transition hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                定价方案
              </Link>
              <Link
                href="/notification-demo"
                className="rounded-lg bg-gray-200 px-4 py-3 transition hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                通知示例
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-gray-200 px-4 py-3 transition hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                仪表盘
              </Link>
              <Link
                href="/design-system"
                className="rounded-lg bg-gray-200 px-4 py-3 transition hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                设计系统
              </Link>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
            <h2 className="mb-3 text-lg font-semibold">✨ 图片优化特性</h2>
            <ul className="space-y-2 text-left text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>WebP/AVIF 自动格式转换</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>响应式图片策略</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>懒加载 + 占位符</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>LCP 性能优化</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>错误处理和回退</span>
              </li>
            </ul>
          </div>

          {/* 移动端导航增强特性说明 */}
          <div className="mt-8 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <h3 className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
              📱 移动端导航增强 v1.13
            </h3>
            <ul className="space-y-1 text-left text-xs text-blue-700 dark:text-blue-400">
              <li>✅ Safe Area 适配（刘海屏/灵动岛）</li>
              <li>✅ 触控区域优化（≥44px）</li>
              <li>✅ 汉堡菜单组件（动画过渡）</li>
              <li>✅ 底部导航栏（高亮当前页）</li>
              <li>✅ 暗色模式支持</li>
              <li>✅ 键盘导航支持</li>
            </ul>
          </div>
        </div>
      </div>
    </MobileLayout>
  )
}
