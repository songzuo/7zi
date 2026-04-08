import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/audit/logger', () => ({
  AuditLogger: {
    logAuthEvent: vi.fn().mockResolvedValue(undefined),
    logRegistration: vi.fn().mockResolvedValue(undefined),
    logPasswordReset: vi.fn().mockResolvedValue(undefined),
    logApiAccess: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/rate-limit/limiter', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getClientIP: vi.fn(() => '127.0.0.1'),
    RateLimiter: actual.RateLimiter,
  }
})

describe('Auth API Debug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debug full POST flow with missing username - show response', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    // Log the full response
    console.log('FULL RESPONSE:', { status: response.status, body: data })

    // This should fail showing us the actual status
    expect(response.status).toBe(400)
  })
})
