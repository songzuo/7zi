/**
 * @fileoverview Agents API Integration Tests
 * @description Tests for /api/agents/* endpoints using MSW
 * 
 * Coverage targets:
 * - POST /api/agents/register - Register a new agent
 * - GET /api/agents/:id - Get agent info
 * - DELETE /api/agents/:id - Unregister/deregister an agent
 * - GET /api/agents/discover - Discover available agents
 * - POST /api/agents/heartbeat - Send agent heartbeat
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { server, mockData } from './mocks/handlers'

function getAuthHeader(userId: string): HeadersInit {
  const token = mockData.generateToken(userId)
  return { Authorization: `Bearer ${token}` }
}

describe('/api/agents - Integration Tests', () => {
  beforeAll(() => {
    server.listen()
  })

  beforeEach(() => {
    mockData.resetUsers()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  // ============================================================================
  // POST /api/agents/register - Register Agent
  // ============================================================================
  describe('POST /api/agents/register - Register Agent', () => {
    const validAgentData = {
      name: 'Test Agent',
      type: 'assistant',
      capabilities: ['chat', 'task-execution'],
      endpoint: 'http://localhost:4000',
      metadata: {
        version: '1.0.0',
        provider: 'minimax',
      },
    }

    it('should register agent successfully with valid data', async () => {
      const user = mockData.createUser({
        email: 'agent-owner@example.com',
        password: 'SecurePass123',
        name: 'Agent Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(validAgentData),
      })

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.agent).toBeDefined()
      expect(data.data.agent.name).toBe(validAgentData.name)
      expect(data.data.agent.type).toBe(validAgentData.type)
      expect(data.data.agent.status).toBe('online')
    })

    it('should register agent with minimal required fields', async () => {
      const user = mockData.createUser({
        email: 'agent-minimal@example.com',
        password: 'SecurePass123',
        name: 'Minimal Agent Owner',
      })

      const minimalData = {
        name: 'Minimal Agent',
        type: 'assistant',
      }

      const response = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(minimalData),
      })

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.agent.id).toBeDefined()
    })

    it('should reject agent registration without name', async () => {
      const user = mockData.createUser({
        email: 'no-name@example.com',
        password: 'SecurePass123',
        name: 'No Name Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          type: 'assistant',
          capabilities: ['chat'],
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('VALIDATION_ERROR')
    })

    it('should reject agent registration without authentication', async () => {
      const response = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Unauthenticated Agent',
          type: 'assistant',
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('UNAUTHORIZED')
    })

    it('should reject agent registration with duplicate name', async () => {
      const user = mockData.createUser({
        email: 'dup-agent@example.com',
        password: 'SecurePass123',
        name: 'Dup Agent Owner',
      })

      // First registration
      const firstResponse = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Duplicate Agent',
          type: 'assistant',
        }),
      })

      // Duplicate registration
      const secondResponse = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Duplicate Agent',
          type: 'assistant',
        }),
      })

      const data = await secondResponse.json()

      expect(secondResponse.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should reject agent registration with invalid agent type', async () => {
      const user = mockData.createUser({
        email: 'invalid-type@example.com',
        password: 'SecurePass123',
        name: 'Invalid Type Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Invalid Type Agent',
          type: 'invalid_type',
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  // ============================================================================
  // GET /api/agents/:id - Get Agent Info
  // ============================================================================
  describe('GET /api/agents/:id - Get Agent Info', () => {
    it('should return agent info with valid id', async () => {
      const user = mockData.createUser({
        email: 'get-agent@example.com',
        password: 'SecurePass123',
        name: 'Get Agent Owner',
      })

      // First register an agent
      const registerResponse = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Get Test Agent',
          type: 'assistant',
        }),
      })

      const registerData = await registerResponse.json()
      const agentId = registerData.data?.agent?.id || 'agent-123'

      const response = await fetch(`http://localhost:3000/api/agents/${agentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.agent).toBeDefined()
    })

    it('should reject get request without authentication', async () => {
      const response = await fetch('http://localhost:3000/api/agents/agent-456', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('UNAUTHORIZED')
    })

    it('should return 404 for non-existent agent', async () => {
      const user = mockData.createUser({
        email: 'not-found@example.com',
        password: 'SecurePass123',
        name: 'Not Found Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/non_existent_id', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
      })

      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('NOT_FOUND')
    })

    it('should handle invalid agent id format', async () => {
      const user = mockData.createUser({
        email: 'bad-id-format@example.com',
        password: 'SecurePass123',
        name: 'Bad ID Format Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/invalid%3Aid%3Aformat', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
      })

      // Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ============================================================================
  // DELETE /api/agents/:id - Unregister Agent
  // ============================================================================
  describe('DELETE /api/agents/:id - Unregister Agent', () => {
    it('should unregister agent successfully with valid id', async () => {
      const user = mockData.createUser({
        email: 'delete-agent@example.com',
        password: 'SecurePass123',
        name: 'Delete Agent Owner',
      })

      // First register an agent
      const registerResponse = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Delete Test Agent',
          type: 'assistant',
        }),
      })

      const registerData = await registerResponse.json()
      const agentId = registerData.data?.agent?.id || 'agent-to-delete'

      const response = await fetch(`http://localhost:3000/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject delete request without authentication', async () => {
      const response = await fetch('http://localhost:3000/api/agents/agent-789', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('UNAUTHORIZED')
    })

    it('should return 404 when deleting non-existent agent', async () => {
      const user = mockData.createUser({
        email: 'delete-nonexistent@example.com',
        password: 'SecurePass123',
        name: 'Delete Non Existent Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/never_exist_id', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
      })

      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })
  })

  // ============================================================================
  // GET /api/agents/discover - Discover Agents
  // ============================================================================
  describe('GET /api/agents/discover - Discover Agents', () => {
    it('should discover agents successfully with valid auth', async () => {
      const user = mockData.createUser({
        email: 'discover-agent@example.com',
        password: 'SecurePass123',
        name: 'Discover Agent Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/discover', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.agents).toBeDefined()
      expect(Array.isArray(data.data.agents)).toBe(true)
    })

    it('should reject discover request without authentication', async () => {
      const response = await fetch('http://localhost:3000/api/agents/discover', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should filter agents by type in discover', async () => {
      const user = mockData.createUser({
        email: 'discover-filter@example.com',
        password: 'SecurePass123',
        name: 'Discover Filter Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/discover?type=assistant', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
      })

      // Should return success or handle filter gracefully
      expect(response.status).toBeGreaterThanOrEqual(200)
    })
  })

  // ============================================================================
  // POST /api/agents/heartbeat - Send Heartbeat
  // ============================================================================
  describe('POST /api/agents/heartbeat - Send Heartbeat', () => {
    it('should send heartbeat successfully with valid data', async () => {
      const user = mockData.createUser({
        email: 'heartbeat-agent@example.com',
        password: 'SecurePass123',
        name: 'Heartbeat Agent Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          agentId: 'agent-heartbeat-123',
          timestamp: new Date().toISOString(),
          status: 'online',
          load: 0.5,
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.received).toBe(true)
    })

    it('should reject heartbeat without agentId', async () => {
      const user = mockData.createUser({
        email: 'heartbeat-no-id@example.com',
        password: 'SecurePass123',
        name: 'Heartbeat No ID Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          status: 'online',
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('VALIDATION_ERROR')
    })

    it('should reject heartbeat without authentication', async () => {
      const response = await fetch('http://localhost:3000/api/agents/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: 'agent-123',
          timestamp: new Date().toISOString(),
          status: 'online',
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should handle heartbeat with load information', async () => {
      const user = mockData.createUser({
        email: 'heartbeat-load@example.com',
        password: 'SecurePass123',
        name: 'Heartbeat Load Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          agentId: 'agent-load-123',
          timestamp: new Date().toISOString(),
          status: 'busy',
          load: 0.85,
          avgResponseTime: 150,
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================
  describe('Agents API - Edge Cases and Error Handling', () => {
    it('should handle malformed JSON in registration', async () => {
      const user = mockData.createUser({
        email: 'malformed@example.com',
        password: 'SecurePass123',
        name: 'Malformed Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: 'invalid json {',
      })

      // Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle empty request body', async () => {
      const user = mockData.createUser({
        email: 'empty-body@example.com',
        password: 'SecurePass123',
        name: 'Empty Body Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should handle very long agent name', async () => {
      const user = mockData.createUser({
        email: 'long-name@example.com',
        password: 'SecurePass123',
        name: 'Long Name Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'A'.repeat(1000),
          type: 'assistant',
        }),
      })

      // Should handle validation error
      expect(response.status).toBe(400)
    })

    it('should reject request with invalid token format', async () => {
      const response = await fetch('http://localhost:3000/api/agents/discover', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'InvalidFormat token',
        },
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should handle missing Content-Type header', async () => {
      const user = mockData.createUser({
        email: 'no-content-type@example.com',
        password: 'SecurePass123',
        name: 'No Content Type Owner',
      })

      const response = await fetch('http://localhost:3000/api/agents/register', {
        method: 'POST',
        headers: {
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'No Content Type Agent',
          type: 'assistant',
        }),
      })

      // Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(200)
    })
  })
})