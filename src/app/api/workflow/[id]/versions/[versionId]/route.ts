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
  createForbiddenError,
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

    // 用 createForbiddenError 而不是 createErrorResponse(err, 403)：
    // 后者走的是普通 Error 分支，error.type 会是 INTERNAL_ERROR，
    // 与 403 的语义不符（客户端按 type 分支处理时会走错）。
    return createForbiddenError('Direct version deletion is not allowed. Use rollback instead.')
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}