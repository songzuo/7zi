/**
 * 响应式设计文档页面
 */

import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: '响应式设计 - 7zi Studio',
  description: '断点系统和响应式布局指南。',
};

export default function ResponsivePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">📱 响应式设计</h1>
        
        {/* 断点系统 */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">断点系统</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4">断点名称</th>
                  <th className="py-2 px-4">最小宽度</th>
                  <th className="py-2 px-4">CSS</th>
                  <th className="py-2 px-4">典型设备</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4"><code className="bg-gray-100 px-2 py-1 rounded">sm</code></td>
                  <td className="py-2 px-4">640px</td>
                  <td className="py-2 px-4"><code className="text-sm">@media (min-width: 640px)</code></td>
                  <td className="py-2 px-4">手机横屏</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4"><code className="bg-gray-100 px-2 py-1 rounded">md</code></td>
                  <td className="py-2 px-4">768px</td>
                  <td className="py-2 px-4"><code className="text-sm">@media (min-width: 768px)</code></td>
                  <td className="py-2 px-4">平板竖屏</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4"><code className="bg-gray-100 px-2 py-1 rounded">lg</code></td>
                  <td className="py-2 px-4">1024px</td>
                  <td className="py-2 px-4"><code className="text-sm">@media (min-width: 1024px)</code></td>
                  <td className="py-2 px-4">平板横屏/小屏笔记本</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4"><code className="bg-gray-100 px-2 py-1 rounded">xl</code></td>
                  <td className="py-2 px-4">1280px</td>
                  <td className="py-2 px-4"><code className="text-sm">@media (min-width: 1280px)</code></td>
                  <td className="py-2 px-4">桌面显示器</td>
                </tr>
                <tr>
                  <td className="py-2 px-4"><code className="bg-gray-100 px-2 py-1 rounded">2xl</code></td>
                  <td className="py-2 px-4">1536px</td>
                  <td className="py-2 px-4"><code className="text-sm">@media (min-width: 1536px)</code></td>
                  <td className="py-2 px-4">大屏显示器</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 响应式布局示例 */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">布局示例</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">网格布局</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-blue-100 p-4 rounded-lg text-center">
                    Item {i}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                使用 <code>grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4</code>
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Flex 布局</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 bg-green-100 p-4 rounded-lg text-center">Flex 1</div>
                <div className="flex-1 bg-green-100 p-4 rounded-lg text-center">Flex 1</div>
                <div className="flex-1 bg-green-100 p-4 rounded-lg text-center">Flex 1</div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                使用 <code>flex flex-col sm:flex-row</code>
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">响应式隐藏/显示</h3>
              <div className="space-y-2">
                <div className="bg-yellow-100 p-4 rounded-lg sm:hidden text-center">
                  仅在手机端显示
                </div>
                <div className="hidden sm:block bg-purple-100 p-4 rounded-lg text-center">
                  仅在平板及更大屏幕显示
                </div>
                <div className="bg-gray-200 p-4 rounded-lg text-center">
                  所有设备都显示
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 响应式图片 */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">响应式图片</h2>
          
          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <pre className="text-sm overflow-x-auto">{`<OptimizedImage
  src="/images/hero.jpg"
  alt="Hero image"
  preset="hero"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 800px"
/>`}</pre>
          </div>
          
          <p className="text-gray-600">
            使用 <code className="bg-gray-100 px-2 py-1 rounded">OptimizedImage</code> 组件配合 
            <code className="bg-gray-100 px-2 py-1 rounded">sizes</code> 属性实现响应式图片加载。
          </p>
        </section>

        {/* 导航 */}
        <div className="flex justify-between mt-8">
          <Link href="/design-system/components" className="text-blue-600 hover:underline">
            ← 组件库
          </Link>
          <Link href="/design-system/guidelines" className="text-blue-600 hover:underline">
            最佳实践 →
          </Link>
        </div>
      </div>
    </div>
  );
}
