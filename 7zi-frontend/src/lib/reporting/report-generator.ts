/**
 * Report Generator
 * 报表生成器
 *
 * 支持 6 种报表类型，模板变量替换，图表数据生成
 */

import type { AggregatedData } from './data-aggregator'
import { generateSecureId } from '@/lib/utils'

/**
 * 报表类型
 */
export type ReportType =
  | 'summary'      // 汇总报表
  | 'detailed'     // 详细报表
  | 'trend'        // 趋势报表
  | 'comparison'  // 对比报表
  | 'analytics'    // 分析报表
  | 'export'       // 导出报表

/**
 * 报表配置
 */
export interface ReportConfig {
  type: ReportType
  title: string
  description?: string
  data: AggregatedData | Record<string, AggregatedData>
  options?: ReportOptions
}

/**
 * 报表选项
 */
export interface ReportOptions {
  includeCharts?: boolean
  includeRawData?: boolean
  includeSummary?: boolean
  chartType?: 'line' | 'bar' | 'pie' | 'area'
  language?: 'zh' | 'en' | 'ja'
  theme?: 'light' | 'dark'
}

/**
 * 生成的报表
 */
export interface GeneratedReport {
  id: string
  type: ReportType
  title: string
  description?: string
  content: string
  charts?: ChartData[]
  metadata: ReportMetadata
  rawData?: Record<string, unknown>
}

/**
 * 报表元数据
 */
export interface ReportMetadata {
  generatedAt: number
  timeRange: string
  dataSources: string[]
  options: ReportOptions
}

/**
 * 图表数据
 */
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area'
  title: string
  labels: string[]
  datasets: ChartDataset[]
}

/**
 * 图表数据集
 */
export interface ChartDataset {
  label: string
  data: number[]
  color?: string
}

/**
 * 报表模板
 */
interface ReportTemplate {
  type: ReportType
  template: string
  variables: string[]
}

/**
 * 报表模板映射
 */
const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
  summary: {
    type: 'summary',
    template: `## {{title}}

{{description}}

### 📊 关键指标

{{metrics_summary}}

### 📈 趋势分析

{{trend_analysis}}

---
*报表生成时间: {{generated_at}}*`,
    variables: ['title', 'description', 'metrics_summary', 'trend_analysis', 'generated_at'],
  },
  detailed: {
    type: 'detailed',
    template: `## {{title}}

{{description}}

### 📋 详细数据

{{detailed_data}}

### 📊 指标分析

{{metric_analysis}}

### 🔍 深度洞察

{{insights}}

---
*报表生成时间: {{generated_at}}*`,
    variables: ['title', 'description', 'detailed_data', 'metric_analysis', 'insights', 'generated_at'],
  },
  trend: {
    type: 'trend',
    template: `## {{title}}

{{description}}

### 📈 趋势概览

{{trend_overview}}

### 📊 趋势图表

{{trend_charts}}

### 📉 变化分析

{{change_analysis}}

---
*报表生成时间: {{generated_at}}*`,
    variables: ['title', 'description', 'trend_overview', 'trend_charts', 'change_analysis', 'generated_at'],
  },
  comparison: {
    type: 'comparison',
    template: `## {{title}}

{{description}}

### 🔄 对比概览

{{comparison_overview}}

### 📊 对比数据

{{comparison_data}}

### 🏆 最佳表现

{{top_performers}}

---
*报表生成时间: {{generated_at}}*`,
    variables: ['title', 'description', 'comparison_overview', 'comparison_data', 'top_performers', 'generated_at'],
  },
  analytics: {
    type: 'analytics',
    template: `## {{title}}

{{description}}

### 📊 数据分析

{{analytics_data}}

### 🎯 关键发现

{{key_findings}}

### 💡 建议

{{recommendations}}

---
*报表生成时间: {{generated_at}}*`,
    variables: ['title', 'description', 'analytics_data', 'key_findings', 'recommendations', 'generated_at'],
  },
  export: {
    type: 'export',
    template: `## {{title}}

### 📋 导出数据

{{export_data}}

---
*报表生成时间: {{generated_at}}*`,
    variables: ['title', 'export_data', 'generated_at'],
  },
}

/**
 * 报表生成器类
 */
export class ReportGenerator {
  private templates: Map<ReportType, ReportTemplate>
  private defaultOptions: ReportOptions

