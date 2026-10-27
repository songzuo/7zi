/**
 * A2A Registry API Integration Tests
 *
 * Tests for agent registration, unregistration, and status management.
 *
 * 契约对齐说明（与 src/app/api/a2a/registry/** 真实实现一致）：
 *   - 集合路由 GET  /api/a2a/registry  → 200, data = { agents, count }
 *   - 集合路由 POST /api/a2a/registry  → 201, data = { message, agent }；body 必填 name + url
 *   - 单体路由 GET/PUT/DELETE/PATCH /api/a2a/registry/[id]
 *     GET    → 200, data 就是 agent 对象本身（不是 data.agent）
 *     PUT    → 200, data = { message, agent }；不存在 → 404
 *     DELETE → 200, data = { message, id }；不存在 → 404
 *     PATCH  → 200, data = { message, agent }（心跳更新）
 *   - AgentRegistration 字段：id/name/url/capabilities[]/skills[]/status/lastHeartbeat/load?/metadata?
 *     （没有 createdAt，也没有 type 字段）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { agentScheduler } from './mocks/agent-scheduler-compat'
import { GET, POST } from '@/app/api/a2a/registry/route'
import {
  GET as GETAgent,
  PUT,
  DELETE,
  PATCH,
} from '@/app/api/a2a/registry/[id]/route'

// Mock auth
// A2A 路由的鉴权走 src/lib/agents/a2a/auth.ts，
// 它内部用的是 @/lib/auth/service 的 authenticateToken。
// （原测试 mock 的是早已不存在的 @/lib/auth/api-auth。）
vi.mock('@/lib/auth/service', () => ({
  authenticateToken: vi.fn(),
}))

// A2A 的 X-API-Key 方式按 AgentCard 声明的 apiKey securityScheme 校验，
// 合法值从环境变量读（部署时决定）。这里声明测试用的 key。
process.env.A2A_API_KEY = 'test-api-key'

import { authenticateToken } from '@/lib/auth/service'
import { UserRole, UserStatus } from '@/lib/auth/types'

/**
 * 构造 authenticateToken 的成功返回值（真实契约：{ user, context }）
 * 见 src/lib/auth/service.ts:345 —— authenticateToken 返回
 * { user: User, context: UserContext } 或 null。
 */
function authenticatedResult() {
  return {
    user: {
      id: 'user-1',
      email: 'testuser@example.com',
      password: 'hashed-password',
      name: 'testuser',
      role: UserRole.MEMBER,
      roles: [],
      status: UserStatus.ACTIVE,
      permissions: [],
      metadata: {},
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    context: {
      userId: 'user-1',
      email: 'testuser@example.com',
      role: UserRole.MEMBER,
      roles: [],
      permissions: [],
      customPermissions: [],
    },
  }
}

/** 构造一个带有效 Bearer 凭据的请求 */
function authRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(url, {
    ...init,
    headers: {
      Authorization: 'Bearer test-jwt-token-for-a2a-tests',
      ...(init?.headers as Record<string, string> | undefined),
    },
  })
}

/** 构造单体路由的 context（Next.js 15+ 的 params 是 Promise） */
function agentContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

/** AgentRegistration.status 的合法取值 */
const VALID_STATUSES = ['online', 'offline', 'busy'] as const

