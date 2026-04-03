/**
 * @fileoverview AI 报表生成系统 - 模块入口
 * @description 自然语言查询生成数据分析报表
 */

// 主组件
export { AIReportGenerator, AIRaportSimple } from './AIReportGenerator'

// 查询解析
export { parseQuery, useQueryParser, generateSuggestions } from './QueryParser'

// SQL 生成
export { generateSQL, useSQLGenerator, validateSQL, formatSQL } from './SQLGenerator'

// 图表渲染
export { 
  ChartRenderer, 
  recommendChartType, 
  generateChartConfig 
} from './charts/ChartRenderer'

// 导出功能
export { 
  ReportExporter, 
  ExportPanel, 
  useReportExport 
} from './export/ReportExporter'

// Hooks
export {
  useQueryState,
  useReportConfig,
  useDataFetch,
  useChartConfig,
  useDebounce,
  useLocalStorage
} from './hooks'

// 类型
export type {
  QueryIntent,
  ChartType,
  ExportFormat,
  QueryStatus,
  TimeRange,
  DataField,
  ParsedQuery,
  QueryFilter,
  Aggregation,
  GeneratedSQL,
  ChartConfig,
  ChartSeries,
  QueryResult,
  ReportConfig,
  ReportTemplate,
  ExportOptions,
  AIReportGeneratorProps,
  QueryInputProps,
  ChartRendererProps,
  ExportPanelProps,
  HistoryItem,
  APIResponse
} from './types'