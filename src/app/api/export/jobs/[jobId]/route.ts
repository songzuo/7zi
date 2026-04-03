/**
 * @fileoverview 导出 API 路由 - 任务状态查询
 * @description GET /api/export/jobs/[jobId] - 查询导出任务状态
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
      exportTimeoutMs: 5 * 60 * 1000, // 5分钟
      enableQueue: true,
    })
  }
  return exportService
}

/**
 * GET /api/export/jobs/[jobId] - 查询导出任务状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // 认证检查
  const authResponse = authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  try {
    const { jobId } = params

    if (!jobId) {
      return NextResponse.json(
        { error: '缺少 jobId 参数' },
        { status: 400 }
      )
    }

    // 查询任务状态
    const service = getExportService()
    const result = await service.getJobStatus(jobId)

    if (!result) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      requestId: result.requestId,
      message: result.message,
      progress: result.progress,
      resultUrl: result.resultUrl,
      expiresAt: result.expiresAt,
    })
  } catch (error) {
    logger.error('[Export API] 查询任务状态失败', {
      error: error instanceof Error ? error.message : '未知错误',
    })

    return NextResponse.json(
      { error: '查询任务状态失败' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/export/jobs/[jobId] - 取消或删除导出任务
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // 认证检查
  const authResponse = authMiddleware(request)
  if (authResponse.status !== 200) {
    return authResponse
  }

  try {
    const { jobId } = params

    if (!jobId) {
      return NextResponse.json(
        { error: '缺少 jobId 参数' },
        { status: 400 }
      )
    }

    // 取消任务
    const service = getExportService()
    const cancelled = await service.cancelJob(jobId)

    if (!cancelled) {
      // 如果无法取消，尝试删除
      const deleted = await service.deleteJob(jobId)

      if (!deleted) {
        return NextResponse.json(
          { error: '任务不存在或无法取消' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        message: '任务已删除',
      })
    }

    return NextResponse.json({
      success: true,
      message: '任务已取消',
    })
  } catch (error) {
    logger.error('[Export API] 取消/删除任务失败', {
      error: error instanceof Error ? error.message : '未知错误',
    })

    return NextResponse.json(
      { error: '取消/删除任务失败' },
      { status: 500 }
    )
  }
}