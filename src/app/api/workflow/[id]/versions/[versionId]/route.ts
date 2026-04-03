/**
 * Workflow Version API Route
 * GET    /api/workflow/[id]/versions/[versionId] - Get specific version
 * DELETE /api/workflow/[id]/versions/[versionId] - Delete a version
 */

import { NextRequest } from 'next/server'
import { workflowVersionService } from '@/lib/workflow/version-service'
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundError,
} from '@/lib/api/error-handler'

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>
}

/**
 * GET /api/workflow/[id]/versions/[versionId]
 * Get a specific version
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { versionId } = await params

    const version = await workflowVersionService.getVersion(versionId)

    if (!version) {
      return createNotFoundError('Version not found')
    }

    return createSuccessResponse(version)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * DELETE /api/workflow/[id]/versions/[versionId]
 * Delete a specific version (not recommended, use with caution)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workflowId, versionId } = await params

    const version = await workflowVersionService.getVersion(versionId)

    if (!version || version.workflowId !== workflowId) {
      return createNotFoundError('Version not found')
    }

    // Note: We don't allow direct deletion of versions to preserve history
    // This would require admin privileges in a real implementation

    return createErrorResponse(new Error('Direct version deletion is not allowed. Use rollback instead.'), 403)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}