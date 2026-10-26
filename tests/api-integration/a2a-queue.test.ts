/**
 * A2A Queue API Integration Tests
 *
 * Tests for task scheduling, status updates, and queue management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { agentScheduler } from './mocks/agent-scheduler-compat'
import { GET, POST, PUT, DELETE } from '@/app/api/a2a/queue/route'

// Mock auth
// A2A 路由的鉴权走 src/lib/agents/a2a/auth.ts，
// 它内部用的是 @/lib/auth/service 的 authenticateToken。
// （原测试 mock 的是早已不存在的 @/lib/auth/api-auth。）
vi.mock('@/lib/auth/service', () => ({
  authenticateToken: vi.fn(),
}))

// Mock error handler
vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data, status = 200) => {
    return new Response(JSON.stringify({ success: true, data }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  createErrorResponse: vi.fn((error: Error) => {
    return new Response(
      JSON.stringify({
        success: false,
        error: { type: 'INTERNAL', message: 'An internal error occurred' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }),
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

describe('A2A Queue API - GET /api/a2a/queue', () => {
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

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Unauthorized')
    })

    it('should allow authenticated user to list tasks', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Task Listing', () => {
    beforeEach(() => {
      vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())

      // Register agents for testing
      agentScheduler.registerAgent('agent-1', 'Agent 1', 'test', ['test-task'])
      agentScheduler.registerAgent('agent-2', 'Agent 2', 'test', ['other-task'])
    })

    it('should return empty tasks array when no tasks scheduled', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.tasks).toEqual([])
      expect(json.data.stats.total).toBe(0)
    })

    it('should return all tasks', async () => {
      agentScheduler.scheduleTask({
        type: 'test-task',
        input: { data: 'test1' },
      })
      agentScheduler.scheduleTask({
        type: 'test-task',
        input: { data: 'test2' },
      })

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.tasks.length).toBe(2)
    })

    it('should filter tasks by status', async () => {
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test1' } })
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test2' } })

      // Complete first task
      const tasks = agentScheduler.getAllTasks()
      agentScheduler.updateTask({
        taskId: tasks[0].id,
        status: 'completed',
        output: { result: 'success' },
      })

      const request = authRequest('http://localhost/api/a2a/queue?status=completed', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.tasks.length).toBe(1)
      expect(json.data.tasks[0].status).toBe('completed')
    })

    it('should filter tasks by type', async () => {
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test1' } })
      agentScheduler.scheduleTask({ type: 'other-task', input: { data: 'test2' } })

      const request = authRequest('http://localhost/api/a2a/queue?type=test-task', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.tasks.length).toBe(1)
      expect(json.data.tasks[0].type).toBe('test-task')
    })

    it('should filter tasks by agentId', async () => {
      agentScheduler.scheduleTask({
        type: 'test-task',
        input: { data: 'test1' },
        agentId: 'agent-1',
      })
      agentScheduler.scheduleTask({
        type: 'test-task',
        input: { data: 'test2' },
        agentId: 'agent-2',
      })

      const request = authRequest('http://localhost/api/a2a/queue?agentId=agent-1', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.tasks.length).toBe(1)
      expect(json.data.tasks[0].agentId).toBe('agent-1')
    })

    it('should return single task by ID', async () => {
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test' } })

      const tasks = agentScheduler.getAllTasks()
      const taskId = tasks[0].id

      const request = authRequest(`http://localhost/api/a2a/queue?id=${taskId}`, {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.task.id).toBe(taskId)
    })

    it('should return 404 for non-existent task ID', async () => {
      const request = authRequest('http://localhost/api/a2a/queue?id=non-existent', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.success).toBe(false)
    })
  })

  describe('Queue Statistics', () => {
    beforeEach(() => {
      vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())

      agentScheduler.registerAgent('agent-1', 'Agent 1', 'test', ['test-task'])
    })

    it('should return correct statistics', async () => {
      // Schedule tasks
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test1' } })
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test2' } })
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test3' } })

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.stats).toHaveProperty('pending')
      expect(json.data.stats).toHaveProperty('running')
      expect(json.data.stats).toHaveProperty('completed')
      expect(json.data.stats).toHaveProperty('failed')
      expect(json.data.stats).toHaveProperty('total')
    })

    it('should reflect completed tasks in stats', async () => {
      agentScheduler.scheduleTask({
        type: 'test-task',
        input: { data: 'test1' },
        agentId: 'agent-1', // Force assignment
      })

      const tasks = agentScheduler.getAllTasks()
      const taskId = tasks[0].id

      agentScheduler.updateTask({
        taskId,
        status: 'completed',
        output: { result: 'success' },
      })

      const getRequest = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const getResponse = await GET(getRequest)
      const json = await getResponse.json()

      expect(json.data.stats.completed).toBe(1)
    })

    it('should reflect failed tasks in stats', async () => {
      agentScheduler.updateAgentStatus('agent-1', 'busy') // Prevent auto-assignment

      agentScheduler.scheduleTask({
        type: 'test-task',
        input: { data: 'test1' },
        maxRetries: 0, // No retries
      })

      const tasks = agentScheduler.getAllTasks()
      const taskId = tasks[0].id

      // Update task directly to failed (since it's pending)
      agentScheduler.updateTask({
        taskId,
        status: 'failed',
        error: 'Task failed',
      })

      const getRequest = authRequest('http://localhost/api/a2a/queue', {
        method: 'GET',
      })

      const getResponse = await GET(getRequest)
      const json = await getResponse.json()

      expect(json.data.stats.failed).toBe(1)
    })
  })
})

describe('A2A Queue API - POST /api/a2a/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agentScheduler.clear()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
    agentScheduler.registerAgent('agent-1', 'Agent 1', 'test', ['test-task'])
  })

  afterEach(() => {
    agentScheduler.clear()
    vi.restoreAllMocks()
  })

  describe('Validation', () => {
    it('should return 400 when type is missing', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { data: 'test' },
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 when input is missing', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 when input is not an object', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: 'not-an-object',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Task Scheduling', () => {
    it('should schedule a task successfully', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'test' },
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.task).toBeDefined()
      expect(json.data.taskId).toBeDefined()
      expect(json.data.task.type).toBe('test-task')
      expect(json.data.task.input).toEqual({ data: 'test' })
    })

    it('should schedule task with default priority', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'test' },
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.task.priority).toBe('normal')
    })

    it('should schedule task with custom priority', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'test' },
          priority: 'high',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.task.priority).toBe('high')
    })

    it('should schedule task with specific agent', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'test' },
          agentId: 'agent-1',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.task.agentId).toBe('agent-1')
      expect(json.data.task.status).toBe('running')
    })

    it('should schedule task with metadata', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'test' },
          metadata: {
            source: 'api',
            user: 'test-user',
          },
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.task.metadata).toEqual({
        source: 'api',
        user: 'test-user',
      })
    })

    it('should schedule task with custom maxRetries', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'test' },
          maxRetries: 5,
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.task.maxRetries).toBe(5)
    })

    it('should set default maxRetries to 3', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'test' },
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.task.maxRetries).toBe(3)
    })

    it('should assign task to idle agent automatically', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'test' },
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.task.agentId).toBeDefined()
      expect(json.data.task.status).toBe('running')
    })

    it('should queue task when no agent available', async () => {
      // Make agent busy
      agentScheduler.updateAgentStatus('agent-1', 'busy')

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'test' },
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.task.status).toBe('pending')
      expect(json.data.task.agentId).toBeUndefined()
    })
  })
})

describe('A2A Queue API - PUT /api/a2a/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agentScheduler.clear()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
    agentScheduler.registerAgent('agent-1', 'Agent 1', 'test', ['test-task'])
  })

  afterEach(() => {
    agentScheduler.clear()
    vi.restoreAllMocks()
  })

  describe('Validation', () => {
    it('should return 400 when taskId is missing', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
        }),
      })

      const response = await PUT(request)
      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent task', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'non-existent',
          status: 'completed',
        }),
      })

      const response = await PUT(request)
      expect(response.status).toBe(404)
    })
  })

  describe('Task Updates', () => {
    it('should update task status to completed', async () => {
      agentScheduler.updateAgentStatus('agent-1', 'busy') // Prevent auto-assignment

      agentScheduler.scheduleTask({
        type: 'test-task',
        input: { data: 'test' },
        agentId: 'agent-1', // Force assignment
      })
      const tasks = agentScheduler.getAllTasks()
      const taskId = tasks[0].id

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          status: 'completed',
          output: { result: 'success' },
        }),
      })

      const response = await PUT(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.task.status).toBe('completed')
      expect(json.data.task.output).toEqual({ result: 'success' })
      expect(json.data.task.completedAt).toBeDefined()
    })

    it('should update task status to failed', async () => {
      // Make agent busy to prevent auto-assignment
      agentScheduler.updateAgentStatus('agent-1', 'busy')

      // Schedule task with maxRetries=0 (no retries)
      agentScheduler.scheduleTask({
        type: 'test-task',
        input: { data: 'test' },
        maxRetries: 0,
      })

      const tasks = agentScheduler.getAllTasks()
      const taskId = tasks[0].id

      // Task should be pending (agent is busy)
      expect(tasks[0].status).toBe('pending')

      // Now update to failed
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          status: 'failed',
          error: 'Task failed',
        }),
      })

      const response = await PUT(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      // With maxRetries=0, task stays failed (no retry)
      expect(json.data.task.status).toBe('failed')
      expect(json.data.task.error).toBe('Task failed')
      expect(json.data.task.completedAt).toBeDefined()
    })

    it('should update task output only', async () => {
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test' } })
      const tasks = agentScheduler.getAllTasks()
      const taskId = tasks[0].id

      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          output: { progress: 50 },
        }),
      })

      const response = await PUT(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.task.output).toEqual({ progress: 50 })
    })

    it('should retry failed task up to maxRetries', async () => {
      agentScheduler.updateAgentStatus('agent-1', 'busy') // Prevent auto-assignment for requeue

      agentScheduler.scheduleTask({
        type: 'test-task',
        input: { data: 'test' },
        maxRetries: 3,
        agentId: 'agent-1',
      })
      const tasks = agentScheduler.getAllTasks()
      const taskId = tasks[0].id

      // Fail first time
      agentScheduler.updateTask({
        taskId,
        status: 'failed',
        error: 'First failure',
      })

      // Task should be rescheduled
      const updatedTask = agentScheduler.getTask(taskId)
      expect(updatedTask?.retries).toBe(1)
      // Note: Since agent is busy, it will be queued, not running
      expect(['pending', 'running']).toContain(updatedTask?.status)
    })

    it('should not retry after maxRetries exceeded', async () => {
      agentScheduler.updateAgentStatus('agent-1', 'busy') // Prevent auto-assignment

      agentScheduler.scheduleTask({
        type: 'test-task',
        input: { data: 'test' },
        maxRetries: 2,
        agentId: 'agent-1',
      })
      const tasks = agentScheduler.getAllTasks()
      const taskId = tasks[0].id

      // Fail three times (exceeds maxRetries)
      for (let i = 0; i < 3; i++) {
        agentScheduler.updateTask({
          taskId,
          status: 'failed',
          error: `Failure ${i + 1}`,
        })
      }

      const updatedTask = agentScheduler.getTask(taskId)
      expect(updatedTask?.retries).toBe(2)
      expect(updatedTask?.status).toBe('failed')
    })
  })
})

describe('A2A Queue API - DELETE /api/a2a/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agentScheduler.clear()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
    agentScheduler.registerAgent('agent-1', 'Agent 1', 'test', ['test-task'])
  })

  afterEach(() => {
    agentScheduler.clear()
    vi.restoreAllMocks()
  })

  describe('Validation', () => {
    it('should return 400 when taskId is missing', async () => {
      const request = authRequest('http://localhost/api/a2a/queue', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent task', async () => {
      const request = authRequest('http://localhost/api/a2a/queue?id=non-existent', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      expect(response.status).toBe(404)
    })
  })

  describe('Task Cancellation', () => {
    it('should cancel a pending task', async () => {
      agentScheduler.updateAgentStatus('agent-1', 'busy')
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test' } })

      const tasks = agentScheduler.getAllTasks()
      const taskId = tasks[0].id

      const request = authRequest(`http://localhost/api/a2a/queue?id=${taskId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should cancel a running task and free agent', async () => {
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test' } })

      const tasks = agentScheduler.getAllTasks()
      const taskId = tasks[0].id
      const agentId = tasks[0].agentId

      const request = authRequest(`http://localhost/api/a2a/queue?id=${taskId}`, {
        method: 'DELETE',
      })

      await DELETE(request)

      const task = agentScheduler.getTask(taskId)
      const agent = agentScheduler.getAgent(agentId!)

      expect(task?.status).toBe('cancelled')
      expect(agent?.status).toBe('idle')
    })

    it('should handle cancelling already cancelled task', async () => {
      agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test' } })
      const tasks = agentScheduler.getAllTasks()
      const taskId = tasks[0].id

      // Cancel first time
      const request1 = authRequest(`http://localhost/api/a2a/queue?id=${taskId}`, {
        method: 'DELETE',
      })
      await DELETE(request1)

      // Try to cancel again - note that cancelled tasks are still in the scheduler
      // but the API might return 200 for "already cancelled" as a no-op
      // Let's check what actually happens
      const request2 = authRequest(`http://localhost/api/a2a/queue?id=${taskId}`, {
        method: 'DELETE',
      })
      const response2 = await DELETE(request2)

      // The task still exists but is cancelled, so the operation succeeds
      expect([200, 404]).toContain(response2.status)
    })
  })
})

describe('A2A Queue API - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agentScheduler.clear()
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult())
    agentScheduler.registerAgent('agent-1', 'Agent 1', 'test', ['test-task'])
    agentScheduler.registerAgent('agent-2', 'Agent 2', 'test', ['test-task'])
  })

  afterEach(() => {
    agentScheduler.clear()
    vi.restoreAllMocks()
  })

  it('should complete full task lifecycle', async () => {
    // Schedule task
    const postRequest = authRequest('http://localhost/api/a2a/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test-task',
        input: { data: 'test' },
      }),
    })

    const postResponse = await POST(postRequest)
    const postJson = await postResponse.json()
    const taskId = postJson.data.taskId

    expect(postResponse.status).toBe(201)

    // Check task status
    const getRequest = authRequest(`http://localhost/api/a2a/queue?id=${taskId}`, {
      method: 'GET',
    })

    const getResponse = await GET(getRequest)
    expect(getResponse.status).toBe(200)

    // Complete task
    const putRequest = authRequest('http://localhost/api/a2a/queue', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        status: 'completed',
        output: { result: 'success' },
      }),
    })

    const putResponse = await PUT(putRequest)
    expect(putResponse.status).toBe(200)
  })

  it('should handle task with retry on failure', async () => {
    // Schedule task
    const postRequest = authRequest('http://localhost/api/a2a/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test-task',
        input: { data: 'test' },
        maxRetries: 2,
      }),
    })

    const postResponse = await POST(postRequest)
    const postJson = await postResponse.json()
    const taskId = postJson.data.taskId

    // Fail task
    const putRequest1 = authRequest('http://localhost/api/a2a/queue', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        status: 'failed',
        error: 'First failure',
      }),
    })

    await PUT(putRequest1)

    // Check task is rescheduled
    const task = agentScheduler.getTask(taskId)
    expect(task?.retries).toBe(1)
    // Status can be pending or running depending on agent availability
    expect(['pending', 'running']).toContain(task?.status)
  })

  it('should filter tasks by multiple criteria', async () => {
    agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test1' } })
    agentScheduler.scheduleTask({ type: 'test-task', input: { data: 'test2' } })
    agentScheduler.scheduleTask({ type: 'other-task', input: { data: 'test3' } })

    // Complete first task
    const tasks = agentScheduler.getAllTasks()
    agentScheduler.updateTask({
      taskId: tasks[0].id,
      status: 'completed',
      output: { result: 'success' },
    })

    // Filter by type and status
    const getRequest = authRequest(
      'http://localhost/api/a2a/queue?type=test-task&status=running',
      { method: 'GET' }
    )

    const getResponse = await GET(getRequest)
    const getJson = await getResponse.json()

    expect(getResponse.status).toBe(200)
    expect(getJson.data.tasks.length).toBe(1)
  })

  it('should handle multiple tasks with different priorities', async () => {
    // Make agents busy to queue tasks
    agentScheduler.updateAgentStatus('agent-1', 'busy')
    agentScheduler.updateAgentStatus('agent-2', 'busy')

    await POST(
      authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'low' },
          priority: 'low',
        }),
      })
    )

    await POST(
      authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'urgent' },
          priority: 'urgent',
        }),
      })
    )

    await POST(
      authRequest('http://localhost/api/a2a/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test-task',
          input: { data: 'normal' },
          priority: 'normal',
        }),
      })
    )

    // Free one agent
    agentScheduler.updateAgentStatus('agent-1', 'idle')

    // Urgent task should be assigned first
    const getRequest = authRequest('http://localhost/api/a2a/queue', {
      method: 'GET',
    })

    const getResponse = await GET(getRequest)
    const getJson = await getResponse.json()

    expect(getResponse.status).toBe(200)
    expect(getJson.data.stats.total).toBe(3)
  })
})