  constructor() {
    this.templates = new Map(Object.values(REPORT_TEMPLATES).map(t => [t.type, t]))
    this.defaultOptions = {
      includeCharts: true,
      includeRawData: false,
      includeSummary: true,
      chartType: 'line',
      language: 'zh',
      theme: 'light',
    }
  }

  /**
   * 生成报表
   */
  generate(config: ReportConfig): GeneratedReport {
    const options = { ...this.defaultOptions, ...config.options }
    const template = this.templates.get(config.type)

    if (!template) {
      throw new Error(`Unknown report type: ${config.type}`)
    }

    // 替换模板变量
    const variables = this.prepareVariables(config, options)
    const content = this.replaceVariables(template.template, variables)

    // 生成图表数据
    const charts = options.includeCharts
      ? this.generateChartData(config.data, options.chartType || 'line')
      : undefined

    // 生成报表
    const report: GeneratedReport = {
      id: this.generateId(),
      type: config.type,
      title: config.title,
      description: config.description,
      content,
      charts,
      metadata: {
        generatedAt: Date.now(),
        timeRange: this.getTimeRangeString(config.data),
        dataSources: this.getDataSources(config.data),
        options,
      },
    }

    // 添加原始数据
    if (options.includeRawData) {
      report.rawData = this.prepareRawData(config.data)
    }

    return report
  }

  /**
   * 准备模板变量
   */
  private prepareVariables(
    config: ReportConfig,
    options: ReportOptions
  ): Record<string, string> {
    const data = config.data
    const lang = options.language || 'zh'

    const variables: Record<string, string> = {
      title: config.title,
      description: config.description || '',
      generated_at: new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US'),
    }

    switch (config.type) {
      case 'summary':
        variables.metrics_summary = this.formatMetricsSummary(data, lang)
        variables.trend_analysis = this.formatTrendAnalysis(data, lang)
        break
      case 'detailed':
        variables.detailed_data = this.formatDetailedData(data, lang)
        variables.metric_analysis = this.formatMetricAnalysis(data, lang)
        variables.insights = this.generateInsights(data, lang)
        break
      case 'trend':
        variables.trend_overview = this.formatTrendOverview(data, lang)
        variables.trend_charts = this.formatTrendCharts(data, lang)
        variables.change_analysis = this.formatChangeAnalysis(data, lang)
        break
      case 'comparison':
        variables.comparison_overview = this.formatComparisonOverview(data, lang)
        variables.comparison_data = this.formatComparisonData(data, lang)
        variables.top_performers = this.formatTopPerformers(data, lang)
        break
      case 'analytics':
        variables.analytics_data = this.formatAnalyticsData(data, lang)
        variables.key_findings = this.formatKeyFindings(data, lang)
        variables.recommendations = this.formatRecommendations(data, lang)
        break
      case 'export':
        variables.export_data = this.formatExportData(data, lang)
        break
    }

    return variables
  }

  /**
   * 替换模板变量
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    // 清理未替换的变量
    result = result.replace(/\{\{[^}]+\}\}/g, '')
    return result
  }

  /**
   * 格式化指标摘要
   */
  private formatMetricsSummary(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    const labels = {
      zh: { active_users: '活跃用户', new_users: '新增用户', sessions: '会话数', avg_response_time: '平均响应时间', error_rate: '错误率', throughput: '吞吐量' },
      en: { active_users: 'Active Users', new_users: 'New Users', sessions: 'Sessions', avg_response_time: 'Avg Response Time', error_rate: 'Error Rate', throughput: 'Throughput' },
      ja: { active_users: 'アクティブユーザー', new_users: '新規ユーザー', sessions: 'セッション数', avg_response_time: '平均応答時間', error_rate: 'エラー率', throughput: 'スループット' },
    }

    const l = labels[lang as keyof typeof labels] || labels.zh

    let summary = ''
    const metricsData = this.getMetricsData(data)

    for (const metric of metricsData.slice(0, 6)) {
      const name = l[metric.name as keyof typeof l] || metric.name
      const trendIcon = metric.trend === 'up' ? '📈' : metric.trend === 'down' ? '📉' : '➡️'
      summary += `- **${name}**: ${metric.value.toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US')} ${trendIcon}\n`
    }

    return summary
  }

