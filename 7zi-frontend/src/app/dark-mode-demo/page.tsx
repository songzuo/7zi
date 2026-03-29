/**
 * 深色模式演示页面
 * 展示主题切换功能和各种组件在暗色模式下的表现
 */

'use client';

import React from 'react';
import { ThemeSwitcher } from '../../components/ui/ThemeSwitcher';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card';

export default function DarkModeDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            7zi Frontend - 深色模式演示
          </h1>
          <ThemeSwitcher size="lg" showLabel />
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* 介绍部分 */}
        <section className="mb-12">
          <Card className="border-2 border-primary-200 dark:border-primary-800">
            <CardBody>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-4">
                🌙 深色模式实现完成
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                点击右上角的主题切换按钮，体验平滑的主题过渡动画！
              </p>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" size="md">
                  主要按钮
                </Button>
                <Button variant="secondary" size="md">
                  次要按钮
                </Button>
                <Button variant="outline" size="md">
                  轮廓按钮
                </Button>
                <Button variant="ghost" size="md">
                  幽灵按钮
                </Button>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* 功能特性 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">
            ✨ 功能特性
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🎨 CSS 变量系统</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-gray-600 dark:text-gray-300">
                  完整的颜色变量系统，支持浅色和暗色主题的无缝切换
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>💾 持久化存储</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-gray-600 dark:text-gray-300">
                  用户主题偏好自动保存到 localStorage，刷新页面后保持
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🖥️ 系统偏好检测</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-gray-600 dark:text-gray-300">
                  支持跟随系统主题设置，自动检测并应用系统偏好
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🎬 平滑过渡动画</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-gray-600 dark:text-gray-300">
                  300ms 的平滑过渡动画，提供舒适的视觉体验
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔄 三种主题模式</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-gray-600 dark:text-gray-300">
                  支持浅色、深色、跟随系统三种模式，点击即可循环切换
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📱 响应式设计</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-gray-600 dark:text-gray-300">
                  完美适配各种设备尺寸，从手机到桌面都能正常显示
                </p>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* 颜色展示 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">
            🎨 主题色展示
          </h2>
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
                主色调
              </h3>
              <div className="grid grid-cols-5 gap-2 mb-6">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((level) => (
                  <div
                    key={level}
                    className="p-3 rounded-md text-center"
                    style={{
                      backgroundColor: `var(--color-primary-${level})`,
                      color: level < 500 ? '#1f2937' : '#f9fafb',
                    }}
                  >
                    <div className="text-xs font-medium">{level}</div>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
                灰色系
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((level) => (
                  <div
                    key={level}
                    className="p-3 rounded-md text-center"
                    style={{
                      backgroundColor: `var(--color-gray-${level})`,
                      color: level < 600 ? '#1f2937' : '#f9fafb',
                    }}
                  >
                    <div className="text-xs font-medium">{level}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </section>

        {/* 组件展示 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">
            🧩 组件展示
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 按钮展示 */}
            <Card>
              <CardHeader>
                <CardTitle>按钮组件</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" size="xs">
                      极小
                    </Button>
                    <Button variant="primary" size="sm">
                      小
                    </Button>
                    <Button variant="primary" size="md">
                      中
                    </Button>
                    <Button variant="primary" size="lg">
                      大
                    </Button>
                    <Button variant="primary" size="xl">
                      特大
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="success">成功</Button>
                    <Button variant="danger">危险</Button>
                    <Button variant="primary">警告</Button>
                  </div>
                  <Button variant="outline" fullWidth>
                    全宽按钮
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* 输入框展示 */}
            <Card>
              <CardHeader>
                <CardTitle>输入框组件</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="普通输入框"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                  />
                  <input
                    type="email"
                    placeholder="邮箱输入框"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                  />
                  <textarea
                    placeholder="多行文本域"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 resize-none"
                  />
                </div>
              </CardBody>
            </Card>

            {/* 状态展示 */}
            <Card>
              <CardHeader>
                <CardTitle>状态展示</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">正常状态</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">警告状态</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">错误状态</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-700 dark:text-gray-300">信息状态</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 文字排版 */}
            <Card>
              <CardHeader>
                <CardTitle>文字排版</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-2 text-gray-900 dark:text-gray-50">
                  <p className="text-xs">这是极小号文字 (12px)</p>
                  <p className="text-sm">这是小号文字 (14px)</p>
                  <p className="text-base">这是基础文字 (16px)</p>
                  <p className="text-lg">这是大号文字 (18px)</p>
                  <p className="text-xl">这是特大号文字 (20px)</p>
                  <p className="text-2xl font-bold">这是标题文字 (24px)</p>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* 使用说明 */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">
            📖 使用说明
          </h2>
          <Card>
            <CardBody>
              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
                    在组件中使用
                  </h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{`import { ThemeSwitcher } from '@/components/ui';

function MyComponent() {
  return (
    <div>
      <ThemeSwitcher size="md" showLabel />
    </div>
  );
}`}</code>
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
                    在代码中使用主题钩子
                  </h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{`import { useTheme } from '@/shared/context/ThemeContext';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div>
      <p>当前主题: {theme}</p>
      <p>实际主题: {resolvedTheme}</p>
      <button onClick={() => setTheme('dark')}>
        切换到深色模式
      </button>
    </div>
  );
}`}</code>
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
                    使用 CSS 变量
                  </h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{`/* 在 CSS 文件中 */
.my-component {
  color: var(--color-gray-900);
  background-color: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
}

/* 暗色模式会自动覆盖这些变量 */
.dark .my-component {
  /* 会自动使用暗色模式的颜色变量 */
}`}</code>
                  </pre>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>
      </main>

      {/* 页脚 */}
      <footer className="mt-12 py-8 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>7zi Frontend - 深色模式演示页面</p>
          <p className="text-sm mt-2">
            当前主题: <span className="font-semibold">{localStorage.getItem('theme') || 'system'}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
