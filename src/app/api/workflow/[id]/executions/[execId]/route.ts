/**
 * 获取工作流执行详情
 * GET /api/workflow/:id/executions/:execId
 */

import { NextRequest, NextResponse } from 'next/server'
import { workflowMonitoring } from '@/lib/workflow/monitoring'
import { createNotFoundError } from '@/lib/api/error-handler'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; execId: string }> }
) {
  try {
    const { id: workflowId, execId } = await params

    // 获取执行详情
    const details = workflowMonitoring.getExecutionDetails(execId)

    if (!details.execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    // 验证工作流ID匹配。
    // 归属不匹配统一按 404 处理（与 versions 路由一致）——
    // 避免通过状态码差异泄漏"执行存在但不属于本工作流"这一信息。
    if (details.execution.workflowId !== workflowId) {
      return createNotFoundError('Execution not found')
    }

    return NextResponse.json(details)
  } catch (error) {
    console.error('Error fetching execution details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch execution details' },
      { status: 500 }
    )
  }
}