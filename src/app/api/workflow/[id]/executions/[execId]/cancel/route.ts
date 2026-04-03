/**
 * 取消工作流执行
 * POST /api/workflow/:id/executions/:execId/cancel
 */

import { NextRequest, NextResponse } from 'next/server'
import { workflowMonitoring } from '@/lib/workflow/monitoring'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; execId: string }> }
) {
  try {
    const { id: workflowId, execId } = await params

    // 获取执行记录
    const execution = workflowMonitoring.getExecution(execId)

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    // 验证工作流ID匹配
    if (execution.workflowId !== workflowId) {
      return NextResponse.json(
        { error: 'Execution does not belong to this workflow' },
        { status: 400 }
      )
    }

    // 检查执行状态
    if (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot cancel execution with status: ${execution.status}` },
        { status: 400 }
      )
    }

    // 取消执行
    const cancelledExecution = workflowMonitoring.cancelExecution(execId)

    return NextResponse.json({
      success: true,
      execution: cancelledExecution,
    })
  } catch (error) {
    console.error('Error cancelling execution:', error)
    return NextResponse.json(
      { error: 'Failed to cancel execution' },
      { status: 500 }
    )
  }
}