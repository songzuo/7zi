/**
 * Workflow Version Compare API Route
 * GET /api/workflow/[id]/versions/compare - Compare two versions
 */

import { NextRequest } from 'next/server'
import { workflowVersionService } from '@/lib/workflow/version-service'
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
 * GET /api/workflow/[id]/versions/compare
 * Compare two versions and return diff
 * Query params: fromVersionId, toVersionId
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workflowId } = await params
    const { searchParams } = new URL(request.url)

    const fromVersionId = searchParams.get('fromVersionId')
    const toVersionId = searchParams.get('toVersionId')

    if (!fromVersionId || !toVersionId) {
      return createValidationError('Both fromVersionId and toVersionId are required')
    }

    const diff = await workflowVersionService.compareVersions(fromVersionId, toVersionId)

    // Verify both versions belong to this workflow
    if (diff.workflowId !== workflowId) {
      return createNotFoundError('Version not found for this workflow')
    }

    return createSuccessResponse(diff)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('not found')) {
      return createNotFoundError(message)
    }
    return createErrorResponse(error instanceof Error ? error : new Error(message))
  }
}