/**
 * PrefetchProvider
 *
 * React Context 提供预加载功能
 */

'use client'

import React, { createContext, useContext, useEffect, useCallback, useRef, useMemo } from 'react'
import { PredictivePrefetcher, globalPrefetcher, type UserContext } from './predictive-prefetcher'
import {
  ResourcePrefetcher,
  globalResourcePrefetcher,
  type ResourceConfig,
} from './resource-prefetcher'
import { UserBehaviorAnalyzer, globalBehaviorAnalyzer } from './user-behavior'
import { RoutePrefetcher, globalRoutePrefetcher } from './route-prefetcher'

export interface PrefetchProviderProps {
  children: React.ReactNode

  /** 启用智能预加载 */
  enablePredictive?: boolean

  /** 启用资源预加载 */
  enableResourcePrefetch?: boolean

  /** 启用用户行为分析 */
  enableBehaviorAnalysis?: boolean

  /** 自动预加载配置 */
  autoPrefetchConfig?: {
    /** 滚动时自动预加载 */
    onScroll?: boolean
    /** 鼠标悬停时预加载 */
    onHover?: boolean
    /** 视口内自动预加载 */
    inViewport?: boolean
    /** 预加载延迟 (ms) */
    hoverDelay?: number
  }

  /** 性能监控回调 */
  onPerformanceMetrics?: (metrics: PrefetchMetrics) => void

  /** 调试模式 */
  debug?: boolean
}

export interface PrefetchMetrics {
  pagesVisited: number
  resourcesPrefetched: number
  cacheHits: number
  cacheMisses: number
  avgLoadTime: number
  behaviorStats: ReturnType<UserBehaviorAnalyzer['getStats']> | null
}

interface PrefetchContextValue {
  // 预加载功能
  prefetch: (path: string) => Promise<void>
  prefetchResources: (resources: ResourceConfig[]) => Promise<void>

  // 用户行为
  recordVisit: (path: string, timeSpent?: number) => void
  recordNavigation: (fromPath: string, toPath: string) => void

  // 状态
  metrics: PrefetchMetrics
  isInitialized: boolean

  // 工具方法
  getPredictions: (currentPath: string) => Array<{ path: string; confidence: number }>
  getResourceHints: (resources: ResourceConfig[]) => string[]
}

export const PrefetchContext = createContext<PrefetchContextValue | null>(null)

/**
 * 预加载 Provider
 */
