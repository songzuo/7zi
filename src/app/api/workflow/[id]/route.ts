/**
 * Workflow [id] API Route
 * GET    /api/workflow/[id] - 获取工作流详情
 * PUT    /api/workflow/[id] - 更新工作流
 * DELETE /api/workflow/[id] - 删除工作流
 */

import { NextRequest } from 'next/server'
import { WorkflowEngine, workflowEngine } from '@/lib/workflow/engine'
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
 * GET /api/workflow/[id]
 * 获取工作流详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const { getDatabase } = await import('@/lib/db/connection')
    const db = getDatabase()

    // Fetch workflow from database
    const workflow = db.get<{
      id: string
      name: string
      description: string
      version: number
      status: string
      nodes: string
      edges: string
      config: string
      created_at: string
      updated_at: string
      created_by: string
      updated_by: string
    }>(`
      SELECT * FROM workflows WHERE id = ?
    `, [id])

    if (!workflow) {
      return createNotFoundError('工作流不存在')
    }

    // Parse JSON fields
    const parsedWorkflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      status: workflow.status as 'active' | 'draft' | 'archived',
      nodes: workflow.nodes ? JSON.parse(workflow.nodes) : [],
      edges: workflow.edges ? JSON.parse(workflow.edges) : [],
      config: workflow.config ? JSON.parse(workflow.config) : {},
      metadata: {
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
        createdBy: workflow.created_by,
        updatedBy: workflow.updated_by,
      },
    }

    return createSuccessResponse(parsedWorkflow)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * PUT /api/workflow/[id]
 * 更新工作流
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { getDatabase } = await import('@/lib/db/connection')
    const db = getDatabase()

    // Check if workflow exists
    const existing = db.get('SELECT id FROM workflows WHERE id = ?', [id])
    if (!existing) {
      return createNotFoundError('工作流不存在')
    }

    const now = new Date().toISOString()
    
    // Update workflow in database
    db.exec(`
      UPDATE workflows SET
        name = ?,
        description = ?,
        version = version + 1,
        status = ?,
        nodes = ?,
        edges = ?,
        config = ?,
        updated_at = ?,
        updated_by = ?
      WHERE id = ?
    `, [
      body.name || '未命名工作流',
      body.description,
      body.status || 'draft',
      body.nodes ? JSON.stringify(body.nodes) : null,
      body.edges ? JSON.stringify(body.edges) : null,
      body.config ? JSON.stringify(body.config) : null,
      now,
      body.userId || 'system',
      id,
    ])

    // Get updated workflow
    const updatedWorkflow = db.get(`
      SELECT * FROM workflows WHERE id = ?
    `, [id])

    // Verify workflow
    const validation = workflowEngine.validateWorkflow({
      ...body,
      id,
      version: (updatedWorkflow as { version: number })?.version || 1,
    })
    if (!validation.valid) {
      return createValidationError('工作流验证失败', { errors: validation.errors })
    }

    // Auto-create version snapshot (if enabled)
    const settings = await workflowVersionService.getVersionSettings(id)
    if (settings.autoVersionOnUpdate) {
      try {
        await workflowVersionService.createVersion(updatedWorkflow as any, {
          changeSummary: body.changeSummary || '工作流更新',
          changeType: 'update',
          createdBy: body.userId || 'system',
        })
      } catch (versionError) {
        console.error('Failed to create version snapshot:', versionError)
      }
    }

    return createSuccessResponse(updatedWorkflow)
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * DELETE /api/workflow/[id]
 * 删除工作流
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const { getDatabase } = await import('@/lib/db/connection')
    const db = getDatabase()

    // Check if workflow exists
    const existing = db.get('SELECT id FROM workflows WHERE id = ?', [id])
    if (!existing) {
      return createNotFoundError('工作流不存在')
    }

    // Delete workflow from database
    db.exec('DELETE FROM workflows WHERE id = ?', [id])
    
    // Delete related workflow instances
    db.exec('DELETE FROM workflow_instances WHERE workflow_id = ?', [id])

    // Delete version history
    try {
      await workflowVersionService.deleteAllVersions(id)
    } catch (versionError) {
      console.error('Failed to delete version history:', versionError)
    }

    return createSuccessResponse({
      id,
      message: '工作流已删除',
    })
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