describe('A2A Registry API - GET /api/a2a/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // A2A 路由自己守门（withA2AAuth），默认给一份有效凭据；
    // 需要匿名访问的用例在自己的 beforeEach 里覆盖成 null。
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
    agentScheduler.clear()
  })

  afterEach(() => {
    agentScheduler.clear()
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(null)

      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.success).toBe(false)
      // 鉴权错误的 error 是对象，不是字符串
      expect(json.error.type).toBe('UNAUTHORIZED')
      expect(typeof json.error.message).toBe('string')
    })

    it('should allow authenticated user to list agents', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())

      // Register a test agent
      agentScheduler.registerAgent('agent-1', 'Test Agent', 'test', ['test-capability'])

      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Agent Listing', () => {
    beforeEach(() => {
      vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
    })

    it('should return empty array when no agents registered', async () => {
      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.agents).toEqual([])
      expect(json.data.count).toBe(0)
    })

    it('should return all registered agents', async () => {
      agentScheduler.registerAgent('agent-1', 'Agent 1', 'type-a', ['cap-a'])
      agentScheduler.registerAgent('agent-2', 'Agent 2', 'type-b', ['cap-b'])
      agentScheduler.registerAgent('agent-3', 'Agent 3', 'type-a', ['cap-a', 'cap-b'])

      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.agents.length).toBe(3)
      expect(json.data.count).toBe(3)
    })

    it('should filter agents by capability', async () => {
      agentScheduler.registerAgent('agent-1', 'Agent 1', 'type-a', ['cap-a'])
      agentScheduler.registerAgent('agent-2', 'Agent 2', 'type-b', ['cap-b'])
      agentScheduler.registerAgent('agent-3', 'Agent 3', 'type-a', ['cap-a', 'cap-b'])

      const request = authRequest('http://localhost/api/a2a/registry?capability=cap-a', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.agents.length).toBe(2)
    })

    it('should return single agent by ID', async () => {
      agentScheduler.registerAgent('agent-1', 'Agent 1', 'type-a', ['cap-a'])

      const request = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'GET',
      })

      const response = await GETAgent(request, agentContext('agent-1'))
      const json = await response.json()

      expect(response.status).toBe(200)
      // 单体路由的 data 就是 agent 对象本身
      expect(json.data.id).toBe('agent-1')
      expect(json.data.name).toBe('Agent 1')
      expect(json.data.url).toBe('http://localhost/agents/agent-1')
      expect(json.data.capabilities).toEqual(['cap-a'])
      expect(VALID_STATUSES).toContain(json.data.status)
      expect(typeof json.data.lastHeartbeat).toBe('string')
    })

    it('should return 404 for non-existent agent ID', async () => {
      const request = authRequest('http://localhost/api/a2a/registry/non-existent', {
        method: 'GET',
      })

      const response = await GETAgent(request, agentContext('non-existent'))
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
      expect(json.error.type).toBe('NOT_FOUND')
    })
  })
})

describe('A2A Registry API - POST /api/a2a/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agentScheduler.clear()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
  })

  afterEach(() => {
    agentScheduler.clear()
    vi.restoreAllMocks()
  })

  describe('Validation', () => {
    it('should return 400 when name is missing', async () => {
      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'http://localhost:3000/agents/agent-1',
          capabilities: ['cap-a'],
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.type).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when url is missing', async () => {
      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          capabilities: ['cap-a'],
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.type).toBe('VALIDATION_ERROR')
    })

    it('should allow capabilities to be omitted and default to empty array', async () => {
      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          url: 'http://localhost:3000/agents/agent-1',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data.agent.capabilities).toEqual([])
      expect(json.data.agent.skills).toEqual([])
    })

    it('should return 400 when capabilities is not an array', async () => {
      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          url: 'http://localhost:3000/agents/agent-1',
          capabilities: 'not-an-array',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.type).toBe('VALIDATION_ERROR')
    })
  })

  describe('Agent Registration', () => {
    it('should register a new agent successfully', async () => {
      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          url: 'http://localhost:3000/agents/agent-1',
          capabilities: ['cap-a', 'cap-b'],
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.agent).toBeDefined()
      expect(json.data.agent.name).toBe('Test Agent')
      expect(json.data.agent.url).toBe('http://localhost:3000/agents/agent-1')
      expect(json.data.agent.status).toBe('online')
      expect(json.data.agent.capabilities).toEqual(['cap-a', 'cap-b'])
    })

    it('should register agent with metadata', async () => {
      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          url: 'http://localhost:3000/agents/agent-1',
          capabilities: ['cap-a'],
          metadata: {
            version: '1.0.0',
            owner: 'test-user',
          },
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data.agent.metadata).toEqual({
        version: '1.0.0',
        owner: 'test-user',
      })
    })

    it('should generate unique agent IDs', async () => {
      const request1 = authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent 1',
          url: 'http://localhost:3000/agents/agent-1',
          capabilities: ['cap-a'],
        }),
      })

      const request2 = authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent 2',
          url: 'http://localhost:3000/agents/agent-2',
          capabilities: ['cap-a'],
        }),
      })

      const response1 = await POST(request1)
      const response2 = await POST(request2)

      const json1 = await response1.json()
      const json2 = await response2.json()

      expect(json1.data.agent.id).toBeTruthy()
      expect(json2.data.agent.id).toBeTruthy()
      expect(json1.data.agent.id).not.toBe(json2.data.agent.id)
    })

    it('should set initial status to online', async () => {
      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          url: 'http://localhost:3000/agents/agent-1',
          capabilities: ['cap-a'],
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.data.agent.status).toBe('online')
    })

    it('should record last heartbeat as a valid ISO timestamp', async () => {
      const beforeRegister = Date.now()

      const request = authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Agent',
          url: 'http://localhost:3000/agents/agent-1',
          capabilities: ['cap-a'],
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      const afterRegister = Date.now()

      const heartbeat = json.data.agent.lastHeartbeat
      // 是合法的 ISO 8601 时间字符串
      expect(typeof heartbeat).toBe('string')
      expect(new Date(heartbeat).toISOString()).toBe(heartbeat)
      // 且落在注册前后区间内
      expect(Date.parse(heartbeat)).toBeGreaterThanOrEqual(beforeRegister)
      expect(Date.parse(heartbeat)).toBeLessThanOrEqual(afterRegister)
    })
  })
})

