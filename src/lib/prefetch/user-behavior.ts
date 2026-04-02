/**
 * User Behavior Analyzer
 *
 * 分析用户访问模式，预测下一个可能访问的页面
 */

export interface UserBehaviorPattern {
  path: string
  visitCount: number
  nextPages: Map<string, number> // path -> frequency
  avgSessionDuration: number
  lastVisitTime: number
}

export interface UserSession {
  sessionId: string
  startTime: number
  endTime?: number
  pathSequence: string[]
  totalTime: number
}

export interface UserBehaviorData {
  patterns: Map<string, UserBehaviorPattern>
  sessions: UserSession[]
  totalVisits: number
  lastAnalyzed: number
}

/**
 * 用户行为分析器
 */
export class UserBehaviorAnalyzer {
  private data: UserBehaviorData
  private currentSession: UserSession | null = null
  private storageKey: string
  private maxSessions: number
  private maxPatternAge: number // milliseconds

  constructor(options?: { storageKey?: string; maxSessions?: number; maxPatternAge?: number }) {
    this.storageKey = options?.storageKey || 'user-behavior-data'
    this.maxSessions = options?.maxSessions || 100
    this.maxPatternAge = options?.maxPatternAge || 30 * 24 * 60 * 60 * 1000 // 30 days

    this.data = {
      patterns: new Map(),
      sessions: [],
      totalVisits: 0,
      lastAnalyzed: Date.now(),
    }

    // 从本地存储加载数据
    this.loadFromStorage()
  }

  /**
   * 开始新会话
   */
  startSession(path: string): string {
    const sessionId = this.generateSessionId()

    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      pathSequence: [path],
      totalTime: 0,
    }

    // 记录访问
    this.recordVisit(path)