  /**
   * 格式化趋势分析
   */
  private formatTrendAnalysis(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    const labels = {
      zh: '根据数据分析，整体呈现稳定趋势。',
      en: 'Based on the data analysis, the overall trend is stable.',
      ja: 'データ分析によると、全体的な傾向は安定しています。',
    }

    const metricsData = this.getMetricsData(data)
    const upCount = metricsData.filter(m => m.trend === 'up').length
    const downCount = metricsData.filter(m => m.trend === 'down').length

    if (upCount > downCount) {
      return lang === 'zh' ? '整体趋势向好，多项指标呈上升趋势。' : lang === 'en' ? 'Overall trend is positive, with multiple metrics showing upward trends.' : '全体的な傾向は良好で、複数の指標が上昇傾向を示しています。'
    } else if (downCount > upCount) {
      return lang === 'zh' ? '部分指标有所下降，建议关注。' : lang === 'en' ? 'Some metrics have declined, attention recommended.' : '一部指標が低下しており、注視をお勧めします。'
    }

    return labels[lang as keyof typeof labels] || labels.zh
  }

  /**
   * 格式化详细数据
   */
  private formatDetailedData(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    const metricsData = this.getMetricsData(data)
    let output = '| 指标 | 数值 | 变化 | 变化率 |\n| --- | --- | --- | --- |\n'

    for (const metric of metricsData) {
      const change = metric.change !== undefined ? (metric.change > 0 ? `+${metric.change}` : `${metric.change}`) : '-'
      const changePercent = metric.changePercent !== undefined ? `${(metric.changePercent * 100).toFixed(2)}%` : '-'
      output += `| ${metric.name} | ${metric.value.toLocaleString()} | ${change} | ${changePercent} |\n`
    }

    return output
  }

  /**
   * 格式化指标分析
   */
  private formatMetricAnalysis(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    const labels = {
      zh: '详细分析各指标的当前值和变化趋势。',
      en: 'Detailed analysis of current values and trends for each metric.',
      ja: '各指標の現在値と傾向の詳細な分析。',
    }
    return labels[lang as keyof typeof labels] || labels.zh
  }

  /**
   * 生成洞察
   */
  private generateInsights(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    const labels = {
      zh: '根据数据分析，发现以下关键洞察：\n1. 用户活跃度保持稳定\n2. 系统性能表现良好\n3. 建议持续监控关键指标',
      en: 'Based on data analysis, the following key insights are found:\n1. User activity remains stable\n2. System performance is good\n3. Continuous monitoring of key metrics is recommended',
      ja: 'データ分析により、以下の重要な洞察が見つかりました：\n1. ユーザーアクティビティは安定しています\n2. システムパフォーマンスは良好です\n3. 主要指標の継続的な監視をお勧めします',
    }
    return labels[lang as keyof typeof labels] || labels.zh
  }

  /**
   * 格式化趋势概览
   */
  private formatTrendOverview(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    return lang === 'zh' ? '以下是各项指标的趋势概览。' : lang === 'en' ? 'Below is an overview of trends for each metric.' : '以下は各指標の傾向の概要です。'
  }

  /**
   * 格式化趋势图表
   */
  private formatTrendCharts(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    return lang === 'zh' ? '趋势图表数据已生成。' : lang === 'en' ? 'Trend chart data has been generated.' : 'トレンドチャートデータが生成されました。'
  }

  /**
   * 格式化变化分析
   */
  private formatChangeAnalysis(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    return lang === 'zh' ? '分析各项指标的变化情况。' : lang === 'en' ? 'Analyze changes in various metrics.' : '各指標の変化を分析します。'
  }

  /**
   * 格式化对比概览
   */
  private formatComparisonOverview(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    return lang === 'zh' ? '以下是各数据源的对比概览。' : lang === 'en' ? 'Below is a comparison overview of data sources.' : '以下はデータソースの比較概要です。'
  }

  /**
   * 格式化对比数据
   */
  private formatComparisonData(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    return this.formatDetailedData(data, lang)
  }

