/**
 * A2A Queue API Integration Tests
 *
 * Tests for the A2A message queue endpoints:
 *   GET    /api/a2a/queue            - queue status & statistics
 *   POST   /api/a2a/queue            - enqueue a message
 *   DELETE /api/a2a/queue[?agentId=] - remove messages by agent / priority, or clear all
 *
 * ## 为什么整份重写（2026-10-27, T198）
 *
 * 这份测试最早写于 2026-03-29（commit 7d972bd00d），但它断言的
 * 是一套**从未存在过的**「任务调度队列」契约：
 *   - 从 '@/app/api/a2a/queue/route' import PUT —— 该路由从来没有 PUT
 *     （只有 GET / POST / DELETE）。
 *   - 断言响应信封是 { success, data: { tasks, stats, task, taskId } } ——
 *     实现用的是 NextResponse.json，响应体是扁平的
 *     { status, stats, nextMessage, config } / { message, queueSize, queuedMessage }。
 *   - 断言 GET/DELETE 支持 ?id= 查询单个任务、404 未找到任务 ——
 *     实现的 DELETE 只支持 ?agentId= / ?priority= / 全量清空，没有「单任务」概念。
 *
 * 也就是说：这份测试文件从落地那天起就 100% 失败（模块都加载不了），
 * 后来被 compat 层救活也只是让它「跑起来」，断言仍然对不上实现。
 *
 * 修法原则是**以实现为准对齐测试**：实现侧的契约有 docs/API.md、
 * A2A_PROTOCOL_V2_IMPLEMENTATION.md 与 A2A AgentCard 背书，是对外契约；
 * 测试是过时的期望。所以这里按实现重写断言，不改实现、不改对外契约。
 *
 * 实现侧参考：
 *   - src/app/api/a2a/queue/route.ts
 *   - src/lib/agents/a2a/message-queue.ts
 *   - src/lib/agents/a2a/auth.ts（withA2AAuth 的 401 信封）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '@/app/api/a2a/queue/route'
import {
  getMessageQueue,
  resetMessageQueue,
} from '@/lib/agents/a2a/message-queue'

// Mock auth
// A2A 路由的鉴权走 src/lib/agents/a2a/auth.ts，
// 它内部用的是 @/lib/auth/service 的 authenticateToken。
vi.mock('@/lib/auth/service', () => ({
  authenticateToken: vi.fn(),
}))

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

/** 构造一个带 Bearer 凭据的请求 */
function authRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(url, {
    ...init,
    headers: {
      Authorization: 'Bearer test-jwt-token-for-a2a-tests',
      ...(init?.headers as Record<string, string> | undefined),
    },
  })
}

/** 构造一个不带任何凭据的请求 */
function anonRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(url, init)
}

