/**
 * Workflow History API Route
 * GET /api/workflow/[id]/history - Get workflow history/audit trail
 */

import { NextRequest } from 'next/server'
import { workflowHistoryService } from '@/lib/workflow/history'
import type { OperationType } from '@/lib/workflow/history'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  createNotFoundError,
} from '@/lib/api/error-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/workflow/[id]/history
 * Get history/audit trail for a workflow
 * Query params: limit, offset, operation, userId, success, startTime, endTime
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workflowId } = await params
    const { searchParams } = new URL(request.url)

    // Build filter from query params
    const filter: { workflowId?: string; operation?: OperationType; userId?: string; success?: boolean; startTime?: string; endTime?: string; relatedVersionId?: string; relatedInstanceId?: string; relatedNodeId?: string } = {
      workflowId,
    }

    const operation = searchParams.get('operation') as OperationType | null
    if (operation) {
      filter.operation = operation
    }

    const userId = searchParams.get('userId')
    if (userId) {
      filter.userId = userId
    }

    const success = searchParams.get('success')
    if (success !== null) {
      filter.success = success === 'true'
    }

    const startTime = searchParams.get('startTime')
    if (startTime) {
      filter.startTime = startTime
    }

    const endTime = searchParams.get('endTime')
    if (endTime) {
      filter.endTime = endTime
    }

    const relatedVersionId = searchParams.get('relatedVersionId')
    if (relatedVersionId) {
      filter.relatedVersionId = relatedVersionId
    }

    const relatedInstanceId = searchParams.get('relatedInstanceId')
    if (relatedInstanceId) {
      filter.relatedInstanceId = relatedInstanceId
    }

    const relatedNodeId = searchParams.get('relatedNodeId')
    if (relatedNodeId) {
      filter.relatedNodeId = relatedNodeId
    }

    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return createValidationError('Limit must be between 1 and 1000')
    }

    if (isNaN(offset) || offset < 0) {
      return createValidationError('Offset must be >= 0')
    }

    const result = await workflowHistoryService.queryHistory(filter, { limit, offset })

    return createSuccessResponse(result)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}