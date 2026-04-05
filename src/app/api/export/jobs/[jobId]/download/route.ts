/**
 * @fileoverview 导出 API 路由 - 下载导出文件
 * @description GET /api/export/jobs/[jobId]/download - 下载导出文件
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { authMiddleware } from '@/middleware/auth.middleware'
import { logger } from '@/lib/logger'

/**
 * GET /api/export/jobs/[jobId]/download - 下载导出文件
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // 认证检查
  const authResponse = await authMiddleware(request)
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

    // 构建文件路径
    const exportDir = '/tmp/exports'
    const filePath = path.join(exportDir, `${jobId}.xlsx`)

    // 检查文件是否存在
    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json(
        { error: '文件不存在或已过期' },
        { status: 404 }
      )
    }

    // 读取文件
    const fileBuffer = await fs.readFile(filePath)
    const fileStats = await fs.stat(filePath)

    // 确定文件类型
    const ext = path.extname(filePath)
    const mimeTypes: Record<string, string> = {
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
    }
    const mimeType = mimeTypes[ext] || 'application/octet-stream'

    // 返回文件
    const headers = new Headers()
    headers.set('Content-Type', mimeType)
    headers.set('Content-Length', String(fileStats.size))
    headers.set('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`)
    headers.set('Cache-Control', 'no-cache')

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    })
  } catch (error) {
    logger.error('[Export API] 下载文件失败', {
      error: error instanceof Error ? error.message : '未知错误',
    })

    return NextResponse.json(
      { error: '下载文件失败' },
      { status: 500 }
    )
  }
}