/**
 * @fileoverview 使用新 Zustand stores 的示例组件
 * @description 展示如何使用 preferencesStore, filterStore, 和 uiStore
 */

'use client'

import { useState } from 'react'
import {
  useSettings,
  useTheme,
  useLanguage,
  useFilters,
  useSort,
  usePagination,
  useToasts,
  toast,
} from '@/stores'
import type { ToastType } from '@/stores'

export function StoreUsageExample() {
  // ========== preferencesStore 示例 ==========
  const settings = useSettings()
  const { theme, toggleTheme, isDark } = useTheme()
  const { language, setLanguage } = useLanguage()

  // ========== filterStore 示例 ==========
  // 使用命名空间 'example' 隔离过滤状态
  const filters = useFilters('example')
  const sort = useSort('example')
  const pagination = usePagination('example')

  // ========== uiStore 示例 ==========
  const toasts = useToasts()

  // 本地状态
  const [inputValue, setInputValue] = useState('')

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-2xl font-bold">Zustand Stores 使用示例</h1>

      {/* ========== preferencesStore ========== */}
      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-xl font-semibold">1. Preferences Store</h2>

        <div className="space-y-2">
          <p>
            当前主题: <strong>{theme}</strong>
          </p>
          <p>
            深色模式: <strong>{isDark ? '是' : '否'}</strong>
          </p>
          <p>
            当前语言: <strong>{language}</strong>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleTheme}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            切换主题
          </button>

          <select
            value={language}
            onChange={e => setLanguage(e.target.value as string)}
            className="rounded border px-4 py-2"
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>

        <div className="mt-4 rounded bg-gray-100 p-3 dark:bg-gray-800">
          <h3 className="mb-2 font-semibold">设置详情:</h3>
          <pre className="overflow-auto text-xs">{JSON.stringify(settings, null, 2)}</pre>
        </div>
      </section>

      {/* ========== filterStore ========== */}
      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-xl font-semibold">2. Filter Store</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block">搜索查询:</label>
            <input
              type="text"
              value={filters.searchQuery}
              onChange={e => {
                // 使用 store action
                import('@/stores').then(({ useFilterStore }) => {
                  useFilterStore.getState().setSearchQuery('example', e.target.value)
                })
              }}
              placeholder="输入搜索内容..."
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block">排序:</label>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {sort ? `${sort.field} (${sort.direction === 'asc' ? '升序' : '降序'})` : '无排序'}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1 block">分页:</label>
            <div className="flex items-center gap-2 text-sm">
              <span>第 {pagination.page} 页</span>
              <span>每页 {pagination.pageSize} 条</span>
              <span>共 {pagination.total} 条</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              import('@/stores').then(({ useFilterStore }) => {
                useFilterStore.getState().toggleSort('example', 'name')
              })
            }}
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            按名称排序
          </button>

          <button
            onClick={() => {
              import('@/stores').then(({ useFilterStore }) => {
                useFilterStore.getState().setPage('example', 1)
                useFilterStore.getState().setTotal('example', 100)
              })
            }}
            className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
          >
            重置分页
          </button>
        </div>
      </section>

      {/* ========== uiStore (Toast) ========== */}
      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-xl font-semibold">3. UI Store (Toast)</h2>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <button
            onClick={() => toast.success('操作成功！', '成功')}
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Success
          </button>

          <button
            onClick={() => toast.error('发生错误！', '错误')}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            Error
          </button>

          <button
            onClick={() => toast.warning('请注意！', '警告')}
            className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
          >
            Warning
          </button>

          <button
            onClick={() => toast.info('这是一条信息', '信息')}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Info
          </button>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 font-semibold">当前 Toast 列表 ({toasts.length}):</h3>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {toasts.length === 0 ? (
              <p className="text-gray-500">无 Toast</p>
            ) : (
              toasts.map(t => (
                <div
                  key={t.id}
                  className={`rounded p-3 text-white ${
                    t.type === 'success'
                      ? 'bg-green-500'
                      : t.type === 'error'
                        ? 'bg-red-500'
                        : t.type === 'warning'
                          ? 'bg-yellow-500'
                          : t.type === 'loading'
                            ? 'bg-gray-500'
                            : 'bg-blue-500'
                  }`}
                >
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-sm">{t.message}</div>
                  <div className="mt-1 text-xs opacity-75">
                    {new Date(t.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ========== 使用说明 ========== */}
      <section className="space-y-4 rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
        <h2 className="text-xl font-semibold">使用说明</h2>

        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold">1. Preferences Store</h3>
            <p className="text-gray-600 dark:text-gray-400">
              管理用户偏好设置（主题、语言、通知等），替代 SettingsContext
            </p>
            <pre className="mt-2 rounded bg-gray-200 p-2 text-xs dark:bg-gray-800">
              {`import { useTheme, useLanguage } from '@/stores';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  return (
    <button onClick={toggleTheme}>切换主题</button>
  );
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold">2. Filter Store</h3>
            <p className="text-gray-600 dark:text-gray-400">
              管理全局过滤、排序和分页状态，支持多命名空间隔离
            </p>
            <pre className="mt-2 rounded bg-gray-200 p-2 text-xs dark:bg-gray-800">
              {`import { useFilters, useSort, usePagination } from '@/stores';

function MyComponent() {
  const filters = useFilters('dashboard');
  const sort = useSort('dashboard');
  const pagination = usePagination('dashboard');

  return (
    <div>
      <p>搜索: {filters.searchQuery}</p>
      <p>排序: {sort?.field}</p>
      <p>页码: {pagination.page}</p>
    </div>
  );
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold">3. UI Store</h3>
            <p className="text-gray-600 dark:text-gray-400">
              管理 Toast 通知、Modal 对话框、侧边栏和表单草稿
            </p>
            <pre className="mt-2 rounded bg-gray-200 p-2 text-xs dark:bg-gray-800">
              {`import { toast } from '@/stores';

function MyComponent() {
  const handleClick = () => {
    toast.success('操作成功！');
    toast.error('操作失败！');
    toast.info('提示信息');
  };

  return <button onClick={handleClick}>显示通知</button>;
}`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  )
}
