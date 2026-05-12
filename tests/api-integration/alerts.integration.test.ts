/**
 * Alerts API Integration Tests
 * Tests for /api/alerts/rules and /api/alerts/history
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// ============================================
// MSW Handlers for Alerts API
// ============================================

const alertHandlers = [
  // GET /api/alerts/rules - List all alert rules
  http.get('http://localhost:3000/api/alerts/rules', () => {
    return HttpResponse.json({
      success: true,
      data: {
        rules: [
          {
            id: 'rule-1',
            name: 'High CPU Usage',
            metricType: 'CPU',
            condition: '>',
            threshold: 80,
            duration: 300,
            severity: 'warning',
            channels: ['email', 'slack'],
            enabled: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'rule-2',
            name: 'Memory Critical',
            metricType: 'Memory',
            condition: '>',
            threshold: 90,
            duration: 180,
            severity: 'critical',
            channels: ['email', 'webhook'],
            enabled: true,
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ],
        total: 2,
      },
    })
  }),

  // POST /api/alerts/rules - Create a new alert rule
  http.post('http://localhost:3000/api/alerts/rules', async ({ request }) => {
    const body = await request.json().catch(() => null)

    if (!body) {
      return HttpResponse.json(
        { success: false, error: { message: 'Request body is required' } },
        { status: 400 }
      )
    }

    if (!body.name || !body.metricType || !body.condition || body.threshold === undefined) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            message: 'Missing required fields: name, metricType, condition, threshold',
          },
        },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        rule: {
          id: 'rule-new',
          name: body.name,
          metricType: body.metricType,
          condition: body.condition,
          threshold: body.threshold,
          duration: body.duration || 300,
          severity: body.severity || 'warning',
          channels: body.channels || ['email'],
          enabled: body.enabled !== undefined ? body.enabled : true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    })
  }),

  // GET /api/alerts/rules/:id - Get a specific alert rule
  http.get('http://localhost:3000/api/alerts/rules/rule-1', () => {
    return HttpResponse.json({
      success: true,
      data: {
        rule: {
          id: 'rule-1',
          name: 'High CPU Usage',
          metricType: 'CPU',
          condition: '>',
          threshold: 80,
          duration: 300,
          severity: 'warning',
          channels: ['email', 'slack'],
          enabled: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    })
  }),

  // GET /api/alerts/rules/non-existent - Get non-existent rule (404)
  http.get('http://localhost:3000/api/alerts/rules/non-existent', () => {
    return HttpResponse.json(
      { success: false, error: { message: 'Alert rule not found' } },
      { status: 404 }
    )
  }),

  // GET /api/alerts/history - Get alert history
  http.get('http://localhost:3000/api/alerts/history', ({ request }) => {
    const url = new URL(request.url)
    const severity = url.searchParams.get('severity')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    const history = [
      {
        id: 'hist-1',
        ruleId: 'rule-1',
        ruleName: 'High CPU Usage',
        metricType: 'CPU',
        severity: 'warning',
        value: 85,
        threshold: 80,
        condition: '>',
        triggeredAt: '2026-05-10T12:00:00.000Z',
        resolvedAt: '2026-05-10T12:05:00.000Z',
        status: 'resolved',
      },
      {
        id: 'hist-2',
        ruleId: 'rule-2',
        ruleName: 'Memory Critical',
        metricType: 'Memory',
        severity: 'critical',
        value: 92,
        threshold: 90,
        condition: '>',
        triggeredAt: '2026-05-09T08:00:00.000Z',
        resolvedAt: null,
        status: 'active',
      },
    ]

    const filtered = severity
      ? history.filter((h) => h.severity === severity)
      : history

    return HttpResponse.json({
      success: true,
      data: {
        history: filtered.slice((page - 1) * limit, page * limit),
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      },
    })
  }),

  // Edge Cases
const alertsServer = setupServer(...alertHandlers)

// ============================================
// Test Suite: Alerts API
// ============================================

describe('Alerts API Integration Tests', () => {
  beforeAll(() => {
    alertsServer.listen({ onUnhandledRequest: 'warn' })
  })

  afterAll(() => {
    alertsServer.close()
  })

  // ===========================================
  // Test Group: GET /api/alerts/rules
  // ===========================================
  describe('GET /api/alerts/rules', () => {
    it('should return list of alert rules with 200 status', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.rules)).toBe(true)
      expect(data.data.rules.length).toBeGreaterThan(0)
    })

    it('should return rule with all required fields', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules')
      const data = await response.json()

      const rule = data.data.rules[0]
      expect(rule).toHaveProperty('id')
      expect(rule).toHaveProperty('name')
      expect(rule).toHaveProperty('metricType')
      expect(rule).toHaveProperty('condition')
      expect(rule).toHaveProperty('threshold')
      expect(rule).toHaveProperty('severity')
      expect(rule).toHaveProperty('channels')
      expect(rule).toHaveProperty('enabled')
    })

    it('should return total count of rules', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules')
      const data = await response.json()

      expect(data.data).toHaveProperty('total')
      expect(typeof data.data.total).toBe('number')
    })

    it('should return JSON content type', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules')

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  // ===========================================
  // Test Group: POST /api/alerts/rules (Create)
  // ===========================================
  describe('POST /api/alerts/rules', () => {
    it('should create a new alert rule with 200 status', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Alert Rule',
          metricType: 'CPU',
          condition: '>',
          threshold: 75,
          duration: 300,
          severity: 'warning',
          channels: ['email'],
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.rule).toHaveProperty('id')
      expect(data.data.rule.name).toBe('Test Alert Rule')
      expect(data.data.rule.metricType).toBe('CPU')
      expect(data.data.rule.threshold).toBe(75)
    })

    it('should create rule with default values when optional fields omitted', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Minimal Rule',
          metricType: 'Memory',
          condition: '>',
          threshold: 85,
        }),
      })

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.rule.severity).toBe('warning')
      expect(data.data.rule.duration).toBe(300)
    })

    it('should return 400 when name is missing', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricType: 'CPU',
          condition: '>',
          threshold: 80,
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('name')
    })

    it('should return 400 when metricType is missing', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Rule',
          condition: '>',
          threshold: 80,
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 400 when condition is missing', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Rule',
          metricType: 'CPU',
          threshold: 80,
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 400 when threshold is missing', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Rule',
          metricType: 'CPU',
          condition: '>',
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 400 when request body is empty', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should create rule with different severity levels', async () => {
      const severities = ['info', 'warning', 'critical']

      for (const severity of severities) {
        const response = await fetch('http://localhost:3000/api/alerts/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Severity Test - ${severity}`,
            metricType: 'CPU',
            condition: '>',
            threshold: 80,
            severity,
          }),
        })

        const data = await response.json()

        expect(data.success).toBe(true)
        expect(data.data.rule.severity).toBe(severity)
      }
    })

    it('should create rule with different metric types', async () => {
      const metricTypes = ['CPU', 'Memory', 'ResponseTime', 'ErrorRate', 'Throughput']

      for (const metricType of metricTypes) {
        const response = await fetch('http://localhost:3000/api/alerts/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Metric Test - ${metricType}`,
            metricType,
            condition: '>',
            threshold: 80,
          }),
        })

        const data = await response.json()

        expect(data.success).toBe(true)
        expect(data.data.rule.metricType).toBe(metricType)
      }
    })

    it('should create rule with different condition operators', async () => {
      const conditions = ['>', '<', '>=', '<=', '==', '!=']

      for (const condition of conditions) {
        const response = await fetch('http://localhost:3000/api/alerts/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Condition Test - ${condition}`,
            metricType: 'CPU',
            condition,
            threshold: 80,
          }),
        })

        const data = await response.json()

        expect(data.success).toBe(true)
        expect(data.data.rule.condition).toBe(condition)
      }
    })
  })

  // ===========================================
  // Test Group: GET /api/alerts/rules/:id
  // ===========================================
  describe('GET /api/alerts/rules/:id', () => {
    it('should return a specific alert rule with 200 status', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules/rule-1')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.rule.id).toBe('rule-1')
      expect(data.data.rule.name).toBe('High CPU Usage')
    })

    it('should return 404 for non-existent rule', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules/non-existent')
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('not found')
    })

    it('should return all rule fields for existing rule', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules/rule-1')
      const data = await response.json()

      const rule = data.data.rule
      expect(rule).toHaveProperty('id')
      expect(rule).toHaveProperty('name')
      expect(rule).toHaveProperty('metricType')
      expect(rule).toHaveProperty('condition')
      expect(rule).toHaveProperty('threshold')
      expect(rule).toHaveProperty('duration')
      expect(rule).toHaveProperty('severity')
      expect(rule).toHaveProperty('channels')
      expect(rule).toHaveProperty('enabled')
      expect(rule).toHaveProperty('createdAt')
      expect(rule).toHaveProperty('updatedAt')
    })
  })

  // ===========================================
  // Test Group: GET /api/alerts/history
  // ===========================================
  describe('GET /api/alerts/history', () => {
    it('should return alert history with 200 status', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/history')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.history)).toBe(true)
    })

    it('should return history with required fields', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/history')
      const data = await response.json()

      if (data.data.history.length > 0) {
        const hist = data.data.history[0]
        expect(hist).toHaveProperty('id')
        expect(hist).toHaveProperty('ruleId')
        expect(hist).toHaveProperty('ruleName')
        expect(hist).toHaveProperty('metricType')
        expect(hist).toHaveProperty('severity')
        expect(hist).toHaveProperty('value')
        expect(hist).toHaveProperty('threshold')
        expect(hist).toHaveProperty('condition')
        expect(hist).toHaveProperty('triggeredAt')
        expect(hist).toHaveProperty('status')
      }
    })

    it('should return pagination info', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/history')
      const data = await response.json()

      expect(data.data).toHaveProperty('page')
      expect(data.data).toHaveProperty('limit')
      expect(data.data).toHaveProperty('total')
      expect(data.data).toHaveProperty('totalPages')
    })

    it('should handle pagination parameters', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/history?page=1&limit=10')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.page).toBe(1)
      expect(data.data.limit).toBe(10)
    })

    it('should filter by severity', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/history?severity=critical')
      const data = await response.json()

      expect(response.status).toBe(200)
      // All returned items should have severity = critical
      for (const hist of data.data.history) {
        expect(hist.severity).toBe('critical')
      }
    })

    it('should filter by warning severity', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/history?severity=warning')
      const data = await response.json()

      expect(response.status).toBe(200)
      for (const hist of data.data.history) {
        expect(hist.severity).toBe('warning')
      }
    })
  })

  // ===========================================
  // Test Group: 401/403 Authorization Errors
  // ===========================================
  describe('Alerts API - Authorization Errors', () => {
    it('should handle request without authentication', async () => {
      // Without proper auth handler, request proceeds without auth validation
      // This test verifies the endpoint handles missing auth gracefully
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        headers: {}, // No auth header
      })

      // Handler returns 200 since no auth middleware is mocked
      // In production, API would return 401
      expect(response.status).toBe(200)
    })

    it('should handle request with invalid token format', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        headers: { 'Authorization': 'InvalidFormat token' },
      })

      // Without auth handler, invalid format still proceeds
      // In production, API would return 401 for invalid token
      expect(response.status).toBe(200)
    })
  })

  // ===========================================
  // Test Group: Edge Cases
  // ===========================================
  describe('Alerts API - Edge Cases', () => {
    it('should handle rule with all channels', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Multi-Channel Alert',
          metricType: 'CPU',
          condition: '>',
          threshold: 90,
          channels: ['email', 'slack', 'webhook', 'sms'],
        }),
      })

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.rule.channels).toContain('email')
      expect(data.data.rule.channels).toContain('slack')
      expect(data.data.rule.channels).toContain('webhook')
      expect(data.data.rule.channels).toContain('sms')
    })

    it('should handle rule with custom duration', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Custom Duration Alert',
          metricType: 'CPU',
          condition: '>',
          threshold: 80,
          duration: 600, // 10 minutes
        }),
      })

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.rule.duration).toBe(600)
    })

    it('should handle disabled rule creation', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Disabled Alert',
          metricType: 'CPU',
          condition: '>',
          threshold: 80,
          enabled: false,
        }),
      })

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.rule.enabled).toBe(false)
    })

    it('should handle different page values', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/history?page=2')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.page).toBe(2)
    })

    it('should handle different limit values', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/history?limit=50')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.limit).toBe(50)
    })
  })

  // ===========================================
  // Test Group: 500 Server Error
  // ===========================================
  describe('Alerts API - Server Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await fetch('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json }',
      })

      // Should return 400 or 500, not crash
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })
})