/**
 * Bundle Performance Optimizer
 * v1.8.0 前端性能优化工具
 *
 * 功能：
 * - 动态导入管理
 * - 预加载策略
 * - 组件懒加载包装器
 * - 性能指标收集
 */

import { lazy, Suspense, ComponentType } from 'react'

// ============================================
// 类型定义
// ============================================

export interface PreloadConfig {
  priority: 'high' | 'low' | 'auto'
  timeout?: number
}

export interface LazyComponentOptions {
  fallback?: React.ReactNode
  ssr?: boolean
  chunkName?: string
}

// ============================================
// 动态导入缓存
// ============================================

const loadedChunks = new Map<string, Promise<unknown>>()
const preloadedModules = new Set<string>()

/**
 * 缓存动态导入结果，避免重复加载
 */
export function cachedDynamicImport<T>(chunkId: string, importer: () => Promise<T>): Promise<T> {
  if (!loadedChunks.has(chunkId)) {
    loadedChunks.set(chunkId, importer())
  }
  return loadedChunks.get(chunkId) as Promise<T>
}

// ============================================
// 智能预加载
// ============================================

/**
 * 预加载模块
 * 用于用户可能即将访问的功能模块
 */
export function preloadModule(
  chunkId: string,
  importer: () => Promise<unknown>,
  config: PreloadConfig = { priority: 'auto' }
): void {
  // 避免重复预加载
  if (preloadedModules.has(chunkId)) {
    return
  }

  const doPreload = () => {
    preloadedModules.add(chunkId)
    cachedDynamicImport(chunkId, importer)
  }

  if (config.priority === 'high') {
    // 高优先级立即加载
    doPreload()
  } else if (config.priority === 'low') {
    // 低优先级等待空闲时加载
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => doPreload(), { timeout: config.timeout || 2000 })
    } else {
      setTimeout(doPreload, 100)
    }
  } else {
    // 自动优先级：根据网络状况决定
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
      .connection
    if (connection?.effectiveType === '4g') {
      doPreload()
    } else {
      // 网络较慢时延迟预加载
      setTimeout(doPreload, 500)
    }
  }
}

/**
 * 批量预加载模块
 */
export function preloadModules(
  modules: Array<{ chunkId: string; importer: () => Promise<unknown> }>,
  config: PreloadConfig = { priority: 'low' }
): void {
  modules.forEach(({ chunkId, importer }) => {
    preloadModule(chunkId, importer, config)
  })
}

// ============================================
// 懒加载组件包装器
// ============================================

/**
 * 创建懒加载组件
 * 自动包含加载状态和错误处理
 */
export function createLazyComponent<P extends object>(
  dynamicImport: () => Promise<{ default: ComponentType<P> }>,
  options: LazyComponentOptions = {}
) {
  const LazyComponent = lazy(dynamicImport)

  const WrappedComponent = (props: P) => {
    return (
      <Suspense
        fallback={options.fallback || <div className="h-32 animate-pulse rounded bg-gray-200" />}
      >
        <LazyComponent {...props} />
      </Suspense>
    )
  }

  WrappedComponent.displayName = `LazyComponent(${options.chunkName || 'Unknown'})`

  return WrappedComponent
}

// ============================================
// 预加载链接注入
// ============================================

/**
 * 注入预加载链接到 head
 */
export function injectPreloadLink(href: string, as: 'script' | 'style' | 'font' | 'image'): void {
  if (typeof document === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  link.as = as

  if (as === 'font') {
    link.crossOrigin = 'anonymous'
  }

  document.head.appendChild(link)
}

/**
 * 注入 DNS 预解析链接
 */
export function injectDNSPrefetch(hostname: string): void {
  if (typeof document === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'dns-prefetch'
  link.href = `//${hostname}`

  document.head.appendChild(link)
}

// ============================================
// 性能指标收集
// ============================================

export interface BundleMetrics {
  chunkLoadTime: number
  totalChunks: number
  cachedChunks: number
  failedChunks: number
}

/**
 * 收集 bundle 加载性能指标
 */
export function collectBundleMetrics(): BundleMetrics {
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

  const chunkFiles = entries.filter(
    entry => entry.name.includes('/_next/static/chunks/') && entry.name.endsWith('.js')
  )

  const totalLoadTime = chunkFiles.reduce((sum, entry) => sum + entry.duration, 0)

  return {
    chunkLoadTime: Math.round(totalLoadTime),
    totalChunks: chunkFiles.length,
    cachedChunks: chunkFiles.filter(e => e.transferSize === 0).length,
    failedChunks: 0, // 需要错误监听来统计
  }
}

/**
 * 报告性能指标
 */
export function reportBundleMetrics(): void {
  const metrics = collectBundleMetrics()

  if (typeof window !== 'undefined') {
    console.log('[Bundle Metrics]', {
      ...metrics,
      avgChunkTime:
        metrics.totalChunks > 0 ? Math.round(metrics.chunkLoadTime / metrics.totalChunks) : 0,
    })
  }
}

// ============================================
// 导出便捷函数
// ============================================

export const bundleOptimizer = {
  preloadModule,
  preloadModules,
  createLazyComponent,
  injectPreloadLink,
  injectDNSPrefetch,
  collectBundleMetrics,
  reportBundleMetrics,
}

export default bundleOptimizer
