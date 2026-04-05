/**
 * @fileoverview 数据导出模块 - 主入口
 * @description 统一导出所有导出相关功能
 * @version 3.0.0 - v1.12.x 增强版本
 */

// 导出服务
export { ExportService } from './service/export-service'
export type {
  ExportServiceConfig,
  ExportRequest,
  ExportResponse,
  ExportJobResponse,
  ExportJobQueryResult,
} from './service/export-service'

// 导出核心
export { DataExporter } from './core/exporter'
export type {
  ExportFormat,
  ExcelOptions,
  ExportField,
  ExportConfig,
  ExportResult,
} from './core/exporter'

// 任务队列
export { ExportQueue } from './queue/export-queue'
export type {
  ExportJob,
  ExportJobStatus,
  ExportJobProgress,
  ExportQueueConfig,
} from './queue/export-queue'

// 过滤器
export { FilterParser } from './utils/filter-parser'
export type {
  FilterCondition,
  FilterOperator,
  SortOptions,
  PaginationOptions,
  QueryOptions,
} from './utils/filter-parser'

// ============================================================================
// v1.12.x 新增功能
// ============================================================================

// PDF 导出
export { PDFExporter } from './formats/pdf-exporter'
export type {
  PDFOptions,
  PDFCellStyle,
  PDFTableOptions,
  PDFExportResult,
} from './formats/pdf-exporter'

// HTML 导出
export { HTMLExporter } from './formats/html-exporter'
export type {
  HTMLOptions,
  HTMLTableColumn,
  HTMLTableOptions,
  HTMLExportResult,
} from './formats/html-exporter'

// 模板管理
export { TemplateManager, PRESET_TEMPLATES } from './templates/template-manager'
export type {
  TemplateType,
  TemplateVariables,
  TemplateConfig,
  PresetTemplate,
} from './templates/template-manager'

// 批量导出
export { BatchExporter } from './batch/batch-exporter'
export type {
  BatchExportRequest,
  BatchExportItem,
  PackagingOptions,
  BatchExportProgress,
  BatchExportResult,
} from './batch/batch-exporter'

// 进度跟踪
export { ExportProgressTracker, ExportProgressManager } from './progress/export-progress'
export type {
  ExportStage,
  ExportProgressDetail,
  ProgressListener,
  ProgressHistoryEntry,
  ProgressTrackerConfig,
} from './progress/export-progress'
