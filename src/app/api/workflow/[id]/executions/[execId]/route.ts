/**
 * 获取工作流执行详情
 * GET /api/workflow/:id/executions/:execId
 */

import { NextRequest, NextResponse } from 'next/server'
import { workflowMonitoring } from '@/lib/workflow/monitoring'

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

    // 验证工作流ID匹配
    if (details.execution.workflowId !== workflowId) {
      return NextResponse.json(
        { error: 'Execution does not belong to this workflow' },
        { status: 400 }
      )
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