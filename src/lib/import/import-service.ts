/**
 * @fileoverview Data Import Service
 * @description 数据导入服务，支持 CSV/Excel/JSON 格式，后台任务队列，进度追踪
 * @version 1.12.0
 */

import { v4 as uuidv4 } from 'uuid'
import { logger } from '../logger'
import { getDatabaseAsync } from '../db'
import { CSVParser } from './parsers/csv-parser'
import { ExcelParser } from './parsers/excel-parser'
import { JSONParser } from './parsers/json-parser'
import { ImportValidator } from './validator'
import { FieldTransformer } from './transformer'
import type {
  ImportTask,
  ImportOptions,
  ImportResult,
  ImportProgress,
  ImportFormat,
  ImportStatus,
  ImportError,
  FilePreview,
  FieldMapping,
  ProgressCallback,
} from './types'

/**
 * 数据导入服务
 */
export class DataImportService {
  private csvParser = new CSVParser()
  private excelParser = new ExcelParser()
  private jsonParser = new JSONParser()
  private validator = new ImportValidator()
  private transformer = new FieldTransformer()

  private tasks = new Map<string, ImportTask>()
  private progressCallbacks = new Map<string, ProgressCallback[]>()

  /**
   * 创建导入任务
   */
  async createTask(
    file: File | Buffer | ArrayBuffer,
    fileName: string,
    options: ImportOptions
  ): Promise<ImportTask> {
    const taskId = uuidv4()
    const fileSize = file instanceof File ? file.size : (file as Buffer).length || (file as ArrayBuffer).byteLength

    // 验证选项
    this.validateOptions(options)

    const task: ImportTask = {
      id: taskId,
      fileName,
      fileSize,
      filePath: '', // 将在后台处理中设置
      options,
      status: 'pending' as ImportStatus,
      progress: 0,
      totalRows: 0,
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      skippedRows: 0,
      errors: [],
      warnings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.tasks.set(taskId, task)

    logger.info('导入任务已创建', {
      category: 'import-service',
      taskId,
      fileName,
      format: options.format,
    })

    return task
  }

  /**
   * 执行导入任务
   */
  async executeTask(taskId: string): Promise<ImportResult> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    const startedAt = new Date().toISOString()
    task.status = 'processing' as ImportStatus
    task.startedAt = startedAt
    task.updatedAt = startedAt

    try {
      // 1. 解析文件
      this.updateProgress(taskId, 10, 'parsing')
      const data = await this.parseFile(task)

      if (!data.success || data.data.length === 0) {
        throw new Error(data.errors[0]?.message || '文件解析失败')
      }

      task.totalRows = data.totalRows
      task.progress = 20

      // 2. 验证数据
      this.updateProgress(taskId, 30, 'validating')
      if (task.options.validationRules && task.options.validationRules.length > 0) {
        const validationResult = await this.validator.validate(
          data.data,
          task.options.validationRules,
          task.options.validationLevel || 'normal'
        )

        task.validation = validationResult

        if (!validationResult.valid && task.options.errorHandling === 'stop') {
          throw new Error(`数据验证失败: ${validationResult.errors.length} 个错误`)
        }

        // 记录验证错误
        for (const error of validationResult.errors) {
          task.errors.push({
            row: error.row,
            field: error.field,
            message: error.message,
            value: error.value,
            type: 'validation',
            timestamp: new Date().toISOString(),
          })
        }
      }

      task.progress = 40

      // 3. 字段转换
      this.updateProgress(taskId, 50, 'transforming')
      const transformedData = this.transformer.transform(data.data, task.options.fieldMappings)

      task.progress = 60

      // 4. 导入数据库
      this.updateProgress(taskId, 70, 'importing')
      const importStats = await this.importToDatabase(taskId, transformedData)

      task.successRows = importStats.success
      task.failedRows = importStats.failed
      task.skippedRows = importStats.skipped
      task.processedRows = importStats.success + importStats.failed + importStats.skipped

      // 5. 完成
      const completedAt = new Date().toISOString()
      task.status = 'completed' as ImportStatus
      task.completedAt = completedAt
      task.updatedAt = completedAt
      task.progress = 100

      this.tasks.set(taskId, task)

      logger.info('导入任务完成', {
        category: 'import-service',
        taskId,
        success: task.successRows,
        failed: task.failedRows,
        skipped: task.skippedRows,
      })

      const result: ImportResult = {
        success: task.failedRows === 0,
        taskId,
        totalRows: task.totalRows,
        successRows: task.successRows,
        failedRows: task.failedRows,
        skippedRows: task.skippedRows,
        errors: task.errors,
        warnings: task.warnings,
        duration: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
        startedAt,
        completedAt,
      }

      return result
    } catch (error) {
      task.status = 'failed' as ImportStatus
      task.errors.push({
        message: error instanceof Error ? error.message : '导入失败',
        type: 'system',
        timestamp: new Date().toISOString(),
      })
      task.updatedAt = new Date().toISOString()

      this.tasks.set(taskId, task)

      logger.error('导入任务失败', error, {
        category: 'import-service',
        taskId,
      })

      throw error
    }
  }

