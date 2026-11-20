/**
 * Workflow Versions API Route
 * GET    /api/workflow/[id]/versions - Get version list
 * POST   /api/workflow/[id]/versions - Create new version
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
 * GET /api/workflow/[id]/versions
 * Get version list for a workflow
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workflowId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await workflowVersionService.getVersions(workflowId, { limit, offset })

    return createSuccessResponse(result)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * POST /api/workflow/[id]/versions
 * Create a new version snapshot
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workflowId } = await params
    const body = await request.json()

    // Validate workflow data
    if (!body.name) {
      return createValidationError('Workflow name is required')
    }

    if (!Array.isArray(body.nodes)) {
      return createValidationError('Workflow nodes must be an array')
    }

    if (!Array.isArray(body.edges)) {
      return createValidationError('Workflow edges must be an array')
    }

    // Create version
    const version = await workflowVersionService.createVersion(
      {
        id: workflowId,
        name: body.name,
        description: body.description,
        version: body.version || 1,
        status: body.status || 'draft',
        nodes: body.nodes,
        edges: body.edges,
        config: body.config || {},
        metadata: {
          createdAt: body.metadata?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: body.metadata?.createdBy || 'system',
          updatedBy: body.userId || 'system',
        },
      },
      {
        changeSummary: body.changeSummary,
        changeType: body.changeType || 'update',
        createdBy: body.userId || 'system',
        parentVersionId: body.parentVersionId,
      }
    )

    return createSuccessResponse(version, 201)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}