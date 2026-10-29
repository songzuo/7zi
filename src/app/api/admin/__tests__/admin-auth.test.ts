/**
 * Auth tests for the remaining admin routes that previously used a stub
 * `checkAuth()` (any non-empty Bearer token was treated as admin).
 *
 * Covers:
 *   - /api/admin/rate-limit/rules/[id]  (GET / PUT / DELETE)
 *   - /api/admin/rate-limit/statistics   (GET)
 *   - /api/admin/security/blacklist      (GET / POST)
 *
 * All three now share `checkAdminAuth()` from '@/lib/api/admin-auth'.
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
const mockFindById = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockGetStats = vi.fn()
const mockBlacklistFindAll = vi.fn()
const mockBlacklistCreate = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('@/lib/rate-limit-dashboard/database', () => ({
  repositories: {
    rateLimitRules: {
      findAll: (...args: unknown[]) => mockFindAll(...args),
      findById: (...args: unknown[]) => mockFindById(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      getStatistics: (...args: unknown[]) => mockGetStats(...args),
    },
    blacklist: {
      findAll: (...args: unknown[]) => mockBlacklistFindAll(...args),
      create: (...args: unknown[]) => mockBlacklistCreate(...args),
    },
    // statistics 路由直接用原生 better-sqlite3 连接跑统计 SQL
    rateLimitEvents: {
      db: {
        prepare: () => ({
          get: () => ({ total: 0, allowed: 0, blocked: 0, violations: 0, last_violation: null }),
          all: () => [],
        }),
      },
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

import { GET as rulesIdGET, PUT as rulesIdPUT, DELETE as rulesIdDELETE } from '@/app/api/admin/rate-limit/rules/[id]/route'
import { GET as statisticsGET } from '@/app/api/admin/rate-limit/statistics/route'
import { GET as blacklistGET, POST as blacklistPOST } from '@/app/api/admin/security/blacklist/route'
import { verify } from '@/lib/auth/jwt'

const mockedVerify = vi.mocked(verify)

type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>

function requestWithAuth(url: string, authHeader?: string, init?: NextRequestInit): NextRequest {
  const headers = new Headers(init?.headers as HeadersInit | undefined)
  if (authHeader !== undefined) {
    headers.set('authorization', authHeader)
  }
  return new NextRequest(url, { ...init, headers: headers as HeadersInit })
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function adminPayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: 'admin-user-1',
    email: 'admin@example.com',
    role: 'admin',
    type: 'user',
    ...overrides,
  }
}

function validResult(overrides: Partial<TokenVerifyResult> = {}): TokenVerifyResult {
  return { valid: true, payload: adminPayload() as TokenVerifyResult['payload'], ...overrides }
}

// 规则 ID 格式：13 位时间戳 + '-' + 9 位小写字母数字（见 isValidRuleId）
const RULE_ID = '1793173885649-abc123def'
const URL_RULE_ID = `http://localhost/api/admin/rate-limit/rules/${RULE_ID}`
const URL_STATS = 'http://localhost/api/admin/rate-limit/statistics'
const URL_BLACKLIST = 'http://localhost/api/admin/security/blacklist'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('admin routes auth (shared checkAdminAuth)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedVerify.mockResolvedValue(validResult())
    // 注意：vi.clearAllMocks() 会清掉 mockResolvedValue 的实现，
    // 所以这些必须在 beforeEach 里重新设置（而不是只在文件顶层设置一次）。
    mockFindById.mockResolvedValue({
      id: RULE_ID,
      name: 'rule',
      pattern: 'x',
      algorithm: 'token-bucket',
      windowMs: 1000,
      maxRequests: 10,
      keyType: 'ip',
      enabled: true,
    })
    mockFindAll.mockResolvedValue([])
    mockGetStats.mockResolvedValue({ totalRules: 0, activeRules: 0 })
    mockBlacklistFindAll.mockResolvedValue([])
    mockBlacklistCreate.mockResolvedValue({ id: 'bl-1', type: 'ip', value: '1.2.3.4' })
    mockAuditCreate.mockResolvedValue({ id: 'audit-1' })
  })

  describe('missing / malformed Authorization header → 401', () => {
    it('rules/[id] GET', async () => {
      const res = await rulesIdGET(requestWithAuth(URL_RULE_ID), {
        params: { id: RULE_ID },
      })
      expect(res.status).toBe(401)
      expect(mockedVerify).not.toHaveBeenCalled()
    })

    it('rules/[id] PUT', async () => {
      const res = await rulesIdPUT(
        requestWithAuth(URL_RULE_ID, 'Basic abc', {
          method: 'PUT',
          body: JSON.stringify({ name: 'x' }),
        }),
        { params: { id: RULE_ID } }
      )
      expect(res.status).toBe(401)
    })

    it('rules/[id] DELETE', async () => {
      const res = await rulesIdDELETE(requestWithAuth(URL_RULE_ID), {
        params: { id: RULE_ID },
      })
      expect(res.status).toBe(401)
    })

    it('statistics GET', async () => {
      const res = await statisticsGET(requestWithAuth(URL_STATS))
      expect(res.status).toBe(401)
    })

    it('blacklist GET', async () => {
      const res = await blacklistGET(requestWithAuth(URL_BLACKLIST))
      expect(res.status).toBe(401)
    })

    it('blacklist POST', async () => {
      const res = await blacklistPOST(
        requestWithAuth(URL_BLACKLIST, undefined, {
          method: 'POST',
          body: JSON.stringify({ type: 'ip', value: '1.2.3.4', reason: 'test' }),
        })
      )
      expect(res.status).toBe(401)
    })
  })

  describe('invalid / expired JWT → 401', () => {
    beforeEach(() => {
      mockedVerify.mockResolvedValue({ valid: false, error: 'Token expired' })
    })

    it('rules/[id] GET', async () => {
      const res = await rulesIdGET(requestWithAuth(URL_RULE_ID, 'Bearer bad-token'), {
        params: { id: RULE_ID },
      })
      expect(res.status).toBe(401)
      expect(mockFindById).not.toHaveBeenCalled()
    })

    it('statistics GET', async () => {
      const res = await statisticsGET(requestWithAuth(URL_STATS, 'Bearer bad-token'))
      expect(res.status).toBe(401)
    })

    it('blacklist GET', async () => {
      const res = await blacklistGET(requestWithAuth(URL_BLACKLIST, 'Bearer bad-token'))
      expect(res.status).toBe(401)
    })
  })

  describe('valid JWT but non-admin role → 403', () => {
    beforeEach(() => {
      mockedVerify.mockResolvedValue(
        validResult({ payload: adminPayload({ role: 'user' }) as TokenVerifyResult['payload'] })
      )
    })

    it('rules/[id] GET', async () => {
      const res = await rulesIdGET(requestWithAuth(URL_RULE_ID, 'Bearer user-token'), {
        params: { id: RULE_ID },
      })
      expect(res.status).toBe(403)
      expect(mockFindById).not.toHaveBeenCalled()
    })

    it('statistics GET', async () => {
      const res = await statisticsGET(requestWithAuth(URL_STATS, 'Bearer user-token'))
      expect(res.status).toBe(403)
    })

    it('blacklist GET', async () => {
      const res = await blacklistGET(requestWithAuth(URL_BLACKLIST, 'Bearer user-token'))
      expect(res.status).toBe(403)
    })

    it('roles array containing admin is accepted', async () => {
      mockedVerify.mockResolvedValue(
        validResult({
          payload: adminPayload({ role: 'user', roles: ['admin'] }) as TokenVerifyResult['payload'],
        })
      )
      const res = await statisticsGET(requestWithAuth(URL_STATS, 'Bearer user-token'))
      expect(res.status).toBe(200)
    })
  })

  describe('valid admin JWT → allowed, and userId comes from the token', () => {
    it('rules/[id] GET succeeds', async () => {
      const res = await rulesIdGET(requestWithAuth(URL_RULE_ID, 'Bearer admin-token'), {
        params: { id: RULE_ID },
      })
      expect(res.status).toBe(200)
    })

    it('audit log records the real userId, not a hardcoded admin', async () => {
      mockedVerify.mockResolvedValue(
        validResult({
          payload: adminPayload({ sub: 'real-user-42' }) as TokenVerifyResult['payload'],
        })
      )

      await blacklistPOST(
        requestWithAuth(URL_BLACKLIST, 'Bearer admin-token', {
          method: 'POST',
          body: JSON.stringify({ type: 'ip', value: '1.2.3.4', reason: 'test' }),
        })
      )

      expect(mockAuditCreate).toHaveBeenCalled()
      const auditArgs = mockAuditCreate.mock.calls[0] as unknown[]
      expect(JSON.stringify(auditArgs)).toContain('real-user-42')
    })
  })
})
