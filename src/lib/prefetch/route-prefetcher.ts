/**
 * Route Prefetcher
 *
 * 路由级别的预加载策略
 */

import { PrefetchPrediction } from './predictive-prefetcher'

export interface RoutePrefetchConfig {
  /** 路由路径 */
  path: string
  /** 预加载优先级 */
  priority: 'critical' | 'high' | 'medium' | 'low'
  /** 预加载条件 */
  condition?: (context: PrefetchContext) => boolean
  /** 依赖的数据 */
  dataDependencies?: string[]
  /** 预加载延迟 (ms) */
  delay?: number
  /** 是否启用后台预加载 */
  background?: boolean
}

export interface PrefetchContext {
  currentPath: string
  userRole?: string
  isAuthenticated: boolean
  hasPermission: (permission: string) => boolean
  connectionSpeed: 'slow' | 'medium' | 'fast'
  batteryLevel?: number
  dataSaverEnabled: boolean
}

/**
 * 路由预加载配置
 */
export const ROUTE_PREFETCH_CONFIGS: RoutePrefetchConfig[] = [
  // 关键路由 - 始终预加载
  {
    path: '/dashboard',
    priority: 'critical',
    dataDependencies: ['/api/dashboard/stats'],
    background: true,
  },
  {
    path: '/tasks',
    priority: 'critical',
    dataDependencies: ['/api/tasks', '/api/tasks/stats'],
    background: true,
  },

  // 高优先级路由 - 登录后预加载
  {
    path: '/settings',
    priority: 'high',
    condition: ctx => ctx.isAuthenticated,
    delay: 2000,
  },
  {
    path: '/profile',
    priority: 'high',
    condition: ctx => ctx.isAuthenticated,
    delay: 3000,
  },

  // 中优先级路由 - 按需预加载
  {
    path: '/projects',
    priority: 'medium',
    condition: ctx => ctx.isAuthenticated && ctx.hasPermission('view_projects'),
    delay: 5000,
  },
  {
    path: '/reports',
    priority: 'medium',
    condition: ctx => ctx.isAuthenticated && ctx.hasPermission('view_reports'),
    delay: 5000,
  },

  // 低优先级路由 - 后台预加载
  {
    path: '/help',
    priority: 'low',
    background: true,
    delay: 10000,
  },
]

/**
 * 路由预加载器
 */
export class RoutePrefetcher {
  private configs: RoutePrefetchConfig[]
  private prefetchedRoutes: Set<string> = new Set()
  private pendingPrefetches: Map<string, NodeJS.Timeout> = new Map()

  constructor(configs: RoutePrefetchConfig[] = ROUTE_PREFETCH_CONFIGS) {
    this.configs = configs
  }

  /**
   * 初始化预加载
   */
  initialize(context: PrefetchContext): void {
    // 立即预加载关键路由
    const criticalRoutes = this.configs.filter(c => c.priority === 'critical')
    for (const config of criticalRoutes) {
      if (!config.condition || config.condition(context)) {
        this.schedulePrefetch(config)
      }
    }

    // 延迟预加载其他路由
    const otherRoutes = this.configs.filter(c => c.priority !== 'critical')
    for (const config of otherRoutes) {
      if (!config.condition || config.condition(context)) {
        this.schedulePrefetch(config, config.delay)
      }
    }
  }

  /**
   * 调度预加载
   */
  private schedulePrefetch(config: RoutePrefetchConfig, delay: number = 0): void {
    if (this.prefetchedRoutes.has(config.path)) {
      return
    }

    // 取消之前的调度
    const existing = this.pendingPrefetches.get(config.path)
    if (existing) {
      clearTimeout(existing)
    }

    const timeout = setTimeout(() => {
      this.executePrefetch(config)
      this.pendingPrefetches.delete(config.path)
    }, delay)

    this.pendingPrefetches.set(config.path, timeout)
  }