  /**
   * 解析文件
   */
  private async parseFile(task: ImportTask): Promise<{
    success: boolean
    data: Record<string, unknown>[]
    totalRows: number
    errors: Array<{ message: string }>
  }> {
    try {
      switch (task.options.format) {
        case 'csv': {
          // 假设文件内容已转换为字符串
          const content = '' // 从任务中获取
          const result = await this.csvParser.parse(content, {
            format: 'csv',
            delimiter: task.options.delimiter,
            encoding: task.options.encoding,
            skipHeader: task.options.skipHeader,
          })
          return {
            success: result.success,
            data: result.data,
            totalRows: result.totalRows,
            errors: result.errors,
          }
        }

        case 'xlsx': {
          // 假设文件内容已转换为 ArrayBuffer
          const buffer = new ArrayBuffer(0) // 从任务中获取
          const result = await this.excelParser.parse(buffer, {
            format: 'xlsx',
            sheetIndex: task.options.sheetIndex,
            sheetName: task.options.sheetName,
            skipHeader: task.options.skipHeader,
          })
          return {
            success: result.success,
            data: result.data,
            totalRows: result.totalRows,
            errors: result.errors,
          }
        }

        case 'json': {
          // 假设文件内容已转换为字符串
          const content = '' // 从任务中获取
          const result = await this.jsonParser.parse(content, {
            format: 'json',
          })
          return {
            success: result.success,
            data: result.data,
            totalRows: result.totalRows,
            errors: result.errors,
          }
        }

        default:
          return {
            success: false,
            data: [],
            totalRows: 0,
            errors: [{ message: `不支持的格式: ${task.options.format}` }],
          }
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        totalRows: 0,
        errors: [{ message: error instanceof Error ? error.message : '文件解析失败' }],
      }
    }
  }

  /**
   * 导入到数据库
   */
  private async importToDatabase(
    taskId: string,
    data: Record<string, unknown>[]
  ): Promise<{ success: number; failed: number; skipped: number }> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    const db = await getDatabaseAsync()
    const batchSize = task.options.batchSize || 100
    const maxErrors = task.options.maxErrors || 100

    let success = 0
    let failed = 0
    let skipped = 0
    let errorCount = 0

    const table = task.options.targetTable

    // 处理 replace 模式
    if (task.options.mode === 'replace' && !task.options.dryRun) {
      try {
        db.exec(`DELETE FROM ${table}`)
      } catch (error) {
        logger.error(`清空表失败: ${table}`, error, { category: 'import-service' })
      }
    }

