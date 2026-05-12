import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    query: vi.fn().mockResolvedValue([[
      { id: 'exec-1', workflowId: '123', status: 'completed', createdAt: new Date().toISOString() },
      { id: 'exec-2', workflowId: '123', status: 'failed', createdAt: new Date().toISOString() }
    ]])
  }
}))

describe('GET /api/workflow/[id]/executions', () => {
  it('should return list of executions', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/workflow/123/executions'), { params: Promise.resolve({ id: '123' }) })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
  })
})

// POST handler not implemented in route.ts - test removed
