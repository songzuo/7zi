/**
 * Predictive Prefetcher
 *
 * 基于用户行为的智能预加载系统
 * - 分析用户行为模式
 * - 预测下一个可能访问的页面
 * - 预加载关键资源
 */

export interface UserBehaviorPattern {
  path: string
  visitCount: number
  nextPages: Map<string, number> // path -> frequency
  avgTimeSpent: number
  lastVisitTime: number
}

export interface UserContext {
  currentPath: string
  previousPath?: string
  sessionDuration: number
  taskContext?: {
    type: string
    id?: string
  }
  userRole?: string
}

export interface PrefetchPrediction {
  path: string
  confidence: number
  reason: 'historical' | 'contextual' | 'sequential' | 'heuristics'
  priority: 'high' | 'medium' | 'low'
}

export interface PrefetchResult {
  path: string
  success: boolean
  duration: number
  timestamp: number
  error?: string
  resourceType: 'route' | 'data' | 'asset'
}

/**
 * 预测性预加载器
 */
export class PredictivePrefetcher {
  private behaviorPatterns: Map<string, UserBehaviorPattern> = new Map()
  private prefetchCache: Map<string, PrefetchResult> = new Map()
  private config: {
    maxPrefetches: number
    confidenceThreshold: number
    cacheTimeout: number
    enableBackgroundPrefetch: boolean
  }

  constructor(config?: Partial<typeof PredictivePrefetcher.prototype.config>) {
    this.config = {
      maxPrefetches: 5,
      confidenceThreshold: 0.3,
      cacheTimeout: 60000, // 1 minute
      enableBackgroundPrefetch: true,
      ...config,
    }
  }

  /**
   * 记录用户访问
   */
  recordVisit(path: string, timeSpent?: number): void {
    const existing = this.behaviorPatterns.get(path)

    if (existing) {
      existing.visitCount++
      existing.lastVisitTime = Date.now()
      if (timeSpent) {
        existing.avgTimeSpent = (existing.avgTimeSpent + timeSpent) / 2
      }
    } else {
      this.behaviorPatterns.set(path, {
        path,
        visitCount: 1,
        nextPages: new Map(),
        avgTimeSpent: timeSpent || 0,
        lastVisitTime: Date.now(),
      })
    }
  }

  /**
   * 记录页面跳转
   */
  recordNavigation(fromPath: string, toPath: string): void {
    this.recordVisit(toPath)

    const pattern = this.behaviorPatterns.get(fromPath)
    if (pattern) {
      const currentCount = pattern.nextPages.get(toPath) || 0
      pattern.nextPages.set(toPath, currentCount + 1)
    }
  }

  /**
   * 预测下一个可能访问的页面
   */
  predictNextPages(context: UserContext): PrefetchPrediction[] {
    const predictions: PrefetchPrediction[] = []
    const { currentPath } = context

    // 1. 基于历史模式预测
    predictions.push(...this.predictFromHistory(currentPath))

    // 2. 基于上下文预测
    predictions.push(...this.predictFromContext(context))

    // 3. 基于序列预测
    predictions.push(...this.predictFromSequence(context))

    // 4. 启发式预测
    predictions.push(...this.predictFromHeuristics(context))

    // 去重、排序、过滤
    const uniquePredictions = this.deduplicateAndSort(predictions)

    return uniquePredictions
      .filter(p => p.confidence >= this.config.confidenceThreshold)
      .slice(0, this.config.maxPrefetches)
  }

  /**
   * 基于历史模式预测
   */
  private predictFromHistory(currentPath: string): PrefetchPrediction[] {
    const pattern = this.behaviorPatterns.get(currentPath)
    if (!pattern || pattern.visitCount < 2) {
      return []
    }

    const predictions: PrefetchPrediction[] = []

    for (const [nextPath, frequency] of pattern.nextPages) {
      const confidence = frequency / pattern.visitCount
      predictions.push({
        path: nextPath,
        confidence,
        reason: 'historical',
        priority: confidence > 0.5 ? 'high' : confidence > 0.3 ? 'medium' : 'low',
      })
    }

    return predictions
  }

  /**
   * 基于上下文预测
   */
  private predictFromContext(context: UserContext): PrefetchPrediction[] {
    const predictions: PrefetchPrediction[] = []

    if (context.taskContext) {
      // 任务编辑场景
      if (context.taskContext.type === 'task-editing') {
        predictions.push({
          path: '/tasks',
          confidence: 0.7,
          reason: 'contextual',
          priority: 'high',
        })
        predictions.push({
          path: `/tasks/${context.taskContext.id}`,
          confidence: 0.6,
          reason: 'contextual',
          priority: 'medium',
        })
      }

      // 项目查看场景
      if (context.taskContext.type === 'project-view') {
        predictions.push({
          path: '/projects',
          confidence: 0.65,
          reason: 'contextual',
          priority: 'high',
        })
      }
    }

    // 基于用户角色预测
    if (context.userRole === 'admin') {
      predictions.push({
        path: '/admin',
        confidence: 0.5,
        reason: 'contextual',
        priority: 'medium',
      })
    }

    return predictions
  }

  /**
   * 基于序列预测（马尔可夫链简化版）
   */
  private predictFromSequence(context: UserContext): PrefetchPrediction[] {
    if (!context.previousPath) {
      return []
    }

    const predictions: PrefetchPrediction[] = []
    const prevPattern = this.behaviorPatterns.get(context.previousPath)

    if (prevPattern) {
      // 找到从 previousPath -> currentPath 的模式
      const transition = prevPattern.nextPages.get(context.currentPath)
      if (transition) {
        // 查看 currentPath 的后续页面
        const currentPattern = this.behaviorPatterns.get(context.currentPath)
        if (currentPattern) {
          for (const [nextPath, frequency] of currentPattern.nextPages) {
            const confidence =
              (transition / prevPattern.visitCount) * (frequency / currentPattern.visitCount)
            if (confidence > 0.2) {
              predictions.push({
                path: nextPath,
                confidence: confidence * 0.9, // 略微降低序列预测的置信度
                reason: 'sequential',
                priority: 'medium',
              })
            }
          }
        }
      }
    }

    return predictions
  }

