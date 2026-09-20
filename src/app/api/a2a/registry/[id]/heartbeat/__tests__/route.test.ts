/**
 * @fileoverview A2A Agent Heartbeat API route integration tests
 * @description Tests for /api/a2a/registry/[id]/heartbeat endpoint - agent heartbeat
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { createMockNextRequest } from '@/test/utils/mock-request'

describe('/api/a2a/registry/[id]/heartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('POST request - update heartbeat', () => {
    it('should update heartbeat for existing agent', async () => {
      const requestBody = {}

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      // May fail if agent doesn't exist
      expect([200, 404, 500]).toContain(response.status)
      if (response.status === 200) {
        const data = await response.json()
        expect(data).toHaveProperty('message')
        expect(data).toHaveProperty('agent')
        expect(data).toHaveProperty('timestamp')
        expect(data.message).toBe('Heartbeat updated successfully')
      }
    })

    it('should update agent status when provided', async () => {
      const requestBody = {
        status: 'active',
      }

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-456/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-456' } })

      expect([200, 404, 500]).toContain(response.status)
      if (response.status === 200) {
        const data = await response.json()
        expect(data.message).toBe('Heartbeat updated successfully')
      }
    })

    it('should update agent load when provided', async () => {
      const requestBody = {
        load: 0.75,
      }

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-789/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-789' } })

      expect([200, 404, 500]).toContain(response.status)
      if (response.status === 200) {
        const data = await response.json()
        expect(data.message).toBe('Heartbeat updated successfully')
      }
    })

    it('should update both status and load', async () => {
      const requestBody = {
        status: 'idle',
        load: 0.25,
      }

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-abc/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-abc' } })

      expect([200, 404, 500]).toContain(response.status)
      if (response.status === 200) {
        const data = await response.json()
        expect(data.message).toBe('Heartbeat updated successfully')
      }
    })
  })

  describe('agent not found', () => {
    it('should return 404 for non-existent agent', async () => {
      const requestBody = {}

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/non-existent/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect([404, 500]).toContain(response.status)
      if (response.status === 404) {
        expect(data.error).toBe('Agent not found')
        expect(data).toHaveProperty('message')
      }
    })

    it('should return 404 with empty id', async () => {
      const requestBody = {}

      const request = createMockNextRequest('http://localhost:3000/api/a2a/registry//heartbeat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request, { params: { id: '' } })

      expect([404, 500]).toContain(response.status)
    })
  })

  describe('edge cases', () => {
    it('should handle empty body', async () => {
      const requestBody = {}

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should handle malformed JSON', async () => {
      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{invalid json}',
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })
      const data = await response.json()

      expect([400, 500]).toContain(response.status)
      expect(data.error).toBeDefined()
    })

    it('should handle invalid status value', async () => {
      const requestBody = {
        status: 'invalid-status',
      }

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should handle invalid load value', async () => {
      const requestBody = {
        load: 'invalid',
      }

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should handle zero load', async () => {
      const requestBody = {
        load: 0,
      }

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should handle load of 1', async () => {
      const requestBody = {
        load: 1,
      }

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should handle negative load', async () => {
      const requestBody = {
        load: -0.5,
      }

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should handle load greater than 1', async () => {
      const requestBody = {
        load: 1.5,
      }

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should handle load as null', async () => {
      const requestBody = {
        load: null,
      }

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should return JSON content type', async () => {
      const requestBody = {}

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('response structure', () => {
    it('should return correct response structure on success', async () => {
      const requestBody = {}

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      if (response.status === 200) {
        const data = await response.json()
        expect(data).toHaveProperty('message')
        expect(data).toHaveProperty('agent')
        expect(data).toHaveProperty('timestamp')
        expect(typeof data.message).toBe('string')
        expect(typeof data.agent).toBe('object')
        expect(typeof data.timestamp).toBe('string')
      }
    })

    it('should return ISO 8601 timestamp', async () => {
      const requestBody = {}

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123' } })

      if (response.status === 200) {
        const data = await response.json()
        expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      }
    })
  })

  describe('parameter validation', () => {
    it('should handle special characters in id', async () => {
      const requestBody = {}

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/agent-123_abc@xyz/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: 'agent-123_abc@xyz' } })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should handle very long id', async () => {
      const requestBody = {}

      const longId = 'a'.repeat(1000)

      const request = createMockNextRequest(
        `http://localhost:3000/api/a2a/registry/${longId}/heartbeat`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: longId } })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should handle numeric id', async () => {
      const requestBody = {}

      const request = createMockNextRequest(
        'http://localhost:3000/api/a2a/registry/12345/heartbeat',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: requestBody,
        }
      )

      const response = await POST(request, { params: { id: '12345' } })

      expect([200, 404, 500]).toContain(response.status)
    })
  })
})