    return sessionId
  }

  /**
   * 记录页面访问
   */
  recordVisit(path: string, timeSpent?: number): void {
    const now = Date.now()

    // 更新模式
    const pattern = this.data.patterns.get(path)

    if (pattern) {
      pattern.visitCount++
      pattern.lastVisitTime = now

      if (timeSpent && timeSpent > 0) {
        // 加权平均
        const weight = Math.min(1, 1 / pattern.visitCount)
        pattern.avgSessionDuration = pattern.avgSessionDuration * (1 - weight) + timeSpent * weight
      }
    } else {
      this.data.patterns.set(path, {
        path,
        visitCount: 1,
        nextPages: new Map(),
        avgSessionDuration: timeSpent || 0,
        lastVisitTime: now,
      })
    }

    this.data.totalVisits++
    this.data.lastAnalyzed = now

    // 异步保存到本地存储
    this.saveToStorage()
  }

  /**
   * 记录导航（从一个页面到另一个页面）
   */
  recordNavigation(fromPath: string, toPath: string): void {
    // 记录目标页面访问
    this.recordVisit(toPath)

    // 更新源页面的跳转模式
    const pattern = this.data.patterns.get(fromPath)
    if (pattern) {
      const currentCount = pattern.nextPages.get(toPath) || 0
      pattern.nextPages.set(toPath, currentCount + 1)
    }

    // 更新当前会话
    if (this.currentSession) {
      this.currentSession.pathSequence.push(toPath)
    }
  }

  /**
   * 结束会话
   */
  endSession(): number {
    if (!this.currentSession) {
      return 0
    }

    const now = Date.now()
    this.currentSession.endTime = now
    this.currentSession.totalTime = now - this.currentSession.startTime

    // 保存会话
    this.data.sessions.push(this.currentSession)

    // 清理过期会话
    this.cleanupOldSessions()

    // 限制会话数量
    if (this.data.sessions.length > this.maxSessions) {
      this.data.sessions = this.data.sessions.slice(-this.maxSessions)
    }

    const totalTime = this.currentSession.totalTime
    this.currentSession = null

    // 异步保存
    this.saveToStorage()

    return totalTime
  }

  /**
   * 获取下一个可能访问的页面（基于历史模式）
   */
  getNextPages(
    currentPath: string,
    limit: number = 5
  ): Array<{
    path: string
    probability: number
  }> {
    const pattern = this.data.patterns.get(currentPath)
    if (!pattern || pattern.visitCount < 2) {
      return []
    }

    const results: Array<{ path: string; probability: number }> = []

    for (const [nextPath, frequency] of pattern.nextPages) {
      const probability = frequency / pattern.visitCount
      results.push({ path: nextPath, probability })
    }

    // 按概率排序并限制数量
    return results.sort((a, b) => b.probability - a.probability).slice(0, limit)
  }

  /**
   * 基于序列预测（考虑最近的访问路径）
   */
  predictBasedOnSequence(
    currentPath: string,
    previousPaths: string[],
    limit: number = 3
  ): Array<{ path: string; confidence: number }> {
    const predictions: Array<{ path: string; confidence: number }> = []

    // 分析最近 3 次跳转的模式
    const recentPaths = previousPaths.slice(-3)

    for (const prevPath of recentPaths) {
      const pattern = this.data.patterns.get(prevPath)
      if (pattern) {
        // 检查是否有从 prevPath -> currentPath 的跳转
        const transitionCount = pattern.nextPages.get(currentPath) || 0

        if (transitionCount > 0) {
          // 查看 currentPath 的后续页面
          const currentPattern = this.data.patterns.get(currentPath)
          if (currentPattern) {
            for (const [nextPath, frequency] of currentPattern.nextPages) {
              // 计算置信度：基于转移概率
              const confidence =
                (transitionCount / pattern.visitCount) * (frequency / currentPattern.visitCount)

              if (confidence > 0.1) {
                const existing = predictions.find(p => p.path === nextPath)
                if (existing) {
                  existing.confidence = Math.max(existing.confidence, confidence)
                } else {
                  predictions.push({ path: nextPath, confidence })
                }
              }
            }
          }
        }
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, limit)
  }

  /**
   * 获取页面访问统计
   */
  getPageStats(path: string): {
    visitCount: number
    avgDuration: number
    lastVisit: number
    topNextPages: Array<{ path: string; count: number; percentage: number }>
  } | null {
    const pattern = this.data.patterns.get(path)
    if (!pattern) {
      return null
    }

    const topNextPages = Array.from(pattern.nextPages.entries())
      .map(([p, count]) => ({
        path: p,
        count,
        percentage: (count / pattern.visitCount) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      visitCount: pattern.visitCount,
      avgDuration: pattern.avgSessionDuration,
      lastVisit: pattern.lastVisitTime,
      topNextPages,
    }
  }

  /**
   * 获取热门页面
   */
  getPopularPages(limit: number = 10): Array<{
    path: string
    visitCount: number
    avgDuration: number
  }> {
    return Array.from(this.data.patterns.values())
      .map(p => ({
        path: p.path,
        visitCount: p.visitCount,
        avgDuration: p.avgSessionDuration,
      }))
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, limit)
  }

  /**
   * 清理过期数据
   */
  cleanupOldSessions(): void {
    const now = Date.now()
    const cutoff = now - this.maxPatternAge

    // 清理过期会话
    this.data.sessions = this.data.sessions.filter(session => session.startTime > cutoff)

    // 清理过期模式
    for (const [path, pattern] of this.data.patterns) {
      if (pattern.lastVisitTime < cutoff && pattern.visitCount < 5) {
        this.data.patterns.delete(path)
      }
    }
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): UserSession | null {
    return this.currentSession
  }

  /**
   * 导出数据（用于备份或分析）
   */
  exportData(): {
    patterns: Array<{
      path: string
      visitCount: number
      nextPages: Array<[string, number]>
      avgSessionDuration: number
      lastVisitTime: number
    }>
    sessions: UserSession[]
    totalVisits: number
    lastAnalyzed: number
  } {
    return {
      patterns: Array.from(this.data.patterns.values()).map(p => ({
        path: p.path,
        visitCount: p.visitCount,
        nextPages: Array.from(p.nextPages.entries()),
        avgSessionDuration: p.avgSessionDuration,
        lastVisitTime: p.lastVisitTime,
      })),
      sessions: this.data.sessions,
      totalVisits: this.data.totalVisits,
      lastAnalyzed: this.data.lastAnalyzed,
    }
  }

  /**
   * 导入数据（用于恢复或迁移）
   */
  importData(data: ReturnType<typeof this.exportData>): void {
    this.data.patterns = new Map(
      data.patterns.map(p => [
        p.path,
        {
          path: p.path,
          visitCount: p.visitCount,
          nextPages: new Map(p.nextPages),
          avgSessionDuration: p.avgSessionDuration,
          lastVisitTime: p.lastVisitTime,
        },
      ])
    )
    this.data.sessions = data.sessions
    this.data.totalVisits = data.totalVisits
    this.data.lastAnalyzed = data.lastAnalyzed

    this.saveToStorage()
  }

  /**
   * 清除所有数据
   */
  clearData(): void {
    this.data = {
      patterns: new Map(),
      sessions: [],
      totalVisits: 0,
      lastAnalyzed: Date.now(),
    }
    this.currentSession = null

    this.saveToStorage()
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalVisits: number
    uniquePages: number
    totalSessions: number
    avgSessionDuration: number
    lastAnalyzed: number
  } {
    const avgSessionDuration =
      this.data.sessions.length > 0
        ? this.data.sessions.reduce((sum, s) => sum + s.totalTime, 0) / this.data.sessions.length
        : 0

    return {
      totalVisits: this.data.totalVisits,
      uniquePages: this.data.patterns.size,
      totalSessions: this.data.sessions.length,
      avgSessionDuration,
      lastAnalyzed: this.data.lastAnalyzed,
    }
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const serialized = JSON.stringify(this.exportData())
      localStorage.setItem(this.storageKey, serialized)
    } catch (error) {
      console.error('Failed to save user behavior data:', error)
    }
  }

  /**
   * 从本地存储加载
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const serialized = localStorage.getItem(this.storageKey)
      if (serialized) {
        const data = JSON.parse(serialized)
        this.importData(data)
      }
    } catch (error) {
      console.error('Failed to load user behavior data:', error)
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * 全局用户行为分析器实例
 */
export const globalBehaviorAnalyzer = new UserBehaviorAnalyzer()
