/**
 * Page Loading Template
 *
 * This template provides a consistent loading experience across route transitions.
 * It uses skeleton screens for better perceived performance.
 *
 * Usage:
 * 1. Copy this file to your route directory as `loading.tsx`
 * 2. Customize the skeleton layout for your page
 * 3. The loading state will automatically be shown during data fetching
 *
 * @module app/[locale]/[route]/loading
 */

import Skeleton from '@/components/Skeleton'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { SkeletonBase } from '@/components/Skeleton'

/**
 * Page Loading Component
 *
 * This component is automatically rendered by Next.js during route transitions
 * while the page component is fetching data. It displays a skeleton screen
 * to provide immediate visual feedback and improve perceived performance.
 *
 * Customization:
 * - Adjust the number of skeleton cards based on your page layout
 * - Modify grid columns to match your page structure
 * - Add navigation skeleton if needed
 * - Include specific skeleton types (Table, List, etc.)
 */
export default function PageLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Navigation Skeleton */}
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Logo */}
          <Skeleton.Avatar size="lg" className="rounded-lg" />
          {/* Nav items */}
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4].map(i => (
              <SkeletonBase key={i} className="h-8 w-20 rounded-lg" />
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <SkeletonBase className="mb-4 h-12 w-1/2 rounded-lg" />
          <Skeleton.Text lines={2} className="max-w-2xl" />
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton.StatCard key={i} />
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="space-y-6 lg:col-span-2">
            {[1, 2, 3].map(i => (
              <Skeleton.Card key={i} showAvatar lines={4} />
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Skeleton.Card showAvatar lines={3} />
            <Skeleton.List items={4} showAvatar />
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Minimal Page Loading (Inline Spinner)
 *
 * Use this for pages that load quickly and don't need full skeleton screens.
 */
export function MinimalPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <LoadingSpinner
        variant="spin"
        size="xl"
        color="primary"
        label="Loading..."
        labelPosition="bottom"
      />
    </div>
  )
}

/**
 * Card Grid Loading Template
 *
 * Use this for pages that display cards in a grid layout.
 */
export function CardGridLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <SkeletonBase className="mb-2 h-10 w-1/3 rounded-lg" />
        <Skeleton.Text lines={1} />
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex items-center gap-4">
        <SkeletonBase className="h-10 w-32 rounded-lg" />
        <SkeletonBase className="h-10 w-40 rounded-lg" />
        <SkeletonBase className="ml-auto h-10 w-24 rounded-lg" />
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton.Card key={i} showAvatar lines={3} />
        ))}
      </div>
    </div>
  )
}

/**
 * Table Loading Template
 *
 * Use this for pages that display data tables.
 */
export function TableLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <SkeletonBase className="mb-2 h-10 w-1/3 rounded-lg" />
        <Skeleton.Text lines={1} />
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex items-center gap-4">
        <SkeletonBase className="h-10 w-32 rounded-lg" />
        <SkeletonBase className="h-10 w-24 rounded-lg" />
        <SkeletonBase className="ml-auto h-10 w-24 rounded-lg" />
      </div>

      {/* Table */}
      <Skeleton.Table rows={8} columns={5} />
    </div>
  )
}

/**
 * List Loading Template
 *
 * Use this for pages that display lists of items.
 */
export function ListLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <SkeletonBase className="mb-2 h-10 w-1/3 rounded-lg" />
        <Skeleton.Text lines={1} />
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex items-center gap-4">
        <SkeletonBase className="h-10 w-32 rounded-lg" />
        <SkeletonBase className="ml-auto h-10 w-24 rounded-lg" />
      </div>

      {/* List */}
      <Skeleton.List items={10} showAvatar />
    </div>
  )
}

/**
 * Dashboard Loading Template
 *
 * Use this for dashboard pages with widgets and charts.
 */
export function DashboardLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <SkeletonBase className="mb-2 h-10 w-1/3 rounded-lg" />
          <Skeleton.Text lines={1} />
        </div>

        {/* Stats Row */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton.StatCard key={i} />
          ))}
        </div>

        {/* Charts Row */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <SkeletonBase className="mb-6 h-6 w-1/4 rounded-lg" />
            <SkeletonBase className="h-64 w-full rounded-lg" />
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <SkeletonBase className="mb-6 h-6 w-1/4 rounded-lg" />
            <SkeletonBase className="h-64 w-full rounded-lg" />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <SkeletonBase className="mb-6 h-6 w-1/4 rounded-lg" />
          <Skeleton.List items={5} showAvatar />
        </div>
      </main>
    </div>
  )
}

/**
 * Tasks Page Loading Template
 *
 * Use this for task management pages.
 */
export function TasksLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <SkeletonBase className="mb-2 h-10 w-1/3 rounded-lg" />
          <Skeleton.Text lines={1} />
        </div>

        {/* Controls */}
        <div className="mb-6 flex items-center gap-4">
          <SkeletonBase className="h-10 w-48 rounded-lg" />
          <SkeletonBase className="h-10 w-32 rounded-lg" />
          <SkeletonBase className="ml-auto h-10 w-24 rounded-lg" />
        </div>

        {/* Task Board */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Columns: Todo, In Progress, Done */}
          {['Todo', 'In Progress', 'Done'].map(column => (
            <div
              key={column}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <SkeletonBase className="mb-4 h-6 w-20 rounded-lg" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton.Card key={i} showAvatar={false} lines={2} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