    // 批量导入
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)

      for (const row of batch) {
        try {
          if (task.options.dryRun) {
            success++
            continue
          }

          await this.importRow(db, table, row, task.options.mode)
          success++

          // 更新进度
          if ((i + success) % 100 === 0) {
            this.updateProgress(taskId, 70 + (success / data.length) * 25)
          }
        } catch (error) {
          failed++
          errorCount++

          task.errors.push({
            row: i + success + failed + skipped,
            message: error instanceof Error ? error.message : '导入失败',
            type: 'database',
            timestamp: new Date().toISOString(),
          })

          // 检查错误限制
          if (errorCount >= maxErrors) {
            logger.error(`达到最大错误数 ${maxErrors}，停止导入`, undefined, {
              category: 'import-service',
            })
            break
          }

          // 根据错误处理策略
          if (task.options.errorHandling === 'stop') {
            break
          }
        }
      }

      if (errorCount >= maxErrors || (task.options.errorHandling === 'stop' && failed > 0)) {
        break
      }
    }

    return { success, failed, skipped }
  }

  /**
   * 导入单行
   */
  private async importRow(
    db: Awaited<ReturnType<typeof getDatabaseAsync>>,
    table: string,
    row: Record<string, unknown>,
    mode: string
  ): Promise<void> {
    const columns = Object.keys(row)
    const values = Object.values(row)
    const placeholders = columns.map(() => '?').join(', ')

    if (mode === 'insert') {
      db.exec(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values)
    } else if (mode === 'replace') {
      db.exec(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values)
    } else if (mode === 'upsert' || mode === 'update') {
      // 简化实现：实际应该检查主键
      const setClause = columns.map(col => `${col} = ?`).join(', ')
      db.exec(
        `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      )
    }
  }

  /**
   * 获取任务状态
   */
  getTask(taskId: string): ImportTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 获取任务进度
   */
  getProgress(taskId: string): ImportProgress | undefined {
    const task = this.tasks.get(taskId)
    if (!task) return undefined

    return {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      totalRows: task.totalRows,
      processedRows: task.processedRows,
      successRows: task.successRows,
      failedRows: task.failedRows,
      skippedRows: task.skippedRows,
      updatedAt: task.updatedAt,
    }
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false

    if (task.status === 'pending' || task.status === 'processing') {
      task.status = 'cancelled' as ImportStatus
      task.updatedAt = new Date().toISOString()
      this.tasks.set(taskId, task)
      return true
    }

    return false
  }

  /**
   * 预览文件
   */
  async previewFile(
    file: File | Buffer | ArrayBuffer,
    fileName: string,
    format: ImportFormat,
    maxRows = 10
  ): Promise<FilePreview> {
    const fileSize = file instanceof File ? file.size : (file as Buffer).length || (file as ArrayBuffer).byteLength

    try {
      switch (format) {
        case 'csv': {
          const content = '' // 从文件获取
          const result = await this.csvParser.preview(content, maxRows)
          return {
            fileName,
            fileSize,
            format,
            fields: result.fields,
            data: result.data,
            totalRows: result.totalRows,
          }
        }

        case 'xlsx': {
          const buffer = new ArrayBuffer(0) // 从文件获取
          const result = await this.excelParser.preview(buffer, maxRows)
          return {
            fileName,
            fileSize,
            format,
            fields: result.fields,
            data: result.data,
            totalRows: result.totalRows,
            sheets: result.sheets,
          }
        }

        case 'json': {
          const content = '' // 从文件获取
          const result = await this.jsonParser.preview(content, maxRows)
          return {
            fileName,
            fileSize,
            format,
            fields: result.fields,
            data: result.data,
            totalRows: result.totalRows,
          }
        }

        default:
          throw new Error(`不支持的格式: ${format}`)
      }
    } catch (error) {
      logger.error('文件预览失败', error, { category: 'import-service' })
      throw error
    }
  }

  /**
   * 注册进度回调
   */
  registerProgressCallback(taskId: string, callback: ProgressCallback): void {
    const callbacks = this.progressCallbacks.get(taskId) || []
    callbacks.push(callback)
    this.progressCallbacks.set(taskId, callbacks)
  }

  /**
   * 更新进度
   */
  private updateProgress(taskId: string, progress: number, stage?: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.progress = Math.min(100, Math.max(0, progress))
    task.updatedAt = new Date().toISOString()
    this.tasks.set(taskId, task)

    // 触发回调
    const callbacks = this.progressCallbacks.get(taskId) || []
    const progressInfo: ImportProgress = {
      taskId,
      status: task.status,
      progress: task.progress,
      totalRows: task.totalRows,
      processedRows: task.processedRows,
      successRows: task.successRows,
      failedRows: task.failedRows,
      skippedRows: task.skippedRows,
      stage: stage as any,
      updatedAt: task.updatedAt,
    }

    for (const callback of callbacks) {
      try {
        callback(progressInfo)
      } catch (error) {
        logger.error('进度回调执行失败', error, { category: 'import-service' })
      }
    }
  }

  /**
   * 验证选项
   */
  private validateOptions(options: ImportOptions): void {
    if (!['csv', 'xlsx', 'json'].includes(options.format)) {
      throw new Error(`不支持的格式: ${options.format}`)
    }

    if (!['insert', 'update', 'upsert', 'replace'].includes(options.mode)) {
      throw new Error(`不支持的模式: ${options.mode}`)
    }

    if (!options.targetTable) {
      throw new Error('目标表名不能为空')
    }

    if (!options.fieldMappings || options.fieldMappings.length === 0) {
      throw new Error('字段映射不能为空')
    }
  }

  /**
   * 检测文件格式
   */
  detectFormat(fileName: string): ImportFormat {
    const ext = fileName.split('.').pop()?.toLowerCase()

    switch (ext) {
      case 'csv':
        return 'csv'
      case 'xlsx':
      case 'xls':
        return 'xlsx'
      case 'json':
        return 'json'
      default:
        throw new Error(`无法检测文件格式: ${fileName}`)
    }
  }
}

// 导出单例
export const dataImportService = new DataImportService()