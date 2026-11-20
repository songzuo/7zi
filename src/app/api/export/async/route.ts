/**
 * @fileoverview 导出 API 路由 - 异步导出（后台任务）
 * @description POST /api/export/async - 提交异步导出任务（真实数据库）
 * @version 1.1.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { ExportService, ExportRequest } from '@/lib/export/service/export-service'
import { FilterOperator, FilterCondition, SortOptions } from '@/lib/export/utils/filter-parser'
import { authMiddleware } from '@/middleware/auth.middleware'
import { logger } from '@/lib/logger'
import {
  TASK_FIELDS,
  TASK_FIELD_NAMES,
  fetchTasks,
  TaskEntity,
} from '../lib/task-repository'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 异步导出请求体
 */
interface AsyncExportRequestBody {
  format: 'csv' | 'json' | 'xlsx' | 'excel'
  filename: string
  selectedFields?: string[]
  filters?: Array<{
    field: string
    operator:
      | 'eq'
      | 'ne'
      | 'gt'
      | 'gte'
      | 'lt'
      | 'lte'
      | 'like'
      | 'notLike'
      | 'in'
      | 'notIn'
      | 'between'
      | 'isNull'
      | 'isNotNull'
      | 'startsWith'
      | 'endsWith'
    value: unknown
  }>
  sort?: Array<{
    field: string
    order: 'asc' | 'desc'
  }>
  page?: number
  pageSize?: number
  callbackUrl?: string
}

const VALID_FORMATS = ['csv', 'json', 'xlsx', 'excel'] as const

// ============================================================================
// 导出服务实例
// ============================================================================

let exportService: ExportService<TaskEntity>

/**
 * 获取导出服务实例
 */
function getExportService(): ExportService<TaskEntity> {
  if (!exportService) {
    exportService = new ExportService<TaskEntity>({
      maxConcurrentExports: 3,
      exportTimeoutMs: 5 * 60 * 1000, // 5分钟
      streamingThreshold: 10 * 1024 * 1024, // 10MB
      defaultPageSize: 1000,
      maxPageSize: 100000,
      enableQueue: true, // 启用任务队列
    })
  }
  return exportService
}

// ============================================================================
// 请求参数解析
// ============================================================================

function parseFilters(
  raw: AsyncExportRequestBody['filters']
): FilterCondition[] {
  const filters: FilterCondition[] = []

  for (const f of raw ?? []) {
    if (!f || typeof f.field !== 'string' || !f.field) continue
    filters.push({
      field: f.field,
      operator: f.operator as FilterOperator,
      value: f.value,
    })
  }

  return filters
}

function parseSort(raw: AsyncExportRequestBody['sort']): SortOptions[] {
  const sort: SortOptions[] = []

  for (const s of raw ?? []) {
    if (!s || typeof s.field !== 'string' || !s.field) continue
    sort.push({
      field: s.field,
      order: s.order === 'desc' ? 'desc' : 'asc',
    })
  }

  return sort
}

function parseSelectedFields(raw: string[] | undefined): (keyof TaskEntity)[] | undefined {
  if (!raw || raw.length === 0) return undefined
  const valid = raw.filter(f => TASK_FIELD_NAMES.has(f))
  if (valid.length === 0) return undefined
  return valid as (keyof TaskEntity)[]
}

// ============================================================================
// POST /api/export/async - 提交异步导出任务
// ============================================================================
export async function POST(request: NextRequest) {
  // 认证检查
  const authResponse = await authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  try {
    let body: AsyncExportRequestBody
    try {
      body = (await request.json()) as AsyncExportRequestBody
    } catch {
      return NextResponse.json(
        { error: '请求体不是合法 JSON' },
        { status: 400 }
      )
    }

    // 验证必填字段
    if (!body.format || !body.filename) {
      return NextResponse.json(
        { error: '缺少必填字段: format, filename' },
        { status: 400 }
      )
    }

    if (!(VALID_FORMATS as readonly string[]).includes(body.format)) {
      return NextResponse.json(
        { error: `不支持的导出格式: ${body.format}` },
        { status: 400 }
      )
    }

    const filters = parseFilters(body.filters)
    const sort = parseSort(body.sort)
    const selectedFields = parseSelectedFields(body.selectedFields)

    // 从真实数据库读取：过滤 / 排序在 SQL 层真实生效
    const { rows, degraded, reason, ignoredFields } = await fetchTasks({
      filters,
      sort,
      page: body.page && body.page > 0 ? body.page : undefined,
      pageSize: body.pageSize && body.pageSize > 0 ? body.pageSize : undefined,
    })

    // 构建导出请求
    const exportRequest: ExportRequest<TaskEntity> = {
      requestId: `export_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      format: body.format,
      dataSource: 'memory',
      dataConfig: {
        type: 'custom',
        source: 'tasks',
        dataProvider: async () => rows,
      },
      exportConfig: {
        filename: body.filename,
        fields: TASK_FIELDS,
        selectedFields,
        includeHeader: true,
        timestampFormat: 'locale',
      },
      background: true,
      callbackUrl: body.callbackUrl,
    }

    // 提交导出任务
    const service = getExportService()
    const result = await service.submitExportJob(exportRequest)

    if (!result.success) {
      return NextResponse.json(
        { error: '提交导出任务失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      requestId: result.requestId,
      message: result.message,
      expiresAt: result.expiresAt,
      rowCount: rows.length,
      degraded,
      degradedReason: degraded ? reason : undefined,
      ignoredFields: ignoredFields.length > 0 ? ignoredFields : undefined,
    })
  } catch (error) {
    logger.error('[Export API] 提交异步导出任务失败', {
      error: error instanceof Error ? error.message : '未知错误',
    })

    return NextResponse.json(
      { error: '提交导出任务失败' },
      { status: 500 }
    )
  }
}
