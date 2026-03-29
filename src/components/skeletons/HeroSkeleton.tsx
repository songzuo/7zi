/**
 * 骨架屏组件 - 首屏加载占位
 * 
 * 用于 React Suspense fallback，提供平滑的加载体验
 */

import React from 'react';

/**
 * Hero 区域骨架屏
 */
export function HeroSkeleton() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-5xl mx-auto text-center px-6 w-full">
        {/* Badge 骨架 */}
        <div className="flex justify-center mb-8">
          <div className="h-10 w-40 skeleton rounded-full" />
        </div>
        
        {/* 标题骨架 */}
        <div className="space-y-4 mb-6">
          <div className="h-16 sm:h-20 md:h-24 skeleton rounded-lg w-3/4 mx-auto" />
          <div className="h-16 sm:h-20 md:h-24 skeleton rounded-lg w-2/3 mx-auto" />
        </div>
        
        {/* 描述骨架 */}
        <div className="space-y-3 mb-8">
          <div className="h-6 skeleton rounded w-full max-w-3xl mx-auto" />
          <div className="h-6 skeleton rounded w-5/6 max-w-2xl mx-auto" />
        </div>
        
        {/* CTA 按钮骨架 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <div className="h-14 w-48 skeleton rounded-full" />
          <div className="h-14 w-40 skeleton rounded-full" />
        </div>
        
        {/* 统计数据骨架 */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
          <div className="space-y-3">
            <div className="h-10 skeleton rounded" />
            <div className="h-4 skeleton rounded w-3/4 mx-auto" />
          </div>
          <div className="space-y-3">
            <div className="h-10 skeleton rounded" />
            <div className="h-4 skeleton rounded w-3/4 mx-auto" />
          </div>
          <div className="space-y-3">
            <div className="h-10 skeleton rounded" />
            <div className="h-4 skeleton rounded w-3/4 mx-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * 团队预览骨架屏
 */
export function TeamPreviewSkeleton() {
  return (
    <section className="py-16 sm:py-20 px-6 bg-white dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto">
        {/* 标题骨架 */}
        <div className="text-center mb-12">
          <div className="h-10 w-64 skeleton rounded-lg mx-auto mb-4" />
          <div className="h-6 w-96 skeleton rounded mx-auto" />
        </div>
        
        {/* 团队成员骨架 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl"
            >
              <div className="w-16 h-16 skeleton rounded-2xl" />
              <div className="h-4 w-20 skeleton rounded" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * 服务区域骨架屏
 */
export function ServicesSkeleton() {
  return (
    <section className="py-16 sm:py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* 标题骨架 */}
        <div className="text-center mb-12">
          <div className="h-10 w-48 skeleton rounded-lg mx-auto mb-4" />
          <div className="h-6 w-96 skeleton rounded mx-auto" />
        </div>
        
        {/* 服务卡片骨架 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-8 shadow-lg"
            >
              <div className="w-16 h-16 skeleton rounded-2xl mb-6" />
              <div className="h-7 w-32 skeleton rounded mb-3" />
              <div className="h-5 w-full skeleton rounded mb-2" />
              <div className="h-5 w-5/6 skeleton rounded mb-4" />
              
              {/* 特性列表骨架 */}
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 skeleton rounded-full" />
                    <div className="h-4 flex-1 skeleton rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * 为什么选择我们骨架屏
 */
export function WhyUsSkeleton() {
  return (
    <section className="py-16 sm:py-20 px-6 bg-white dark:bg-zinc-900">
      <div className="max-w-4xl mx-auto">
        {/* 标题骨架 */}
        <div className="text-center mb-12">
          <div className="h-10 w-48 skeleton rounded-lg mx-auto" />
        </div>
        
        {/* 优势卡片骨架 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl"
            >
              <div className="w-12 h-12 skeleton rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-32 skeleton rounded" />
                <div className="h-5 w-full skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * CTA 区域骨架屏
 */
export function CTASkeleton() {
  return (
    <section className="py-16 sm:py-20 px-6 bg-gradient-to-r from-cyan-500 to-purple-500">
      <div className="max-w-3xl mx-auto text-center">
        <div className="h-10 w-80 skeleton rounded-lg mx-auto mb-6 bg-white/20" />
        <div className="h-6 w-96 skeleton rounded mx-auto mb-8 bg-white/20" />
        <div className="h-14 w-48 skeleton rounded-full mx-auto bg-white/30" />
      </div>
    </section>
  );
}

/**
 * 导航栏骨架屏
 */
export function NavigationSkeleton() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="h-8 w-32 skeleton rounded" />
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 w-20 skeleton rounded" />
            ))}
          </div>
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-10 w-28 skeleton rounded-full" />
        </div>
      </div>
    </nav>
  );
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
  );
}

/**
 * 简单加载指示器
 */
export function SimpleLoader() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-cyan-500" />
    </div>
  );
}
