/**
 * @fileoverview Automation Engine API integration tests
 * @description Tests for /api/automation endpoints
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { server, mockData } from './mocks/handlers'

function getAuthHeader(userId: string): HeadersInit {
  const token = mockData.generateToken(userId)
  return { Authorization: `Bearer ${token}` }
}

describe('/api/automation - Integration Tests', () => {
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

  describe('POST /api/automation/rules - Create Automation Rule', () => {
    it('should create automation rule successfully with valid data', async () => {
      const user = mockData.createUser({
        email: 'automation@example.com',
        password: 'SecurePass123',
        name: 'Automation User',
      })

      const ruleData = {
        name: 'Test Automation Rule',
        description: 'A test automation rule',
        triggers: [
          {
            type: 'event',
            config: {
              eventType: 'workflow.completed',
              filters: { status: 'success' },
            },
          },
        ],
        actions: [
          {
            type: 'send_notification',
            config: {
              channels: ['email'],
              message: 'Workflow completed successfully',
            },
          },
        ],
        isActive: true,
      }

      const response = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(ruleData),
      })

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.id).toBeDefined()
      expect(data.data.name).toBe(ruleData.name)
      expect(data.data.isActive).toBe(true)
    })

    it('should reject rule creation without authentication', async () => {
      const ruleData = {
        name: 'Test Rule',
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'send_notification' }],
      }

      const response = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should validate required fields', async () => {
      const user = mockData.createUser({
        email: 'validator@example.com',
        password: 'SecurePass123',
        name: 'Validator User',
      })

      const invalidRuleData = {
        name: '', // Empty name
        triggers: [],
        actions: [],
      }

      const response = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(invalidRuleData),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('GET /api/automation/rules - List Automation Rules', () => {
    it('should list all automation rules for authenticated user', async () => {
      const user = mockData.createUser({
        email: 'rulelist@example.com',
        password: 'SecurePass123',
        name: 'Rule List User',
      })

      const response = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'GET',
        headers: getAuthHeader(user.id),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data.rules)).toBe(true)
    })

    it('should support pagination', async () => {
      const user = mockData.createUser({
        email: 'pagination@example.com',
        password: 'SecurePass123',
        name: 'Pagination User',
      })

      const response = await fetch(
        'http://localhost:3000/api/automation/rules?page=1&pageSize=10',
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

    it('should filter rules by status', async () => {
      const user = mockData.createUser({
        email: 'filter@example.com',
        password: 'SecurePass123',
        name: 'Filter User',
      })

      const response = await fetch(
        'http://localhost:3000/api/automation/rules?status=active',
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

  describe('GET /api/automation/rules/:id - Get Single Rule', () => {
    it('should retrieve specific automation rule by ID', async () => {
      const user = mockData.createUser({
        email: 'getrule@example.com',
        password: 'SecurePass123',
        name: 'Get Rule User',
      })

      // First create a rule
      const createResponse = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Get Test Rule',
          triggers: [{ type: 'manual' }],
          actions: [{ type: 'send_notification' }],
        }),
      })

      const createData = await createResponse.json()
      const ruleId = createData.data.id

      // Get the rule
      const response = await fetch(
        `http://localhost:3000/api/automation/rules/${ruleId}`,
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(ruleId)
    })

    it('should return 404 for non-existent rule', async () => {
      const user = mockData.createUser({
        email: 'notfound@example.com',
        password: 'SecurePass123',
        name: 'Not Found User',
      })

      const response = await fetch(
        'http://localhost:3000/api/automation/rules/non-existent-id',
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

  describe('PUT /api/automation/rules/:id - Update Automation Rule', () => {
    it('should update automation rule successfully', async () => {
      const user = mockData.createUser({
        email: 'updater@example.com',
        password: 'SecurePass123',
        name: 'Updater User',
      })

      // Create a rule first
      const createResponse = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Original Rule',
          triggers: [{ type: 'manual' }],
          actions: [{ type: 'send_notification' }],
          isActive: true,
        }),
      })

      const createData = await createResponse.json()
      const ruleId = createData.data.id

      // Update the rule
      const updateData = {
        name: 'Updated Rule Name',
        description: 'Updated description',
        isActive: false,
      }

      const response = await fetch(
        `http://localhost:3000/api/automation/rules/${ruleId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(user.id),
          },
          body: JSON.stringify(updateData),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe(updateData.name)
      expect(data.data.isActive).toBe(updateData.isActive)
    })

    it('should reject update without authentication', async () => {
      const response = await fetch(
        'http://localhost:3000/api/automation/rules/some-rule-id',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Updated' }),
        }
      )

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/automation/rules/:id - Delete Automation Rule', () => {
    it('should delete automation rule successfully', async () => {
      const user = mockData.createUser({
        email: 'deleter@example.com',
        password: 'SecurePass123',
        name: 'Deleter User',
      })

      // Create a rule first
      const createResponse = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Rule to Delete',
          triggers: [{ type: 'manual' }],
          actions: [{ type: 'send_notification' }],
        }),
      })

      const createData = await createResponse.json()
      const ruleId = createData.data.id

      // Delete the rule
      const response = await fetch(
        `http://localhost:3000/api/automation/rules/${ruleId}`,
        {
          method: 'DELETE',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 404 when deleting non-existent rule', async () => {
      const user = mockData.createUser({
        email: 'delete404@example.com',
        password: 'SecurePass123',
        name: 'Delete 404 User',
      })

      const response = await fetch(
        'http://localhost:3000/api/automation/rules/non-existent-id',
        {
          method: 'DELETE',
          headers: getAuthHeader(user.id),
        }
      )

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/automation/rules/:id/trigger - Trigger Automation Rule', () => {
    it('should trigger automation rule manually', async () => {
      const user = mockData.createUser({
        email: 'trigger@example.com',
        password: 'SecurePass123',
        name: 'Trigger User',
      })

      // Create a rule with manual trigger
      const createResponse = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Manual Trigger Rule',
          triggers: [{ type: 'manual' }],
          actions: [{ type: 'send_notification' }],
        }),
      })

      const createData = await createResponse.json()
      const ruleId = createData.data.id

      // Trigger the rule
      const response = await fetch(
        `http://localhost:3000/api/automation/rules/${ruleId}/trigger`,
        {
          method: 'POST',
          headers: getAuthHeader(user.id),
          body: JSON.stringify({
            context: { test: 'data' },
          }),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.executionId).toBeDefined()
    })

    it('should handle trigger with event data', async () => {
      const user = mockData.createUser({
        email: 'eventtrigger@example.com',
        password: 'SecurePass123',
        name: 'Event Trigger User',
      })

      const createResponse = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Event Trigger Rule',
          triggers: [
            {
              type: 'event',
              config: { eventType: 'workflow.completed' },
            },
          ],
          actions: [{ type: 'send_notification' }],
        }),
      })

      const createData = await createResponse.json()
      const ruleId = createData.data.id

      const eventData = {
        eventType: 'workflow.completed',
        data: {
          workflowId: 'wf-123',
          status: 'success',
        },
      }

      const response = await fetch(
        `http://localhost:3000/api/automation/rules/${ruleId}/trigger`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(user.id),
          },
          body: JSON.stringify(eventData),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('POST /api/automation/rules/:id/evaluate - Evaluate Rule Conditions', () => {
    it('should evaluate rule conditions against provided data', async () => {
      const user = mockData.createUser({
        email: 'evaluator@example.com',
        password: 'SecurePass123',
        name: 'Evaluator User',
      })

      const createResponse = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Conditional Rule',
          triggers: [
            {
              type: 'event',
              config: {
                eventType: 'task.created',
                conditions: {
                  priority: 'high',
                  assignee: 'john',
                },
              },
            },
          ],
          actions: [{ type: 'send_notification' }],
        }),
      })

      const createData = await createResponse.json()
      const ruleId = createData.data.id

      const testData = {
        priority: 'high',
        assignee: 'john',
        status: 'pending',
      }

      const response = await fetch(
        `http://localhost:3000/api/automation/rules/${ruleId}/evaluate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(user.id),
          },
          body: JSON.stringify(testData),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('matches')
      expect(data.data).toHaveProperty('matchedConditions')
    })

    it('should return false when conditions do not match', async () => {
      const user = mockData.createUser({
        email: 'nomatch@example.com',
        password: 'SecurePass123',
        name: 'No Match User',
      })

      const createResponse = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'High Priority Rule',
          triggers: [
            {
              type: 'event',
              config: {
                eventType: 'task.created',
                conditions: {
                  priority: 'high',
                },
              },
            },
          ],
          actions: [{ type: 'send_notification' }],
        }),
      })

      const createData = await createResponse.json()
      const ruleId = createData.data.id

      const testData = {
        priority: 'low',
        assignee: 'john',
      }

      const response = await fetch(
        `http://localhost:3000/api/automation/rules/${ruleId}/evaluate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(user.id),
          },
          body: JSON.stringify(testData),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.matches).toBe(false)
    })
  })

  describe('GET /api/automation/rules/:id/executions - List Rule Executions', () => {
    it('should list execution history for a rule', async () => {
      const user = mockData.createUser({
        email: 'history@example.com',
        password: 'SecurePass123',
        name: 'History User',
      })

      const createResponse = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'History Rule',
          triggers: [{ type: 'manual' }],
          actions: [{ type: 'send_notification' }],
        }),
      })

      const createData = await createResponse.json()
      const ruleId = createData.data.id

      const response = await fetch(
        `http://localhost:3000/api/automation/rules/${ruleId}/executions`,
        {
          method: 'GET',
          headers: getAuthHeader(user.id),
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('executions')
      expect(Array.isArray(data.data.executions)).toBe(true)
    })

    it('should support pagination for executions', async () => {
      const user = mockData.createUser({
        email: 'execpagination@example.com',
        password: 'SecurePass123',
        name: 'Exec Pagination User',
      })

      const createResponse = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          name: 'Pagination Rule',
          triggers: [{ type: 'manual' }],
          actions: [{ type: 'send_notification' }],
        }),
      })

      const createData = await createResponse.json()
      const ruleId = createData.data.id

      const response = await fetch(
        `http://localhost:3000/api/automation/rules/${ruleId}/executions?page=1&pageSize=10`,
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
  })

  describe('Automation Rule Security', () => {
    it('should prevent users from accessing other users rules', async () => {
      const user1 = mockData.createUser({
        email: 'user1@example.com',
        password: 'SecurePass123',
        name: 'User 1',
      })

      const user2 = mockData.createUser({
        email: 'user2@example.com',
        password: 'SecurePass123',
        name: 'User 2',
      })

      // Create rule as user1
      const createResponse = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user1.id),
        },
        body: JSON.stringify({
          name: 'User 1 Rule',
          triggers: [{ type: 'manual' }],
          actions: [{ type: 'send_notification' }],
        }),
      })

      const createData = await createResponse.json()
      const ruleId = createData.data.id

      // Try to access as user2
      const response = await fetch(
        `http://localhost:3000/api/automation/rules/${ruleId}`,
        {
          method: 'GET',
          headers: getAuthHeader(user2.id),
        }
      )

      // Should be forbidden or not found
      expect([403, 404]).toContain(response.status)
    })

    it('should validate trigger configuration', async () => {
      const user = mockData.createUser({
        email: 'triggerconfig@example.com',
        password: 'SecurePass123',
        name: 'Trigger Config User',
      })

      const invalidRule = {
        name: 'Invalid Trigger Rule',
        triggers: [
          {
            type: 'invalid_type',
            config: {},
          },
        ],
        actions: [{ type: 'send_notification' }],
      }

      const response = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(invalidRule),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate action configuration', async () => {
      const user = mockData.createUser({
        email: 'actionconfig@example.com',
        password: 'SecurePass123',
        name: 'Action Config User',
      })

      const invalidRule = {
        name: 'Invalid Action Rule',
        triggers: [{ type: 'manual' }],
        actions: [
          {
            type: 'invalid_action',
            config: {},
          },
        ],
      }

      const response = await fetch('http://localhost:3000/api/automation/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify(invalidRule),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })
})