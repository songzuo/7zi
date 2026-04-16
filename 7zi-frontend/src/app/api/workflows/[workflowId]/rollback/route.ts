/**
 * Workflow Rollback API Route
 * POST /api/workflows/[workflowId]/rollback - Rollback to a specific version
 *
 * @version 1.12.0
 * @date 2026-04-04
 */

import { NextRequest, NextResponse } from 'next/server'
import type { RollbackWorkflowDTO, RollbackResponse, WorkflowVersion } from '@/types/workflow-version'

// ============================================
// In-Memory Store (Replace with database in production)
// ============================================

const versionHistoryStore = new Map<string, WorkflowVersion[]>()

// Initialize with sample data if not already done
if (!versionHistoryStore.has('workflow-1')) {
  const now = Date.now()

  versionHistoryStore.set('workflow-1', [
    {
      id: 'version-workflow-1-1',
      workflowId: 'workflow-1',
      version: '1.0.0',
      name: 'Initial Version',
      description: 'Initial workflow definition',
      definition: {
        nodes: [
          {
            id: 'node-1',
            type: 'start',
            data: { label: 'Start' },
            position: { x: 100, y: 100 },
          },
          {
            id: 'node-2',
            type: 'process',
            data: { label: 'Process Data' },
            position: { x: 300, y: 100 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
          },
        ],
      },
      createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'admin@example.com',
      metadata: {
        changeType: 'create',
        changeDescription: 'Initial workflow creation',
      },
    },
    {
      id: 'version-workflow-1-2',
      workflowId: 'workflow-1',
      version: '1.0.1',
      name: 'Added Error Handling',
      description: 'Added error handling node',
      definition: {
        nodes: [
          {
            id: 'node-1',
            type: 'start',
            data: { label: 'Start' },
            position: { x: 100, y: 100 },
          },
          {
            id: 'node-2',
            type: 'process',
            data: { label: 'Process Data' },
            position: { x: 300, y: 100 },
          },
          {
            id: 'node-3',
            type: 'error',
            data: { label: 'Error Handler' },
            position: { x: 300, y: 250 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
          },
          {
            id: 'edge-2',
            source: 'node-2',
            target: 'node-3',
            condition: 'error',
          },
        ],
      },
      createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'admin@example.com',
      metadata: {
        changeType: 'update',
        changeDescription: 'Added error handling node',
      },
    },
    {
      id: 'version-workflow-1-3',
      workflowId: 'workflow-1',
      version: '1.0.2',
      name: 'Optimized Performance',
      description: 'Optimized node connections',
      definition: {
        nodes: [
          {
            id: 'node-1',
            type: 'start',
            data: { label: 'Start' },
            position: { x: 100, y: 100 },
          },
          {
            id: 'node-2',
            type: 'process',
            data: { label: 'Process Data' },
            position: { x: 300, y: 100 },
          },
          {
            id: 'node-3',
            type: 'error',
            data: { label: 'Error Handler' },
            position: { x: 300, y: 250 },
          },
          {
            id: 'node-4',
            type: 'end',
            data: { label: 'End' },
            position: { x: 500, y: 100 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
          },
          {
            id: 'edge-2',
            source: 'node-2',
            target: 'node-3',
            condition: 'error',
          },
          {
            id: 'edge-3',
            source: 'node-2',
            target: 'node-4',
          },
        ],
      },
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'user@example.com',
      metadata: {
        changeType: 'update',
        changeDescription: 'Added end node and optimized connections',
      },
    },
  ])
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the latest version of a workflow
 */
function getLatestVersion(workflowId: string) {
  const versions = versionHistoryStore.get(workflowId) || []

  if (versions.length === 0) {
    return null
  }

  // Sort by createdAt descending and return the first one
  return versions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
}

/**
 * Parse version number and increment
 */
function getNextVersion(baseVersion: string): string {
  const parts = baseVersion.split('.')
  const patch = parseInt(parts[parts.length - 1], 10) + 1
  parts[parts.length - 1] = patch.toString()
  return parts.join('.')
}

// ============================================
// POST - Rollback workflow
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params
    const body: RollbackWorkflowDTO = await request.json()

    const { versionId, rollbackBy, rollbackReason } = body

    // Validation
    if (!versionId) {
      return NextResponse.json(
        { error: 'versionId is required' },
        { status: 400 }
      )
    }

    if (!rollbackBy) {
      return NextResponse.json(
        { error: 'rollbackBy is required' },
        { status: 400 }
      )
    }

    // Get all versions for this workflow
    const versions = versionHistoryStore.get(workflowId) || []

    if (versions.length === 0) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Find the target version
    const targetVersion = versions.find((v) => v.id === versionId)

    if (!targetVersion) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    if (targetVersion.workflowId !== workflowId) {
      return NextResponse.json(
        { error: 'Version does not belong to this workflow' },
        { status: 400 }
      )
    }

    // Get current latest version
    const currentVersion = getLatestVersion(workflowId)

    if (!currentVersion) {
      return NextResponse.json(
        { error: 'No current version found' },
        { status: 404 }
      )
    }

    // Check if already on this version
    if (currentVersion.id === versionId) {
      return NextResponse.json(
        { error: 'Already on this version' },
        { status: 400 }
      )
    }

    // Generate new version number
    const newVersion = getNextVersion(targetVersion.version)

    // Create new version as the rollback result
    const rollbackVersion: WorkflowVersion = {
      id: `rollback-${workflowId}-${Date.now()}`,
      workflowId,
      version: newVersion,
      name: `Rollback to ${targetVersion.version}`,
      description: rollbackReason || `Rolled back to version ${targetVersion.version}`,
      definition: targetVersion.definition,
      createdAt: new Date().toISOString(),
      createdBy: rollbackBy,
      metadata: {
        changeType: 'rollback' as const,
        changeDescription: rollbackReason || `Rolled back to version ${targetVersion.version}`,
        sourceVersion: targetVersion.version,
      },
    }

    // Add the rollback version
    versions.push(rollbackVersion)
    versionHistoryStore.set(workflowId, versions)

    const response: RollbackResponse = {
      currentVersion: rollbackVersion,
      previousVersion: currentVersion,
      rollbackAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error rolling back workflow:', error)
    return NextResponse.json(
      { error: 'Failed to rollback workflow' },
      { status: 500 }
    )
  }
}