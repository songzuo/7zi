/**
 * Workflow Version Rollback API Route
 * POST /api/workflow/[id]/versions/[versionId]/rollback - Rollback to a specific version
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
 * POST /api/workflow/[id]/versions/[versionId]/rollback
 * Rollback workflow to a specific version
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workflowId, versionId } = await params
    const body = await request.json().catch(() => ({}))

    const version = await workflowVersionService.getVersion(versionId)

    if (!version || version.workflowId !== workflowId) {
      return createNotFoundError('Version not found')
    }

    // Perform rollback
    const newVersion = await workflowVersionService.rollbackToVersion(workflowId, versionId, {
      createdBy: body.userId || 'system',
    })

    return createSuccessResponse({
      message: `Successfully rolled back to version ${version.versionNumber}`,
      rollbackFromVersion: version.versionNumber,
      newVersion: newVersion.versionNumber,
      newVersionId: newVersion.id,
      restoredData: {
        nodes: version.nodes,
        edges: version.edges,
        config: version.config,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('not found')) {
      return createNotFoundError(message)
    }
    return createErrorResponse(error instanceof Error ? error : new Error(message))
  }
}