/**
 * @fileoverview Data Import Service - Type Definitions
 * @description 数据导入服务类型定义
 * @version 1.12.0
 */

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 导入格式
 */
export type ImportFormat = 'csv' | 'xlsx' | 'json'

/**
 * 导入模式
 */
export type ImportMode = 'insert' | 'update' | 'upsert' | 'replace'

/**
 * 导入状态
 */
export enum ImportStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 验证级别
 */
export type ValidationLevel = 'strict' | 'normal' | 'loose'

/**
 * 错误处理策略
 */
export type ErrorHandlingStrategy = 'stop' | 'skip' | 'continue'

// ============================================================================
// 字段映射类型
// ============================================================================

/**
 * 字段映射配置
 */
export interface FieldMapping {
  /** 源字段名 */
  sourceField: string
  /** 目标字段名 */
  targetField: string
  /** 字段类型 */
  type?: 'string' | 'number' | 'boolean' | 'date' | 'json'
  /** 是否必需 */
  required?: boolean
  /** 默认值 */
  defaultValue?: unknown
  /** 转换函数 */
  transform?: (value: unknown, row: Record<string, unknown>) => unknown
  /** 验证函数 */
  validate?: (value: unknown) => boolean | string
  /** 字段描述 */
  description?: string
  /** 示例值 */
  example?: unknown
}

/**
 * 字段映射预设
 */
export interface FieldMappingPreset {
  id: string
  name: string
  description?: string
  mappings: FieldMapping[]
  createdAt: string
  updatedAt: string
}

// ============================================================================
// 验证相关类型
// ============================================================================

/**
 * 验证规则
 */
export interface ValidationRule {
  /** 规则类型 */
  type: 'required' | 'type' | 'format' | 'range' | 'custom' | 'unique'
  /** 字段名 */
  field: string
  /** 规则参数 */
  params?: Record<string, unknown>
  /** 自定义验证函数 */
  validate?: (value: unknown, row: Record<string, unknown>) => boolean | string
  /** 错误消息 */
  message?: string
  /** 错误级别 */
  level?: 'error' | 'warning'
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误列表 */
  errors: ValidationError[]
  /** 警告列表 */
  warnings: ValidationWarning[]
  /** 统计信息 */
  stats: {
    totalRows: number
    validRows: number
    invalidRows: number
    warningRows: number
  }
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 行号 (1-based) */
  row: number
  /** 字段名 */
  field: string
  /** 错误消息 */
  message: string
  /** 错误值 */
  value?: unknown
  /** 规则类型 */
  rule?: string
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  /** 行号 (1-based) */
  row: number
  /** 字段名 */
  field: string
  /** 警告消息 */
  message: string
  /** 警告值 */
  value?: unknown
}

// ============================================================================
// 导入配置类型
// ============================================================================

/**
 * 导入选项
 */
export interface ImportOptions {
  /** 导入格式 */
  format: ImportFormat
  /** 导入模式 */
  mode: ImportMode
  /** 目标表名 */
  targetTable: string
  /** 字段映射 */
  fieldMappings: FieldMapping[]
  /** 验证规则 */
  validationRules?: ValidationRule[]
  /** 验证级别 */
  validationLevel?: ValidationLevel
  /** 错误处理策略 */
  errorHandling?: ErrorHandlingStrategy
  /** 批量大小 */
  batchSize?: number
  /** 跳过重复 */
  skipDuplicates?: boolean
  /** 跳过标题行 */
  skipHeader?: boolean
  /** 工作表索引 (Excel) */
  sheetIndex?: number
  /** 工作表名称 (Excel) */
  sheetName?: string
  /** 编码 (CSV) */
  encoding?: string
  /** 分隔符 (CSV) */
  delimiter?: string
  /** 创建备份 */
  createBackup?: boolean
  /** 试运行 */
  dryRun?: boolean
  /** 最大错误数 */
  maxErrors?: number
}

/**
 * 导入任务
 */
export interface ImportTask {
  /** 任务ID */
  id: string
  /** 文件名 */
  fileName: string
  /** 文件大小 */
  fileSize: number
  /** 文件路径 (临时存储) */
  filePath: string
  /** 导入选项 */
  options: ImportOptions
  /** 任务状态 */
  status: ImportStatus
  /** 进度 (0-100) */
  progress: number
  /** 总行数 */
  totalRows: number
  /** 已处理行数 */
  processedRows: number
  /** 成功行数 */
  successRows: number
  /** 失败行数 */
  failedRows: number
  /** 跳过行数 */
  skippedRows: number
  /** 开始时间 */
  startedAt?: string
  /** 完成时间 */
  completedAt?: string
  /** 错误列表 */
  errors: ImportError[]
  /** 警告列表 */
  warnings: ImportWarning[]
  /** 验证结果 */
  validation?: ValidationResult
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 元数据 */
  metadata?: Record<string, unknown>
}

/**
 * 导入错误
 */
