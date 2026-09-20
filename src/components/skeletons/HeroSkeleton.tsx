/**
 * 骨架屏组件 - 首屏加载占位
 *
 * 用于 React Suspense fallback，提供平滑的加载体验
 */

import React from 'react'

/**
 * Hero 区域骨架屏
 */
export function HeroSkeleton() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-6 text-center">
        {/* Badge 骨架 */}
        <div className="mb-8 flex justify-center">
          <div className="skeleton h-10 w-40 rounded-full" />
        </div>

        {/* 标题骨架 */}
        <div className="mb-6 space-y-4">
          <div className="skeleton mx-auto h-16 w-3/4 rounded-lg sm:h-20 md:h-24" />
          <div className="skeleton mx-auto h-16 w-2/3 rounded-lg sm:h-20 md:h-24" />
        </div>

        {/* 描述骨架 */}
        <div className="mb-8 space-y-3">
          <div className="skeleton mx-auto h-6 w-full max-w-3xl rounded" />
          <div className="skeleton mx-auto h-6 w-5/6 max-w-2xl rounded" />
        </div>

        {/* CTA 按钮骨架 */}
        <div className="mb-16 flex flex-col justify-center gap-4 sm:flex-row">
          <div className="skeleton h-14 w-48 rounded-full" />
          <div className="skeleton h-14 w-40 rounded-full" />
        </div>

        {/* 统计数据骨架 */}
        <div className="mx-auto grid max-w-2xl grid-cols-3 gap-4 sm:gap-8">
          <div className="space-y-3">
            <div className="skeleton h-10 rounded" />
            <div className="skeleton mx-auto h-4 w-3/4 rounded" />
          </div>
          <div className="space-y-3">
            <div className="skeleton h-10 rounded" />
            <div className="skeleton mx-auto h-4 w-3/4 rounded" />
          </div>
          <div className="space-y-3">
            <div className="skeleton h-10 rounded" />
            <div className="skeleton mx-auto h-4 w-3/4 rounded" />
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * 团队预览骨架屏
 */
export function TeamPreviewSkeleton() {
  return (
    <section className="bg-white px-6 py-16 sm:py-20 dark:bg-zinc-900">
      <div className="mx-auto max-w-6xl">
        {/* 标题骨架 */}
        <div className="mb-12 text-center">
          <div className="skeleton mx-auto mb-4 h-10 w-64 rounded-lg" />
          <div className="skeleton mx-auto h-6 w-96 rounded" />
        </div>

        {/* 团队成员骨架 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 11 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 rounded-2xl bg-zinc-50 p-4 sm:p-6 dark:bg-zinc-800"
            >
              <div className="skeleton h-16 w-16 rounded-2xl" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * 服务区域骨架屏
 */
export function ServicesSkeleton() {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        {/* 标题骨架 */}
        <div className="mb-12 text-center">
          <div className="skeleton mx-auto mb-4 h-10 w-48 rounded-lg" />
          <div className="skeleton mx-auto h-6 w-96 rounded" />
        </div>

        {/* 服务卡片骨架 */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white p-6 shadow-lg sm:p-8 dark:bg-zinc-900">
              <div className="skeleton mb-6 h-16 w-16 rounded-2xl" />
              <div className="skeleton mb-3 h-7 w-32 rounded" />
              <div className="skeleton mb-2 h-5 w-full rounded" />
              <div className="skeleton mb-4 h-5 w-5/6 rounded" />

              {/* 特性列表骨架 */}
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="skeleton h-1.5 w-1.5 rounded-full" />
                    <div className="skeleton h-4 flex-1 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * 为什么选择我们骨架屏
 */
export function WhyUsSkeleton() {
  return (
    <section className="bg-white px-6 py-16 sm:py-20 dark:bg-zinc-900">
      <div className="mx-auto max-w-4xl">
        {/* 标题骨架 */}
        <div className="mb-12 text-center">
          <div className="skeleton mx-auto h-10 w-48 rounded-lg" />
        </div>

        {/* 优势卡片骨架 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-800"
            >
              <div className="skeleton h-12 w-12 flex-shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-6 w-32 rounded" />
                <div className="skeleton h-5 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * CTA 区域骨架屏
 */
export function CTASkeleton() {
  return (
    <section className="bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="skeleton mx-auto mb-6 h-10 w-80 rounded-lg bg-white/20" />
        <div className="skeleton mx-auto mb-8 h-6 w-96 rounded bg-white/20" />
        <div className="skeleton mx-auto h-14 w-48 rounded-full bg-white/30" />
      </div>
    </section>
  )
}

/**
 * 导航栏骨架屏
 */
export function NavigationSkeleton() {
  return (
    <nav className="fixed top-0 right-0 left-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="skeleton h-8 w-32 rounded" />
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-6 lg:flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-6 w-20 rounded" />
            ))}
          </div>
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div className="skeleton h-10 w-28 rounded-full" />
        </div>
      </div>
    </nav>
  )
}

/**
 * 全页面骨架屏
 */
export function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <NavigationSkeleton />
      <HeroSkeleton />
      <TeamPreviewSkeleton />
      <ServicesSkeleton />
      <WhyUsSkeleton />
      <CTASkeleton />
    </div>
  )
}

/**
 * 简单加载指示器
 */
export function SimpleLoader() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-cyan-500" />
    </div>
  )
}