describe('A2A Registry API - PUT /api/a2a/registry/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agentScheduler.clear()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
    agentScheduler.registerAgent('agent-1', 'Test Agent', 'test', ['cap-a'])
  })

  afterEach(() => {
    agentScheduler.clear()
    vi.restoreAllMocks()
  })

  describe('Validation', () => {
    it('should return 404 when agent id is missing from the path', async () => {
      const request = authRequest('http://localhost/api/a2a/registry/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'busy',
        }),
      })

      const response = await PUT(request, agentContext(''))
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error.type).toBe('NOT_FOUND')
    })

    it('should keep existing fields when status is not provided', async () => {
      const request = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-1',
        }),
      })

      const response = await PUT(request, agentContext('agent-1'))
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.agent.status).toBe('online')
      expect(json.data.agent.name).toBe('Test Agent')
      expect(json.data.agent.capabilities).toEqual(['cap-a'])
    })

    it('should return 400 for invalid status', async () => {
      const request = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'invalid-status',
        }),
      })

      const response = await PUT(request, agentContext('agent-1'))
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.type).toBe('VALIDATION_ERROR')
    })

    it('should return 404 for non-existent agent', async () => {
      const request = authRequest('http://localhost/api/a2a/registry/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'busy',
        }),
      })

      const response = await PUT(request, agentContext('non-existent'))
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error.type).toBe('NOT_FOUND')
    })
  })

  describe('Status Updates', () => {
    it('should update agent status to busy', async () => {
      const request = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'busy',
        }),
      })

      const response = await PUT(request, agentContext('agent-1'))
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.agent.status).toBe('busy')
    })

    it('should update agent status to online', async () => {
      const request = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'online',
        }),
      })

      const response = await PUT(request, agentContext('agent-1'))
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.agent.status).toBe('online')
    })

    it('should update agent status to offline', async () => {
      const request = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'offline',
        }),
      })

      const response = await PUT(request, agentContext('agent-1'))
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.agent.status).toBe('offline')
    })

    it('should update agent name and url', async () => {
      const request = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Renamed Agent',
          url: 'http://localhost:3000/agents/renamed',
          capabilities: ['cap-b'],
        }),
      })

      const response = await PUT(request, agentContext('agent-1'))
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.agent.name).toBe('Renamed Agent')
      expect(json.data.agent.url).toBe('http://localhost:3000/agents/renamed')
      expect(json.data.agent.capabilities).toEqual(['cap-b'])
      expect(json.data.agent.id).toBe('agent-1')
    })

    it('should update lastHeartbeat on heartbeat refresh', async () => {
      const beforeUpdate = Date.now()

      const request = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await PATCH(request, agentContext('agent-1'))
      const json = await response.json()

      const afterUpdate = Date.now()

      expect(response.status).toBe(200)
      const heartbeat = json.data.agent.lastHeartbeat
      expect(new Date(heartbeat).toISOString()).toBe(heartbeat)
      expect(Date.parse(heartbeat)).toBeGreaterThanOrEqual(beforeUpdate)
      expect(Date.parse(heartbeat)).toBeLessThanOrEqual(afterUpdate)
    })
  })
})

