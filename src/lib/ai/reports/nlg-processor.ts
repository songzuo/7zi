/**
 * Natural Language Generation Processor
 * 自然语言生成处理器
 * 
 * @version 1.10.0
 * @created 2025-04-03
 * 
 * 功能：
 * - 将结构化数据转换为自然语言
 * - 支持不同语气风格（正式、简洁、详细）
 * - 关键洞察自动提取
 * - 多语言支持
 */

import { logger } from '@/lib/logger'
import {
  AggregatedData,
  GeneratedReport,
  ReportInsight,
  ReportSectionOutput,
  ReportTone,
  ReportLanguage,
  ReportTemplateType,
  NLGProcessorConfig,
  DataInsight,
  BreakdownData,
  TimeSeriesPoint,
} from './types'

/**
 * NLG 处理器默认配置
 */
const DEFAULT_CONFIG: NLGProcessorConfig = {
  defaultTone: ReportTone.FORMAL,
  defaultLanguage: ReportLanguage.ZH_CN,
  maxContentLength: 10000,
  enableSummarization: true,
  enableInsightExtraction: true,
}

/**
 * 自然语言生成处理器
 */
export class NLGProcessor {
  private config: NLGProcessorConfig

  constructor(config: Partial<NLGProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 生成报表
   */
  async generateReport(
    templateType: ReportTemplateType,
    data: AggregatedData,
    options: {
      language?: ReportLanguage
      tone?: ReportTone
      includeInsights?: boolean
      includeCharts?: boolean
    } = {}
  ): Promise<GeneratedReport> {
    const startTime = Date.now()
    const language = options.language || this.config.defaultLanguage
    const tone = options.tone || this.config.defaultTone

    logger.debug('[NLGProcessor] Generating report', { templateType, language, tone })

    // 生成标题
    const title = this.generateTitle(templateType, data, language)

    // 生成摘要
    const summary = this.generateSummary(templateType, data, tone, language)

    // 生成章节
    const sections = this.generateSections(templateType, data, tone, language)

    // 生成洞察
    const insights = options.includeInsights !== false 
      ? this.generateInsights(data, tone, language)
      : []

    const report: GeneratedReport = {
      id: this.generateReportId(),
      templateType,
      title,
      summary,
      sections,
      insights,
      metadata: {
        generatedAt: new Date().toISOString(),
        timeRange: data.metadata.timeRange,
        language,
        tone,
        dataPoints: data.metadata.dataPoints,
        generationTimeMs: Date.now() - startTime,
      },
      rawData: options.includeCharts ? data : undefined,
    }

    logger.debug('[NLGProcessor] Report generated', { 
      reportId: report.id,
      generationTimeMs: report.metadata.generationTimeMs 
    })

    return report
  }

  /**
   * 生成标题
   */
  private generateTitle(
    templateType: ReportTemplateType,
    data: AggregatedData,
    language: ReportLanguage
  ): string {
    const titles: Record<ReportTemplateType, Record<ReportLanguage, string>> = {
      [ReportTemplateType.PROJECT_PROGRESS]: {
        [ReportLanguage.ZH_CN]: '项目进度报表',
        [ReportLanguage.EN_US]: 'Project Progress Report',
        [ReportLanguage.ZH_TW]: '專案進度報表',
        [ReportLanguage.JA_JP]: 'プロジェクト進捗レポート',
      },
      [ReportTemplateType.TEAM_PERFORMANCE]: {
        [ReportLanguage.ZH_CN]: '团队绩效报表',
        [ReportLanguage.EN_US]: 'Team Performance Report',
        [ReportLanguage.ZH_TW]: '團隊績效報表',
        [ReportLanguage.JA_JP]: 'チームパフォーマンスレポート',
      },
      [ReportTemplateType.TASK_ANALYSIS]: {
        [ReportLanguage.ZH_CN]: '任务分析报表',
        [ReportLanguage.EN_US]: 'Task Analysis Report',
        [ReportLanguage.ZH_TW]: '任務分析報表',
        [ReportLanguage.JA_JP]: 'タスク分析レポート',
      },
      [ReportTemplateType.AGENT_ACTIVITY]: {
        [ReportLanguage.ZH_CN]: '智能体活动报表',
        [ReportLanguage.EN_US]: 'Agent Activity Report',
        [ReportLanguage.ZH_TW]: '智能體活動報表',
        [ReportLanguage.JA_JP]: 'エージェント活動レポート',
      },
      [ReportTemplateType.REVENUE_ANALYSIS]: {
        [ReportLanguage.ZH_CN]: '收入分析报表',
        [ReportLanguage.EN_US]: 'Revenue Analysis Report',
        [ReportLanguage.ZH_TW]: '收入分析報表',
        [ReportLanguage.JA_JP]: '収益分析レポート',
      },
      [ReportTemplateType.USER_ENGAGEMENT]: {
        [ReportLanguage.ZH_CN]: '用户参与度报表',
        [ReportLanguage.EN_US]: 'User Engagement Report',
        [ReportLanguage.ZH_TW]: '用戶參與度報表',
        [ReportLanguage.JA_JP]: 'ユーザーエンゲージメントレポート',
      },
      [ReportTemplateType.CUSTOM]: {
        [ReportLanguage.ZH_CN]: '自定义报表',
        [ReportLanguage.EN_US]: 'Custom Report',
        [ReportLanguage.ZH_TW]: '自定義報表',
        [ReportLanguage.JA_JP]: 'カスタムレポート',
      },
    }

    return titles[templateType]?.[language] || 'Report'
  }

  /**
   * 生成摘要
   */
  private generateSummary(
    templateType: ReportTemplateType,
    data: AggregatedData,
    tone: ReportTone,
    language: ReportLanguage
  ): string {
    const metrics = data.metrics as Record<string, unknown>

    switch (templateType) {
      case ReportTemplateType.PROJECT_PROGRESS:
        return this.generateProjectProgressSummary(metrics, tone, language)
      
      case ReportTemplateType.TEAM_PERFORMANCE:
        return this.generateTeamPerformanceSummary(metrics, tone, language)
      
      case ReportTemplateType.TASK_ANALYSIS:
        return this.generateTaskAnalysisSummary(metrics, tone, language)
      
      case ReportTemplateType.AGENT_ACTIVITY:
        return this.generateAgentActivitySummary(metrics, tone, language)
      
      case ReportTemplateType.REVENUE_ANALYSIS:
        return this.generateRevenueAnalysisSummary(metrics, tone, language)
      
      case ReportTemplateType.USER_ENGAGEMENT:
        return this.generateUserEngagementSummary(metrics, tone, language)
      
      default:
        return this.generateGenericSummary(metrics, tone, language)
    }
  }

  /**
   * 生成章节
   */
  private generateSections(
    templateType: ReportTemplateType,
    data: AggregatedData,
    tone: ReportTone,
    language: ReportLanguage
  ): ReportSectionOutput[] {
    const sections: ReportSectionOutput[] = []

    // 概览章节
    sections.push({
      id: 'overview',
      title: language === ReportLanguage.ZH_CN ? '概览' : 'Overview',
      content: this.generateOverviewContent(data, tone, language),
      data: data.metrics,
      order: 1,
    })

    // 趋势章节
    if (data.timeSeries && data.timeSeries.length > 0) {
      sections.push({
        id: 'trends',
        title: language === ReportLanguage.ZH_CN ? '趋势分析' : 'Trend Analysis',
        content: this.generateTrendsContent(data.timeSeries, tone, language),
        data: { timeSeries: data.timeSeries },
        charts: [
          {
            type: 'line',
            title: language === ReportLanguage.ZH_CN ? '趋势图' : 'Trend Chart',
            data: data.timeSeries as unknown as Record<string, unknown>[],
          },
        ],
        order: 2,
      })
    }

    // 分布章节
    if (data.breakdown && data.breakdown.length > 0) {
      sections.push({
        id: 'breakdown',
        title: language === ReportLanguage.ZH_CN ? '分布分析' : 'Distribution Analysis',
        content: this.generateBreakdownContent(data.breakdown, tone, language),
        data: { breakdown: data.breakdown },
        charts: [
          {
            type: 'pie',
            title: language === ReportLanguage.ZH_CN ? '分布图' : 'Distribution Chart',
            data: data.breakdown as unknown as Record<string, unknown>[],
          },
        ],
        order: 3,
      })
    }

    return sections
  }

  /**
   * 生成洞察
   */
  private generateInsights(
    data: AggregatedData,
    tone: ReportTone,
    language: ReportLanguage
  ): ReportInsight[] {
    const insights: ReportInsight[] = []

    // 从数据洞察转换
    if (data.insights) {
      for (const insight of data.insights) {
        insights.push({
          id: this.generateInsightId(),
          type: this.mapInsightType(insight.type),
          title: insight.title,
          description: insight.description,
          impact: this.mapImportance(insight.importance),
          data: insight.data,
          recommendation: insight.recommendation,
        })
      }
    }

    // 自动生成额外洞察
    const autoInsights = this.generateAutoInsights(data, tone, language)
    insights.push(...autoInsights)

    return insights
  }

  /**
   * 生成概览内容
   */
  private generateOverviewContent(
    data: AggregatedData,
    tone: ReportTone,
    language: ReportLanguage
  ): string {
    const metrics = data.metrics as Record<string, unknown>
    const lines: string[] = []

    // 根据语气调整内容
    if (tone === ReportTone.CONCISE) {
      // 简洁模式：只显示关键指标
      const keys = Object.keys(metrics).slice(0, 5)
      for (const key of keys) {
        lines.push(`- ${key}: ${metrics[key]}`)
      }
    } else if (tone === ReportTone.DETAILED) {
      // 详细模式：显示所有指标
      for (const [key, value] of Object.entries(metrics)) {
        lines.push(`- ${key}: ${value}`)
      }
    } else {
      // 正式模式：显示重要指标
      const importantKeys = this.getImportantMetrics(metrics)
      for (const key of importantKeys) {
        lines.push(`- ${key}: ${metrics[key]}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 生成趋势内容
   */
  private generateTrendsContent(
    timeSeries: TimeSeriesPoint[],
    tone: ReportTone,
    language: ReportLanguage
  ): string {
    if (timeSeries.length === 0) {
      return language === ReportLanguage.ZH_CN ? '暂无趋势数据' : 'No trend data available'
    }

    const first = timeSeries[0].value
    const last = timeSeries[timeSeries.length - 1].value
    const change = ((last - first) / first) * 100
    const trend = change > 0 ? '上升' : change < 0 ? '下降' : '稳定'

    if (language === ReportLanguage.ZH_CN) {
      return `数据呈现${trend}趋势，变化幅度为 ${Math.abs(change).toFixed(1)}%。`
    } else {
      return `Data shows a ${trend} trend with a change of ${Math.abs(change).toFixed(1)}%.`
    }
  }

  /**
   * 生成分布内容
   */
  private generateBreakdownContent(
    breakdown: BreakdownData[],
    tone: ReportTone,
    language: ReportLanguage
  ): string {
    const lines: string[] = []

    for (const item of breakdown) {
      const trendIcon = item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'
      
      if (language === ReportLanguage.ZH_CN) {
        lines.push(
          `- ${item.category}: ${item.value} (${item.percentage}%) ${trendIcon}`
        )
      } else {
        lines.push(
          `- ${item.category}: ${item.value} (${item.percentage}%) ${trendIcon}`
        )
      }
    }

    return lines.join('\n')
  }

  /**
   * 生成自动洞察
   */
  private generateAutoInsights(
    data: AggregatedData,
    tone: ReportTone,
    language: ReportLanguage
  ): ReportInsight[] {
    const insights: ReportInsight[] = []

    // 分析时间序列趋势
    if (data.timeSeries && data.timeSeries.length > 1) {
      const trendInsight = this.analyzeTrend(data.timeSeries, language)
      if (trendInsight) {
        insights.push(trendInsight)
      }
    }

    // 分析分布数据
    if (data.breakdown && data.breakdown.length > 0) {
      const breakdownInsight = this.analyzeBreakdown(data.breakdown, language)
      if (breakdownInsight) {
        insights.push(breakdownInsight)
      }
    }

    return insights
  }

  /**
   * 分析趋势
   */
  private analyzeTrend(
    timeSeries: TimeSeriesPoint[],
    language: ReportLanguage
  ): ReportInsight | null {
    const values = timeSeries.map(p => p.value)
    const first = values[0]
    const last = values[values.length - 1]
    const change = ((last - first) / first) * 100

    if (Math.abs(change) < 5) {
      return null
    }

    const type = change > 0 ? 'achievement' : 'warning'
    const title = language === ReportLanguage.ZH_CN 
      ? (change > 0 ? '增长趋势' : '下降趋势')
      : (change > 0 ? 'Growth Trend' : 'Declining Trend')
    
    const description = language === ReportLanguage.ZH_CN
      ? `数据${change > 0 ? '增长' : '下降'}了 ${Math.abs(change).toFixed(1)}%`
      : `Data ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}%`

    return {
      id: this.generateInsightId(),
      type,
      title,
      description,
      impact: Math.abs(change) > 20 ? 'high' : 'medium',
      data: { change },
    }
  }

  /**
   * 分析分布
   */
  private analyzeBreakdown(
    breakdown: BreakdownData[],
    language: ReportLanguage
  ): ReportInsight | null {
    // 找出占比最大的项
    const maxItem = breakdown.reduce((max, item) => 
      (item.percentage || 0) > (max.percentage || 0) ? item : max
    )

    if (!maxItem.percentage || maxItem.percentage < 50) {
      return null
    }

    const title = language === ReportLanguage.ZH_CN
      ? `主导项: ${maxItem.category}`
      : `Dominant Item: ${maxItem.category}`
    
    const description = language === ReportLanguage.ZH_CN
      ? `${maxItem.category} 占比达到 ${maxItem.percentage}%`
      : `${maxItem.category} accounts for ${maxItem.percentage}%`

    return {
      id: this.generateInsightId(),
      type: 'highlight',
      title,
      description,
      impact: 'medium',
      data: { category: maxItem.category, percentage: maxItem.percentage },
    }
  }

  // ========================================================================
  // 摘要生成方法
  // ========================================================================

  private generateProjectProgressSummary(
    metrics: Record<string, unknown>,
    tone: ReportTone,
    language: ReportLanguage
  ): string {
    if (language === ReportLanguage.ZH_CN) {
      if (tone === ReportTone.CONCISE) {
        return `项目进度 ${metrics.overallProgress}%，完成 ${metrics.completedTasks} 个任务。`
      }
      return `项目整体进度达到 ${metrics.overallProgress}%，本期共完成 ${metrics.completedTasks} 个任务，新增 ${metrics.newTasks} 个任务。${metrics.progressTrend}。`
    } else {
      if (tone === ReportTone.CONCISE) {
        return `Project progress: ${metrics.overallProgress}%, ${metrics.completedTasks} tasks completed.`
      }
      return `Overall project progress reached ${metrics.overallProgress}%. ${metrics.completedTasks} tasks completed, ${metrics.newTasks} new tasks added. ${metrics.progressTrend}.`
    }
  }

  private generateTeamPerformanceSummary(
    metrics: Record<string, unknown>,
    tone: ReportTone,
    language: ReportLanguage
  ): string {
    if (language === ReportLanguage.ZH_CN) {
      if (tone === ReportTone.CONCISE) {
        return `任务完成率 ${metrics.completionRate}%，满意度 ${metrics.satisfactionScore}/5。`
      }
      return `团队在 ${metrics.period} 表现良好，任务完成率达到 ${metrics.completionRate}%，客户满意度 ${metrics.satisfactionScore}/5，协作指数 ${metrics.collaborationScore}/10。`
    } else {
      if (tone === ReportTone.CONCISE) {
        return `Completion rate: ${metrics.completionRate}%, satisfaction: ${metrics.satisfactionScore}/5.`
      }
      return `Team performed well in ${metrics.period}. Completion rate: ${metrics.completionRate}%, customer satisfaction: ${metrics.satisfactionScore}/5, collaboration score: ${metrics.collaborationScore}/10.`
    }
  }

  private generateTaskAnalysisSummary(
    metrics: Record<string, unknown>,
    tone: ReportTone,
    language: ReportLanguage
  ): string {
    if (language === ReportLanguage.ZH_CN) {
      if (tone === ReportTone.CONCISE) {
        return `总任务 ${metrics.totalTasks} 个，完成率 ${metrics.completionRate}%。`
      }
      return `本期共处理 ${metrics.totalTasks} 个任务，完成率 ${metrics.completionRate}%，平均完成时间 ${metrics.avgCompletionTime} 小时。`
    } else {
      if (tone === ReportTone.CONCISE) {
        return `Total tasks: ${metrics.totalTasks}, completion rate: ${metrics.completionRate}%.`
      }
      return `Processed ${metrics.totalTasks} tasks this period. Completion rate: ${metrics.completionRate}%, average completion time: ${metrics.avgCompletionTime} hours.`
    }
  }

  private generateAgentActivitySummary(
    metrics: Record<string, unknown>,
    tone: ReportTone,
    language: ReportLanguage
  ): string {
    if (language === ReportLanguage.ZH_CN) {
      if (tone === ReportTone.CONCISE) {
        return `活跃智能体 ${metrics.activeAgents} 个，成功率 ${metrics.successRate}%。`
      }
      return `当前活跃智能体 ${metrics.activeAgents} 个，成功率 ${metrics.successRate}%，平均响应时间 ${metrics.avgResponseTime}ms，消耗 ${metrics.totalTokens} tokens。`
    } else {
      if (tone === ReportTone.CONCISE) {
        return `Active agents: ${metrics.activeAgents}, success rate: ${metrics.successRate}%.`
      }
      return `${metrics.activeAgents} active agents. Success rate: ${metrics.successRate}%, average response time: ${metrics.avgResponseTime}ms, tokens consumed: ${metrics.totalTokens}.`
    }
  }

  private generateRevenueAnalysisSummary(
    metrics: Record<string, unknown>,
    tone: ReportTone,
    language: ReportLanguage
  ): string {
    if (language === ReportLanguage.ZH_CN) {
      if (tone === ReportTone.CONCISE) {
        return `总收入 ¥${metrics.totalRevenue}，增长 ${metrics.growthRate}%。`
      }
      return `本期总收入 ¥${metrics.totalRevenue}，环比增长 ${metrics.growthRate}%，同比增长 ${metrics.yoyGrowth}%，ARPU ¥${metrics.arpu}。`
    } else {
      if (tone === ReportTone.CONCISE) {
        return `Total revenue: ¥${metrics.totalRevenue}, growth: ${metrics.growthRate}%.`
      }
      return `Total revenue: ¥${metrics.totalRevenue}. MoM growth: ${metrics.growthRate}%, YoY growth: ${metrics.yoyGrowth}%, ARPU: ¥${metrics.arpu}.`
    }
  }

  private generateUserEngagementSummary(
    metrics: Record<string, unknown>,
    tone: ReportTone,
    language: ReportLanguage
  ): string {
    if (language === ReportLanguage.ZH_CN) {
      if (tone === ReportTone.CONCISE) {
        return `活跃用户 ${metrics.activeUsers}，活跃率 ${metrics.activeRate}%。`
      }
      return `总用户 ${metrics.totalUsers}，活跃用户 ${metrics.activeUsers}（活跃率 ${metrics.activeRate}%），留存率 ${metrics.retentionRate}%，满意度 ${metrics.satisfactionScore}/5。`
    } else {
      if (tone === ReportTone.CONCISE) {
        return `Active users: ${metrics.activeUsers}, active rate: ${metrics.activeRate}%.`
      }
      return `Total users: ${metrics.totalUsers}. Active users: ${metrics.activeUsers} (${metrics.activeRate}%), retention rate: ${metrics.retentionRate}%, satisfaction: ${metrics.satisfactionScore}/5.`
    }
  }

  private generateGenericSummary(
    metrics: Record<string, unknown>,
    tone: ReportTone,
    language: ReportLanguage
  ): string {
    const keys = Object.keys(metrics).slice(0, 3)
    const items = keys.map(key => `${key}: ${metrics[key]}`).join(', ')
    
    if (language === ReportLanguage.ZH_CN) {
      return `关键指标: ${items}`
    } else {
      return `Key metrics: ${items}`
    }
  }

  // ========================================================================
  // 辅助方法
  // ========================================================================

  private getImportantMetrics(metrics: Record<string, unknown>): string[] {
    const importantPatterns = [
      /total/i,
      /progress/i,
      /rate/i,
      /score/i,
      /revenue/i,
      /users/i,
      /tasks/i,
    ]

    return Object.keys(metrics).filter(key =>
      importantPatterns.some(pattern => pattern.test(key))
    )
  }

  private mapInsightType(type: string): 'highlight' | 'warning' | 'opportunity' | 'achievement' {
    const typeMap: Record<string, 'highlight' | 'warning' | 'opportunity' | 'achievement'> = {
      positive: 'achievement',
      negative: 'warning',
      neutral: 'highlight',
      alert: 'warning',
      opportunity: 'opportunity',
    }
    return typeMap[type] || 'highlight'
  }

  private mapImportance(importance: string): 'high' | 'medium' | 'low' {
    if (importance === 'high') return 'high'
    if (importance === 'medium') return 'medium'
    return 'low'
  }

  private generateReportId(): string {
    return `rpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateInsightId(): string {
    return `ins-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// 导出单例实例
export const nlgProcessor = new NLGProcessor()