  /**
   * 格式化最佳表现
   */
  private formatTopPerformers(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    const metricsData = this.getMetricsData(data)
    const sorted = [...metricsData].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))

    let output = lang === 'zh' ? '表现最佳的指标：\n' : lang === 'en' ? 'Top performing metrics:\n' : '最も優秀な指標：\n'
    sorted.slice(0, 3).forEach((m, i) => {
      output += `${i + 1}. ${m.name}: ${(m.changePercent! * 100).toFixed(2)}%\n`
    })

    return output
  }

  /**
   * 格式化分析数据
   */
  private formatAnalyticsData(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    return this.formatDetailedData(data, lang)
  }

  /**
   * 格式化关键发现
   */
  private formatKeyFindings(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    return lang === 'zh' ? '1. 数据整体呈现稳定趋势\n2. 部分指标有显著变化\n3. 需要关注异常数据' : lang === 'en' ? '1. Data shows overall stable trend\n2. Some metrics show significant changes\n3. Need to pay attention to abnormal data' : '1. データは全体的な安定傾向を示しています\n2. 一部の指標は大きな変化を示しています\n3. 異常データに注意を払う必要があります'
  }

  /**
   * 格式化建议
   */
  private formatRecommendations(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    return lang === 'zh' ? '1. 继续监控关键指标\n2. 定期生成报表分析\n3. 及时发现和处理异常' : lang === 'en' ? '1. Continue monitoring key metrics\n2. Generate reports regularly for analysis\n3. Detect and handle anomalies promptly' : '1. 主要指標の監視を継続\n2. 定期的なレポート生成と分析\n3. 異常の適時の検出と処理'
  }

  /**
   * 格式化导出数据
   */
  private formatExportData(data: AggregatedData | Record<string, AggregatedData>, lang: string): string {
    return this.formatDetailedData(data, lang)
  }

  /**
   * 获取指标数据
   */
  private getMetricsData(data: AggregatedData | Record<string, AggregatedData>): Array<{
    name: string
    value: number
    change?: number
    changePercent?: number
    trend?: 'up' | 'down' | 'stable'
  }> {
    if ('metrics' in data && Array.isArray(data.metrics)) {
      return data.metrics
    }
    // 合并多个数据源
    const allMetrics: Array<{
      name: string
      value: number
      change?: number
      changePercent?: number
      trend?: 'up' | 'down' | 'stable'
    }> = []
    for (const sourceData of Object.values(data)) {
      if ('metrics' in sourceData && Array.isArray(sourceData.metrics)) {
        allMetrics.push(...sourceData.metrics)
      }
    }
    return allMetrics
  }

  /**
   * 生成图表数据
   */
  private generateChartData(
    data: AggregatedData | Record<string, AggregatedData>,
    chartType: 'line' | 'bar' | 'pie' | 'area'
  ): ChartData[] {
    const charts: ChartData[] = []
    const metricsData = this.getMetricsData(data)

    if (metricsData.length === 0) return charts

    charts.push({
      type: chartType,
      title: '指标趋势',
      labels: metricsData.map(m => m.name),
      datasets: [
        {
          label: '当前值',
          data: metricsData.map(m => m.value),
          color: '#3b82f6',
        },
      ],
    })

    return charts
  }

  /**
   * 获取时间范围字符串
   */
  private getTimeRangeString(data: AggregatedData | Record<string, AggregatedData>): string {
    if ('timeRange' in data) {
      return data.timeRange.type
    }
    const firstData = Object.values(data)[0]
    if (firstData && 'timeRange' in firstData) {
      return firstData.timeRange.type
    }
    return 'unknown'
  }

  /**
   * 获取数据源列表
   */
  private getDataSources(data: AggregatedData | Record<string, AggregatedData>): string[] {
    if ('timeRange' in data) {
      return ['default']
    }
    return Object.keys(data)
  }

  /**
   * 准备原始数据
   */
  private prepareRawData(data: AggregatedData | Record<string, AggregatedData>): Record<string, unknown> {
    if ('metrics' in data) {
      return {
        metrics: data.metrics,
        timeRange: data.timeRange,
        timestamp: data.timestamp,
      }
    }
    return data as Record<string, unknown>
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return generateSecureId('report')
  }

  /**
   * 获取可用模板
   */
  getTemplates(): Array<{ type: ReportType; variables: string[] }> {
    return Array.from(this.templates.values()).map(t => ({
      type: t.type,
      variables: t.variables,
    }))
  }

  /**
   * 添加自定义模板
   */
  addTemplate(type: ReportType, template: string, variables: string[]): void {
    this.templates.set(type, { type, template, variables })
  }
}

/**
 * 创建默认报表生成器
 */
export function createReportGenerator(): ReportGenerator {
  return new ReportGenerator()
}