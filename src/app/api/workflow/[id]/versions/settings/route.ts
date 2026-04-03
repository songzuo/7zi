/**
 * Workflow Version Settings API Route
 * GET  /api/workflow/[id]/versions/settings - Get version settings
 * PUT  /api/workflow/[id]/versions/settings - Update version settings
 */

import { NextRequest } from 'next/server'
import { workflowVersionService } from '@/lib/workflow/version-service'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
} from '@/lib/api/error-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/workflow/[id]/versions/settings
 * Get version settings for a workflow
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workflowId } = await params

    const settings = await workflowVersionService.getVersionSettings(workflowId)

    return createSuccessResponse(settings)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * PUT /api/workflow/[id]/versions/settings
 * Update version settings for a workflow
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workflowId } = await params
    const body = await request.json()

    // Validate settings
    if (body.maxVersions !== undefined) {
      if (typeof body.maxVersions !== 'number' || body.maxVersions < 1 || body.maxVersions > 1000) {
        return createValidationError('maxVersions must be a number between 1 and 1000')
      }
    }

    if (body.retentionDays !== undefined) {
      if (typeof body.retentionDays !== 'number' || body.retentionDays < 1 || body.retentionDays > 365) {
        return createValidationError('retentionDays must be a number between 1 and 365')
      }
    }

    const settings = await workflowVersionService.updateVersionSettings(workflowId, {
      maxVersions: body.maxVersions,
      autoVersionOnUpdate: body.autoVersionOnUpdate,
      retentionDays: body.retentionDays,
    })

    return createSuccessResponse(settings)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}