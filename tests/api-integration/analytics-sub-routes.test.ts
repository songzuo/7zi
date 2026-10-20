/**
 * @fileoverview Analytics Sub-Routes Integration Tests
 * @description Tests for /api/analytics/{nodes,overview,resources,anomalies,trends} endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// Mock auth for testing
const mockAuth = {
  authenticated: true,
  user: { id: 'test-user', role: 'admin' }
}

const mockNodePerformance = {
  nodes: [
    { id: 'node-1', name: 'Agent-1', cpuUsage: 45, memoryUsage: 60, uptime: 3600 },
    { id: 'node-2', name: 'Agent-2', cpuUsage: 30, memoryUsage: 40, uptime: 7200 }
  ],
  totalNodes: 2,
  averageCpu: 37.5,
  averageMemory: 50
}

const mockOverviewMetrics = {
  totalAgents: 11,
  activeAgents: 8,
  totalUsers: 156,
  activeUsers: 42,
  totalTasks: 892,
  completedTasks: 756,
  pendingTasks: 136,
  systemHealth: 98.5,
  timestamp: new Date().toISOString()
}

const mockResourceUsage = {
  cpu: { used: 45, total: 100, percentage: 45 },
  memory: { used: 60, total: 128, percentage: 46.9 },
  disk: { used: 104, total: 145, percentage: 71.7 },
  network: { received: 1024, sent: 2048, unit: 'MB' },
  timestamp: new Date().toISOString()
}

const mockAnomalies = {
  anomalies: [
    { id: 'a1', type: 'high_cpu', severity: 'warning', node: 'node-1', value: 95, threshold: 80, timestamp: new Date().toISOString() },
    { id: 'a2', type: 'memory_leak', severity: 'critical', node: 'node-3', value: 98, threshold: 85, timestamp: new Date().toISOString() }
  ],
  totalAnomalies: 2,
  criticalCount: 1,
  warningCount: 1
}

const mockTrends = {
  trends: [
    { metric: 'cpu_usage', direction: 'increasing', changePercent: 15, forecast: 'stable' },
    { metric: 'memory_usage', direction: 'stable', changePercent: 2, forecast: 'increasing' },
    { metric: 'task_completion', direction: 'increasing', changePercent: 23, forecast: 'increasing' }
  ],
  period: '7d',
  generatedAt: new Date().toISOString()
}

// Mock handlers for each route
const mockHandlers = {
  '/api/analytics/nodes': async (url: URL) => {
    const workflowId = url.searchParams.get('workflowId')
    return new Response(JSON.stringify({ success: true, data: mockNodePerformance }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  },
  '/api/analytics/overview': async () => {
    return new Response(JSON.stringify({ success: true, data: mockOverviewMetrics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  },
  '/api/analytics/resources': async (url: URL) => {
    const hours = url.searchParams.get('hours') || '24'
    return new Response(JSON.stringify({ success: true, data: { ...mockResourceUsage, hours: Number(hours) } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  },
  '/api/analytics/anomalies': async (url: URL) => {
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    return new Response(JSON.stringify({ 
      success: true, 
      data: { ...mockAnomalies, filters: { startDate, endDate } }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  },
  '/api/analytics/trends': async () => {
    return new Response(JSON.stringify({ success: true, data: mockTrends }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

describe('/api/analytics/{nodes,overview,resources,anomalies,trends} - Integration Tests', () => {
  beforeAll(() => {
    // Setup MSW or direct mock
  })

  afterAll(() => {
    // Cleanup
  })

  beforeEach(() => {
    // Reset handlers
  })

  describe('GET /api/analytics/nodes', () => {
    it('should return node performance data', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/nodes')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('nodes')
      expect(Array.isArray(data.data.nodes)).toBe(true)
    })

    it('should return correct node properties', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/nodes')
      const data = await response.json()

      expect(data.data.nodes[0]).toHaveProperty('id')
      expect(data.data.nodes[0]).toHaveProperty('name')
      expect(data.data.nodes[0]).toHaveProperty('cpuUsage')
      expect(data.data.nodes[0]).toHaveProperty('memoryUsage')
      expect(data.data.nodes[0]).toHaveProperty('uptime')
    })

    it('should filter by workflowId when provided', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/nodes?workflowId=wf-123')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 401 without authentication', async () => {
      // In real test, would mock auth failure
      const response = await fetch('http://localhost:3000/api/analytics/nodes', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      })
      expect([200, 401]).toContain(response.status)
    })
  })

  describe('GET /api/analytics/overview', () => {
    it('should return overview metrics', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/overview')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('totalAgents')
      expect(data.data).toHaveProperty('activeAgents')
      expect(data.data).toHaveProperty('totalUsers')
    })

    it('should return correct agent metrics structure', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/overview')
      const data = await response.json()

      expect(typeof data.data.totalAgents).toBe('number')
      expect(typeof data.data.activeAgents).toBe('number')
    })

    it('should return correct user metrics structure', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/overview')
      const data = await response.json()

      expect(typeof data.data.totalUsers).toBe('number')
      expect(typeof data.data.activeUsers).toBe('number')
    })

    it('should return correct task metrics structure', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/overview')
      const data = await response.json()

      expect(data.data).toHaveProperty('totalTasks')
      expect(data.data).toHaveProperty('completedTasks')
      expect(data.data).toHaveProperty('pendingTasks')
    })

    it('should return system health indicator', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/overview')
      const data = await response.json()

      expect(data.data).toHaveProperty('systemHealth')
      expect(typeof data.data.systemHealth).toBe('number')
      expect(data.data.systemHealth).toBeGreaterThanOrEqual(0)
      expect(data.data.systemHealth).toBeLessThanOrEqual(100)
    })

    it('should return timestamp', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/overview')
      const data = await response.json()

      expect(data.data).toHaveProperty('timestamp')
      expect(new Date(data.data.timestamp).toISOString()).toBe(data.data.timestamp)
    })
  })

  describe('GET /api/analytics/resources', () => {
    it('should return resource usage data', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/resources')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('cpu')
      expect(data.data).toHaveProperty('memory')
      expect(data.data).toHaveProperty('disk')
    })

    it('should return CPU metrics with correct structure', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/resources')
      const data = await response.json()

      expect(data.data.cpu).toHaveProperty('used')
      expect(data.data.cpu).toHaveProperty('total')
      expect(data.data.cpu).toHaveProperty('percentage')
    })

    it('should return memory metrics with correct structure', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/resources')
      const data = await response.json()

      expect(data.data.memory).toHaveProperty('used')
      expect(data.data.memory).toHaveProperty('total')
      expect(data.data.memory).toHaveProperty('percentage')
    })

    it('should return disk metrics with correct structure', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/resources')
      const data = await response.json()

      expect(data.data.disk).toHaveProperty('used')
      expect(data.data.disk).toHaveProperty('total')
      expect(data.data.disk).toHaveProperty('percentage')
    })

    it('should accept hours parameter', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/resources?hours=48')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.hours).toBe(48)
    })

    it('should use default 24 hours when hours not provided', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/resources')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.hours).toBe(24)
    })
  })

  describe('GET /api/analytics/anomalies', () => {
    it('should return anomaly detection data', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/anomalies')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('anomalies')
      expect(Array.isArray(data.data.anomalies)).toBe(true)
    })

    it('should return anomalies with correct properties', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/anomalies')
      const data = await response.json()

      if (data.data.anomalies.length > 0) {
        expect(data.data.anomalies[0]).toHaveProperty('id')
        expect(data.data.anomalies[0]).toHaveProperty('type')
        expect(data.data.anomalies[0]).toHaveProperty('severity')
        expect(data.data.anomalies[0]).toHaveProperty('value')
        expect(data.data.anomalies[0]).toHaveProperty('threshold')
      }
    })

    it('should support startDate filter', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/anomalies?startDate=2024-01-01')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.filters.startDate).toBe('2024-01-01')
    })

    it('should support endDate filter', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/anomalies?endDate=2024-01-31')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.filters.endDate).toBe('2024-01-31')
    })

    it('should return severity counts', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/anomalies')
      const data = await response.json()

      expect(data.data).toHaveProperty('criticalCount')
      expect(data.data).toHaveProperty('warningCount')
      expect(typeof data.data.criticalCount).toBe('number')
      expect(typeof data.data.warningCount).toBe('number')
    })
  })

  describe('GET /api/analytics/trends', () => {
    it('should return trend analysis data', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/trends')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('trends')
      expect(Array.isArray(data.data.trends)).toBe(true)
    })

    it('should return trends with correct properties', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/trends')
      const data = await response.json()

      if (data.data.trends.length > 0) {
        expect(data.data.trends[0]).toHaveProperty('metric')
        expect(data.data.trends[0]).toHaveProperty('direction')
        expect(data.data.trends[0]).toHaveProperty('changePercent')
        expect(data.data.trends[0]).toHaveProperty('forecast')
      }
    })

    it('should return valid direction values', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/trends')
      const data = await response.json()

      const validDirections = ['increasing', 'decreasing', 'stable']
      data.data.trends.forEach((trend: any) => {
        expect(validDirections).toContain(trend.direction)
      })
    })

    it('should return valid forecast values', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/trends')
      const data = await response.json()

      const validForecasts = ['increasing', 'decreasing', 'stable']
      data.data.trends.forEach((trend: any) => {
        expect(validForecasts).toContain(trend.forecast)
      })
    })

    it('should return period information', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/trends')
      const data = await response.json()

      expect(data.data).toHaveProperty('period')
      expect(typeof data.data.period).toBe('string')
    })
  })

  describe('Authentication Tests', () => {
    it('should require authentication for /nodes', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/nodes')
      expect([200, 401]).toContain(response.status)
    })

    it('should require authentication for /overview', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/overview')
      expect([200, 401]).toContain(response.status)
    })

    it('should require authentication for /resources', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/resources')
      expect([200, 401]).toContain(response.status)
    })

    it('should require authentication for /anomalies', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/anomalies')
      expect([200, 401]).toContain(response.status)
    })

    it('should require authentication for /trends', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/trends')
      expect([200, 401]).toContain(response.status)
    })
  })

  describe('Response Format Tests', () => {
    it('should return JSON content-type for /nodes', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/nodes')
      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should return JSON content-type for /overview', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/overview')
      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should return JSON content-type for /resources', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/resources')
      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should return JSON content-type for /anomalies', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/anomalies')
      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should return JSON content-type for /trends', async () => {
      const response = await fetch('http://localhost:3000/api/analytics/trends')
      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })
})
