/**
 * Workflow Version Compare API Route Tests (additional coverage)
 *
 * The existing suite (src/app/api/workflow/[id]/versions/__tests__/api.test.ts)
 * only asserts the 400 validation branch of
 * GET /api/workflow/[id]/versions/compare. This file covers the remaining
 * branches:
 *   - successful comparison returning the diff
 *   - 404 when the diff belongs to a different workflow
 *   - 404 when the service raises a "not found" error
 *   - 500 for any other service error
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockCompareVersions } = vi.hoisted(() => ({
  mockCompareVersions: vi.fn(),
}))

vi.mock('@/lib/workflow/version-service', () => ({
  workflowVersionService: {
    compareVersions: (...args: unknown[]) => mockCompareVersions(...args),
  },
}))

import { GET } from './route'

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'GET' })
}

function buildDiff(workflowId: string) {
  return {
    id: 'diff_1',
    workflowId,
    fromVersionId: 'v1',
    toVersionId: 'v2',
    nodesAdded: [],
    nodesRemoved: [],
    nodesModified: [],
    edgesAdded: [],
    edgesRemoved: [],
    edgesModified: [],
    configChanged: {},
    totalChanges: 0,
    computedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('GET /api/workflow/[id]/versions/compare - additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCompareVersions.mockResolvedValue(buildDiff('wf_1'))
  })

  it('returns the diff when both versions belong to the workflow', async () => {
    const response = await GET(
      createRequest('/api/workflow/wf_1/versions/compare?fromVersionId=v1&toVersionId=v2'),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.fromVersionId).toBe('v1')
    expect(body.data.toVersionId).toBe('v2')
    expect(body.data.totalChanges).toBe(0)
    expect(mockCompareVersions).toHaveBeenCalledWith('v1', 'v2')
  })

  it('returns 404 when the diff belongs to another workflow', async () => {
    mockCompareVersions.mockResolvedValue(buildDiff('wf_other'))

    const response = await GET(
      createRequest('/api/workflow/wf_1/versions/compare?fromVersionId=v1&toVersionId=v2'),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.success).toBe(false)
  })

  it('returns 404 when the service reports a missing version', async () => {
    mockCompareVersions.mockRejectedValue(new Error('Version v9 not found'))

    const response = await GET(
      createRequest('/api/workflow/wf_1/versions/compare?fromVersionId=v9&toVersionId=v2'),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.success).toBe(false)
  })

  it('returns 500 when the service fails with a non "not found" error', async () => {
    mockCompareVersions.mockRejectedValue(new Error('database exploded'))

    const response = await GET(
      createRequest('/api/workflow/wf_1/versions/compare?fromVersionId=v1&toVersionId=v2'),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })

  it('rejects the request when fromVersionId is missing', async () => {
    const response = await GET(
      createRequest('/api/workflow/wf_1/versions/compare?toVersionId=v2'),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(response.status).toBe(400)
    expect(mockCompareVersions).not.toHaveBeenCalled()
  })

  it('rejects the request when toVersionId is missing', async () => {
    const response = await GET(
      createRequest('/api/workflow/wf_1/versions/compare?fromVersionId=v1'),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(response.status).toBe(400)
    expect(mockCompareVersions).not.toHaveBeenCalled()
  })
})
