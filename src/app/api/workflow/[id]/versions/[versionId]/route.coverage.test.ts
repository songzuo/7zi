/**
 * Workflow Version Detail API Route - additional coverage
 *
 * The existing route.test.ts covers the happy paths and the 403/404 branches.
 * This file covers the two remaining error branches:
 *   - GET when the service throws
 *   - DELETE when the service throws
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetVersion } = vi.hoisted(() => ({
  mockGetVersion: vi.fn(),
}))

vi.mock('@/lib/workflow/version-service', () => ({
  workflowVersionService: {
    getVersion: (...args: unknown[]) => mockGetVersion(...args),
  },
}))

import { DELETE, GET } from './route'

function createRequest(method: string): NextRequest {
  return new NextRequest(new URL('/api/workflow/wf_1/versions/v1', 'http://localhost'), {
    method,
  })
}

describe('Workflow version detail - additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetVersion.mockReset()
  })

  it('GET returns 500 when the version service throws', async () => {
    mockGetVersion.mockRejectedValue(new Error('version store offline'))

    const response = await GET(createRequest('GET'), {
      params: Promise.resolve({ id: 'wf_1', versionId: 'v1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })

  it('DELETE returns 500 when the version service throws', async () => {
    mockGetVersion.mockRejectedValue(new Error('version store offline'))

    const response = await DELETE(createRequest('DELETE'), {
      params: Promise.resolve({ id: 'wf_1', versionId: 'v1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })
})
