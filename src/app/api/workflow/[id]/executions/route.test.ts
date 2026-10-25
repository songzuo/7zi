import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock workflow monitoring (路由实际依赖 workflowMonitoring.getExecutions)
const mockGetExecutions = vi.fn()

vi.mock('@/lib/workflow/monitoring', () => ({
  workflowMonitoring: {
    getExecutions: (...args: unknown[]) => mockGetExecutions(...args),
  },
}))

describe('GET /api/workflow/[id]/executions', () => {
  beforeEach(() => {
    mockGetExecutions.mockReset()
    mockGetExecutions.mockReturnValue({
      executions: [
        { id: 'exec-1', workflowId: '123', status: 'completed', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'exec-2', workflowId: '123', status: 'failed', createdAt: '2026-01-02T00:00:00.000Z' },
      ],
      total: 2,
    })
  })

  it('should return list of executions', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/workflow/123/executions'), { params: Promise.resolve({ id: '123' }) })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data.executions)).toBe(true)
    expect(data.executions).toHaveLength(2)
    expect(data.executions[0].id).toBe('exec-1')
    expect(data.total).toBe(2)
  })
})

// POST handler not implemented in route.ts - test removed