export interface ImportError {
  /** 行号 */
  row?: number
  /** 字段名 */
  field?: string
  /** 错误消息 */
  message: string
  /** 错误值 */
  value?: unknown
  /** 错误类型 */
  type?: 'validation' | 'transform' | 'database' | 'system'
  /** 时间戳 */
  timestamp: string
}

/**
 * 导入警告
 */
export interface ImportWarning {
  /** 行号 */
  row?: number
  /** 字段名 */
  field?: string
  /** 警告消息 */
  message: string
  /** 警告值 */
  value?: unknown
  /** 时间戳 */
  timestamp: string
}

/**
 * 导入结果
 */
export interface ImportResult {
  /** 是否成功 */
  success: boolean
  /** 任务ID */
  taskId: string
  /** 总行数 */
  totalRows: number
  /** 成功行数 */
  successRows: number
  /** 失败行数 */
  failedRows: number
  /** 跳过行数 */
  skippedRows: number
  /** 错误列表 */
  errors: ImportError[]
  /** 警告列表 */
  warnings: ImportWarning[]
  /** 处理时间 (毫秒) */
  duration: number
  /** 处理时间 */
  startedAt: string
  completedAt: string
}

// ============================================================================
// 解析器类型
// ============================================================================

/**
 * 解析选项
 */
export interface ParseOptions {
  /** 格式 */
  format: ImportFormat
  /** 编码 (CSV) */
  encoding?: string
  /** 分隔符 (CSV) */
  delimiter?: string
  /** 跳过标题行 */
  skipHeader?: boolean
  /** 工作表索引 (Excel) */
  sheetIndex?: number
  /** 工作表名称 (Excel) */
  sheetName?: string
  /** 最大行数 (用于预览) */
  maxRows?: number
  /** 流式处理 */
  streaming?: boolean
  /** 批量大小 (流式处理) */
  batchSize?: number
}

/**
 * 解析结果
 */
export interface ParseResult {
  /** 是否成功 */
  success: boolean
  /** 数据行 */
  data: Record<string, unknown>[]
  /** 字段名列表 */
  fields: string[]
  /** 总行数 */
  totalRows: number
  /** 错误列表 */
  errors: ParseError[]
  /** 警告列表 */
  warnings: ParseWarning[]
}

/**
 * 解析错误
 */
export interface ParseError {
  /** 行号 */
  row?: number
  /** 字段名 */
  field?: string
  /** 错误消息 */
  message: string
  /** 原始值 */
  rawValue?: string
}

/**
 * 解析警告
 */
export interface ParseWarning {
  /** 行号 */
  row?: number
  /** 字段名 */
  field?: string
  /** 警告消息 */
  message: string
  /** 原始值 */
  rawValue?: string
}

/**
 * 文件预览
 */
export interface FilePreview {
  /** 文件名 */
  fileName: string
  /** 文件大小 */
  fileSize: number
  /** 格式 */
  format: ImportFormat
  /** 字段列表 */
  fields: string[]
  /** 预览数据 (前N行) */
  data: Record<string, unknown>[]
  /** 总行数 */
  totalRows: number
  /** 工作表列表 (Excel) */
  sheets?: string[]
}

// ============================================================================
// 进度类型
// ============================================================================

/**
 * 导入进度
 */
export interface ImportProgress {
  /** 任务ID */
  taskId: string
  /** 状态 */
  status: ImportStatus
  /** 进度 (0-100) */
  progress: number
  /** 总行数 */
  totalRows: number
  /** 已处理行数 */
  processedRows: number
  /** 成功行数 */
  successRows: number
  /** 失败行数 */
  failedRows: number
  /** 跳过行数 */
  skippedRows: number
  /** 当前阶段 */
  stage?: 'uploading' | 'parsing' | 'validating' | 'importing' | 'completed'
  /** 预估剩余时间 (秒) */
  estimatedTimeRemaining?: number
  /** 处理速度 (行/秒) */
  processingRate?: number
  /** 更新时间 */
  updatedAt: string
}

/**
 * 进度回调
 */
export type ProgressCallback = (progress: ImportProgress) => void

// ============================================================================
// 事件类型
// ============================================================================

/**
 * 导入事件类型
 */
export enum ImportEventType {
  TASK_CREATED = 'task_created',
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  TASK_CANCELLED = 'task_cancelled',
  PROGRESS_UPDATED = 'progress_updated',
  ERROR_OCCURRED = 'error_occurred',
  WARNING_OCCURRED = 'warning_occurred',
  ROW_PROCESSED = 'row_processed',
  BATCH_COMPLETED = 'batch_completed',
}

/**
 * 导入事件
 */
export interface ImportEvent {
  /** 事件类型 */
  type: ImportEventType
  /** 任务ID */
  taskId: string
  /** 事件数据 */
  data?: Record<string, unknown>
  /** 时间戳 */
  timestamp: string
}

/**
 * 事件回调
 */
export type EventCallback = (event: ImportEvent) => void
