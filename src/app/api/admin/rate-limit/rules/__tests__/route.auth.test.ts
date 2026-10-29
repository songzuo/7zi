/**
 * Auth tests for /api/admin/rate-limit/rules
 *
 * Verifies that the route enforces real JWT validation and an admin role check
 * (T243 - management API auth hardening).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { TokenVerifyResult } from '@/lib/auth/jwt'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/jwt', () => ({
  verify: vi.fn(),
}))

const mockFindAll = vi.fn()
const mockCreate = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('@/lib/rate-limit-dashboard/database', () => ({
  repositories: {
    rateLimitRules: {
      findAll: (...args: unknown[]) => mockFindAll(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => mockAuditCreate(...args),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET, POST } from '@/app/api/admin/rate-limit/rules/route'
import { verify } from '@/lib/auth/jwt'

const mockedVerify = vi.mocked(verify)

const URL_RULES = 'http://localhost/api/admin/rate-limit/rules'

type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>

function requestWithAuth(authHeader?: string, init?: NextRequestInit): NextRequest {
  const headers = new Headers(init?.headers)
  if (authHeader !== undefined) {
    headers.set('authorization', authHeader)
  }
  return new NextRequest(URL_RULES, { ...init, headers })
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function validAdminPayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: 'admin-user-1',
    email: 'admin@example.com',
    role: 'admin',
    roles: ['admin'],
    type: 'user' as const,
    ...overrides,
  }
}

function verifyResult(partial: Partial<TokenVerifyResult>): TokenVerifyResult {
  return partial as TokenVerifyResult
}

describe('/api/admin/rate-limit/rules - authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindAll.mockResolvedValue({
      items: [],
      meta: { currentPage: 1, perPage: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false },
    })
  })

  it('returns 401 when the Authorization header is missing', async () => {
    const response = await GET(requestWithAuth())

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeTruthy()
    expect(mockedVerify).not.toHaveBeenCalled()
    expect(mockFindAll).not.toHaveBeenCalled()
  })

  it('returns 401 when the Authorization header is not a Bearer token', async () => {
    const response = await GET(requestWithAuth('Basic dXNlcjpwYXNz'))

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Missing or invalid authorization header')
    expect(mockedVerify).not.toHaveBeenCalled()
  })

  it('returns 401 for a forged/invalid token', async () => {
    mockedVerify.mockResolvedValue(
      verifyResult({ valid: false, error: 'Invalid signature' })
    )

    const response = await GET(requestWithAuth('Bearer forged.token.value'))

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
    // The real error message coming from @/lib/auth/jwt must be surfaced
    expect(body.error).toBe('Invalid signature')
    expect(mockedVerify).toHaveBeenCalledWith('forged.token.value')
    expect(mockFindAll).not.toHaveBeenCalled()
  })

  it('returns 401 when the token is expired', async () => {
    mockedVerify.mockResolvedValue(verifyResult({ valid: false, error: 'Token expired' }))

    const response = await POST(
      requestWithAuth('Bearer expired.token', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Token expired')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 403 when a valid token has a non-admin role', async () => {
    mockedVerify.mockResolvedValue(
      verifyResult({
        valid: true,
        payload: validAdminPayload({ role: 'user', roles: ['user'] }),
      })
    )

    const response = await GET(requestWithAuth('Bearer valid.user.token'))

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Admin privileges required')
    expect(mockFindAll).not.toHaveBeenCalled()
  })

  it('returns 403 when the token has no role information at all', async () => {
    mockedVerify.mockResolvedValue(
      verifyResult({
        valid: true,
        payload: validAdminPayload({ role: undefined, roles: undefined }),
      })
    )

    const response = await GET(requestWithAuth('Bearer valid.roleless.token'))

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Admin privileges required')
    expect(mockFindAll).not.toHaveBeenCalled()
  })

  it('allows an admin token (role: admin) to reach the business logic', async () => {
    mockedVerify.mockResolvedValue(
      verifyResult({ valid: true, payload: validAdminPayload() })
    )

    const response = await GET(requestWithAuth('Bearer valid.admin.token'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(mockFindAll).toHaveBeenCalledTimes(1)
  })

  it('allows an admin token identified only via roles[] to reach the business logic', async () => {
    mockedVerify.mockResolvedValue(
      verifyResult({
        valid: true,
        payload: validAdminPayload({ role: 'operator', roles: ['operator', 'admin'] }),
      })
    )

    const response = await GET(requestWithAuth('Bearer valid.roles.token'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(mockFindAll).toHaveBeenCalledTimes(1)
  })

  it('allows an admin token to create a rule and audits with the real user id', async () => {
    mockedVerify.mockResolvedValue(
      verifyResult({ valid: true, payload: validAdminPayload() })
    )
    mockCreate.mockResolvedValue({ id: 'rule-1', name: 'test-rule' })

    const response = await POST(
      requestWithAuth('Bearer valid.admin.token', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test-rule',
          pattern: '^/api/test',
          algorithm: 'sliding-window',
          windowMs: 60000,
          maxRequests: 100,
          keyType: 'ip',
        }),
      })
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockAuditCreate).toHaveBeenCalledTimes(1)
    expect(mockAuditCreate.mock.calls[0][0]).toMatchObject({
      action: 'CREATE_RATE_LIMIT_RULE',
      userId: 'admin-user-1',
    })
  })
})
