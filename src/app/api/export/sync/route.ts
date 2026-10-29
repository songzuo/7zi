/**
 * @fileoverview 导出 API 路由 - 同步导出
 * @description POST /api/export/sync - 同步导出数据（真实数据库）
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
 * 导出请求体
 */
interface ExportRequestBody {
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
}

const VALID_FORMATS = ['csv', 'json', 'xlsx', 'excel'] as const
const MAX_EXPORT_ROWS = 100000

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
      enableQueue: false, // 同步导出不需要队列
    })
  }
  return exportService
}

// ============================================================================
// 请求参数解析
// ============================================================================

/**
 * 解析并校验过滤条件
 */
function parseFilters(
  raw: ExportRequestBody['filters']
): { filters: FilterCondition[]; invalid: number } {
  const filters: FilterCondition[] = []
  let invalid = 0

  for (const f of raw ?? []) {
    if (!f || typeof f.field !== 'string' || !f.field) {
      invalid++
      continue
    }
    filters.push({
      field: f.field,
      operator: f.operator as FilterOperator,
      value: f.value,
    })
  }

  return { filters, invalid }
}

/**
 * 解析并校验排序条件
 */
function parseSort(raw: ExportRequestBody['sort']): { sort: SortOptions[]; invalid: number } {
  const sort: SortOptions[] = []
  let invalid = 0

  for (const s of raw ?? []) {
    if (!s || typeof s.field !== 'string' || !s.field) {
      invalid++
      continue
    }
    sort.push({
      field: s.field,
      order: s.order === 'desc' ? 'desc' : 'asc',
    })
  }

  return { sort, invalid }
}

/**
 * 校验 selectedFields，只保留白名单内的字段
 */
function parseSelectedFields(raw: string[] | undefined): (keyof TaskEntity)[] | undefined {
  if (!raw || raw.length === 0) return undefined

  const valid = raw.filter(f => TASK_FIELD_NAMES.has(f))
  if (valid.length === 0) return undefined

  return valid as (keyof TaskEntity)[]
}

// ============================================================================
// 响应辅助
// ============================================================================

/**
 * 组装导出文件响应
 */
function buildFileResponse(
  result: {
    data?: ArrayBuffer | string
    filename: string
    mimeType: string
    size: number
  },
  extraHeaders: Record<string, string>
): NextResponse {
  const headers = new Headers()
  headers.set('Content-Type', result.mimeType)
  headers.set('Content-Disposition', `attachment; filename="${result.filename}"`)
  headers.set('Content-Length', String(result.size))

  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value)
  }

  return new NextResponse(result.data as BodyInit, {
    status: 200,
    headers,
  })
}

// ============================================================================
// GET /api/export/sync - 同步导出数据
// ============================================================================
export async function GET(request: NextRequest) {
  // 认证检查
  const authResponse = await authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const formatParam = searchParams.get('format')
    const format = (VALID_FORMATS as readonly string[]).includes(formatParam ?? '')
      ? (formatParam as 'csv' | 'json' | 'xlsx' | 'excel')
      : 'csv'
    const filename = searchParams.get('filename') || 'export'
    const selectedFields = parseSelectedFields(searchParams.get('fields')?.split(','))

    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')
    const page = pageParam ? parseInt(pageParam, 10) : undefined
    const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : undefined

    // 从真实数据库读取（过滤 / 排序在 SQL 层生效）
    const { rows, degraded, reason, ignoredFields } = await fetchTasks({
      page: page && page > 0 ? page : undefined,
      pageSize: pageSize && pageSize > 0 ? pageSize : undefined,
    })

    const exportRequest: ExportRequest<TaskEntity> = {
      requestId: `export_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      format,
      dataSource: 'memory',
      dataConfig: {
        type: 'custom',
        source: 'tasks',
        dataProvider: async () => rows,
      },
      exportConfig: {
        filename,
        fields: TASK_FIELDS,
        selectedFields,
        includeHeader: true,
        timestampFormat: 'locale',
      },
      background: false,
    }

    const service = getExportService()
    const result = await service.export(exportRequest)

    if (!result.success) {
      logger.error('[Export API] 同步导出失败', { requestId: exportRequest.requestId })
      return NextResponse.json(
        { error: '导出失败' },
        { status: 500 }
      )
    }

    const extraHeaders: Record<string, string> = {
      'X-Export-Row-Count': String(rows.length),
    }
    if (degraded) {
      extraHeaders['X-Export-Degraded'] = 'true'
      extraHeaders['X-Export-Reason'] = reason ?? 'database unavailable'
    }
    if (ignoredFields.length > 0) {
      extraHeaders['X-Export-Ignored-Fields'] = ignoredFields.join(',')
    }

    return buildFileResponse(
      {
        data: result.data,
        filename: result.filename,
        mimeType: result.mimeType,
        size: result.size,
      },
      extraHeaders
    )
  } catch (error) {
    logger.error('[Export API] 同步导出失败', {
      error: error instanceof Error ? error.message : '未知错误',
    })

    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/export/sync - 同步导出数据（支持过滤和排序）
// ============================================================================
export async function POST(request: NextRequest) {
  // 认证检查
  const authResponse = await authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  try {
    let body: ExportRequestBody
    try {
      body = (await request.json()) as ExportRequestBody
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

    const { filters, invalid: invalidFilters } = parseFilters(body.filters)
    const { sort, invalid: invalidSort } = parseSort(body.sort)
    const selectedFields = parseSelectedFields(body.selectedFields)

    // 从真实数据库读取：过滤 / 排序在 SQL 层真实生效
    const { rows, degraded, reason, ignoredFields } = await fetchTasks({
      filters,
      sort,
      page: body.page && body.page > 0 ? body.page : undefined,
      pageSize: body.pageSize && body.pageSize > 0 ? body.pageSize : undefined,
    })

    if (rows.length > MAX_EXPORT_ROWS) {
      logger.warn('[Export API] 导出行数超过上限，已截断', {
        rowCount: rows.length,
        max: MAX_EXPORT_ROWS,
      })
      rows.length = MAX_EXPORT_ROWS
    }

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
      background: false,
    }

    // 执行导出
    const service = getExportService()
    const result = await service.export(exportRequest)

    if (!result.success) {
      logger.error('[Export API] 同步导出失败', { requestId: exportRequest.requestId })
      return NextResponse.json(
        { error: '导出失败' },
        { status: 500 }
      )
    }

    const extraHeaders: Record<string, string> = {
      'X-Export-Row-Count': String(rows.length),
    }
    if (degraded) {
      extraHeaders['X-Export-Degraded'] = 'true'
      extraHeaders['X-Export-Reason'] = reason ?? 'database unavailable'
    }
    if (ignoredFields.length > 0 || invalidFilters > 0 || invalidSort > 0) {
      const ignored = [...ignoredFields]
      if (invalidFilters > 0) ignored.push(`invalid-filters:${invalidFilters}`)
      if (invalidSort > 0) ignored.push(`invalid-sort:${invalidSort}`)
      extraHeaders['X-Export-Ignored-Fields'] = ignored.join(',')
    }

    return buildFileResponse(
      {
        data: result.data,
        filename: result.filename,
        mimeType: result.mimeType,
        size: result.size,
      },
      extraHeaders
    )
  } catch (error) {
    logger.error('[Export API] 同步导出失败', {
      error: error instanceof Error ? error.message : '未知错误',
    })

    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    )
  }
}
