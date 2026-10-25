/**
 * 取消工作流执行
 * POST /api/workflow/:id/executions/:execId/cancel
 */

import { NextRequest } from 'next/server'
import { workflowMonitoring } from '@/lib/workflow/monitoring'
import {
  createNotFoundError,
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
} from '@/lib/api/error-handler'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; execId: string }> }
) {
  try {
    const { id: workflowId, execId } = await params

    // 获取执行记录
    const execution = workflowMonitoring.getExecution(execId)

    if (!execution) {
      return createNotFoundError('Execution not found')
    }

    // 验证工作流ID匹配。
    // 归属不匹配统一按 404 处理（与 versions 路由一致）——
    // 避免通过状态码差异泄漏"执行存在但不属于本工作流"这一信息。
    if (execution.workflowId !== workflowId) {
      return createNotFoundError('Execution not found')
    }

    // 检查执行状态
    if (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') {
      return createValidationError(
        `Cannot cancel execution with status: ${execution.status}`,
        { status: execution.status }
      )
    }

    // 取消执行
    const cancelledExecution = workflowMonitoring.cancelExecution(execId)

    // 用统一信封（{ success, data, timestamp }），与同族 workflow 路由一致。
    return createSuccessResponse({ execution: cancelledExecution })
  } catch (error) {
    logger.error('Error cancelling execution', error, { category: 'workflow' })
    // 对外用通用文案，不把内部错误细节透给调用方；真实错误已写进日志。
    return createErrorResponse(new Error('Failed to cancel execution'))
  }
}