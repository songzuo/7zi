/**
 * 组件库文档页面
 */

import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: '组件库 - 7zi Studio',
  description: '可复用的 UI 组件库。',
};

export default function ComponentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🧩 组件库</h1>
        
        {/* 按钮组件 */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Button 按钮</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">变体</h3>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Primary</button>
                <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Secondary</button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Outline</button>
                <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">Ghost</button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">尺寸</h3>
              <div className="flex items-center gap-3">
                <button className="px-2 py-1 text-sm bg-blue-600 text-white rounded">Small</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">Medium</button>
                <button className="px-6 py-3 text-lg bg-blue-600 text-white rounded-lg">Large</button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">状态</h3>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg" disabled style={{ opacity: 0.5 }}>Disabled</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Loading
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 输入框组件 */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Input 输入框</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">默认输入框</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入内容..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">带图标</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input 
                  type="text" 
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="搜索..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">错误状态</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-red-500 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="错误输入"
              />
              <p className="mt-1 text-sm text-red-500">请输入有效的内容</p>
            </div>
          </div>
        </section>

        {/* 卡片组件 */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Card 卡片</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900 mb-2">基础卡片</h3>
              <p className="text-gray-600 text-sm">这是一个基础的卡片组件，用于展示内容块。</p>
            </div>
            
            <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 bg-gradient-to-r from-blue-400 to-purple-500" />
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">带图片卡片</h3>
                <p className="text-gray-600 text-sm">卡片可以包含图片、标题和内容。</p>
              </div>
            </div>
          </div>
        </section>

        {/* 模态框 */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Modal 模态框</h2>
          
          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md mx-auto p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-gray-600 mb-4">您确定要删除此项目吗？此操作无法撤销。</p>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">删除</button>
              </div>
            </div>
          </div>
        </section>

        {/* 导航 */}
        <div className="flex justify-between mt-8">
          <Link href="/design-system/tokens" className="text-blue-600 hover:underline">
            ← 设计 Token
          </Link>
          <Link href="/design-system/responsive" className="text-blue-600 hover:underline">
            响应式设计 →
          </Link>
        </div>
      </div>
    </div>
  );
}
