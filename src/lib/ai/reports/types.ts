/**
 * Natural Language Report Generator Types
 * 自然语言报表生成器类型定义
 * 
 * @version 1.10.0
 * @created 2025-04-03
 */

/**
 * 报表模板类型
 */
export enum ReportTemplateType {
  PROJECT_PROGRESS = 'project_progress',      // 项目进度报表
  TEAM_PERFORMANCE = 'team_performance',       // 团队绩效报表
  TASK_ANALYSIS = 'task_analysis',             // 任务分析报表
  AGENT_ACTIVITY = 'agent_activity',           // 智能体活动报表
  REVENUE_ANALYSIS = 'revenue_analysis',       // 收入分析报表
  USER_ENGAGEMENT = 'user_engagement',         // 用户参与度报表
  CUSTOM = 'custom',                           // 自定义报表
}

/**
 * 报表语气风格
 */
export enum ReportTone {
  FORMAL = 'formal',      // 正式
  CONCISE = 'concise',    // 简洁
  DETAILED = 'detailed',  // 详细
  CASUAL = 'casual',      // 轻松
  TECHNICAL = 'technical', // 技术性
}

/**
 * 报表语言
 */
export enum ReportLanguage {
  ZH_CN = 'zh-CN',  // 简体中文
  EN_US = 'en-US',  // 美式英语
  ZH_TW = 'zh-TW',  // 繁体中文
  JA_JP = 'ja-JP',  // 日语
}

/**
 * 时间范围
 */
export type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

/**
 * 自定义时间范围
 */
export interface CustomTimeRange {
  start: string  // ISO 8601 格式
  end: string    // ISO 8601 格式
}

/**
 * 报表模板变量
 */
export interface ReportTemplateVariable {
  key: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object'
  required: boolean
  defaultValue?: unknown
  description: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
    options?: string[]
  }
}

/**
 * 报表模板
 */
export interface ReportTemplate {
  id: string
  type: ReportTemplateType
  name: string
  description: string
  version: string
  variables: ReportTemplateVariable[]
  sections: ReportSection[]
  supportedLanguages: ReportLanguage[]
  supportedTones: ReportTone[]
  metadata: {
    author?: string
    createdAt: string
    updatedAt: string
    tags?: string[]
  }
}

/**
 * 报表章节
 */
export interface ReportSection {
  id: string
  title: string
  template: string  // 模板字符串，支持变量插值 {{variable}}
  order: number
  required: boolean
  conditional?: {
    variable: string
    operator: 'equals' | 'notEquals' | 'exists' | 'greaterThan' | 'lessThan'
    value: unknown
  }
}

/**
 * 数据聚合请求
 */
export interface DataAggregationRequest {
  templateType: ReportTemplateType
  timeRange: TimeRange
  customRange?: CustomTimeRange
  filters?: Record<string, unknown>
  groupBy?: string[]
  aggregations?: AggregationSpec[]
}

/**
 * 聚合规格
 */
export interface AggregationSpec {
  field: string
  operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct'
  alias?: string
}

/**
 * 聚合数据结果
 */
export interface AggregatedData {
  metrics: Record<string, number | string | boolean>
  timeSeries?: TimeSeriesPoint[]
  breakdown?: BreakdownData[]
  insights?: DataInsight[]
  metadata: {
    aggregatedAt: string
    dataPoints: number
    timeRange: {
      start: string
      end: string
    }
  }
}

/**
 * 时间序列数据点
 */
export interface TimeSeriesPoint {
  timestamp: string
  value: number
  label?: string
}

/**
 * 分组数据
 */
export interface BreakdownData {
  category: string
  value: number
  percentage?: number
  trend?: 'up' | 'down' | 'stable'
  change?: number
}

/**
 * 数据洞察
 */
export interface DataInsight {
  type: 'positive' | 'negative' | 'neutral' | 'alert'
  title: string
  description: string
  importance: 'high' | 'medium' | 'low'
  data?: Record<string, unknown>
  recommendation?: string
}

/**
 * 报表生成请求
 */
export interface ReportGenerateRequest {
  templateId?: string
  templateType?: ReportTemplateType
  timeRange: TimeRange
  customRange?: CustomTimeRange
  language?: ReportLanguage
  tone?: ReportTone
  variables?: Record<string, unknown>
  filters?: Record<string, unknown>
  options?: {
    includeCharts?: boolean
    includeRawData?: boolean
    includeInsights?: boolean
    maxSections?: number
  }
}

/**
 * 生成的报表
 */
export interface GeneratedReport {
  id: string
  templateType: ReportTemplateType
  title: string
  summary: string
  sections: ReportSectionOutput[]
  insights: ReportInsight[]
  metadata: {
    generatedAt: string
    timeRange: {
      start: string
      end: string
    }
    language: ReportLanguage
    tone: ReportTone
    dataPoints: number
    generationTimeMs: number
  }
  rawData?: AggregatedData
}

/**
 * 报表章节输出
 */
export interface ReportSectionOutput {
  id: string
  title: string
  content: string
  data?: Record<string, unknown>
  charts?: ChartSpec[]
  order: number
}

/**
 * 图表规格
 */
export interface ChartSpec {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter'
  title: string
  data: Record<string, unknown>[]
  config?: Record<string, unknown>
}

/**
 * 报表洞察
 */
export interface ReportInsight {
  id: string
  type: 'highlight' | 'warning' | 'opportunity' | 'achievement'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  data?: Record<string, unknown>
  recommendation?: string
}

/**
 * 报表生成选项
 */
export interface ReportGeneratorOptions {
  enableCache: boolean
  cacheTTL: number  // 秒
  maxConcurrentAggregations: number
  defaultLanguage: ReportLanguage
  defaultTone: ReportTone
  enableInsights: boolean
  enableCharts: boolean
}

/**
 * 模板引擎配置
 */
export interface TemplateEngineConfig {
  templatesDir?: string
  enableHotReload: boolean
  defaultLanguage: ReportLanguage
  strictMode: boolean
}

/**
 * 数据聚合器配置
 */
export interface DataAggregatorConfig {
  cacheEnabled: boolean
  cacheTTL: number
  maxQueryTime: number  // 毫秒
  batchSize: number
}

/**
 * NLG 处理器配置
 */
export interface NLGProcessorConfig {
  defaultTone: ReportTone
  defaultLanguage: ReportLanguage
  maxContentLength: number
  enableSummarization: boolean
  enableInsightExtraction: boolean
}

/**
 * 缓存条目
 */
export interface ReportCacheEntry {
  key: string
  data: AggregatedData | GeneratedReport
  createdAt: number
  expiresAt: number
  hitCount: number
}
