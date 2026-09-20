/**
 * @fileoverview AI 报表生成系统 - 类型定义
 * @description 自然语言报表生成的核心类型
 */

// 查询意图类型
export type QueryIntent = 
  | 'aggregation'  // 聚合查询 (SUM, COUNT, AVG)
  | 'comparison'   // 对比查询 (同比、环比)
  | 'trend'        // 趋势查询 (时间序列)
  | 'distribution' // 分布查询 (占比、分布)
  | 'ranking'      // 排名查询
  | 'unknown'      // 未知意图

// 图表类型
export type ChartType = 
  | 'line'      // 折线图
  | 'bar'       // 柱状图
  | 'pie'       // 饼图
  | 'scatter'   // 散点图
  | 'heatmap'   // 热力图
  | 'area'      // 面积图
  | 'table'     // 数据表格

// 导出格式
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json'

// 查询状态
export type QueryStatus = 'idle' | 'parsing' | 'generating' | 'rendering' | 'success' | 'error'

// 时间范围
export interface TimeRange {
  start: Date
  end: Date
  preset?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
}

// 数据字段
export interface DataField {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  alias?: string
  format?: string
}

// 查询解析结果
export interface ParsedQuery {
  intent: QueryIntent
  metrics: string[]        // 指标字段
  dimensions: string[]     // 维度字段
  filters: QueryFilter[]   // 过滤条件
  timeRange?: TimeRange    // 时间范围
  aggregations: Aggregation[]
  orderBy?: {
    field: string
    direction: 'asc' | 'desc'
  }
  limit?: number
  confidence: number       // 解析置信度 0-1
}

// 查询过滤条件
export interface QueryFilter {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'between'
  value: string | number | boolean | (string | number)[]
}

// 聚合函数
export interface Aggregation {
  function: 'sum' | 'avg' | 'count' | 'max' | 'min' | 'distinct_count'
  field: string
  alias?: string
}

// SQL 生成结果
export interface GeneratedSQL {
  sql: string
  params: Record<string, unknown>
  explanation: string      // SQL 解释
  warnings: string[]       // 警告信息
}

// 图表配置
export interface ChartConfig {
  type: ChartType
  title: string
  subtitle?: string
  xAxis?: {
    field: string
    label?: string
    type?: 'category' | 'value' | 'time'
  }
  yAxis?: {
    field: string
    label?: string
    type?: 'value'
  }
  series: ChartSeries[]
  colors?: string[]
  legend?: {
    show: boolean
    position?: 'top' | 'bottom' | 'left' | 'right'
  }
  tooltip?: {
    show: boolean
    format?: string
  }
  responsive: boolean
  height?: number
}

// 图表数据系列
export interface ChartSeries {
  name: string
  field: string
  type?: 'line' | 'bar' | 'area'
  color?: string
  stack?: string
  smooth?: boolean
}

// 查询结果
export interface QueryResult {
  data: Record<string, unknown>[]
  fields: DataField[]
  totalCount: number
  executionTime: number
  cached: boolean
}

// 报表配置
export interface ReportConfig {
  id: string
  name: string
  description?: string
  query: string           // 原始自然语言查询
  parsedQuery: ParsedQuery
  sql: GeneratedSQL
  chartConfig: ChartConfig
  result: QueryResult
  createdAt: Date
  updatedAt: Date
  createdBy: string
  isPublic: boolean
  tags: string[]
}

// 报表模板
export interface ReportTemplate {
  id: string
  name: string
  description: string
  category: 'sales' | 'marketing' | 'operations' | 'finance' | 'custom'
  template: string        // 自然语言模板
  defaultTimeRange: TimeRange['preset']
  defaultChartType: ChartType
  icon: string
}

// 导出选项
export interface ExportOptions {
  format: ExportFormat
  includeChart: boolean
  includeData: boolean
  includeSQL: boolean
  title?: string
  author?: string
  paperSize?: 'A4' | 'A3' | 'Letter'
  orientation?: 'portrait' | 'landscape'
}

// AI 报表组件 Props
export interface AIReportGeneratorProps {
  dataSource?: string
  templates?: ReportTemplate[]
  onSave?: (config: ReportConfig) => void
  onExport?: (options: ExportOptions) => void
  className?: string
}

// 查询输入组件 Props
export interface QueryInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  suggestions?: string[]
  className?: string
}

// 图表渲染器 Props
export interface ChartRendererProps {
  config: ChartConfig
  data: Record<string, unknown>[]
  loading?: boolean
  error?: Error | null
  onChartReady?: (instance: unknown) => void
  className?: string
}

// 导出面板 Props
export interface ExportPanelProps {
  onExport: (options: ExportOptions) => Promise<void>
  disabled?: boolean
  className?: string
}

// 历史记录项
export interface HistoryItem {
  id: string
  query: string
  timestamp: Date
  status: 'success' | 'error'
  chartType: ChartType
}

// API 响应
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
