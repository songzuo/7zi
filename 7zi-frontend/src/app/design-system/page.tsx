/**
 * 设计系统文档主页
 */

import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: '设计系统文档 - 7zi Studio',
  description:
    '7zi Studio 设计系统文档，包含组件、设计 Token 和最佳实践。提供完整的设计语言和可复用的 UI 组件，帮助团队快速构建一致、美观的用户界面。',
  keywords: ['设计系统', 'Design System', 'UI组件', 'Design Token', '7zi Studio', '组件库'],
  openGraph: {
    title: '设计系统文档 - 7zi Studio',
    description: '7zi Studio 设计系统文档，包含组件、设计 Token 和最佳实践。',
    type: 'website',
    siteName: '7zi Studio',
    url: 'https://7zi.studio/design-system',
    images: [
      {
        url: 'https://7zi.studio/images/og-design-system.jpg',
        width: 1200,
        height: 630,
        alt: '设计系统文档',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '设计系统文档 - 7zi Studio',
    description: '7zi Studio 设计系统文档，包含组件、设计 Token 和最佳实践。',
    images: ['https://7zi.studio/images/og-design-system.jpg'],
  },
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">设计系统文档</h1>
          <p className="max-w-3xl text-lg text-gray-600">
            7zi Frontend 设计系统提供了一套完整的设计语言和可复用的 UI 组件，
            帮助团队快速构建一致、美观的用户界面。
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 设计 Token */}
          <Link
            href="/design-system/tokens"
            className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 text-blue-600">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">设计 Token</h2>
            <p className="text-sm text-gray-600">
              颜色、字体、间距、阴影等基础设计变量，确保整个应用的一致性。
            </p>
          </Link>

          {/* 组件库 */}
          <Link
            href="/design-system/components"
            className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 text-green-600">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">组件库</h2>
            <p className="text-sm text-gray-600">
              可复用的 UI 组件，包括按钮、输入框、卡片、模态框等。
            </p>
          </Link>

          {/* 响应式设计 */}
          <Link
            href="/design-system/responsive"
            className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 text-purple-600">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">响应式设计</h2>
            <p className="text-sm text-gray-600">
              断点系统和响应式布局指南，确保在各种设备上都有良好的体验。
            </p>
          </Link>

          {/* Storybook */}
          <Link
            href="/storybook"
            className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 text-orange-600">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Storybook</h2>
            <p className="text-sm text-gray-600">交互式组件文档，查看所有组件的各种状态和变体。</p>
          </Link>

          {/* 最佳实践 */}
          <Link
            href="/design-system/guidelines"
            className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 text-pink-600">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">最佳实践</h2>
            <p className="text-sm text-gray-600">组件使用指南、无障碍规范和性能优化建议。</p>
          </Link>

          {/* 更新日志 */}
          <Link
            href="/design-system/changelog"
            className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 text-indigo-600">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">更新日志</h2>
            <p className="text-sm text-gray-600">设计系统的版本历史和变更记录。</p>
          </Link>
        </div>

        {/* 快速开始 */}
        <div className="mt-12 rounded-lg border bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">快速开始</h2>

          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">安装依赖</h3>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100">
                <code>npm install clsx date-fns zustand socket.io-client</code>
              </pre>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">导入组件</h3>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100">
                <code>{`import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function MyComponent() {
  return (
    <Card>
      <Input label="姓名" placeholder="请输入您的姓名" />
      <Button variant="primary">提交</Button>
    </Card>
  );
}`}</code>
              </pre>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">使用设计 Token</h3>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100">
                <code>{`/* 在 CSS 中使用 */
.my-element {
  color: var(--color-primary-600);
  font-size: var(--font-size-lg);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
}

/* 在 Tailwind 中使用 */
<div className="text-blue-600 text-lg p-4 rounded-lg">
  使用 Tailwind 类名
</div>`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
