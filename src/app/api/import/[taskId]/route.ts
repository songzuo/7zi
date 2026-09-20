/**
 * @fileoverview Data Import API - Task Endpoints
 * @description 导入任务相关 API 端点
 * @version 1.12.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { dataImportService } from '@/lib/import'

/**
 * GET /api/import/[taskId] - 获取任务详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const task = dataImportService.getTask(params.taskId)

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      task,
      progress: dataImportService.getProgress(params.taskId),
    })
  } catch (error) {
    console.error('获取导入任务失败:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取导入任务失败',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/import/[taskId] - 取消任务
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const cancelled = dataImportService.cancelTask(params.taskId)

    if (!cancelled) {
      return NextResponse.json({ error: '无法取消任务' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: '任务已取消',
    })
  } catch (error) {
    console.error('取消导入任务失败:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '取消导入任务失败',
      },
      { status: 500 }
    )
  }
}