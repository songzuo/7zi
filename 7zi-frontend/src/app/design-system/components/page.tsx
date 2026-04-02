/**
 * 组件库文档页面
 */

import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: '组件库 - 7zi Studio',
  description: '可复用的 UI 组件库。',
}

export default function ComponentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">🧩 组件库</h1>

        {/* 按钮组件 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Button 按钮</h2>

          <div className="space-y-4">
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">变体</h3>
              <div className="flex gap-3">
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                  Primary
                </button>
                <button className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">
                  Secondary
                </button>
                <button className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                  Outline
                </button>
                <button className="rounded-lg px-4 py-2 text-blue-600 hover:bg-blue-50">
                  Ghost
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">尺寸</h3>
              <div className="flex items-center gap-3">
                <button className="rounded bg-blue-600 px-2 py-1 text-sm text-white">Small</button>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">Medium</button>
                <button className="rounded-lg bg-blue-600 px-6 py-3 text-lg text-white">
                  Large
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">状态</h3>
              <div className="flex gap-3">
                <button
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                  disabled
                  style={{ opacity: 0.5 }}
                >
                  Disabled
                </button>
                <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white">
                  <span className="animate-spin">⏳</span> Loading
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 输入框组件 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Input 输入框</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">默认输入框</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="请输入内容..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">带图标</label>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="搜索..."
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">错误状态</label>
              <input
                type="text"
                className="w-full rounded-lg border border-red-500 px-3 py-2 focus:ring-2 focus:ring-red-500"
                placeholder="错误输入"
              />
              <p className="mt-1 text-sm text-red-500">请输入有效的内容</p>
            </div>
          </div>
        </section>

        {/* 卡片组件 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Card 卡片</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 transition-shadow hover:shadow-md">
              <h3 className="mb-2 font-semibold text-gray-900">基础卡片</h3>
              <p className="text-sm text-gray-600">这是一个基础的卡片组件，用于展示内容块。</p>
            </div>

            <div className="overflow-hidden rounded-lg border transition-shadow hover:shadow-md">
              <div className="h-32 bg-gradient-to-r from-blue-400 to-purple-500" />
              <div className="p-4">
                <h3 className="mb-2 font-semibold text-gray-900">带图片卡片</h3>
                <p className="text-sm text-gray-600">卡片可以包含图片、标题和内容。</p>
              </div>
            </div>
          </div>
        </section>

        {/* 模态框 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Modal 模态框</h2>

          <div className="rounded-lg border bg-gray-50 p-6">
            <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">确认删除</h3>
              <p className="mb-4 text-gray-600">您确定要删除此项目吗？此操作无法撤销。</p>
              <div className="flex justify-end gap-2">
                <button className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100">
                  取消
                </button>
                <button className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
                  删除
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 导航 */}
        <div className="mt-8 flex justify-between">
          <Link href="/design-system/tokens" className="text-blue-600 hover:underline">
            ← 设计 Token
          </Link>
          <Link href="/design-system/responsive" className="text-blue-600 hover:underline">
            响应式设计 →
          </Link>
        </div>
      </div>
    </div>
  )
}
