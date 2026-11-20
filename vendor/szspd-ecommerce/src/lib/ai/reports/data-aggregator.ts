/**
 * Report Data Aggregator
 * 报表数据聚合器
 * 
 * @version 1.10.0
 * @created 2025-04-03
 * 
 * 功能：
 * - 从数据库聚合关键指标
 * - 支持自定义时间范围
 * - 缓存机制优化
 * - 支持多种聚合操作
 */

import { DatabaseConnection } from '@/lib/db/types'
import { logger } from '@/lib/logger'
import {
  DataAggregationRequest,
  AggregatedData,
  TimeSeriesPoint,
  BreakdownData,
  DataInsight,
  ReportTemplateType,
  TimeRange,
  CustomTimeRange,
  DataAggregatorConfig,
  ReportCacheEntry,
} from './types'

/**
 * 数据聚合器默认配置
 */
const DEFAULT_CONFIG: DataAggregatorConfig = {
  cacheEnabled: true,
  cacheTTL: 300, // 5 分钟
  maxQueryTime: 30000, // 30 秒
  batchSize: 1000,
}

/**
 * 报表数据聚合器
 */
export class ReportDataAggregator {
  private config: DataAggregatorConfig
  private cache: Map<string, ReportCacheEntry> = new Map()
  private db: DatabaseConnection | null = null

  constructor(
    db: DatabaseConnection | null = null,
    config: Partial<DataAggregatorConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.db = db
    this.startCacheCleanup()
  }

  /**
   * 设置数据库连接
   */
  setDatabase(db: DatabaseConnection): void {
    this.db = db
  }