/** POST 一条消息到队列，返回响应体 */
async function enqueue(
  body: Record<string, unknown>,
  status = 201
): Promise<Record<string, unknown>> {
  const request = authRequest('http://localhost/api/a2a/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const response = await POST(request)
  expect(response.status).toBe(status)
  return (await response.json()) as Record<string, unknown>
}

describe('A2A Queue API - GET /api/a2a/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
    resetMessageQueue()
  })

  afterEach(() => {
    resetMessageQueue()
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(null)

      const request = anonRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.success).toBe(false)
      expect(json.error.type).toBe('UNAUTHORIZED')
      expect(typeof json.error.message).toBe('string')
      expect(typeof json.error.timestamp).toBe('string')
    })

    it('should allow authenticated user to read queue status', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Queue Status', () => {
    it('should return status ok and zero total for an empty queue', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.status).toBe('ok')
      expect(json.stats.total).toBe(0)
      expect(json.nextMessage).toBeNull()
    })

    it('should expose all four priority buckets in stats', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(json.stats.byPriority).toEqual({
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
      })
    })

    it('should report the queue configuration', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(json.config.maxRetries).toBe(3)
      expect(json.config.retryDelayMs).toBe(5000)
      expect(json.config.maxQueueSize).toBe(1000)
    })

    it('should count enqueued messages in total stats', async () => {
      await enqueue({ taskId: 'task-1', agentId: 'agent-1' })
      await enqueue({ taskId: 'task-2', agentId: 'agent-1' })

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.stats.total).toBe(2)
      expect(json.stats.byPriority.normal).toBe(2)
    })

    it('should group stats by agent', async () => {
      await enqueue({ taskId: 'task-1', agentId: 'agent-1' })
      await enqueue({ taskId: 'task-2', agentId: 'agent-2' })

      // byAgent 在实现里是 Map，JSON 序列化后是 {}，
      // 所以直接查队列实例的原始统计。
      const stats = getMessageQueue().getStats()
      expect(stats.byAgent.get('agent-1')).toBe(1)
      expect(stats.byAgent.get('agent-2')).toBe(1)
    })

    it('should peek the highest priority message', async () => {
      await enqueue({ taskId: 'task-low', agentId: 'agent-1', priority: 'low' })
      await enqueue({ taskId: 'task-normal', agentId: 'agent-1' })
      await enqueue({ taskId: 'task-critical', agentId: 'agent-1', priority: 'critical' })

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.nextMessage.taskId).toBe('task-critical')
    })

    it('should not dequeue the peeked message', async () => {
      await enqueue({ taskId: 'task-1', agentId: 'agent-1' })

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      await GET(request)

      expect(getMessageQueue().size()).toBe(1)
    })
  })
})

describe('A2A Queue API - POST /api/a2a/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
    resetMessageQueue()
  })

  afterEach(() => {
    resetMessageQueue()
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(null)

      const request = anonRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'task-1', agentId: 'agent-1' }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.success).toBe(false)
      expect(json.error.type).toBe('UNAUTHORIZED')
    })
  })

  describe('Validation', () => {
    it('should return 400 when taskId is missing', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-1',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('Validation error')
    })

    it('should return 400 when agentId is missing', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-1',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('Validation error')
      expect(json.message).toBe('Missing required fields: taskId, agentId')
    })

    it('should reject an unknown priority', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-1',
          agentId: 'agent-1',
          priority: 'urgent',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      // 实现里 priority 只认 low | normal | high | critical，
      // 未知优先级在 enqueue 时抛错 → 500（见报告「遗留项」）。
      expect(response.status).toBe(500)
      expect(json.error).toBe('Failed to enqueue message')
      expect(getMessageQueue().size()).toBe(0)
    })
  })

  describe('Enqueueing', () => {
    it('should enqueue a message successfully', async () => {
      const json = await enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        payload: { data: 'test' },
      })

      expect(json.message).toBe('Message enqueued successfully')
      expect(json.queueSize).toBe(1)
      expect(json.queuedMessage.taskId).toBe('task-1')
      expect(json.queuedMessage.agentId).toBe('agent-1')
      expect(json.queuedMessage.payload).toEqual({ data: 'test' })
    })

    it('should generate an id when none is provided', async () => {
      const json = await enqueue({ taskId: 'task-1', agentId: 'agent-1' })

      expect(typeof json.queuedMessage.id).toBe('string')
      expect(json.queuedMessage.id.length).toBeGreaterThan(0)
    })

    it('should keep a caller supplied id', async () => {
      const json = await enqueue({
        id: 'msg-custom-id',
        taskId: 'task-1',
        agentId: 'agent-1',
      })

      expect(json.queuedMessage.id).toBe('msg-custom-id')
    })

    it('should default priority to normal', async () => {
      const json = await enqueue({ taskId: 'task-1', agentId: 'agent-1' })

      expect(json.queuedMessage.priority).toBe('normal')
    })

    it('should honour a custom priority', async () => {
      const json = await enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        priority: 'high',
      })

      expect(json.queuedMessage.priority).toBe('high')
    })

    it('should default payload to an empty object', async () => {
      const json = await enqueue({ taskId: 'task-1', agentId: 'agent-1' })

      expect(json.queuedMessage.payload).toEqual({})
    })

    it('should default maxAttempts to 3', async () => {
      const json = await enqueue({ taskId: 'task-1', agentId: 'agent-1' })

      expect(json.queuedMessage.maxAttempts).toBe(3)
    })

    it('should honour a custom maxAttempts', async () => {
      const json = await enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        maxAttempts: 5,
      })

      expect(json.queuedMessage.maxAttempts).toBe(5)
    })

    it('should default attempts to 0 and stamp createdAt', async () => {
      const json = await enqueue({ taskId: 'task-1', agentId: 'agent-1' })

      expect(json.queuedMessage.attempts).toBe(0)
      expect(typeof json.queuedMessage.createdAt).toBe('string')
      expect(Number.isNaN(Date.parse(json.queuedMessage.createdAt))).toBe(false)
    })

    it('should keep a caller supplied createdAt', async () => {
      const createdAt = '2026-01-01T00:00:00.000Z'
      const json = await enqueue({
        taskId: 'task-1',
        agentId: 'agent-1',
        createdAt,
      })

      expect(json.queuedMessage.createdAt).toBe(createdAt)
    })

    it('should increase queueSize on each enqueue', async () => {
      const first = await enqueue({ taskId: 'task-1', agentId: 'agent-1' })
      const second = await enqueue({ taskId: 'task-2', agentId: 'agent-1' })

      expect(first.queueSize).toBe(1)
      expect(second.queueSize).toBe(2)
      expect(getMessageQueue().size()).toBe(2)
    })

    it('should keep messages of different agents separate', async () => {
      await enqueue({ taskId: 'task-1', agentId: 'agent-1' })
      await enqueue({ taskId: 'task-2', agentId: 'agent-2' })

      expect(getMessageQueue().getMessagesByAgent('agent-1')).toHaveLength(1)
      expect(getMessageQueue().getMessagesByAgent('agent-2')).toHaveLength(1)
    })
  })
})

