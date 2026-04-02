/**
 * 设计 Token 文档页面
 */

import React from 'react'

export const metadata = {
  title: '设计 Token - 7zi Studio',
  description: '颜色、字体、间距、阴影等基础设计变量。',
}

export default function DesignTokensPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">🎨 设计 Token</h1>

        {/* 颜色 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">颜色系统</h2>

          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-gray-700">主色调</h3>
            <div className="grid grid-cols-6 gap-3">
              {[
                'blue-50',
                'blue-100',
                'blue-200',
                'blue-300',
                'blue-400',
                'blue-500',
                'blue-600',
                'blue-700',
                'blue-800',
                'blue-900',
                'blue-950',
              ].map(color => (
                <div key={color} className="text-center">
                  <div className={`h-12 w-full rounded-lg bg-${color}`} />
                  <span className="mt-1 text-xs text-gray-500">{color}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-gray-700">灰度色</h3>
            <div className="grid grid-cols-6 gap-3">
              {[
                'gray-50',
                'gray-100',
                'gray-200',
                'gray-300',
                'gray-400',
                'gray-500',
                'gray-600',
                'gray-700',
                'gray-800',
                'gray-900',
                'gray-950',
              ].map(color => (
                <div key={color} className="text-center">
                  <div className={`h-12 w-full rounded-lg bg-${color}`} />
                  <span className="mt-1 text-xs text-gray-500">{color}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700">语义色</h3>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-green-100 p-4 text-center text-green-800">
                成功 / Success
              </div>
              <div className="rounded-lg bg-yellow-100 p-4 text-center text-yellow-800">
                警告 / Warning
              </div>
              <div className="rounded-lg bg-red-100 p-4 text-center text-red-800">错误 / Error</div>
              <div className="rounded-lg bg-blue-100 p-4 text-center text-blue-800">
                信息 / Info
              </div>
            </div>
          </div>
        </section>

        {/* 字体 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">字体系统</h2>

          <div className="space-y-4">
            <div className="border-b pb-4">
              <span className="text-xs text-gray-500">font-family</span>
              <p className="text-lg">Inter, system-ui, sans-serif</p>
            </div>
            <div className="border-b pb-4">
              <span className="text-xs text-gray-500">heading</span>
              <p className="text-3xl font-bold">标题文字 Heading</p>
            </div>
            <div className="border-b pb-4">
              <span className="text-xs text-gray-500">body</span>
              <p className="text-base">正文文字 Body text for general content.</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">caption</span>
              <p className="text-sm text-gray-600">辅助文字 Caption text</p>
            </div>
          </div>
        </section>

        {/* 间距 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">间距系统</h2>

          <div className="grid grid-cols-6 gap-4">
            {[
              { name: 'spacing-1', value: '0.25rem', px: '4px' },
              { name: 'spacing-2', value: '0.5rem', px: '8px' },
              { name: 'spacing-3', value: '0.75rem', px: '12px' },
              { name: 'spacing-4', value: '1rem', px: '16px' },
              { name: 'spacing-6', value: '1.5rem', px: '24px' },
              { name: 'spacing-8', value: '2rem', px: '32px' },
            ].map(spacing => (
              <div key={spacing.name} className="text-center">
                <div className="mb-2 w-full bg-blue-200" style={{ height: spacing.px }} />
                <span className="text-xs text-gray-500">{spacing.name}</span>
                <div className="text-xs text-gray-400">{spacing.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 圆角 */}
        <section className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">圆角系统</h2>

          <div className="flex items-end gap-4">
            {[
              { name: 'rounded-none', value: '0' },
              { name: 'rounded-sm', value: '0.125rem' },
              { name: 'rounded', value: '0.25rem' },
              { name: 'rounded-md', value: '0.375rem' },
              { name: 'rounded-lg', value: '0.5rem' },
              { name: 'rounded-xl', value: '0.75rem' },
              { name: 'rounded-2xl', value: '1rem' },
              { name: 'rounded-full', value: '9999px' },
            ].map(radius => (
              <div key={radius.name} className="text-center">
                <div className={`h-16 w-16 bg-blue-500 ${radius.name}`} />
                <span className="mt-2 block text-xs text-gray-500">{radius.name}</span>
                <span className="text-xs text-gray-400">{radius.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