  /**
   * 聚合数据
   */
  async aggregate(request: DataAggregationRequest): Promise<AggregatedData> {
    const cacheKey = this.generateCacheKey(request)

    // 尝试从缓存获取
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        logger.debug('[ReportDataAggregator] Cache hit', { cacheKey })
        return cached as AggregatedData
      }
    }

    logger.debug('[ReportDataAggregator] Cache miss, aggregating data', { cacheKey })

    // 聚合数据
    const data = await this.performAggregation(request)

    // 存入缓存
    if (this.config.cacheEnabled) {
      this.setCache(cacheKey, data)
    }

    return data
  }

  /**
   * 执行数据聚合
   */
  private async performAggregation(request: DataAggregationRequest): Promise<AggregatedData> {
    const { templateType, timeRange, customRange, filters, groupBy, aggregations } = request

    // 根据模板类型聚合数据
    switch (templateType) {
      case ReportTemplateType.PROJECT_PROGRESS:
        return this.aggregateProjectProgress(timeRange, customRange, filters)
      
      case ReportTemplateType.TEAM_PERFORMANCE:
        return this.aggregateTeamPerformance(timeRange, customRange, filters)
      
      case ReportTemplateType.TASK_ANALYSIS:
        return this.aggregateTaskAnalysis(timeRange, customRange, filters)
      
      case ReportTemplateType.AGENT_ACTIVITY:
        return this.aggregateAgentActivity(timeRange, customRange, filters)
      
      case ReportTemplateType.REVENUE_ANALYSIS:
        return this.aggregateRevenueAnalysis(timeRange, customRange, filters)
      
      case ReportTemplateType.USER_ENGAGEMENT:
        return this.aggregateUserEngagement(timeRange, customRange, filters)
      
      case ReportTemplateType.CUSTOM:
        // 自定义报表使用通用聚合
        return this.aggregateCustom(timeRange, customRange, filters)
      
      default:
        throw new Error(`Unsupported template type: ${templateType}`)
    }
  }

  /**
   * 聚合项目进度数据
   */
  private async aggregateProjectProgress(
    timeRange: TimeRange,
    customRange?: CustomTimeRange,
    filters?: Record<string, unknown>
  ): Promise<AggregatedData> {
    const { start, end } = this.parseTimeRange(timeRange, customRange)

    // 模拟数据 - 实际应用中从数据库查询
    const metrics = {
      projectName: filters?.projectName as string || '默认项目',
      overallProgress: 68,
      completedTasks: 42,
      newTasks: 15,
      progressTrend: '提升 5%',
      milestonesCount: 8,
      completedMilestones: 5,
      risksCount: 3,
    }

    const timeSeries = this.generateTimeSeries(start, end, 'progress')
    
    const breakdown: BreakdownData[] = [
      { category: '已完成', value: 42, percentage: 73.7, trend: 'up', change: 8 },
      { category: '进行中', value: 10, percentage: 17.5, trend: 'stable', change: 0 },
      { category: '待开始', value: 5, percentage: 8.8, trend: 'down', change: -3 },
    ]

    const insights: DataInsight[] = [
      {
        type: 'positive',
        title: '进度良好',
        description: '项目整体进度达到 68%，比预期提前 5%',
        importance: 'high',
        recommendation: '继续保持当前节奏，关注高风险任务',
      },
      {
        type: 'alert',
        title: '里程碑延期风险',
        description: '有 2 个里程碑可能延期',
        importance: 'medium',
        recommendation: '建议增加资源投入或调整优先级',
      },
    ]

    return {
      metrics,
      timeSeries,
      breakdown,
      insights,
      metadata: {
        aggregatedAt: new Date().toISOString(),
        dataPoints: timeSeries.length,
        timeRange: { start, end },
      },
    }
  }

  /**
   * 聚合团队绩效数据
   */
  private async aggregateTeamPerformance(
    timeRange: TimeRange,
    customRange?: CustomTimeRange,
    filters?: Record<string, unknown>
  ): Promise<AggregatedData> {
    const { start, end } = this.parseTimeRange(timeRange, customRange)

    const metrics = {
      teamName: filters?.teamName as string || '开发团队',
      period: this.formatPeriod(timeRange, customRange),
      completionRate: 87,
      avgResponseTime: 45,
      collaborationScore: 8.5,
      satisfactionScore: 4.2,
      totalMembers: 8,
      activeMembers: 7,
    }

    const timeSeries = this.generateTimeSeries(start, end, 'tasks')
    
    const breakdown: BreakdownData[] = [
      { category: '优秀', value: 3, percentage: 37.5, trend: 'up', change: 1 },
      { category: '良好', value: 4, percentage: 50, trend: 'stable', change: 0 },
      { category: '待改进', value: 1, percentage: 12.5, trend: 'down', change: -1 },
    ]

    const insights: DataInsight[] = [
      {
        type: 'positive',
        title: '团队表现优秀',
        description: '任务完成率达到 87%，客户满意度 4.2/5',
        importance: 'high',
      },
      {
        type: 'neutral',
        title: '协作指数稳定',
        description: '团队协作指数保持在 8.5/10',
        importance: 'medium',
      },
    ]

    return {
      metrics,
      timeSeries,
      breakdown,
      insights,
      metadata: {
        aggregatedAt: new Date().toISOString(),
        dataPoints: timeSeries.length,
        timeRange: { start, end },
      },
    }
  }

  /**
   * 聚合任务分析数据
   */
  private async aggregateTaskAnalysis(
    timeRange: TimeRange,
    customRange?: CustomTimeRange,
    filters?: Record<string, unknown>
  ): Promise<AggregatedData> {
    const { start, end } = this.parseTimeRange(timeRange, customRange)

    const metrics = {
      totalTasks: 156,
      completedTasks: 132,
      inProgressTasks: 18,
      pendingTasks: 4,
      cancelledTasks: 2,
      completionRate: 84.6,
      avgCompletionTime: 4.2,
      highPriority: 45,
      mediumPriority: 78,
      lowPriority: 33,
    }

    const timeSeries = this.generateTimeSeries(start, end, 'tasks')
    
    const breakdown: BreakdownData[] = [
      { category: '已完成', value: 132, percentage: 84.6, trend: 'up', change: 12 },
      { category: '进行中', value: 18, percentage: 11.5, trend: 'stable', change: 0 },
      { category: '待处理', value: 4, percentage: 2.6, trend: 'down', change: -2 },
    ]

    const insights: DataInsight[] = [
      {
        type: 'positive',
        title: '完成率提升',
        description: '任务完成率达到 84.6%，比上期提升 5%',
        importance: 'high',
      },
      {
        type: 'alert',
        title: '高优先级任务积压',
        description: '有 8 个高优先级任务未完成',
        importance: 'medium',
        recommendation: '建议优先处理高优先级任务',
      },
    ]

    return {
      metrics,
      timeSeries,
      breakdown,
      insights,
      metadata: {
        aggregatedAt: new Date().toISOString(),
        dataPoints: timeSeries.length,
        timeRange: { start, end },
      },
    }
  }

  /**
   * 聚合智能体活动数据
   */
  private async aggregateAgentActivity(
    timeRange: TimeRange,
    customRange?: CustomTimeRange,
    filters?: Record<string, unknown>
  ): Promise<AggregatedData> {
    const { start, end } = this.parseTimeRange(timeRange, customRange)

    const metrics = {
      activeAgents: 9,
      totalAgents: 11,
      totalTasks: 342,
      totalTokens: 2450000,
      avgResponseTime: 1450,
      successRate: 96.8,
      errorRate: 3.2,
    }

    const timeSeries = this.generateTimeSeries(start, end, 'tokens')
    
    const breakdown: BreakdownData[] = [
      { category: 'minimax', value: 4, percentage: 36.4, trend: 'up', change: 15 },
      { category: 'self-claude', value: 3, percentage: 27.3, trend: 'stable', change: 0 },
      { category: 'volcengine', value: 2, percentage: 18.2, trend: 'up', change: 8 },
      { category: 'bailian', value: 2, percentage: 18.2, trend: 'down', change: -5 },
    ]

    const insights: DataInsight[] = [
      {
        type: 'positive',
        title: '智能体运行稳定',
        description: '成功率 96.8%，平均响应时间 1450ms',
        importance: 'high',
      },
      {
        type: 'neutral',
        title: 'Token 消耗正常',
        description: '本期消耗 245 万 tokens，在预期范围内',
        importance: 'medium',
      },
    ]

    return {
      metrics,
      timeSeries,
      breakdown,
      insights,
      metadata: {
        aggregatedAt: new Date().toISOString(),
        dataPoints: timeSeries.length,
        timeRange: { start, end },
      },
    }
  }

  /**
   * 聚合收入分析数据
   */
  private async aggregateRevenueAnalysis(
    timeRange: TimeRange,
    customRange?: CustomTimeRange,
    filters?: Record<string, unknown>
  ): Promise<AggregatedData> {
    const { start, end } = this.parseTimeRange(timeRange, customRange)

    const metrics = {
      totalRevenue: 125000,
      growthRate: 18.5,
      yoyGrowth: 42.3,
      arpu: 250,
      conversionRate: 3.8,
      mrr: 42000,
      arr: 504000,
    }

    const timeSeries = this.generateTimeSeries(start, end, 'revenue')
    
    const breakdown: BreakdownData[] = [
      { category: '订阅收入', value: 75000, percentage: 60, trend: 'up', change: 22 },
      { category: '一次性收入', value: 35000, percentage: 28, trend: 'stable', change: 0 },
      { category: '企业收入', value: 15000, percentage: 12, trend: 'up', change: 8 },
    ]

    const insights: DataInsight[] = [
      {
        type: 'positive',
        title: '收入增长强劲',
        description: '环比增长 18.5%，同比增长 42.3%',
        importance: 'high',
      },
      {
        type: 'neutral',
        title: '企业客户潜力',
        description: '企业收入占比仅 12%，有较大增长空间',
        importance: 'medium',
        recommendation: '建议加强企业客户拓展',
      },
    ]

    return {
      metrics,
      timeSeries,
      breakdown,
      insights,
      metadata: {
        aggregatedAt: new Date().toISOString(),
        dataPoints: timeSeries.length,
        timeRange: { start, end },
      },
    }
  }

  /**
   * 聚合用户参与度数据
   */
  private async aggregateUserEngagement(
    timeRange: TimeRange,
    customRange?: CustomTimeRange,
    filters?: Record<string, unknown>
  ): Promise<AggregatedData> {
    const { start, end } = this.parseTimeRange(timeRange, customRange)

    const metrics = {
      totalUsers: 5200,
      activeUsers: 890,
      activeRate: 17.1,
      newUsers: 145,
      churnedUsers: 38,
      netGrowth: 107,
      retentionRate: 78.5,
      avgSessionDuration: 18.5,
      actionsPerUser: 24,
      dauMauRatio: 0.17,
      satisfactionScore: 4.3,
    }

    const timeSeries = this.generateTimeSeries(start, end, 'users')
    
    const breakdown: BreakdownData[] = [
      { category: '日活跃', value: 890, percentage: 17.1, trend: 'up', change: 5 },
      { category: '周活跃', value: 2100, percentage: 40.4, trend: 'up', change: 8 },
      { category: '月活跃', value: 3200, percentage: 61.5, trend: 'up', change: 12 },
    ]

    const insights: DataInsight[] = [
      {
        type: 'positive',
        title: '用户活跃度提升',
        description: 'DAU/MAU 比例达到 0.17，用户粘性增强',
        importance: 'high',
      },
      {
        type: 'alert',
        title: '留存率需关注',
        description: '留存率 78.5%，略低于目标 80%',
        importance: 'medium',
        recommendation: '建议优化用户引导和功能体验',
      },
    ]

    return {
      metrics,
      timeSeries,
      breakdown,
      insights,
      metadata: {
        aggregatedAt: new Date().toISOString(),
        dataPoints: timeSeries.length,
        timeRange: { start, end },
      },
    }
  }

  /**
   * 聚合自定义报表数据
   */
  private async aggregateCustom(
    timeRange: TimeRange,
    customRange?: CustomTimeRange,
    filters?: Record<string, unknown>
  ): Promise<AggregatedData> {
    const { start, end } = this.parseTimeRange(timeRange, customRange)

    // 自定义报表使用通用指标
    const metrics = {
      ...(filters || {}),
      totalRecords: 1000,
      processedAt: new Date().toISOString(),
    }

    const timeSeries = this.generateTimeSeries(start, end, 'generic')
    
    const breakdown: BreakdownData[] = [
      { category: '类别 A', value: 400, percentage: 40, trend: 'up', change: 10 },
      { category: '类别 B', value: 350, percentage: 35, trend: 'stable', change: 0 },
      { category: '类别 C', value: 250, percentage: 25, trend: 'down', change: -5 },
    ]

    const insights: DataInsight[] = [
      {
        type: 'neutral',
        title: '自定义报表已生成',
        description: '根据提供的参数聚合了相关数据',
        importance: 'medium',
      },
    ]

    return {
      metrics,
      timeSeries,
      breakdown,
      insights,
      metadata: {
        aggregatedAt: new Date().toISOString(),
        dataPoints: timeSeries.length,
        timeRange: { start, end },
      },
    }
  }

  /**
   * 解析时间范围
   */
  private parseTimeRange(timeRange: TimeRange, customRange?: CustomTimeRange): { start: string; end: string } {
    const now = new Date()
    let start: Date

    switch (timeRange) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      
      case 'week':
        start = new Date(now)
        start.setDate(now.getDate() - 7)
        break
      
      case 'month':
        start = new Date(now)
        start.setMonth(now.getMonth() - 1)
        break
      
      case 'quarter':
        start = new Date(now)
        start.setMonth(now.getMonth() - 3)
        break
      
      case 'year':
        start = new Date(now)
        start.setFullYear(now.getFullYear() - 1)
        break
      
      case 'custom':
        if (!customRange) {
          throw new Error('Custom time range requires customRange parameter')
        }
        return {
          start: customRange.start,
          end: customRange.end,
        }
      
      default:
        start = new Date(now)
        start.setDate(now.getDate() - 7)
    }

    return {
      start: start.toISOString(),
      end: now.toISOString(),
    }
  }

  /**
   * 格式化周期
   */
  private formatPeriod(timeRange: TimeRange, customRange?: CustomTimeRange): string {
    if (timeRange === 'custom' && customRange) {
      const start = new Date(customRange.start)
      const end = new Date(customRange.end)
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    }

    const periodMap: Record<TimeRange, string> = {
      today: '今日',
      week: '本周',
      month: '本月',
      quarter: '本季度',
      year: '本年度',
      custom: '自定义周期',
    }

    return periodMap[timeRange]
  }

  /**
   * 生成时间序列数据
   */
  private generateTimeSeries(start: string, end: string, metric: string): TimeSeriesPoint[] {
    const points: TimeSeriesPoint[] = []
    const startDate = new Date(start)
    const endDate = new Date(end)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)

      let value: number
      switch (metric) {
        case 'progress':
          value = 50 + Math.random() * 30
          break
        case 'tasks':
          value = 10 + Math.floor(Math.random() * 20)
          break
        case 'tokens':
          value = 50000 + Math.floor(Math.random() * 100000)
          break
        case 'revenue':
          value = 1000 + Math.floor(Math.random() * 2000)
          break
        case 'users':
          value = 100 + Math.floor(Math.random() * 50)
          break
        default:
          value = Math.random() * 100
      }

      points.push({
        timestamp: date.toISOString(),
        value,
        label: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      })
    }

    return points
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(request: DataAggregationRequest): string {
    const parts = [
      request.templateType,
      request.timeRange,
      request.customRange ? `${request.customRange.start}-${request.customRange.end}` : '',
      JSON.stringify(request.filters || {}),
      JSON.stringify(request.groupBy || []),
      JSON.stringify(request.aggregations || []),
    ]
    return parts.join(':')
  }

  /**
   * 从缓存获取
   */
  private getFromCache(key: string): AggregatedData | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    // 更新命中计数
    entry.hitCount++
    
    return entry.data as AggregatedData
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, data: AggregatedData): void {
    const entry: ReportCacheEntry = {
      key,
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.cacheTTL * 1000,
      hitCount: 0,
    }
    
    this.cache.set(key, entry)
  }

  /**
   * 清理过期缓存
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key)
        }
      }
    }, 60000) // 每分钟清理一次
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; hits: number; entries: Array<{ key: string; hitCount: number }> } {
    const entries = Array.from(this.cache.values()).map(entry => ({
      key: entry.key,
      hitCount: entry.hitCount,
    }))

    return {
      size: this.cache.size,
      hits: entries.reduce((sum, entry) => sum + entry.hitCount, 0),
      entries,
    }
  }
}

// 导出单例实例
export const dataAggregator = new ReportDataAggregator()