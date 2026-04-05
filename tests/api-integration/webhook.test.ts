/**
 * @fileoverview Webhook System API integration tests
 * @description Tests for /api/webhooks endpoints
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { server, mockData } from './mocks/handlers'

function getAuthHeader(userId: string): HeadersInit {
  const token = mockData.generateToken(userId)
  return { Authorization: `Bearer ${token}` }
}

describe('/api/webhooks - Integration Tests', () => {
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

  describe('POST /api/webhooks - Create Webhook', () => {
    it('should create webhook successfully with valid data', async () => {
      const user = mockData.createUser({
        email: 'webhook@example.com',
        password: 'SecurePass123',
        name: 'Webhook User',
      })

      const webhookData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['workflow.started', 'workflow.completed', 'workflow.failed'],
        isActive: true,
        secret: 'webhook-secret-key',
      }

      const response = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(webhookData),
      })

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.id).toBeDefined()
      expect(data.data.name).toBe(webhookData.name)
      expect(data.data.url).toBe(webhookData.url)
      expect(data.data.events).toEqual(webhookData.events)
      expect(data.data.isActive).toBe(true)
    })

    it('should reject webhook creation without authentication', async () => {
      const webhookData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['workflow.started'],
      }

      const response = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should validate webhook URL format', async () => {
      const user = mockData.createUser({
        email: 'urlvalidator@example.com',
        password: 'SecurePass123',
        name: 'URL Validator User',
      })

      const invalidWebhookData = {
        name: 'Invalid URL Webhook',
        url: 'not-a-valid-url',
        events: ['workflow.started'],
      }

      const response = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(invalidWebhookData),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate required fields', async () => {
      const user = mockData.createUser({
        email: 'fieldvalidator@example.com',
        password: 'SecurePass123',
        name: 'Field Validator User',
      })

      const invalidWebhookData = {
        name: '', // Empty name
        url: '', // Empty URL
        events: [], // Empty events
      }

      const response = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(invalidWebhookData),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate event types', async () => {
      const user = mockData.createUser({
        email: 'eventvalidator@example.com',
        password: 'SecurePass123',
        name: 'Event Validator User',
      })

      const invalidWebhookData = {
        name: 'Invalid Events Webhook',
        url: 'https://example.com/webhook',
        events: ['invalid.event.type'],
      }

      const response = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(invalidWebhookData),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('GET /api/webhooks - List Webhooks', () => {
    it('should list all webhooks for authenticated user', async () => {
      const user = mockData.createUser({
        email: 'webhooklist@example.com',
        password: 'SecurePass123',
        name: 'Webhook List User',
      })

      const response = await fetch('http://localhost:3000/api/webhooks', {
        method: 'GET',
        headers: getAuthHeader(user.id),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data.webhooks)).toBe(true)
    })

    it('should support pagination', async () => {
      const user = mockData.createUser({
        email: 'webhookpagination@example.com',
        password: 'SecurePass123',
        name: 'Webhook Pagination User',
      })

      const response = await fetch(
        'http://localhost:3000/api/webhooks?page=1&pageSize=10',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('page')
      expect(data.data).toHaveProperty('pageSize')
      expect(data.data).toHaveProperty('total')
      expect(data.data).toHaveProperty('hasMore')
    })

    it('should filter webhooks by status', async () => {
      const user = mockData.createUser({
        email: 'webhookfilter@example.com',
        password: 'SecurePass123',
        name: 'Webhook Filter User',
      })

      const response = await fetch('http://localhost:3000/api/webhooks?isActive=true', {
        method: 'GET',
        headers: getAuthHeader(user.id),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should filter webhooks by event type', async () => {
      const user = mockData.createUser({
        email: 'eventfilter@example.com',
        password: 'SecurePass123',
        name: 'Event Filter User',
      })

      const response = await fetch(
        'http://localhost:3000/api/webhooks?event=workflow.completed',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/webhooks/:id - Get Single Webhook', () => {
    it('should retrieve specific webhook by ID', async () => {
      const user = mockData.createUser({
        email: 'getwebhook@example.com',
        password: 'SecurePass123',
        name: 'Get Webhook User',
      })

      // First create a webhook
      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Get Test Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      // Get the webhook
      const response = await fetch(`http://localhost:3000/api/webhooks/${webhookId}`, {
        method: 'GET',
        headers: getAuthHeader(user.id),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(webhookId)
      expect(data.data.name).toBe('Get Test Webhook')
    })

    it('should return 404 for non-existent webhook', async () => {
      const user = mockData.createUser({
        email: 'webhook404@example.com',
        password: 'SecurePass123',
        name: 'Webhook 404 User',
      })

      const response = await fetch(
        'http://localhost:3000/api/webhooks/non-existent-id',
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })
  })

  describe('PUT /api/webhooks/:id - Update Webhook', () => {
    it('should update webhook successfully', async () => {
      const user = mockData.createUser({
        email: 'updatewebhook@example.com',
        password: 'SecurePass123',
        name: 'Update Webhook User',
      })

      // Create a webhook first
      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Original Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
          isActive: true,
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      // Update the webhook
      const updateData = {
        name: 'Updated Webhook Name',
        url: 'https://example.com/updated-webhook',
        events: ['workflow.started', 'workflow.completed'],
        isActive: false,
      }

      const response = await fetch(`http://localhost:3000/api/webhooks/${webhookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe(updateData.name)
      expect(data.data.url).toBe(updateData.url)
      expect(data.data.isActive).toBe(updateData.isActive)
    })

    it('should reject update without authentication', async () => {
      const response = await fetch('http://localhost:3000/api/webhooks/some-webhook-id', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated' }),
      })

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/webhooks/:id - Delete Webhook', () => {
    it('should delete webhook successfully', async () => {
      const user = mockData.createUser({
        email: 'deletewebhook@example.com',
        password: 'SecurePass123',
        name: 'Delete Webhook User',
      })

      // Create a webhook first
      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Webhook to Delete',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      // Delete the webhook
      const response = await fetch(`http://localhost:3000/api/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: getAuthHeader(user.id),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 404 when deleting non-existent webhook', async () => {
      const user = mockData.createUser({
        email: 'deletewebhook404@example.com',
        password: 'SecurePass123',
        name: 'Delete Webhook 404 User',
      })

      const response = await fetch(
        'http://localhost:3000/api/webhooks/non-existent-id',
        {
          method: 'DELETE',
          headers: getAuthHeader(user.id),
        }
      )

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/webhooks/:id/test - Send Test Event', () => {
    it('should send test event to webhook successfully', async () => {
      const user = mockData.createUser({
        email: 'testwebhook@example.com',
        password: 'SecurePass123',
        name: 'Test Webhook User',
      })

      // Create a webhook first
      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Test Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      // Send test event
      const testEventData = {
        eventType: 'workflow.started',
        data: {
          workflowId: 'wf-test-123',
          status: 'started',
          timestamp: new Date().toISOString(),
        },
      }

      const response = await fetch(
        `http://localhost:3000/api/webhooks/${webhookId}/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(user.id),
          },
          body: JSON.stringify(testEventData),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('deliveryId')
      expect(data.data).toHaveProperty('status')
    })

    it('should handle test event with custom payload', async () => {
      const user = mockData.createUser({
        email: 'custompayload@example.com',
        password: 'SecurePass123',
        name: 'Custom Payload User',
      })

      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Custom Payload Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.completed'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      const customPayload = {
        eventType: 'workflow.completed',
        data: {
          workflowId: 'wf-custom-456',
          status: 'completed',
          result: { success: true, duration: 1234 },
        },
      }

      const response = await fetch(
        `http://localhost:3000/api/webhooks/${webhookId}/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(user.id),
          },
          body: JSON.stringify(customPayload),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/webhooks/:id/logs - Get Webhook Logs', () => {
    it('should retrieve webhook delivery logs', async () => {
      const user = mockData.createUser({
        email: 'webhooklogs@example.com',
        password: 'SecurePass123',
        name: 'Webhook Logs User',
      })

      // Create a webhook first
      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Logs Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      // Get logs
      const response = await fetch(
        `http://localhost:3000/api/webhooks/${webhookId}/logs`,
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('logs')
      expect(Array.isArray(data.data.logs)).toBe(true)
    })

    it('should support pagination for logs', async () => {
      const user = mockData.createUser({
        email: 'logpagination@example.com',
        password: 'SecurePass123',
        name: 'Log Pagination User',
      })

      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Pagination Logs Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      const response = await fetch(
        `http://localhost:3000/api/webhooks/${webhookId}/logs?page=1&pageSize=10`,
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('page')
      expect(data.data).toHaveProperty('pageSize')
      expect(data.data).toHaveProperty('total')
    })

    it('should filter logs by status', async () => {
      const user = mockData.createUser({
        email: 'logstatusfilter@example.com',
        password: 'SecurePass123',
        name: 'Log Status Filter User',
      })

      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Status Filter Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      const response = await fetch(
        `http://localhost:3000/api/webhooks/${webhookId}/logs?status=success`,
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should filter logs by date range', async () => {
      const user = mockData.createUser({
        email: 'logdatefilter@example.com',
        password: 'SecurePass123',
        name: 'Log Date Filter User',
      })

      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Date Filter Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const endDate = new Date().toISOString()

      const response = await fetch(
        `http://localhost:3000/api/webhooks/${webhookId}/logs?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/webhooks/:id/logs/:logId - Get Single Log Entry', () => {
    it('should retrieve specific log entry', async () => {
      const user = mockData.createUser({
        email: 'singlelog@example.com',
        password: 'SecurePass123',
        name: 'Single Log User',
      })

      // Create a webhook
      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Single Log Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      // Send a test event to create a log
      const testResponse = await fetch(
        `http://localhost:3000/api/webhooks/${webhookId}/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(user.id),
          },
          body: JSON.stringify({
            eventType: 'workflow.started',
            data: { workflowId: 'wf-123' },
          }),
        }
      )

      const testData = await testResponse.json()
      const deliveryId = testData.data.deliveryId

      // Get the specific log
      const response = await fetch(
        `http://localhost:3000/api/webhooks/${webhookId}/logs/${deliveryId}`,
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id')
      expect(data.data).toHaveProperty('status')
      expect(data.data).toHaveProperty('timestamp')
      expect(data.data).toHaveProperty('request')
      expect(data.data).toHaveProperty('response')
    })
  })

  describe('POST /api/webhooks/:id/retry - Retry Failed Delivery', () => {
    it('should retry failed webhook delivery', async () => {
      const user = mockData.createUser({
        email: 'retrywebhook@example.com',
        password: 'SecurePass123',
        name: 'Retry Webhook User',
      })

      // Create a webhook
      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Retry Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      // Assume we have a failed delivery with ID
      const failedDeliveryId = 'delivery-failed-123'

      const response = await fetch(
        `http://localhost:3000/api/webhooks/${webhookId}/retry/${failedDeliveryId}`,
        {
          method: 'POST',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('newDeliveryId')
    })
  })

  describe('Webhook Security', () => {
    it('should prevent users from accessing other users webhooks', async () => {
      const user1 = mockData.createUser({
        email: 'webhookuser1@example.com',
        password: 'SecurePass123',
        name: 'Webhook User 1',
      })

      const user2 = mockData.createUser({
        email: 'webhookuser2@example.com',
        password: 'SecurePass123',
        name: 'Webhook User 2',
      })

      // Create webhook as user1
      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user1.id),
        },
        body: JSON.stringify({
          name: 'User 1 Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      // Try to access as user2
      const response = await fetch(`http://localhost:3000/api/webhooks/${webhookId}`, {
        method: 'GET',
        headers: getAuthHeader(user2.id),
      })

      // Should be forbidden or not found
      expect([403, 404]).toContain(response.status)
    })

    it('should validate webhook secret format', async () => {
      const user = mockData.createUser({
        email: 'secretvalidator@example.com',
        password: 'SecurePass123',
        name: 'Secret Validator User',
      })

      const webhookWithWeakSecret = {
        name: 'Weak Secret Webhook',
        url: 'https://example.com/webhook',
        events: ['workflow.started'],
        secret: '123', // Too short
      }

      const response = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(webhookWithWeakSecret),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should rate limit webhook test requests', async () => {
      const user = mockData.createUser({
        email: 'ratelimit@example.com',
        password: 'SecurePass123',
        name: 'Rate Limit User',
      })

      const createResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Rate Limit Webhook',
          url: 'https://example.com/webhook',
          events: ['workflow.started'],
        }),
      })

      const createData = await createResponse.json()
      const webhookId = createData.data.id

      // Send multiple test requests rapidly
      const requests = Array(10)
        .fill(null)
        .map(() =>
          fetch(`http://localhost:3000/api/webhooks/${webhookId}/test`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeader(user.id),
            },
            body: JSON.stringify({
              eventType: 'workflow.started',
              data: { workflowId: 'wf-test' },
            }),
          })
        )

      const responses = await Promise.all(requests)

      // At least some should be rate limited
      const rateLimited = responses.filter((r) => r.status === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
    })
  })
})