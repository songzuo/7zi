/**
 * 获取工作流执行历史
 * GET /api/workflow/:id/executions
 */

import { NextRequest } from 'next/server'
import { workflowMonitoring } from '@/lib/workflow/monitoring'
import { WorkflowExecutionStatus } from '@/lib/workflow/monitoring/types'
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    
    // 解析查询参数
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as WorkflowExecutionStatus | null
    const triggerType = searchParams.get('triggerType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const orderBy = searchParams.get('orderBy') as 'startTime' | 'duration' | 'status' | undefined
    const order = searchParams.get('order') as 'asc' | 'desc' | undefined

    // 获取执行历史
    const result = workflowMonitoring.getExecutions({
      workflowId,
      status: status || undefined,
      triggerType: triggerType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit,
      offset,
      orderBy,
      order,
    })

    // 用统一信封（{ success, data, timestamp }），与同族 workflow 路由一致。
    return createSuccessResponse(result)
  } catch (error) {
    logger.error('Error fetching execution history', error, { category: 'workflow' })
    // 对外用通用文案，不把内部错误细节透给调用方；真实错误已写进日志。
    return createErrorResponse(new Error('Failed to fetch execution history'))
  }
}
