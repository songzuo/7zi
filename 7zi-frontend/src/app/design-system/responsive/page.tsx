/**
 * 响应式设计文档页面
 */

import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: '响应式设计 - 7zi Studio',
  description: '断点系统和响应式布局指南。',
}

export default function ResponsivePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">📱 响应式设计</h1>

        {/* 断点系统 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">断点系统</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2">断点名称</th>
                  <th className="px-4 py-2">最小宽度</th>
                  <th className="px-4 py-2">CSS</th>
                  <th className="px-4 py-2">典型设备</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-2">
                    <code className="rounded bg-gray-100 px-2 py-1">sm</code>
                  </td>
                  <td className="px-4 py-2">640px</td>
                  <td className="px-4 py-2">
                    <code className="text-sm">@media (min-width: 640px)</code>
                  </td>
                  <td className="px-4 py-2">手机横屏</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2">
                    <code className="rounded bg-gray-100 px-2 py-1">md</code>
                  </td>
                  <td className="px-4 py-2">768px</td>
                  <td className="px-4 py-2">
                    <code className="text-sm">@media (min-width: 768px)</code>
                  </td>
                  <td className="px-4 py-2">平板竖屏</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2">
                    <code className="rounded bg-gray-100 px-2 py-1">lg</code>
                  </td>
                  <td className="px-4 py-2">1024px</td>
                  <td className="px-4 py-2">
                    <code className="text-sm">@media (min-width: 1024px)</code>
                  </td>
                  <td className="px-4 py-2">平板横屏/小屏笔记本</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2">
                    <code className="rounded bg-gray-100 px-2 py-1">xl</code>
                  </td>
                  <td className="px-4 py-2">1280px</td>
                  <td className="px-4 py-2">
                    <code className="text-sm">@media (min-width: 1280px)</code>
                  </td>
                  <td className="px-4 py-2">桌面显示器</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">
                    <code className="rounded bg-gray-100 px-2 py-1">2xl</code>
                  </td>
                  <td className="px-4 py-2">1536px</td>
                  <td className="px-4 py-2">
                    <code className="text-sm">@media (min-width: 1536px)</code>
                  </td>
                  <td className="px-4 py-2">大屏显示器</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 响应式布局示例 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">布局示例</h2>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">网格布局</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-lg bg-blue-100 p-4 text-center">
                    Item {i}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                使用 <code>grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4</code>
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">Flex 布局</h3>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1 rounded-lg bg-green-100 p-4 text-center">Flex 1</div>
                <div className="flex-1 rounded-lg bg-green-100 p-4 text-center">Flex 1</div>
                <div className="flex-1 rounded-lg bg-green-100 p-4 text-center">Flex 1</div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                使用 <code>flex flex-col sm:flex-row</code>
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">响应式隐藏/显示</h3>
              <div className="space-y-2">
                <div className="rounded-lg bg-yellow-100 p-4 text-center sm:hidden">
                  仅在手机端显示
                </div>
                <div className="hidden rounded-lg bg-purple-100 p-4 text-center sm:block">
                  仅在平板及更大屏幕显示
                </div>
                <div className="rounded-lg bg-gray-200 p-4 text-center">所有设备都显示</div>
              </div>
            </div>
          </div>
        </section>

        {/* 响应式图片 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">响应式图片</h2>

          <div className="mb-4 rounded-lg bg-gray-100 p-4">
            <pre className="overflow-x-auto text-sm">{`<OptimizedImage
  src="/images/hero.jpg"
  alt="Hero image"
  preset="hero"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 800px"
/>`}</pre>
          </div>

          <p className="text-gray-600">
            使用 <code className="rounded bg-gray-100 px-2 py-1">OptimizedImage</code> 组件配合
            <code className="rounded bg-gray-100 px-2 py-1">sizes</code> 属性实现响应式图片加载。
          </p>
        </section>

        {/* 导航 */}
        <div className="mt-8 flex justify-between">
          <Link href="/design-system/components" className="text-blue-600 hover:underline">
            ← 组件库
          </Link>
          <Link href="/design-system/guidelines" className="text-blue-600 hover:underline">
            最佳实践 →
          </Link>
        </div>
      </div>
    </div>
  )
}