export function PrefetchProvider({
  children,
  enablePredictive = true,
  enableResourcePrefetch = true,
  enableBehaviorAnalysis = true,
  autoPrefetchConfig = {
    onScroll: true,
    onHover: true,
    inViewport: true,
    hoverDelay: 100,
  },
  onPerformanceMetrics,
  debug = false,
}: PrefetchProviderProps) {
  // 实例引用
  const predictivePrefetcherRef = useRef<PredictivePrefetcher>(globalPrefetcher)
  const resourcePrefetcherRef = useRef<ResourcePrefetcher>(globalResourcePrefetcher)
  const behaviorAnalyzerRef = useRef<UserBehaviorAnalyzer>(globalBehaviorAnalyzer)
  const routePrefetcherRef = useRef<RoutePrefetcher>(globalRoutePrefetcher)

  // 状态
  const isInitializedRef = useRef(false)
  const metricsRef = useRef<PrefetchMetrics>({
    pagesVisited: 0,
    resourcesPrefetched: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgLoadTime: 0,
    behaviorStats: null,
  })

  // 加载时间记录
  const loadTimesRef = useRef<number[]>([])
  const currentPageRef = useRef<string>('')
  const pageLoadTimeRef = useRef<number>(Date.now())

  // 初始化
  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    // 初始化路由预加载
    if (enablePredictive) {
      routePrefetcherRef.current.initialize({
        currentPath: window.location.pathname,
        isAuthenticated: true, // 从 auth context 获取
        connectionSpeed: getConnectionSpeed(),
        dataSaverEnabled: isDataSaverEnabled(),
        hasPermission: () => true,
      })
    }

    // 启动会话
    if (enableBehaviorAnalysis) {
      const currentPath = window.location.pathname
      currentPageRef.current = currentPath
      behaviorAnalyzerRef.current.startSession(currentPath)
    }

    if (debug) {
      console.log('[PrefetchProvider] Initialized')
    }
  }, [enablePredictive, enableBehaviorAnalysis, debug])

  // 路由变化监听
  useEffect(() => {
    if (!enableBehaviorAnalysis) return

    const handleRouteChange = () => {
      const newPath = window.location.pathname
      const previousPath = currentPageRef.current

      if (previousPath && previousPath !== newPath) {
        // 计算在上一页停留的时间
        const timeSpent = Date.now() - pageLoadTimeRef.current

        // 记录导航
        behaviorAnalyzerRef.current.recordNavigation(previousPath, newPath)

        // 更新当前页面
        currentPageRef.current = newPath
        pageLoadTimeRef.current = Date.now()

        // 预测并预加载
        if (enablePredictive) {
          const predictions = predictivePrefetcherRef.current.predictNextPages({
            currentPath: newPath,
            previousPath,
            sessionDuration: 0,
          })

          // 预加载预测的页面
          const paths = predictions.map(p => p.path)
          predictivePrefetcherRef.current.prefetch(paths)
        }
      }
    }

    // 使用 popstate 监听路由变化
    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [enableBehaviorAnalysis, enablePredictive])

  // 自动预加载配置
  useEffect(() => {
    if (!autoPrefetchConfig.onHover) return

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const link = target.closest('a[href]')

      if (link) {
        const href = link.getAttribute('href')
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          // 延迟预加载
          setTimeout(() => {
            predictivePrefetcherRef.current.prefetch([href])
          }, autoPrefetchConfig.hoverDelay || 100)
        }
      }
    }

    document.addEventListener('mouseover', handleMouseOver, { passive: true })

    return () => {
      document.removeEventListener('mouseover', handleMouseOver)
    }
  }, [autoPrefetchConfig])

  // 视口内图片预加载
  useEffect(() => {
    if (!autoPrefetchConfig.inViewport || !enableResourcePrefetch) return

    resourcePrefetcherRef.current.prefetchImagesInViewport()
  }, [autoPrefetchConfig, enableResourcePrefetch])

  // 定期更新指标
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = behaviorAnalyzerRef.current.getStats()
      const resourceStatus = resourcePrefetcherRef.current.getPrefetchStatus()

      metricsRef.current = {
        pagesVisited: stats.totalVisits,
        resourcesPrefetched: resourceStatus.total,
        cacheHits: resourceStatus.loaded,
        cacheMisses: resourceStatus.errors,
        avgLoadTime:
          loadTimesRef.current.length > 0
            ? loadTimesRef.current.reduce((a, b) => a + b, 0) / loadTimesRef.current.length
            : 0,
        behaviorStats: stats,
      }

      if (onPerformanceMetrics) {
        onPerformanceMetrics(metricsRef.current)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [onPerformanceMetrics])

  // 页面卸载时结束会话
  useEffect(() => {
    const handleUnload = () => {
      if (enableBehaviorAnalysis) {
        behaviorAnalyzerRef.current.endSession()
      }
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [enableBehaviorAnalysis])

  // API 方法
  const prefetch = useCallback(
    async (path: string) => {
      const startTime = performance.now()

      try {
        await predictivePrefetcherRef.current.prefetch([path])

        const loadTime = performance.now() - startTime
        loadTimesRef.current.push(loadTime)

        if (debug) {
          console.log(`[PrefetchProvider] Prefetched: ${path} (${loadTime.toFixed(2)}ms)`)
        }
      } catch (error) {
        if (debug) {
          console.error(`[PrefetchProvider] Failed to prefetch: ${path}`, error)
        }
      }
    },
    [debug]
  )

  const prefetchResources = useCallback(
    async (resources: ResourceConfig[]) => {
      const results = await resourcePrefetcherRef.current.prefetchResources(resources)

      if (debug) {
        console.log('[PrefetchProvider] Prefetched resources:', results)
      }
    },
    [debug]
  )

  const recordVisit = useCallback(
    (path: string, timeSpent?: number) => {
      behaviorAnalyzerRef.current.recordVisit(path, timeSpent)

      if (debug) {
        console.log(`[PrefetchProvider] Recorded visit: ${path}`)
      }
    },
    [debug]
  )

  const recordNavigation = useCallback(
    (fromPath: string, toPath: string) => {
      behaviorAnalyzerRef.current.recordNavigation(fromPath, toPath)

      if (debug) {
        console.log(`[PrefetchProvider] Recorded navigation: ${fromPath} -> ${toPath}`)
      }
    },
    [debug]
  )

  const getPredictions = useCallback((currentPath: string) => {
    return behaviorAnalyzerRef.current.getNextPages(currentPath).map(p => ({
      path: p.path,
      confidence: p.probability,
    }))
  }, [])

  const getResourceHints = useCallback((resources: ResourceConfig[]) => {
    return resourcePrefetcherRef.current.generateResourceHints(resources)
  }, [])

  // Context 值
  const contextValue = useMemo<PrefetchContextValue>(
    () => ({
      prefetch,
      prefetchResources,
      recordVisit,
      recordNavigation,
      metrics: metricsRef.current,
      isInitialized: isInitializedRef.current,
      getPredictions,
      getResourceHints,
    }),
    [prefetch, prefetchResources, recordVisit, recordNavigation, getPredictions, getResourceHints]
  )

  return <PrefetchContext.Provider value={contextValue}>{children}</PrefetchContext.Provider>
}

/**
 * 使用预加载功能的 Hook
 */
export function usePrefetchContext(): PrefetchContextValue {
  const context = useContext(PrefetchContext)

  if (!context) {
    throw new Error('usePrefetchContext must be used within a PrefetchProvider')
  }

  return context
}

/**
 * 获取连接速度
 */
function getConnectionSpeed(): 'slow' | 'medium' | 'fast' {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 'fast'
  }

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
    .connection

  if (!connection) return 'fast'

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'slow'
    case '3g':
      return 'medium'
    default:
      return 'fast'
  }
}

/**
 * 检查是否启用了数据节省模式
 */
function isDataSaverEnabled(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false
  }

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return connection?.saveData ?? false
}

export default PrefetchProvider
