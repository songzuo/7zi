/**
 * @fileoverview 导出 API 路由 - 查询任务列表
 * @description GET /api/export/jobs - 查询导出任务列表
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { ExportService } from '@/lib/export/service/export-service'
import { authMiddleware } from '@/middleware/auth.middleware'
import { logger } from '@/lib/logger'

// ============================================================================
// 导出服务实例
// ============================================================================

let exportService: ExportService

/**
 * 获取导出服务实例
 */
function getExportService(): ExportService {
  if (!exportService) {
    exportService = new ExportService({
      maxConcurrentExports: 3,
      enableQueue: true,
    })
  }
  return exportService
}

/**
 * GET /api/export/jobs - 查询导出任务列表
 */
export async function GET(request: NextRequest) {
  // 认证检查
  const authResponse = authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as any
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // 查询任务列表
    const service = getExportService()
    const result = await service.queryJobs({
      status,
      page,
      pageSize,
    })

    return NextResponse.json({
      success: true,
      jobs: result.jobs,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    })
  } catch (error) {
    logger.error('[Export API] 查询任务列表失败', {
      error: error instanceof Error ? error.message : '未知错误',
    })

    return NextResponse.json(
      { error: '查询任务列表失败' },
      { status: 500 }
    )
  }
}