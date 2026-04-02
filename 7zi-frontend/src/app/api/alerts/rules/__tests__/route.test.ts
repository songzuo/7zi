/**
 * Alert Rules API Tests
 * @version 1.0.0
 * @date 2026-04-03
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}))

describe('Alert Rules API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/alerts/rules', () => {
    it('should return alert rules list', async () => {
      // Import the route handler
      const { GET } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/rules')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('rules')
      expect(data).toHaveProperty('total')
      expect(Array.isArray(data.rules)).toBe(true)
    })

    it('should support pagination', async () => {
      const { GET } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/rules?page=1&pageSize=5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.page).toBe(1)
      expect(data.pageSize).toBe(5)
    })

    it('should filter by enabled status', async () => {
      const { GET } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/rules?enabled=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.rules.forEach((rule: any) => {
        expect(rule.enabled).toBe(true)
      })
    })

    it('should filter by severity', async () => {
      const { GET } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/rules?severity=critical')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.rules.forEach((rule: any) => {
        expect(rule.severity).toBe('critical')
      })
    })

    it('should filter by metric type', async () => {
      const { GET } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/rules?metricType=CPU')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.rules.forEach((rule: any) => {
        expect(rule.metricType).toBe('CPU')
      })
    })
  })

  describe('POST /api/alerts/rules', () => {
    it('should create a new alert rule with valid data', async () => {
      const { POST } = await import('../route')
      
      const newRule = {
        name: 'Test Alert Rule',
        metricType: 'CPU',
        condition: '>',
        threshold: 80,
        duration: 300,
        severity: 'warning',
        channels: ['email', 'slack'],
        enabled: true,
        description: 'Test description'
      }

      const request = new NextRequest('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        body: JSON.stringify(newRule)
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('Test Alert Rule')
      expect(data.metricType).toBe('CPU')
      expect(data.threshold).toBe(80)
    })

    it('should reject invalid metric type', async () => {
      const { POST } = await import('../route')
      
      const invalidRule = {
        name: 'Test Alert',
        metricType: 'InvalidType',
        condition: '>',
        threshold: 80,
        duration: 300,
        severity: 'warning',
        channels: ['email']
      }

      const request = new NextRequest('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        body: JSON.stringify(invalidRule)
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should reject invalid condition', async () => {
      const { POST } = await import('../route')
      
      const invalidRule = {
        name: 'Test Alert',
        metricType: 'CPU',
        condition: '!=',
        threshold: 80,
        duration: 300,
        severity: 'warning',
        channels: ['email']
      }

      const request = new NextRequest('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        body: JSON.stringify(invalidRule)
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should reject empty name', async () => {
      const { POST } = await import('../route')
      
      const invalidRule = {
        name: '',
        metricType: 'CPU',
        condition: '>',
        threshold: 80,
        duration: 300,
        severity: 'warning',
        channels: ['email']
      }

      const request = new NextRequest('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        body: JSON.stringify(invalidRule)
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('Name is required')
    })

    it('should reject negative threshold', async () => {
      const { POST } = await import('../route')
      
      const invalidRule = {
        name: 'Test Alert',
        metricType: 'CPU',
        condition: '>',
        threshold: -10,
        duration: 300,
        severity: 'warning',
        channels: ['email']
      }

      const request = new NextRequest('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        body: JSON.stringify(invalidRule)
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should reject empty channels', async () => {
      const { POST } = await import('../route')
      
      const invalidRule = {
        name: 'Test Alert',
        metricType: 'CPU',
        condition: '>',
        threshold: 80,
        duration: 300,
        severity: 'warning',
        channels: []
      }

      const request = new NextRequest('http://localhost:3000/api/alerts/rules', {
        method: 'POST',
        body: JSON.stringify(invalidRule)
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('At least one notification channel is required')
    })
  })
})
