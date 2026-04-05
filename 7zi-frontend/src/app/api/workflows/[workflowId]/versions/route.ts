/**
 * Workflow Version History API Route
 * GET /api/workflows/[workflowId]/versions - Get version history
 *
 * @version 1.12.0
 * @date 2026-04-04
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  WorkflowVersion,
  WorkflowVersionHistoryQuery,
  WorkflowVersionHistoryResponse,
} from '@/types/workflow-version'

// ============================================
// In-Memory Store (Replace with database in production)
// ============================================

// Sample version history data
const generateSampleVersions = (workflowId: string): WorkflowVersion[] => {
  const versions: WorkflowVersion[] = []
  const now = Date.now()

  // Version 1.0.0 - Initial
  versions.push({
    id: `version-${workflowId}-1`,
    workflowId,
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
      changeType: 'create' as const,
      changeDescription: 'Initial workflow creation',
    },
  })

  // Version 1.0.1 - Update
  versions.push({
    id: `version-${workflowId}-2`,
    workflowId,
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
  })

  // Version 1.0.2 - Update
  versions.push({
    id: `version-${workflowId}-3`,
    workflowId,
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
      changeType: 'update' as const,
      changeDescription: 'Added end node and optimized connections',
    },
  })

  // Version 1.0.3 - Rollback
  versions.push({
    id: `version-${workflowId}-4`,
    workflowId,
    version: '1.0.3',
    name: 'Rollback to 1.0.1',
    description: 'Rolled back due to performance issues',
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
    createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin@example.com',
    metadata: {
      changeType: 'rollback' as const,
      changeDescription: 'Rolled back to version 1.0.1 due to performance issues',
      sourceVersion: '1.0.1',
    },
  })

  return versions
}

// In-memory storage (replace with database in production)
const versionHistoryStore = new Map<string, WorkflowVersion[]>()

// Initialize with sample data
versionHistoryStore.set('workflow-1', generateSampleVersions('workflow-1'))
versionHistoryStore.set('workflow-2', generateSampleVersions('workflow-2'))

// ============================================
// GET - Fetch version history
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const { workflowId } = params
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const changeType = searchParams.get('changeType') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    // Get versions for this workflow
    let versions = versionHistoryStore.get(workflowId) || []

    // Apply filters
    if (changeType) {
      versions = versions.filter((v) => v.metadata?.changeType === changeType)
    }

    if (startDate) {
      versions = versions.filter(
        (v) => new Date(v.createdAt) >= new Date(startDate)
      )
    }

    if (endDate) {
      versions = versions.filter(
        (v) => new Date(v.createdAt) <= new Date(endDate)
      )
    }

    // Sort by createdAt descending (newest first)
    versions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Calculate pagination
    const total = versions.length
    const startIndex = (page - 1) * pageSize
    const paginatedVersions = versions.slice(startIndex, startIndex + pageSize)

    const response: WorkflowVersionHistoryResponse = {
      versions: paginatedVersions,
      total,
      page,
      pageSize,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching workflow version history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow version history' },
      { status: 500 }
    )
  }
}