/**
 * Workflow Version Settings API Route - additional coverage
 *
 * The existing suite only asserts the GET default-settings happy path.
 * This file covers:
 *   - GET error branch
 *   - PUT happy path
 *   - PUT validation failures (maxVersions / retentionDays)
 *   - PUT error branch
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetVersionSettings, mockUpdateVersionSettings } = vi.hoisted(() => ({
  mockGetVersionSettings: vi.fn(),
  mockUpdateVersionSettings: vi.fn(),
}))

vi.mock('@/lib/workflow/version-service', () => ({
  workflowVersionService: {
    getVersionSettings: (...args: unknown[]) => mockGetVersionSettings(...args),
    updateVersionSettings: (...args: unknown[]) => mockUpdateVersionSettings(...args),
  },
}))

import { GET, PUT } from './route'

const DEFAULT_SETTINGS = {
  maxVersions: 50,
  autoVersionOnUpdate: true,
  retentionDays: 90,
}

function createRequest(url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: body === undefined ? 'GET' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('GET /api/workflow/[id]/versions/settings - additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetVersionSettings.mockResolvedValue(DEFAULT_SETTINGS)
  })

  it('returns the settings for the workflow', async () => {
    const response = await GET(createRequest('/api/workflow/wf_1/versions/settings'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.maxVersions).toBe(50)
    expect(mockGetVersionSettings).toHaveBeenCalledWith('wf_1')
  })

  it('returns an error response when the service fails', async () => {
    mockGetVersionSettings.mockRejectedValue(new Error('settings unavailable'))

    const response = await GET(createRequest('/api/workflow/wf_1/versions/settings'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })
})

describe('PUT /api/workflow/[id]/versions/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateVersionSettings.mockResolvedValue({
      maxVersions: 10,
      autoVersionOnUpdate: false,
      retentionDays: 30,
    })
  })

  it('updates the settings and returns the new values', async () => {
    const response = await PUT(
      createRequest('/api/workflow/wf_1/versions/settings', {
        maxVersions: 10,
        autoVersionOnUpdate: false,
        retentionDays: 30,
      }),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.maxVersions).toBe(10)
    expect(body.data.autoVersionOnUpdate).toBe(false)
    expect(mockUpdateVersionSettings).toHaveBeenCalledWith('wf_1', {
      maxVersions: 10,
      autoVersionOnUpdate: false,
      retentionDays: 30,
    })
  })

  it('rejects a maxVersions value below 1', async () => {
    const response = await PUT(
      createRequest('/api/workflow/wf_1/versions/settings', { maxVersions: 0 }),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockUpdateVersionSettings).not.toHaveBeenCalled()
  })

  it('rejects a maxVersions value above 1000', async () => {
    const response = await PUT(
      createRequest('/api/workflow/wf_1/versions/settings', { maxVersions: 1001 }),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(response.status).toBe(400)
    expect(mockUpdateVersionSettings).not.toHaveBeenCalled()
  })

  it('rejects a non-numeric maxVersions value', async () => {
    const response = await PUT(
      createRequest('/api/workflow/wf_1/versions/settings', { maxVersions: 'many' }),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(response.status).toBe(400)
    expect(mockUpdateVersionSettings).not.toHaveBeenCalled()
  })

  it('rejects a retentionDays value below 1', async () => {
    const response = await PUT(
      createRequest('/api/workflow/wf_1/versions/settings', { retentionDays: 0 }),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(response.status).toBe(400)
    expect(mockUpdateVersionSettings).not.toHaveBeenCalled()
  })

  it('rejects a retentionDays value above 365', async () => {
    const response = await PUT(
      createRequest('/api/workflow/wf_1/versions/settings', { retentionDays: 366 }),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(response.status).toBe(400)
    expect(mockUpdateVersionSettings).not.toHaveBeenCalled()
  })

  it('accepts a partial update without maxVersions', async () => {
    const response = await PUT(
      createRequest('/api/workflow/wf_1/versions/settings', { autoVersionOnUpdate: false }),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(response.status).toBe(200)
    expect(mockUpdateVersionSettings).toHaveBeenCalledWith('wf_1', {
      maxVersions: undefined,
      autoVersionOnUpdate: false,
      retentionDays: undefined,
    })
  })

  it('returns an error response when the service fails', async () => {
    mockUpdateVersionSettings.mockRejectedValue(new Error('update failed'))

    const response = await PUT(
      createRequest('/api/workflow/wf_1/versions/settings', { maxVersions: 10 }),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })
})
