/**
 * Workflow Version API Tests
 * 
 * Tests for version history API endpoints:
 * - GET /api/workflow/[id]/versions
 * - POST /api/workflow/[id]/versions
 * - GET /api/workflow/[id]/versions/[versionId]
 * - GET /api/workflow/[id]/versions/compare
 * - POST /api/workflow/[id]/versions/[versionId]/rollback
 * - GET/PUT /api/workflow/[id]/versions/settings
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getVersions, POST as createVersion } from '../route'
import { GET as getVersion } from '../[versionId]/route'
import { GET as compareVersions } from '../compare/route'
import { POST as rollbackVersion } from '../[versionId]/rollback/route'
import { GET as getSettings, PUT as updateSettings } from '../settings/route'

// Mock workflow data
const mockWorkflow = {
  id: 'wf_api_test',
  name: 'API Test Workflow',
  description: 'Test workflow for API',
  version: 1,
  status: 'draft',
  nodes: [
    { id: 'node_1', type: 'start', name: 'Start', position: { x: 100, y: 100 } },
    { id: 'node_2', type: 'agent', name: 'Agent', position: { x: 300, y: 100 } },
    { id: 'node_3', type: 'end', name: 'End', position: { x: 500, y: 100 } },
  ],
  edges: [
    { id: 'edge_1', source: 'node_1', target: 'node_2', type: 'sequence' },
    { id: 'edge_2', source: 'node_2', target: 'node_3', type: 'sequence' },
  ],
  config: { timeout: 3600 },
}

function createRequest(url: string, options: RequestInit & { body?: string } = {}): NextRequest {
  const { body, ...rest } = options
  return new NextRequest(new URL(url, 'http://localhost'), {
    ...rest,
    body: body as BodyInit | undefined,
  } as any)
}

describe('Workflow Version API', () => {
  describe('GET /api/workflow/[id]/versions', () => {
    it('should return empty list for workflow with no versions', async () => {
      const request = createRequest('/api/workflow/wf_empty/versions')
      const response = await getVersions(request, { params: Promise.resolve({ id: 'wf_empty' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.versions).toHaveLength(0)
      expect(data.data.total).toBe(0)
    })

    it('should support pagination parameters', async () => {
      const request = createRequest('/api/workflow/wf_test/versions?limit=10&offset=5')
      const response = await getVersions(request, { params: Promise.resolve({ id: 'wf_test' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.limit).toBe(10)
      expect(data.data.offset).toBe(5)
    })
  })

  describe('POST /api/workflow/[id]/versions', () => {
    it('should create a new version', async () => {
      const request = createRequest('/api/workflow/wf_api_test/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mockWorkflow,
          changeSummary: 'Test version creation',
          userId: 'test_user',
        }),
      })

      const response = await createVersion(request, { params: Promise.resolve({ id: 'wf_api_test' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.versionNumber).toBe(1)
      expect(data.data.changeSummary).toBe('Test version creation')
    })

    it('should validate required fields', async () => {
      const request = createRequest('/api/workflow/wf_test/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Missing name
      })

      const response = await createVersion(request, { params: Promise.resolve({ id: 'wf_test' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate nodes array', async () => {
      const request = createRequest('/api/workflow/wf_test/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', nodes: 'not_an_array' }),
      })

      const response = await createVersion(request, { params: Promise.resolve({ id: 'wf_test' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate edges array', async () => {
      const request = createRequest('/api/workflow/wf_test/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', nodes: [], edges: 'not_an_array' }),
      })

      const response = await createVersion(request, { params: Promise.resolve({ id: 'wf_test' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('GET /api/workflow/[id]/versions/[versionId]', () => {
    it('should return 404 for nonexistent version', async () => {
      const request = createRequest('/api/workflow/wf_test/versions/nonexistent')
      const response = await getVersion(request, {
        params: Promise.resolve({ id: 'wf_test', versionId: 'nonexistent' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })
  })

  describe('GET /api/workflow/[id]/versions/compare', () => {
    it('should require both version IDs', async () => {
      const request = createRequest('/api/workflow/wf_test/versions/compare?fromVersionId=v1')
      const response = await compareVersions(request, { params: Promise.resolve({ id: 'wf_test' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate both version IDs are provided', async () => {
      const request = createRequest('/api/workflow/wf_test/versions/compare?toVersionId=v2')
      const response = await compareVersions(request, { params: Promise.resolve({ id: 'wf_test' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('POST /api/workflow/[id]/versions/[versionId]/rollback', () => {
    it('should return 404 for nonexistent version', async () => {
      const request = createRequest('/api/workflow/wf_test/versions/nonexistent/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await rollbackVersion(request, {
        params: Promise.resolve({ id: 'wf_test', versionId: 'nonexistent' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })
  })

  describe('GET /api/workflow/[id]/versions/settings', () => {
    it('should return default settings', async () => {
      const request = createRequest('/api/workflow/wf_new/versions/settings')
      const response = await getSettings(request, { params: Promise.resolve({ id: 'wf_new' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.maxVersions).toBe(50)
      expect(data.data.autoVersionOnUpdate).toBe(true)
      expect(data.data.retentionDays).toBe(90)
    })
  })

  describe('PUT /api/workflow/[id]/versions/settings', () => {
    it('should update settings', async () => {
      const request = createRequest('/api/workflow/wf_test/versions/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxVersions: 100,
          autoVersionOnUpdate: false,
          retentionDays: 30,
        }),
      })

      const response = await updateSettings(request, { params: Promise.resolve({ id: 'wf_test' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.maxVersions).toBe(100)
      expect(data.data.autoVersionOnUpdate).toBe(false)
      expect(data.data.retentionDays).toBe(30)
    })

    it('should validate maxVersions range', async () => {
      const request = createRequest('/api/workflow/wf_test/versions/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxVersions: 0 }),
      })

      const response = await updateSettings(request, { params: Promise.resolve({ id: 'wf_test' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate maxVersions upper bound', async () => {
      const request = createRequest('/api/workflow/wf_test/versions/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxVersions: 1001 }),
      })

      const response = await updateSettings(request, { params: Promise.resolve({ id: 'wf_test' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate retentionDays range', async () => {
      const request = createRequest('/api/workflow/wf_test/versions/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: 0 }),
      })

      const response = await updateSettings(request, { params: Promise.resolve({ id: 'wf_test' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })
})
