/**
 * 最佳实践文档页面
 */

import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: '最佳实践 - 7zi Studio',
  description: '组件使用指南、无障碍规范和性能优化建议。',
}

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">✅ 最佳实践</h1>

        {/* 无障碍 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">♿ 无障碍规范</h2>

          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900">语义化 HTML</h3>
              <p className="mt-1 text-sm text-gray-600">
                使用正确的 HTML 标签，如 <code>&lt;button&gt;</code> 而非{' '}
                <code>&lt;div onClick&gt;</code>
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-900">键盘导航</h3>
              <p className="mt-1 text-sm text-gray-600">
                确保所有交互元素可以通过键盘访问，支持 Tab、Enter、Escape 等快捷键
              </p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="font-semibold text-gray-900">ARIA 标签</h3>
              <p className="mt-1 text-sm text-gray-600">
                为非语义化元素添加适当的 <code>aria-label</code>、<code>role</code> 等属性
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-gray-900">颜色对比度</h3>
              <p className="mt-1 text-sm text-gray-600">
                确保文字和背景的对比度符合 WCAG 2.1 AA 标准（至少 4.5:1）
              </p>
            </div>
          </div>
        </section>

        {/* 性能优化 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">⚡ 性能优化</h2>

          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold text-gray-900">图片优化</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>
                  使用 <code>OptimizedImage</code> 组件自动 WebP/AVIF 转换
                </li>
                <li>
                  为关键图片（LCP）设置 <code>priority</code>
                </li>
                <li>
                  使用 <code>loading="lazy"</code> 延迟加载非首屏图片
                </li>
                <li>
                  配置正确的 <code>sizes</code> 属性优化响应式加载
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-gray-900">代码分割</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>
                  使用 <code>dynamic</code> 动态导入大型组件
                </li>
                <li>路由级别的自动代码分割</li>
                <li>第三方库按需导入</li>
              </ul>
              <div className="mt-3 rounded bg-gray-100 p-3 text-sm">
                <code>const HeavyComponent = dynamic(() =&gt; import('./HeavyComponent'))</code>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-gray-900">渲染优化</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>
                  使用 <code>React.memo</code> 避免不必要的重渲染
                </li>
                <li>
                  使用 <code>useMemo</code> 和 <code>useCallback</code> 缓存计算
                </li>
                <li>
                  列表渲染使用稳定的 <code>key</code> 属性
                </li>
                <li>虚拟列表处理大数据集</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 代码规范 */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">📝 代码规范</h2>

          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100">
              <pre className="text-sm">{`// ✅ 推荐：组件命名使用 PascalCase
export function UserProfile() { ... }

// ✅ 推荐：使用 TypeScript 类型
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

// ✅ 推荐：使用 clsx 合并类名
import clsx from 'clsx';

<div className={clsx(
  'base-styles',
  isActive && 'active-styles',
  className
)} />

// ✅ 推荐：使用 next/image 优化图片
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  loading="lazy"
/>`}</pre>
            </div>
          </div>
        </section>

        {/* 错误处理 */}
        <section className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">🛡️ 错误处理</h2>

          <div className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-semibold text-gray-900">错误边界</h3>
              <p className="mt-1 text-sm text-gray-600">
                使用 <code>ErrorBoundary</code> 捕获组件错误，防止整个应用崩溃
              </p>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-gray-900">优雅降级</h3>
              <p className="mt-1 text-sm text-gray-600">
                为关键功能提供降级方案，如图片加载失败时显示占位符
              </p>
            </div>

            <div className="border-l-4 border-cyan-500 pl-4">
              <h3 className="font-semibold text-gray-900">错误日志</h3>
              <p className="mt-1 text-sm text-gray-600">
                集成错误监控（如 Sentry）追踪生产环境错误
              </p>
            </div>
          </div>
        </section>

        {/* 导航 */}
        <div className="mt-8 flex justify-between">
          <Link href="/design-system/responsive" className="text-blue-600 hover:underline">
            ← 响应式设计
          </Link>
          <Link href="/design-system/changelog" className="text-blue-600 hover:underline">
            更新日志 →
          </Link>
        </div>
      </div>
    </div>
  )
}