describe('A2A Queue API - DELETE /api/a2a/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
    resetMessageQueue()
  })

  afterEach(() => {
    resetMessageQueue()
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(null)

      const request = anonRequest('http://localhost/api/a2a/queue', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.success).toBe(false)
      expect(json.error.type).toBe('UNAUTHORIZED')
    })
  })

  describe('Clearing', () => {
    it('should clear the whole queue when no filter is given', async () => {
      await enqueue({ taskId: 'task-1', agentId: 'agent-1' })
      await enqueue({ taskId: 'task-2', agentId: 'agent-2' })

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.message).toBe('Queue cleared successfully')
      expect(json.queueSize).toBe(0)
      expect(getMessageQueue().size()).toBe(0)
    })

    it('should remove only the messages of the given agent', async () => {
      await enqueue({ taskId: 'task-1', agentId: 'agent-1' })
      await enqueue({ taskId: 'task-2', agentId: 'agent-1' })
      await enqueue({ taskId: 'task-3', agentId: 'agent-2' })

      const request = authRequest('http://localhost/api/a2a/queue?agentId=agent-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.removed).toBe(2)
      expect(json.queueSize).toBe(1)
      expect(getMessageQueue().size()).toBe(1)
    })

    it('should remove nothing when the agent has no messages', async () => {
      await enqueue({ taskId: 'task-1', agentId: 'agent-1' })

      const request = authRequest('http://localhost/api/a2a/queue?agentId=agent-unknown', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.removed).toBe(0)
      expect(json.queueSize).toBe(1)
    })

    it('should remove only the messages of the given priority', async () => {
      await enqueue({ taskId: 'task-1', agentId: 'agent-1', priority: 'high' })
      await enqueue({ taskId: 'task-2', agentId: 'agent-1', priority: 'low' })
      await enqueue({ taskId: 'task-3', agentId: 'agent-1' })

      const request = authRequest('http://localhost/api/a2a/queue?priority=high', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.removed).toBe(1)
      expect(json.queueSize).toBe(2)
      expect(getMessageQueue().size()).toBe(2)
    })

    it('should remove nothing for a priority with no messages', async () => {
      await enqueue({ taskId: 'task-1', agentId: 'agent-1' })

      const request = authRequest('http://localhost/api/a2a/queue?priority=critical', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.removed).toBe(0)
      expect(json.queueSize).toBe(1)
    })
  })
})