  /**
   * 执行预加载
   */
  private async executePrefetch(config: RoutePrefetchConfig): Promise<void> {
    if (this.prefetchedRoutes.has(config.path)) {
      return
    }

    try {
      // 预加载路由
      if (typeof window !== 'undefined') {
        // Next.js router prefetch
        interface WindowWithNext {
          next?: {
            router?: {
              prefetch?: (path: string) => Promise<void>
            }
          }
        }
        const router = (window as WindowWithNext).next?.router
        if (router?.prefetch) {
          await router.prefetch(config.path)
        }
      }

      // 预加载数据依赖
      if (config.dataDependencies) {
        await Promise.all(config.dataDependencies.map(dep => this.prefetchData(dep)))
      }

      this.prefetchedRoutes.add(config.path)
    } catch (error) {
      console.error(`Failed to prefetch ${config.path}:`, error)
    }
  }

  /**
   * 预加载数据
   */
  private async prefetchData(url: string): Promise<void> {
    if (typeof document === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    link.as = 'fetch'
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  }

  /**
   * 预测并预加载
   */
  async prefetchPredictions(predictions: PrefetchPrediction[]): Promise<void> {
    for (const pred of predictions) {
      if (pred.priority === 'high') {
        await this.executePrefetch({ path: pred.path, priority: 'high' })
      } else {
        this.schedulePrefetch(
          { path: pred.path, priority: pred.priority },
          pred.priority === 'medium' ? 1000 : 3000
        )
      }
    }
  }

  /**
   * 取消预加载
   */
  cancelPrefetch(path: string): void {
    const timeout = this.pendingPrefetches.get(path)
    if (timeout) {
      clearTimeout(timeout)
      this.pendingPrefetches.delete(path)
    }
  }

  /**
   * 清除所有预加载
   */
  clearAll(): void {
    for (const timeout of this.pendingPrefetches.values()) {
      clearTimeout(timeout)
    }
    this.pendingPrefetches.clear()
    this.prefetchedRoutes.clear()
  }

  /**
   * 获取预加载状态
   */
  getStatus(): {
    prefetched: string[]
    pending: string[]
  } {
    return {
      prefetched: Array.from(this.prefetchedRoutes),
      pending: Array.from(this.pendingPrefetches.keys()),
    }
  }
}

/**
 * 资源优先级管理
 */
export class ResourcePriorityManager {
  private priorityQueue: Map<string, { priority: number; callback: () => Promise<void> }[]> =
    new Map()

  /**
   * 添加资源到队列
   */
  enqueue(queueName: string, priority: number, callback: () => Promise<void>): void {
    if (!this.priorityQueue.has(queueName)) {
      this.priorityQueue.set(queueName, [])
    }

    const queue = this.priorityQueue.get(queueName)!
    queue.push({ priority, callback })
    queue.sort((a, b) => b.priority - a.priority)
  }

  /**
   * 执行队列
   */
  async executeQueue(queueName: string, concurrency: number = 2): Promise<void> {
    const queue = this.priorityQueue.get(queueName)
    if (!queue || queue.length === 0) return

    const executing: Promise<void>[] = []

    while (queue.length > 0) {
      if (executing.length >= concurrency) {
        await Promise.race(executing)
      }

      const item = queue.shift()
      if (item) {
        const promise = item
          .callback()
          .then(() => {
            const index = executing.indexOf(promise)
            if (index > -1) {
              executing.splice(index, 1)
            }
          })
          .catch(() => {
            // Silently ignore callback errors and remove from executing
            const index = executing.indexOf(promise)
            if (index > -1) {
              executing.splice(index, 1)
            }
          })
        executing.push(promise)
      }
    }

    await Promise.all(executing)
  }

  /**
   * 清除队列
   */
  clearQueue(queueName: string): void {
    this.priorityQueue.delete(queueName)
  }
}

/**
 * 全局路由预加载器实例
 */
export const globalRoutePrefetcher = new RoutePrefetcher()
