/**
 * Alert History API Tests
 * @version 1.0.0
 * @date 2026-04-03
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

describe('Alert History API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/alerts/history', () => {
    it('should return alert history list', async () => {
      const { GET } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/history')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('alerts')
      expect(data.data).toHaveProperty('total')
      expect(Array.isArray(data.data.alerts)).toBe(true)
    })

    it('should support pagination', async () => {
      const { GET } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/history?page=1&pageSize=5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.page).toBe(1)
      expect(data.data.pageSize).toBe(5)
    })

    it('should filter by status', async () => {
      const { GET } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/history?status=active')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.data.alerts.forEach((alert: any) => {
        expect(alert.status).toBe('active')
      })
    })

    it('should filter by severity', async () => {
      const { GET } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/history?severity=critical')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.data.alerts.forEach((alert: any) => {
        expect(alert.severity).toBe('critical')
      })
    })

    it('should filter by rule ID', async () => {
      const { GET } = await import('../route')
      
      // First get all alerts to get a ruleId
      const allRequest = new NextRequest('http://localhost:3000/api/alerts/history')
      const allResponse = await GET(allRequest)
      const allData = await allResponse.json()

      if (allData.data.alerts.length > 0) {
        const ruleId = allData.data.alerts[0].ruleId
        
        const request = new NextRequest(`http://localhost:3000/api/alerts/history?ruleId=${ruleId}`)
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        data.data.alerts.forEach((alert: any) => {
          expect(alert.ruleId).toBe(ruleId)
        })
      }
    })

    it('should filter by date range', async () => {
      const { GET } = await import('../route')
      
      const today = new Date().toISOString().split('T')[0]
      const request = new NextRequest(`http://localhost:3000/api/alerts/history?startDate=${today}`)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Alerts from today should be included
      data.data.alerts.forEach((alert: any) => {
        expect(new Date(alert.triggeredAt).toISOString().split('T')[0]).toBe(today)
      })
    })
  })

  describe('POST /api/alerts/history', () => {
    it('should acknowledge an alert with valid data', async () => {
      const { POST } = await import('../route')
      
      // First get an alert to acknowledge
      const getRequest = new NextRequest('http://localhost:3000/api/alerts/history')
      const getResponse = await import('../route').then(m => m.GET(getRequest))
      const getData = await getResponse.json()

      if (getData.data.alerts.length > 0) {
        const alertId = getData.data.alerts[0].id
        
        const acknowledgeRequest = new NextRequest('http://localhost:3000/api/alerts/history', {
          method: 'POST',
          body: JSON.stringify({
            alertId,
            acknowledgedBy: 'test@example.com'
          })
        })
        
        const response = await POST(acknowledgeRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.status).toBe('acknowledged')
        expect(data.data.acknowledgedBy).toBe('test@example.com')
      }
    })

    it('should reject acknowledge without alertId', async () => {
      const { POST } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/history', {
        method: 'POST',
        body: JSON.stringify({
          acknowledgedBy: 'test@example.com'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('alertId')
    })

    it('should reject acknowledge without acknowledgedBy', async () => {
      const { POST } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/history', {
        method: 'POST',
        body: JSON.stringify({
          alertId: 'test-id'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('acknowledgedBy')
    })

    it('should reject acknowledge for non-existent alert', async () => {
      const { POST } = await import('../route')
      
      const request = new NextRequest('http://localhost:3000/api/alerts/history', {
        method: 'POST',
        body: JSON.stringify({
          alertId: 'non-existent-id',
          acknowledgedBy: 'test@example.com'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('not found')
    })
  })
})