describe('A2A Queue API - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
    resetMessageQueue()
  })

  afterEach(() => {
    resetMessageQueue()
    vi.restoreAllMocks()
  })

  it('should complete a full enqueue -> observe -> clear lifecycle', async () => {
    const enqueued = await enqueue({
      taskId: 'task-1',
      agentId: 'agent-1',
      payload: { data: 'test' },
    })
    const messageId = enqueued.queuedMessage.id as string

    // Observe the queue
    const getRequest = authRequest('http://localhost/api/a2a/queue', {
      method: 'GET',
    })
    const getResponse = await GET(getRequest)
    const getJson = await getResponse.json()

    expect(getResponse.status).toBe(200)
    expect(getJson.stats.total).toBe(1)
    expect(getJson.nextMessage.id).toBe(messageId)

    // Clear the queue
    const deleteRequest = authRequest('http://localhost/api/a2a/queue', {
      method: 'DELETE',
    })
    const deleteResponse = await DELETE(deleteRequest)
    const deleteJson = await deleteResponse.json()

    expect(deleteResponse.status).toBe(200)
    expect(deleteJson.queueSize).toBe(0)
    expect(getMessageQueue().size()).toBe(0)
  })

  it('should serve the highest priority message first', async () => {
    await enqueue({ taskId: 'task-low', agentId: 'agent-1', priority: 'low' })
    await enqueue({ taskId: 'task-normal', agentId: 'agent-1', priority: 'normal' })
    await enqueue({ taskId: 'task-high', agentId: 'agent-1', priority: 'high' })
    await enqueue({ taskId: 'task-critical', agentId: 'agent-1', priority: 'critical' })

    const getRequest = authRequest('http://localhost/api/a2a/queue', {
      method: 'GET',
    })
    const getResponse = await GET(getRequest)
    const getJson = await getResponse.json()

    expect(getJson.stats.total).toBe(4)
    expect(getJson.stats.byPriority).toEqual({
      critical: 1,
      high: 1,
      normal: 1,
      low: 1,
    })
    expect(getJson.nextMessage.taskId).toBe('task-critical')
  })

  it('should support per-agent cleanup without touching other agents', async () => {
    await enqueue({ taskId: 'task-1', agentId: 'agent-1' })
    await enqueue({ taskId: 'task-2', agentId: 'agent-2' })

    const deleteRequest = authRequest('http://localhost/api/a2a/queue?agentId=agent-1', {
      method: 'DELETE',
    })
    await DELETE(deleteRequest)

    expect(getMessageQueue().getMessagesByAgent('agent-1')).toHaveLength(0)
    expect(getMessageQueue().getMessagesByAgent('agent-2')).toHaveLength(1)

    const getRequest = authRequest('http://localhost/api/a2a/queue', {
      method: 'GET',
    })
    const getResponse = await GET(getRequest)
    const getJson = await getResponse.json()

    expect(getJson.stats.total).toBe(1)
    expect(getJson.nextMessage.taskId).toBe('task-2')
  })

  it('should retry a message up to maxAttempts', async () => {
    const enqueued = await enqueue({
      taskId: 'task-1',
      agentId: 'agent-1',
      maxAttempts: 2,
    })
    const messageId = enqueued.queuedMessage.id as string

    expect(getMessageQueue().retry(messageId)).toBe(true)

    const retried = getMessageQueue().getMessagesByAgent('agent-1')[0]
    expect(retried.attempts).toBe(1)
    expect(retried.taskId).toBe('task-1')
    expect(retried.nextRetryAt).toBeDefined()
  })

  it('should stop retrying once maxAttempts is exceeded', async () => {
    const enqueued = await enqueue({
      taskId: 'task-1',
      agentId: 'agent-1',
      maxAttempts: 1,
    })
    const messageId = enqueued.queuedMessage.id as string

    expect(getMessageQueue().retry(messageId)).toBe(true)
    expect(getMessageQueue().retry(messageId)).toBe(false)
  })
})
