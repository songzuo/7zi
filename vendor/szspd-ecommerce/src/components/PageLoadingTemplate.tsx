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

import { Skeleton, SkeletonCard, SkeletonStatCard, SkeletonText, SkeletonList } from '@/components/ui/Skeleton'
import { LoadingSpinner } from '@/components/LoadingSpinner'

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
          <Skeleton variant="circle" className="w-10 h-10 rounded-lg" />
          {/* Nav items */}
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} variant="text" className="h-8 w-20 rounded-lg" />
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Skeleton variant="text" className="mb-4 h-12 w-1/2 rounded-lg" />
          <SkeletonText lines={2} className="max-w-2xl" />
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="space-y-6 lg:col-span-2">
            {[1, 2, 3].map(i => (
              <SkeletonCard key={i} hasAvatar lines={4} />
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <SkeletonCard hasAvatar lines={3} />
            <SkeletonList items={4} hasAvatar />
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
 * Dashboard Page Loading
 *
 * Optimized for dashboard pages with stats and charts.
 */
export function DashboardPageLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        {/* Charts Section */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2].map(i => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
              <Skeleton variant="text" className="mb-4 h-6 w-1/3" />
              <div className="flex h-64 items-center justify-center">
                <LoadingSpinner variant="spin" size="lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <Skeleton variant="text" className="mb-4 h-6 w-1/4" />
          <SkeletonList items={5} hasAvatar />
        </div>
      </main>
    </div>
  )
}

/**
 * Blog Page Loading
 *
 * Optimized for blog listing pages.
 */
export function BlogPageLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Skeleton variant="text" className="mb-4 h-12 w-1/2 rounded-lg" />
          <SkeletonText lines={2} className="max-w-2xl" />
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonCard key={i} hasImage lines={3} />
          ))}
        </div>
      </main>
    </div>
  )
}

/**
 * Table Page Loading
 *
 * Optimized for data table pages.
 */
export function TablePageLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <Skeleton variant="text" className="h-8 w-1/3" />
          <div className="flex gap-2">
            <Skeleton variant="rounded" className="h-10 w-24" />
            <Skeleton variant="rounded" className="h-10 w-24" />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <Skeleton variant="rounded" className="h-10 w-48" />
          <Skeleton variant="rounded" className="h-10 w-32" />
          <Skeleton variant="rounded" className="h-10 w-32" />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex gap-4 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} variant="text" className="h-4 flex-1" />
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="flex gap-4 border-b border-zinc-100 p-4 dark:border-zinc-700">
              {[1, 2, 3, 4, 5].map(j => (
                <Skeleton key={j} variant="text" className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

/**
 * Settings Page Loading
 *
 * Optimized for settings pages with forms.
 */
export function SettingsPageLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Skeleton variant="text" className="mb-4 h-10 w-1/3" />
          <SkeletonText lines={2} className="max-w-xl" />
        </div>

        {/* Settings Form */}
        <div className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton variant="text" className="h-4 w-32" />
              <Skeleton variant="rounded" className="h-10 w-full max-w-md" />
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <Skeleton variant="rounded" className="h-10 w-24" />
            <Skeleton variant="rounded" className="h-10 w-20" />
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Card Grid Loading
 *
 * Generic card grid loading state for portfolio and similar pages.
 */
export function CardGridLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Skeleton variant="text" className="mb-4 h-12 w-1/2 rounded-lg" />
          <SkeletonText lines={2} className="max-w-2xl" />
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonCard key={i} hasImage lines={3} />
          ))}
        </div>
      </main>
    </div>
  )
}

/**
 * Dashboard Loading
 *
 * Simplified dashboard loading state.
 */
export function DashboardLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {[1, 2, 3].map(i => (
              <SkeletonCard key={i} hasAvatar lines={4} />
            ))}
          </div>
          <div className="space-y-6">
            <SkeletonCard hasAvatar lines={3} />
            <SkeletonList items={4} hasAvatar />
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Tasks Loading
 *
 * Loading state for tasks page.
 */
export function TasksLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <Skeleton variant="text" className="h-8 w-1/3" />
          <div className="flex gap-2">
            <Skeleton variant="rounded" className="h-10 w-24" />
            <Skeleton variant="rounded" className="h-10 w-24" />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <Skeleton variant="rounded" className="h-10 w-48" />
          <Skeleton variant="rounded" className="h-10 w-32" />
          <Skeleton variant="rounded" className="h-10 w-32" />
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center gap-3">
                <Skeleton variant="circle" className="h-5 w-5" />
                <Skeleton variant="text" className="h-4 flex-1" />
                <Skeleton variant="rounded" className="h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}