  /**
   * 启发式预测
   */
  private predictFromHeuristics(context: UserContext): PrefetchPrediction[] {
    const predictions: PrefetchPrediction[] = []
    const currentPath = context.currentPath

    // 通用导航规则
    const heuristics: Record<string, PrefetchPrediction[]> = {
      '/': [
        { path: '/dashboard', confidence: 0.5, reason: 'heuristics', priority: 'medium' },
        { path: '/tasks', confidence: 0.4, reason: 'heuristics', priority: 'low' },
      ],
      '/dashboard': [
        { path: '/tasks', confidence: 0.6, reason: 'heuristics', priority: 'high' },
        { path: '/settings', confidence: 0.3, reason: 'heuristics', priority: 'low' },
      ],
      '/tasks': [
        { path: '/tasks/new', confidence: 0.5, reason: 'heuristics', priority: 'medium' },
        { path: '/dashboard', confidence: 0.4, reason: 'heuristics', priority: 'low' },
      ],
      '/settings': [
        { path: '/settings/profile', confidence: 0.6, reason: 'heuristics', priority: 'high' },
        {
          path: '/settings/notifications',
          confidence: 0.5,
          reason: 'heuristics',
          priority: 'medium',
        },
      ],
    }

    if (heuristics[currentPath]) {
      predictions.push(...heuristics[currentPath])
    }

    return predictions
  }

  /**
   * 去重并排序
   */
  private deduplicateAndSort(predictions: PrefetchPrediction[]): PrefetchPrediction[] {
    const uniqueMap = new Map<string, PrefetchPrediction>()

    for (const pred of predictions) {
      const existing = uniqueMap.get(pred.path)
      if (!existing || existing.confidence < pred.confidence) {
        uniqueMap.set(pred.path, pred)
      }
    }

    return Array.from(uniqueMap.values()).sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * 执行预加载
   */
  async prefetch(paths: string[]): Promise<PrefetchResult[]> {
    const results: PrefetchResult[] = []

    for (const path of paths) {
      // 检查缓存
      const cached = this.prefetchCache.get(path)
      if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
        results.push(cached)
        continue
      }

      // 执行预加载
      const result = await this.prefetchPath(path)
      this.prefetchCache.set(path, result)
      results.push(result)
    }

    return results
  }

  /**
   * 预加载单个路径
   */
  private async prefetchPath(path: string): Promise<PrefetchResult> {
    const startTime = performance.now()

    try {
      // 在浏览器环境中，使用 Next.js 的 router.prefetch
      if (typeof window !== 'undefined' && 'router' in window) {
        // @ts-ignore - Next.js router
        await window.router.prefetch(path)
      }

      // 预加载关键资源
      await this.prefetchCriticalResources(path)

      return {
        path,
        success: true,
        duration: performance.now() - startTime,
        timestamp: Date.now(),
        resourceType: 'route',
      }
    } catch (error) {
      return {
        path,
        success: false,
        duration: performance.now() - startTime,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
        resourceType: 'route',
      }
    }
  }

  /**
   * 预加载关键资源
   */
  private async prefetchCriticalResources(path: string): Promise<void> {
    // 根据路径预加载特定资源
    const resourceMap: Record<string, string[]> = {
      '/dashboard': ['/api/dashboard/stats', '/api/recent-activities'],
      '/tasks': ['/api/tasks', '/api/tasks/stats'],
      '/settings': ['/api/user/preferences'],
    }

    const resources = resourceMap[path] || []

    for (const resource of resources) {
      try {
        // 使用 link rel=prefetch 预加载
        if (typeof document !== 'undefined') {
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = resource
          document.head.appendChild(link)
        }
      } catch (error) {
        // 忽略预加载错误
      }
    }
  }

  /**
   * 获取预加载缓存
   */
  getCache(): Map<string, PrefetchResult> {
    return new Map(this.prefetchCache)
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.prefetchCache.clear()
  }

  /**
   * 导出行为模式（用于持久化）
   */
  exportPatterns(): UserBehaviorPattern[] {
    return Array.from(this.behaviorPatterns.values()).map(pattern => ({
      ...pattern,
      nextPages: Array.from(pattern.nextPages.entries()),
    })) as UserBehaviorPattern[]
  }

  /**
   * 导入行为模式
   */
  importPatterns(patterns: UserBehaviorPattern[]): void {
    for (const pattern of patterns) {
      this.behaviorPatterns.set(pattern.path, {
        ...pattern,
        nextPages: new Map(Object.entries(pattern.nextPages as Record<string, number>)),
      })
    }
  }
}

/**
 * 全局预加载器实例
 */
export const globalPrefetcher = new PredictivePrefetcher()

/**
 * React Hook: 使用预测性预加载
 */
export function usePredictivePrefetch() {
  return {
    recordVisit: (path: string, timeSpent?: number) =>
      globalPrefetcher.recordVisit(path, timeSpent),
    recordNavigation: (from: string, to: string) => globalPrefetcher.recordNavigation(from, to),
    predict: (context: UserContext) => globalPrefetcher.predictNextPages(context),
    prefetch: (paths: string[]) => globalPrefetcher.prefetch(paths),
  }
}
