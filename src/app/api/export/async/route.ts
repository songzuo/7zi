/**
 * @fileoverview 导出 API 路由 - 异步导出（后台任务）
 * @description POST /api/export/async - 提交异步导出任务
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { ExportService, ExportRequest } from '@/lib/export/service/export-service'
import { ExportField } from '@/lib/export/core/exporter'
import { FilterOperator } from '@/lib/export/utils/filter-parser'
import { authMiddleware } from '@/middleware/auth.middleware'
import { logger } from '@/lib/logger'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 任务实体 - 满足 Record<string, unknown> 约束
 */
interface TaskEntity extends Record<string, unknown> {
  id: string
  title: string
  description?: string
  status: string
  priority: 'low' | 'medium' | 'high'
  assignee?: string
  createdAt: string
  updatedAt: string
  dueDate?: string
  tags: string[]
  estimatedHours?: number
  actualHours?: number
}

/**
 * 异步导出请求体
 */
interface AsyncExportRequestBody {
  format: 'csv' | 'json' | 'xlsx' | 'excel'
  filename: string
  selectedFields?: string[]
  filters?: Array<{
    field: string
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'notIn'
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

// ============================================================================
// 字段定义
// ============================================================================

const TASK_FIELDS: ExportField<TaskEntity>[] = [
  { key: 'id', label: '任务ID', order: 1 },
  { key: 'title', label: '任务标题', order: 2 },
  { key: 'description', label: '任务描述', order: 3 },
  { key: 'status', label: '状态', order: 4 },
  { key: 'priority', label: '优先级', order: 5 },
  { key: 'assignee', label: '负责人', order: 6 },
  { key: 'createdAt', label: '创建时间', order: 7 },
  { key: 'updatedAt', label: '更新时间', order: 8 },
  { key: 'dueDate', label: '截止日期', order: 9 },
  { key: 'tags', label: '标签', order: 10 },
  { key: 'estimatedHours', label: '预估工时', order: 11 },
  { key: 'actualHours', label: '实际工时', order: 12 },
]

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

/**
 * 获取模拟任务数据
 */
async function getTasks(): Promise<TaskEntity[]> {
  // TODO: 从数据库获取实际数据
  const tasks: TaskEntity[] = []
  const statuses = ['pending', 'in-progress', 'completed', 'cancelled']
  const priorities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']
  const assignees = ['Alice', 'Bob', 'Charlie', 'David']

  for (let i = 1; i <= 100; i++) {
    tasks.push({
      id: `TASK-${String(i).padStart(4, '0')}`,
      title: `任务 ${i}`,
      description: `这是任务 ${i} 的描述`,
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      assignee: assignees[i % assignees.length],
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
      tags: [`tag-${i % 5}`, `important`],
      estimatedHours: i % 10,
      actualHours: i % 8,
    })
  }

  return tasks
}

/**
 * POST /api/export/async - 提交异步导出任务
 */
export async function POST(request: NextRequest) {
  // 认证检查
  const authResponse = await authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  try {
    const body: AsyncExportRequestBody = await request.json()

    // 验证必填字段
    if (!body.format || !body.filename) {
      return NextResponse.json(
        { error: '缺少必填字段: format, filename' },
        { status: 400 }
      )
    }

    // 获取数据
    const tasks = await getTasks()

    // 构建导出请求
    const exportRequest: ExportRequest<TaskEntity> = {
      requestId: `export_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      format: body.format,
      dataSource: 'memory',
      dataConfig: {
        type: 'custom',
        source: 'tasks',
        dataProvider: async () => tasks,
      },
      exportConfig: {
        filename: body.filename,
        fields: TASK_FIELDS,
        selectedFields: body.selectedFields as (keyof TaskEntity)[],
        includeHeader: true,
        timestampFormat: 'locale',
      },
      pagination: body.page && body.pageSize ? {
        page: body.page,
        pageSize: Math.min(body.pageSize, 100000),
      } : undefined,
      filters: body.filters?.map(f => ({
        field: f.field,
        operator: f.operator as FilterOperator,
        value: f.value,
      })),
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