describe('A2A Registry API - DELETE /api/a2a/registry/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agentScheduler.clear()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
  })

  afterEach(() => {
    agentScheduler.clear()
    vi.restoreAllMocks()
  })

  describe('Validation', () => {
    it('should return 404 when agent id is missing from the path', async () => {
      const request = authRequest('http://localhost/api/a2a/registry/', {
        method: 'DELETE',
      })

      const response = await DELETE(request, agentContext(''))
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error.type).toBe('NOT_FOUND')
    })

    it('should return 404 for non-existent agent', async () => {
      const request = authRequest('http://localhost/api/a2a/registry/non-existent', {
        method: 'DELETE',
      })

      const response = await DELETE(request, agentContext('non-existent'))
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error.type).toBe('NOT_FOUND')
    })
  })

  describe('Agent Unregistration', () => {
    it('should unregister an agent successfully', async () => {
      agentScheduler.registerAgent('agent-1', 'Test Agent', 'test', ['cap-a'])

      const request = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, agentContext('agent-1'))
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.id).toBe('agent-1')
      expect(json.data.message).toBe('Agent unregistered successfully')
    })

    it('should remove agent from registry', async () => {
      agentScheduler.registerAgent('agent-1', 'Test Agent', 'test', ['cap-a'])

      const deleteRequest = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'DELETE',
      })

      await DELETE(deleteRequest, agentContext('agent-1'))

      const agents = agentScheduler.getAllAgents()
      expect(agents.length).toBe(0)
    })

    it('should handle unregistering already removed agent', async () => {
      agentScheduler.registerAgent('agent-1', 'Test Agent', 'test', ['cap-a'])

      const deleteRequest1 = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'DELETE',
      })

      await DELETE(deleteRequest1, agentContext('agent-1'))

      const deleteRequest2 = authRequest('http://localhost/api/a2a/registry/agent-1', {
        method: 'DELETE',
      })

      const response2 = await DELETE(deleteRequest2, agentContext('agent-1'))
      expect(response2.status).toBe(404)
    })
  })
})

describe('A2A Registry API - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agentScheduler.clear()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
  })

  afterEach(() => {
    agentScheduler.clear()
    vi.restoreAllMocks()
  })

  it('should complete full lifecycle: register, update, unregister', async () => {
    // Register
    const postRequest = authRequest('http://localhost/api/a2a/registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lifecycle Agent',
        url: 'http://localhost:3000/agents/lifecycle',
        capabilities: ['cap-a'],
      }),
    })

    const postResponse = await POST(postRequest)
    const postJson = await postResponse.json()
    const agentId = postJson.data.agent.id

    expect(postResponse.status).toBe(201)
    expect(agentId).toBeTruthy()

    // Update status
    const putRequest = authRequest(`http://localhost/api/a2a/registry/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'busy',
      }),
    })

    const putResponse = await PUT(putRequest, agentContext(agentId))
    const putJson = await putResponse.json()
    expect(putResponse.status).toBe(200)
    expect(putJson.data.agent.status).toBe('busy')

    // Unregister
    const deleteRequest = authRequest(`http://localhost/api/a2a/registry/${agentId}`, {
      method: 'DELETE',
    })

    const deleteResponse = await DELETE(deleteRequest, agentContext(agentId))
    expect(deleteResponse.status).toBe(200)
    expect(agentScheduler.getAllAgents().length).toBe(0)
  })

  it('should list multiple registered agents', async () => {
    await POST(
      authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent 1',
          url: 'http://localhost:3000/agents/agent-1',
          capabilities: ['cap-a'],
        }),
      })
    )

    await POST(
      authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent 2',
          url: 'http://localhost:3000/agents/agent-2',
          capabilities: ['cap-b'],
        }),
      })
    )

    await POST(
      authRequest('http://localhost/api/a2a/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Agent 3',
          url: 'http://localhost:3000/agents/agent-3',
          capabilities: ['cap-a', 'cap-b'],
        }),
      })
    )

    const getRequest = authRequest('http://localhost/api/a2a/registry', {
      method: 'GET',
    })

    const getResponse = await GET(getRequest)
    const getJson = await getResponse.json()

    expect(getResponse.status).toBe(200)
    expect(getJson.data.agents.length).toBe(3)
    expect(getJson.data.count).toBe(3)
  })
})
