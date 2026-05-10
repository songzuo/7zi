import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock workflow executor
vi.mock('@/lib/workflow/executor', () => ({
  WorkflowExecutor: {
    create: vi.fn().mockImplementation(() => ({
      execute: vi.fn().mockResolvedValue({ 
        success: true, 
        executionId: 'exec-123',
        result: { output: 'test-output' }
      })
    }))
  }
}))

describe('POST /api/workflow/[id]/run', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost:3000/api/workflow/123/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { test: 'data' } })
    })
  })

  it('should execute workflow and return execution id', async () => {
    const response = await POST(mockRequest, { params: Promise.resolve({ id: '123' }) })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.executionId).toBeDefined()
    expect(data.success).toBe(true)
  })

  it('should validate required workflow id', async () => {
    const response = await POST(mockRequest, { params: Promise.resolve({ id: '' }) })
    expect(response.status).toBe(400)
  })
})
