/**
 * Analytics API Route Tests
 *
 * Tests for /api/analytics endpoints:
 * - GET /api/analytics/nodes - Node performance data
 * - GET /api/analytics/overview - Overview metrics
 * - GET /api/analytics/resources - Resource usage data
 * - GET /api/analytics/anomalies - Anomaly detection data
 * - GET /api/analytics/trends - Workflow trend data
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock analytics service
vi.mock('@/lib/analytics/service', () => {
  const mockAnalyticsService = {
    getOverviewMetrics: vi.fn(() => Promise.resolve({
      totalExecutions: 1234,
      successRate: 95.5,
      avgDuration: 1250,
      activeWorkflows: 42,
      totalNodes: 156,
      timeRange: '7d',
      generatedAt: new Date().toISOString(),
    })),
    getWorkflowTrends: vi.fn(({ days = 7, status = 'all' } = {}) => Promise.resolve([
      {
        date: '2026-10-20',
        success: 150,
        failed: 10,
        total: 160,
        avgDuration: 1200,
        successRate: 93.75,
      },
      {
        date: '2026-10-19',
        success: 140,
        failed: 8,
        total: 148,
        avgDuration: 1150,
        successRate: 94.59,
      },
    ])),
    getNodePerformance: vi.fn((workflowId?: string) => Promise.resolve([
      {
        nodeId: 'node-1',
        nodeName: 'Start Node',
        executionCount: 500,
        avgDuration: 100,
        successRate: 98.5,
        lastExecuted: '2026-10-20T10:00:00Z',
      },
      {
        nodeId: 'node-2',
        nodeName: 'Action Node',
        executionCount: 450,
        avgDuration: 500,
        successRate: 95.2,
        lastExecuted: '2026-10-20T09:30:00Z',
      },
    ])),
    getResourceUsage: vi.fn((hours: number = 24) => Promise.resolve([
      {
        timestamp: '2026-10-20T10:00:00Z',
        cpu: 45.5,
        memory: 62.3,
        network: 120.5,
        disk: 38.2,
      },
      {
        timestamp: '2026-10-20T09:00:00Z',
        cpu: 42.1,
        memory: 60.8,
        network: 115.2,
        disk: 37.9,
      },
    ])),
    getAllMetrics: vi.fn(({ startDate, endDate } = {}) => Promise.resolve({
      overview: {
        totalExecutions: 1234,
        successRate: 95.5,
        avgDuration: 1250,
        activeWorkflows: 42,
        totalNodes: 156,
        timeRange: '7d',
        generatedAt: new Date().toISOString(),
      },
      workflowTrends: [],
      nodePerformance: [],
      resourceUsage: [],
      anomalies: [
        {
          timestamp: '2026-10-20T08:00:00Z',
          type: 'performance',
          severity: 'high',
          message: 'Execution count spike detected',
          value: 250,
          threshold: 200,
        },
      ],
    })),
    clearCache: vi.fn(),
  }

  return {
    analyticsService: mockAnalyticsService,
    createAnalyticsService: vi.fn(() => mockAnalyticsService),
  }
})

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data: any, status?: number) => ({
    status: status || 200,
    json: async () => ({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  })),
  createErrorResponse: vi.fn((error: any, statusCode?: number) => ({
    status: statusCode || 500,
    json: async () => ({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: error?.message || 'An error occurred',
        timestamp: new Date().toISOString(),
      },
    }),
  })),
  createUnauthorizedError: vi.fn((message: string) => ({
    status: 401,
    json: async () => ({
      success: false,
      error: { type: 'UNAUTHORIZED', message, timestamp: new Date().toISOString() },
    }),
  })),
  createBadRequestError: vi.fn((message: string) => ({
    status: 400,
    json: async () => ({
      success: false,
      error: { type: 'BAD_REQUEST', message, timestamp: new Date().toISOString() },
    }),
  })),
  withErrorHandling: (handler: Function) => handler,
}))

vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn((request: Request) => 
    Promise.resolve({
      authenticated: true,
      user: { id: 'test-user', name: 'Test User' },
    })
  ),
}))

describe('Analytics API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================
  // GET /api/analytics/overview - Overview Metrics Tests
  // ==========================================
  describe('GET /api/analytics/overview - Overview Metrics', () => {
    it('should return overview metrics successfully', async () => {
      const { GET } = await import('@/app/api/analytics/overview/route')
      
      const request = new NextRequest('http://localhost/api/analytics/overview', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('totalExecutions')
      expect(data.data).toHaveProperty('successRate')
      expect(data.data).toHaveProperty('avgDuration')
      expect(data.data).toHaveProperty('activeWorkflows')
      expect(data.data).toHaveProperty('totalNodes')
      expect(data.data).toHaveProperty('timeRange')
    })

    it('should return correct overview metrics structure', async () => {
      const { GET } = await import('@/app/api/analytics/overview/route')
      
      const request = new NextRequest('http://localhost/api/analytics/overview', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.totalExecutions).toBe(1234)
      expect(data.data.successRate).toBe(95.5)
      expect(data.data.avgDuration).toBe(1250)
      expect(data.data.activeWorkflows).toBe(42)
      expect(data.data.totalNodes).toBe(156)
      expect(data.data.timeRange).toBe('7d')
    })

    it('should reject unauthorized requests', async () => {
      const { authenticateJWT } = await import('@/lib/auth/api-auth')
      ;(authenticateJWT as any).mockResolvedValueOnce({
        authenticated: false,
        user: null,
      })

      const { GET } = await import('@/app/api/analytics/overview/route')
      
      const request = new NextRequest('http://localhost/api/analytics/overview', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const { analyticsService } = await import('@/lib/analytics/service')
      ;(analyticsService.getOverviewMetrics as any).mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      const { GET } = await import('@/app/api/analytics/overview/route')
      
      const request = new NextRequest('http://localhost/api/analytics/overview', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  // ==========================================
  // GET /api/analytics/nodes - Node Performance Tests
  // ==========================================
  describe('GET /api/analytics/nodes - Node Performance', () => {
    it('should return node performance data successfully', async () => {
      const { GET } = await import('@/app/api/analytics/nodes/route')
      
      const request = new NextRequest('http://localhost/api/analytics/nodes', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
    })

    it('should return node performance with correct structure', async () => {
      const { GET } = await import('@/app/api/analytics/nodes/route')
      
      const request = new NextRequest('http://localhost/api/analytics/nodes', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      const node = data.data[0]
      expect(node).toHaveProperty('nodeId')
      expect(node).toHaveProperty('nodeName')
      expect(node).toHaveProperty('executionCount')
      expect(node).toHaveProperty('avgDuration')
      expect(node).toHaveProperty('successRate')
      expect(node).toHaveProperty('lastExecuted')
    })

    it('should filter by workflowId when provided', async () => {
      const { GET } = await import('@/app/api/analytics/nodes/route')
      
      const request = new NextRequest('http://localhost/api/analytics/nodes?workflowId=wf-123', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject unauthorized requests', async () => {
      const { authenticateJWT } = await import('@/lib/auth/api-auth')
      ;(authenticateJWT as any).mockResolvedValueOnce({
        authenticated: false,
        user: null,
      })

      const { GET } = await import('@/app/api/analytics/nodes/route')
      
      const request = new NextRequest('http://localhost/api/analytics/nodes', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should handle empty results gracefully', async () => {
      const { analyticsService } = await import('@/lib/analytics/service')
      ;(analyticsService.getNodePerformance as any).mockResolvedValueOnce([])

      const { GET } = await import('@/app/api/analytics/nodes/route')
      
      const request = new NextRequest('http://localhost/api/analytics/nodes', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBe(0)
    })
  })

  // ==========================================
  // GET /api/analytics/resources - Resource Usage Tests
  // ==========================================
  describe('GET /api/analytics/resources - Resource Usage', () => {
    it('should return resource usage data successfully', async () => {
      const { GET } = await import('@/app/api/analytics/resources/route')
      
      const request = new NextRequest('http://localhost/api/analytics/resources', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should return resource usage with correct structure', async () => {
      const { GET } = await import('@/app/api/analytics/resources/route')
      
      const request = new NextRequest('http://localhost/api/analytics/resources', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      const resource = data.data[0]
      expect(resource).toHaveProperty('timestamp')
      expect(resource).toHaveProperty('cpu')
      expect(resource).toHaveProperty('memory')
      expect(resource).toHaveProperty('network')
      expect(resource).toHaveProperty('disk')
    })

    it('should accept custom hours parameter', async () => {
      const { GET } = await import('@/app/api/analytics/resources/route')
      
      const request = new NextRequest('http://localhost/api/analytics/resources?hours=48', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should use default 24 hours when hours not specified', async () => {
      const { analyticsService } = await import('@/lib/analytics/service')

      const { GET } = await import('@/app/api/analytics/resources/route')
      
      const request = new NextRequest('http://localhost/api/analytics/resources', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      
      expect(response.status).toBe(200)
      // Verify getResourceUsage was called with default 24 hours
      expect(analyticsService.getResourceUsage).toHaveBeenCalledWith(24)
    })

    it('should reject unauthorized requests', async () => {
      const { authenticateJWT } = await import('@/lib/auth/api-auth')
      ;(authenticateJWT as any).mockResolvedValueOnce({
        authenticated: false,
        user: null,
      })

      const { GET } = await import('@/app/api/analytics/resources/route')
      
      const request = new NextRequest('http://localhost/api/analytics/resources', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should handle invalid hours parameter gracefully', async () => {
      const { GET } = await import('@/app/api/analytics/resources/route')
      
      // Invalid hours (non-numeric) should default to 24
      const request = new NextRequest('http://localhost/api/analytics/resources?hours=invalid', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      
      // NaN defaults to 24 in the route handler
      expect(response.status).toBe(200)
    })
  })

  // ==========================================
  // GET /api/analytics/anomalies - Anomaly Detection Tests
  // ==========================================
  describe('GET /api/analytics/anomalies - Anomaly Detection', () => {
    it('should return anomaly detection data successfully', async () => {
      const { GET } = await import('@/app/api/analytics/anomalies/route')
      
      const request = new NextRequest('http://localhost/api/analytics/anomalies', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should return anomalies with correct structure', async () => {
      const { GET } = await import('@/app/api/analytics/anomalies/route')
      
      const request = new NextRequest('http://localhost/api/analytics/anomalies', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      const anomaly = data.data[0]
      expect(anomaly).toHaveProperty('timestamp')
      expect(anomaly).toHaveProperty('type')
      expect(anomaly).toHaveProperty('severity')
      expect(anomaly).toHaveProperty('message')
      expect(anomaly).toHaveProperty('value')
      expect(anomaly).toHaveProperty('threshold')
    })

    it('should accept date range parameters', async () => {
      const { GET } = await import('@/app/api/analytics/anomalies/route')
      
      const request = new NextRequest(
        'http://localhost/api/analytics/anomalies?startDate=2026-10-01&endDate=2026-10-20',
        {
          method: 'GET',
          headers: {
            'x-user-id': 'test-user',
            'x-user-name': 'Test User',
          },
        }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject unauthorized requests', async () => {
      const { authenticateJWT } = await import('@/lib/auth/api-auth')
      ;(authenticateJWT as any).mockResolvedValueOnce({
        authenticated: false,
        user: null,
      })

      const { GET } = await import('@/app/api/analytics/anomalies/route')
      
      const request = new NextRequest('http://localhost/api/analytics/anomalies', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should return empty array when no anomalies detected', async () => {
      const { analyticsService } = await import('@/lib/analytics/service')
      ;(analyticsService.getAllMetrics as any).mockResolvedValueOnce({
        overview: {},
        workflowTrends: [],
        nodePerformance: [],
        resourceUsage: [],
        anomalies: [],
      })

      const { GET } = await import('@/app/api/analytics/anomalies/route')
      
      const request = new NextRequest('http://localhost/api/analytics/anomalies', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBe(0)
    })

    it('should handle different severity levels', async () => {
      const { analyticsService } = await import('@/lib/analytics/service')
      ;(analyticsService.getAllMetrics as any).mockResolvedValueOnce({
        overview: {},
        workflowTrends: [],
        nodePerformance: [],
        resourceUsage: [],
        anomalies: [
          {
            timestamp: '2026-10-20T08:00:00Z',
            type: 'performance',
            severity: 'high',
            message: 'High severity anomaly',
            value: 300,
            threshold: 200,
          },
          {
            timestamp: '2026-10-20T07:00:00Z',
            type: 'performance',
            severity: 'medium',
            message: 'Medium severity anomaly',
            value: 220,
            threshold: 200,
          },
        ],
      })

      const { GET } = await import('@/app/api/analytics/anomalies/route')
      
      const request = new NextRequest('http://localhost/api/analytics/anomalies', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.length).toBe(2)
      expect(data.data[0].severity).toBe('high')
      expect(data.data[1].severity).toBe('medium')
    })
  })

  // ==========================================
  // GET /api/analytics/trends - Workflow Trends Tests
  // ==========================================
  describe('GET /api/analytics/trends - Workflow Trends', () => {
    it('should return workflow trend data successfully', async () => {
      const { GET } = await import('@/app/api/analytics/trends/route')
      
      const request = new NextRequest('http://localhost/api/analytics/trends', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
    })

    it('should return trends with correct structure', async () => {
      const { GET } = await import('@/app/api/analytics/trends/route')
      
      const request = new NextRequest('http://localhost/api/analytics/trends', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      const trend = data.data[0]
      expect(trend).toHaveProperty('date')
      expect(trend).toHaveProperty('success')
      expect(trend).toHaveProperty('failed')
      expect(trend).toHaveProperty('total')
      expect(trend).toHaveProperty('avgDuration')
      expect(trend).toHaveProperty('successRate')
    })

    it('should accept days parameter', async () => {
      const { GET } = await import('@/app/api/analytics/trends/route')
      
      const request = new NextRequest('http://localhost/api/analytics/trends?days=30', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should accept status filter parameter', async () => {
      const { GET } = await import('@/app/api/analytics/trends/route')
      
      const request = new NextRequest('http://localhost/api/analytics/trends?status=success', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should use default 7 days when days not specified', async () => {
      const { analyticsService } = await import('@/lib/analytics/service')

      const { GET } = await import('@/app/api/analytics/trends/route')
      
      const request = new NextRequest('http://localhost/api/analytics/trends', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      await GET(request)
      
      expect(analyticsService.getWorkflowTrends).toHaveBeenCalledWith({
        days: 7,
        status: 'all',
      })
    })

    it('should reject unauthorized requests', async () => {
      const { authenticateJWT } = await import('@/lib/auth/api-auth')
      ;(authenticateJWT as any).mockResolvedValueOnce({
        authenticated: false,
        user: null,
      })

      const { GET } = await import('@/app/api/analytics/trends/route')
      
      const request = new NextRequest('http://localhost/api/analytics/trends', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should handle invalid status parameter gracefully', async () => {
      const { GET } = await import('@/app/api/analytics/trends/route')
      
      // Invalid status should default to 'all'
      const request = new NextRequest('http://localhost/api/analytics/trends?status=invalid', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })

    it('should calculate correct success rate in trends', async () => {
      const { GET } = await import('@/app/api/analytics/trends/route')
      
      const request = new NextRequest('http://localhost/api/analytics/trends', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      // Verify success rate is calculated correctly
      const trend = data.data[0]
      const expectedSuccessRate = (trend.success / trend.total) * 100
      expect(trend.successRate).toBeCloseTo(expectedSuccessRate, 1)
    })

    it('should handle all status filter options', async () => {
      const { GET } = await import('@/app/api/analytics/trends/route')
      
      for (const status of ['success', 'failed', 'all']) {
        const request = new NextRequest(`http://localhost/api/analytics/trends?status=${status}`, {
          method: 'GET',
          headers: {
            'x-user-id': 'test-user',
            'x-user-name': 'Test User',
          },
        })

        const response = await GET(request)
        
        expect(response.status).toBe(200)
        expect((await response.json()).success).toBe(true)
      }
    })
  })

  // ==========================================
  // Common Response Format Tests
  // ==========================================
  describe('Common Response Format - All Analytics Endpoints', () => {
    it('all endpoints should return consistent response structure', async () => {
      const endpoints = [
        { path: '/api/analytics/overview', importPath: '@/app/api/analytics/overview/route' },
        { path: '/api/analytics/nodes', importPath: '@/app/api/analytics/nodes/route' },
        { path: '/api/analytics/resources', importPath: '@/app/api/analytics/resources/route' },
        { path: '/api/analytics/anomalies', importPath: '@/app/api/analytics/anomalies/route' },
        { path: '/api/analytics/trends', importPath: '@/app/api/analytics/trends/route' },
      ]

      for (const endpoint of endpoints) {
        const { GET } = await import(endpoint.importPath)
        
        const request = new NextRequest(`http://localhost${endpoint.path}`, {
          method: 'GET',
          headers: {
            'x-user-id': 'test-user',
            'x-user-name': 'Test User',
          },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toHaveProperty('success')
        expect(data).toHaveProperty('data')
        expect(data).toHaveProperty('timestamp')
      }
    })
  })
})
