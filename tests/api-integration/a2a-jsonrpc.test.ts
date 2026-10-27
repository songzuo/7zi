/**
 * A2A JSON-RPC API Integration Tests
 *
 * 目标端点：POST /api/a2a/jsonrpc （+ OPTIONS 预检）
 *
 * ## 为什么整份重写（2026-10-27, T199）
 *
 * 这份测试最早写于 2026-03-29，但它断言的是一套**从未存在过**的 JSON-RPC 契约：
 *   - 方法名 `agent.list` / `agent.get` / `agent.discover` / `agent.heartbeat`
 *   - 方法名 `task.create` / `task.get` / `task.status` / `task.update` / `task.cancel`
 *   - 方法名 `queue.stats`
 *   真正的实现（A2AProtocol v0.3.0）根本没有这些方法，
 *   真实方法是：message/send、message/stream、tasks/get、tasks/list、tasks/cancel、
 *   agent/getCard、agent/getExtendedCard。
 *   → 所有这些方法在实现里都会走 default 分支，返回 -32601 Method not found。
 *
 *   - 响应信封断言成了 `{ success: true, data: { task, taskId, agents, stats } }`，
 *     但实现返回的是**裸 JSON-RPC 信封**：`{ jsonrpc, result | error, id }`。
 *     （`data`/`success` 那套是 /api/a2a/registry、/api/a2a/queue 的 REST 契约。）
 *
 *   - 错误码断言成 -32602（Invalid params）/ -32002（agent not found）/
 *     -32004（task not found），实现的真实映射是：
 *       - 结构性/schema 错误 → -32600 "Invalid request format"
 *       - 未知方法           → -32601 "Method not found: <method>"
 *       - JSON 解析失败      → -32700 "Parse error"
 *       - handler 内部抛错   → -32603（消息里保留原始原因，
 *         例如 "Task not found: xxx" / "Missing required field: id"）
 *     注：实现里 A2AErrorCodes.TASK_NOT_FOUND(-32001) 被 createA2AError 挂到
 *     Error 上，但 handleRequest 的 catch 只取 error.message，统一包成 -32603。
 *     这一点由实现侧自己的单测背书
 *     （src/lib/agents/a2a/__tests__/jsonrpc-handler.test.ts 明确断言 -32603），
 *     所以这里以实现为准，不改实现。
 *
 *   - HTTP 状态码：JSON-RPC 错误码 → 状态码由 determineErrorStatusCode 映射
 *     （-32700/-32600/-32602 → 400，-32601 → 404，-32603 及其他 → 500）。
 *
 * 修法原则是**以实现为准对齐测试**：实现侧的契约有 A2A_PROTOCOL 文档、
 * AgentCard 与实现侧自己的单测背书，是对外契约；测试是过时的期望。
 * 所以这里按实现重写断言，不改实现、不改对外契约、不 skip 任何断言。
 *
 * 实现侧参考：
 *   - src/app/api/a2a/jsonrpc/route.ts
 *   - src/lib/agents/a2a/jsonrpc-handler.ts
 *   - src/lib/agents/a2a/task-store.ts
 *   - src/lib/agents/a2a/executor.ts
 *   - src/lib/agents/a2a/agent-card.ts
 *   - src/lib/agents/a2a/auth.ts（withA2AAuth 的 401 信封）
 *   - src/lib/api/validation.ts（jsonRpcRequestSchema）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, OPTIONS } from '@/app/api/a2a/jsonrpc/route'
import { getTaskStore } from '@/lib/agents/a2a/task-store'

// A2A 路由的鉴权走 src/lib/agents/a2a/auth.ts，
// 它内部用的是 @/lib/auth/service 的 authenticateToken。
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
 * 见 src/lib/auth/service.ts —— authenticateToken 返回
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

/** 构造一个带有效 Bearer 凭据的 JSON-RPC 请求 */
function rpcRequest(body: unknown, init?: RequestInit): NextRequest {
  return new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
    method: 'POST',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-jwt-token-for-a2a-jsonrpc-tests',
      ...(init?.headers ?? {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

/** 构造一个不带任何凭据的请求 */
function anonymousRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

/** 统一的 JSON-RPC 请求体 */
function rpcBody(method: string, params?: unknown, id: string | number = 'test-1') {
  return { jsonrpc: '2.0', method, params, id }
}

/** 发送一条 JSON-RPC 请求并返回 { status, json } */
async function callRpc(body: unknown, init?: RequestInit) {
  const response = await POST(rpcRequest(body, init))
  const json = await response.json()
  return { status: response.status, json }
}

/** 发送一条 JSON-RPC 请求并返回 { status, json, headers } */
async function callRpcWithHeaders(body: unknown, init?: RequestInit) {
  const response = await POST(rpcRequest(body, init))
  const json = await response.json()
  return { status: response.status, json, headers: response.headers }
}

/** 读取 result 中的 Task 结构（未做任何类型断言的原始对象） */
function resultTask(json: { result?: unknown }): {
  kind: string
  id: string
  contextId?: string
  status: { state: string; timestamp: string; message?: string }
  history?: Array<{ messageId: string; role: string; parts: unknown[] }>
  artifacts?: Array<{ artifactId: string; name?: string; parts: unknown[] }>
} {
  return json.result as never
}

describe('A2A JSON-RPC API - Authentication', () => {
  beforeEach(() => {
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult() as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthenticated requests', async () => {
    const response = await POST(anonymousRequest(rpcBody('agent/getCard')))
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error.type).toBe('UNAUTHORIZED')
    expect(json.error.message).toBe('Missing or invalid credentials')
  })

  it('should accept a valid X-API-Key credential', async () => {
    const response = await POST(
      rpcRequest(rpcBody('agent/getCard'), {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
      })
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.result.name).toBe('7zi Agent')
  })

  it('should return 401 for an invalid X-API-Key credential', async () => {
    // 注意：这里必须只带 X-API-Key，不能同时带 Bearer，
    // 否则 Bearer 分支先命中就放行了（auth.ts 的判定顺序）。
    const response = await POST(
      new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'wrong-key',
        },
        body: JSON.stringify(rpcBody('agent/getCard')),
      })
    )

    expect(response.status).toBe(401)
  })
})

describe('A2A JSON-RPC API - Protocol Validation', () => {
  beforeEach(() => {
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult() as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('JSON-RPC 2.0 Format', () => {
    it('should reject requests without jsonrpc version', async () => {
      const { status, json } = await callRpc({ method: 'agent/getCard', id: 'no-version' })

      expect(status).toBe(400)
      expect(json.jsonrpc).toBe('2.0')
      expect(json.error.code).toBe(-32600)
      expect(json.error.message).toBe('Invalid request format')
      expect(json.error.data.jsonrpc).toContain('expected "2.0"')
      expect(json.id).toBe('no-version')
    })

    it('should reject requests with wrong jsonrpc version', async () => {
      const { status, json } = await callRpc({
        jsonrpc: '1.0',
        method: 'agent/getCard',
        id: 'bad-version',
      })

      expect(status).toBe(400)
      expect(json.error.code).toBe(-32600)
      expect(json.error.message).toBe('Invalid request format')
      expect(json.error.data.jsonrpc).toContain('expected "2.0"')
    })

    it('should reject requests without method', async () => {
      const { status, json } = await callRpc({ jsonrpc: '2.0', id: 'no-method' })

      expect(status).toBe(400)
      expect(json.error.code).toBe(-32600)
      expect(json.error.message).toBe('Invalid request format')
      expect(json.error.data.method).toBeDefined()
    })

    it('should reject requests with an empty method name', async () => {
      const { status, json } = await callRpc({ jsonrpc: '2.0', method: '', id: 'empty-method' })

      expect(status).toBe(400)
      expect(json.error.code).toBe(-32600)
      expect(json.error.data.method).toBeDefined()
    })

    it('should reject a non-object request body', async () => {
      const { status, json } = await callRpc('"just-a-string"')

      expect(status).toBe(400)
      expect(json.error.code).toBe(-32600)
      expect(json.error.message).toBe('Invalid request')
      expect(json.id).toBeNull()
    })

    it('should handle invalid JSON', async () => {
      const { status, json } = await callRpc('{ this is not json ')

      expect(status).toBe(400)
      expect(json.jsonrpc).toBe('2.0')
      expect(json.error.code).toBe(-32700)
      expect(json.error.message).toBe('Parse error')
      expect(json.id).toBeNull()
    })

    it('should return jsonrpc version in response', async () => {
      const { json } = await callRpc(rpcBody('agent/getCard'))

      expect(json.jsonrpc).toBe('2.0')
    })

    it('should echo request ID in response', async () => {
      const { json } = await callRpc(rpcBody('agent/getCard', {}, 'echo-me'))

      expect(json.id).toBe('echo-me')
    })

    it('should handle numeric IDs', async () => {
      const { json } = await callRpc(rpcBody('agent/getCard', {}, 42))

      expect(json.id).toBe(42)
    })

    it('should use a null id when the request has no id', async () => {
      const { json } = await callRpc({ jsonrpc: '2.0', method: 'agent/getCard' })

      expect(json.id).toBeNull()
    })
  })

  describe('Batch Requests', () => {
    it('should handle a batch of requests', async () => {
      const { status, json } = await callRpc([
        rpcBody('agent/getCard', {}, 'batch-1'),
        rpcBody('tasks/list', {}, 'batch-2'),
      ])

      expect(status).toBe(200)
      expect(Array.isArray(json)).toBe(true)
      expect(json).toHaveLength(2)
      expect(json[0].id).toBe('batch-1')
      expect(json[0].result.name).toBe('7zi Agent')
      expect(json[1].id).toBe('batch-2')
      expect(json[1].result).toHaveProperty('tasks')
    })

    it('should reject an empty batch', async () => {
      const { status, json } = await callRpc([])

      expect(status).toBe(400)
      expect(json.error.code).toBe(-32600)
      expect(json.error.message).toBe('Invalid request - empty batch')
    })

    it('should reject the whole batch when one entry is invalid', async () => {
      // 实现侧用 jsonRpcBatchRequestSchema = z.array(jsonRpcRequestSchema).min(1)
      // 整体校验，只要有一个 entry 不合法，整批都被拒，
      // 返回一个只含单个错误对象的数组。
      const { status, json } = await callRpc([rpcBody('agent/getCard', {}, 'ok-id'), { id: 'x' }])

      expect(status).toBe(200)
      expect(Array.isArray(json)).toBe(true)
      expect(json).toHaveLength(1)
      expect(json[0].jsonrpc).toBe('2.0')
      expect(json[0].error.code).toBe(-32600)
      expect(json[0].error.message).toBe('Invalid batch request format')
      expect(json[0].id).toBeNull()
    })
  })
})

describe('A2A JSON-RPC API - Agent Card Methods', () => {
  beforeEach(() => {
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult() as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('agent/getCard', () => {
    it('should return the public agent card', async () => {
      const { status, json } = await callRpc(rpcBody('agent/getCard'))

      expect(status).toBe(200)
      expect(json.result.name).toBe('7zi Agent')
      expect(json.result.version).toBe('1.0.0')
      expect(json.result.protocolVersion).toBe('0.3.0')
      expect(json.result.url).toContain('/api/a2a/jsonrpc')
      expect(Array.isArray(json.result.skills)).toBe(true)
      expect(json.result.skills.length).toBeGreaterThan(0)
    })

    it('should declare its capabilities', async () => {
      const { json } = await callRpc(rpcBody('agent/getCard'))

      expect(json.result.capabilities.streaming).toBe(true)
      expect(json.result.capabilities.pushNotifications).toBe(false)
      expect(json.result.capabilities.extendedAgentCard).toBe(true)
    })

    it('should declare the apiKey security scheme', async () => {
      const { json } = await callRpc(rpcBody('agent/getCard'))

      expect(json.result.securitySchemes.apiKey.name).toBe('X-API-Key')
      expect(json.result.securitySchemes.bearerAuth.scheme).toBe('bearer')
    })
  })

  describe('agent/getExtendedCard', () => {
    it('should return the extended agent card for authenticated users', async () => {
      const { status, json } = await callRpc(rpcBody('agent/getExtendedCard'))

      expect(status).toBe(200)
      expect(json.result.name).toBe('7zi Agent')
      const adminSkill = json.result.skills.find((s: { id: string }) => s.id === 'admin')
      expect(adminSkill).toBeDefined()
      expect(adminSkill.name).toBe('Admin Operations')
    })
  })
})

describe('A2A JSON-RPC API - Message Methods', () => {
  beforeEach(() => {
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult() as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('message/send', () => {
    it('should create and execute a task', async () => {
      const { status, json } = await callRpc(
        rpcBody('message/send', {
          message: {
            kind: 'message',
            messageId: 'msg-hello-1',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello there' }],
          },
        })
      )

      expect(status).toBe(200)
      const task = resultTask(json)
      expect(task.kind).toBe('task')
      expect(task.id).toBeDefined()
      expect(task.contextId).toBeDefined()
      expect(task.status.state).toBe('completed')
      expect(task.history).toHaveLength(1)
      expect(task.history?.[0].messageId).toBe('msg-hello-1')
      expect(task.history?.[0].role).toBe('user')
    })

    it('should store the response artifact on the task', async () => {
      const { json } = await callRpc(
        rpcBody('message/send', {
          message: {
            kind: 'message',
            messageId: 'msg-hello-2',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
          },
        })
      )
      const taskId = resultTask(json).id

      const { json: getJson } = await callRpc(rpcBody('tasks/get', { id: taskId }))
      const stored = resultTask(getJson)
      expect(stored.artifacts?.length).toBeGreaterThan(0)
      const artifact = stored.artifacts![0]
      expect(artifact.artifactId).toBeDefined()
      expect(artifact.name).toBe('response')
      const textPart = artifact.parts.find(
        (p: { kind: string; text?: string }) => p.kind === 'text'
      ) as { kind: string; text: string }
      expect(textPart.text).toContain('Hello')
    })

    it('should use the caller supplied contextId', async () => {
      const { json } = await callRpc(
        rpcBody('message/send', {
          message: {
            kind: 'message',
            messageId: 'msg-ctx-1',
            role: 'user',
            contextId: 'ctx-explicit',
            parts: [{ kind: 'text', text: 'Hello' }],
          },
        })
      )

      expect(resultTask(json).contextId).toBe('ctx-explicit')
    })

    it('should honour the blocking configuration', async () => {
      const { status, json } = await callRpc(
        rpcBody('message/send', {
          message: {
            kind: 'message',
            messageId: 'msg-blocking-1',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
          },
          configuration: { blocking: true },
        })
      )

      expect(status).toBe(200)
      expect(resultTask(json).status.state).toBe('completed')
    })

    it('should return an error when message.messageId is missing', async () => {
      const { status, json } = await callRpc(
        rpcBody('message/send', {
          message: { kind: 'message', role: 'user', parts: [{ kind: 'text', text: 'Hi' }] },
        })
      )

      expect(status).toBe(500)
      expect(json.error.code).toBe(-32603)
      expect(json.error.message).toContain('Missing required field: message.messageId')
    })
  })

  describe('message/stream', () => {
    it('should return the task for a streamed message', async () => {
      const { status, json } = await callRpc(
        rpcBody('message/stream', {
          message: {
            kind: 'message',
            messageId: 'msg-stream-1',
            role: 'user',
            parts: [{ kind: 'text', text: 'Hello' }],
          },
        })
      )

      expect(status).toBe(200)
      const task = resultTask(json)
      expect(task.kind).toBe('task')
      expect(task.status.state).toBe('completed')
    })
  })
})

describe('A2A JSON-RPC API - Task Methods', () => {
  beforeEach(() => {
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult() as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('tasks/get', () => {
    it('should get task by ID', async () => {
      const created = getTaskStore().createTask('ctx-get-1')
      const { status, json } = await callRpc(rpcBody('tasks/get', { id: created.id }))

      expect(status).toBe(200)
      const task = resultTask(json)
      expect(task.id).toBe(created.id)
      expect(task.contextId).toBe('ctx-get-1')
      expect(task.status.state).toBe('submitted')
    })

    it('should apply the history length limit', async () => {
      const store = getTaskStore()
      const created = store.createTask('ctx-history-1')
      store.addMessage(created.id, {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'one' }],
      })
      store.addMessage(created.id, {
        kind: 'message',
        messageId: 'msg-2',
        role: 'agent',
        parts: [{ kind: 'text', text: 'two' }],
      })

      const { json } = await callRpc(
        rpcBody('tasks/get', { id: created.id, historyLength: 1 })
      )
      const task = resultTask(json)

      expect(task.history).toHaveLength(1)
      expect(task.history?.[0].messageId).toBe('msg-2')
    })

    it('should return an error when id is missing', async () => {
      const { status, json } = await callRpc(rpcBody('tasks/get', {}))

      expect(status).toBe(500)
      expect(json.error.code).toBe(-32603)
      expect(json.error.message).toContain('Missing required field: id')
    })

    it('should return an error when the task does not exist', async () => {
      const { status, json } = await callRpc(
        rpcBody('tasks/get', { id: 'does-not-exist-at-all' })
      )

      expect(status).toBe(500)
      expect(json.error.code).toBe(-32603)
      expect(json.error.message).toContain('Task not found: does-not-exist-at-all')
    })
  })

  describe('tasks/list', () => {
    it('should list tasks', async () => {
      const store = getTaskStore()
      store.createTask('ctx-list-1')
      store.createTask('ctx-list-1')

      const { status, json } = await callRpc(rpcBody('tasks/list', {}))

      expect(status).toBe(200)
      expect(Array.isArray(json.result.tasks)).toBe(true)
      expect(json.result.tasks.length).toBeGreaterThanOrEqual(2)
      expect(json.result.pageSize).toBe(50)
      expect(json.result.totalSize).toBeGreaterThanOrEqual(2)
      expect(typeof json.result.nextPageToken).toBe('string')
    })

    it('should filter tasks by contextId', async () => {
      const store = getTaskStore()
      store.createTask('ctx-filter-match')
      store.createTask('ctx-filter-other')

      const { json } = await callRpc(rpcBody('tasks/list', { contextId: 'ctx-filter-match' }))

      expect(json.result.tasks.length).toBe(1)
      expect(json.result.tasks[0].contextId).toBe('ctx-filter-match')
    })

    it('should filter tasks by status', async () => {
      const store = getTaskStore()
      const submitted = store.createTask('ctx-status-filter')
      store.updateTaskStatus(submitted.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })
      store.createTask('ctx-status-filter')

      const { json } = await callRpc(rpcBody('tasks/list', { status: 'completed' }))

      expect(json.result.tasks.length).toBeGreaterThanOrEqual(1)
      expect(
        json.result.tasks.every((t: { status: { state: string } }) => t.status.state === 'completed')
      ).toBe(true)
    })

    it('should paginate tasks', async () => {
      const store = getTaskStore()
      for (let i = 0; i < 3; i++) {
        store.createTask('ctx-page-1')
      }

      const { json } = await callRpc(rpcBody('tasks/list', { pageSize: 2 }))
      expect(json.result.tasks).toHaveLength(2)
      expect(json.result.pageSize).toBe(2)
      expect(json.result.nextPageToken).not.toBe('')
    })

    it('should exclude artifacts unless includeArtifacts is true', async () => {
      const store = getTaskStore()
      const created = store.createTask('ctx-artifacts-1')
      store.addArtifact(created.id, {
        artifactId: 'artifact-1',
        name: 'response',
        parts: [{ kind: 'text', text: 'hi' }],
      })

      const { json: withoutArtifacts } = await callRpc(rpcBody('tasks/list', {}))
      const listed = withoutArtifacts.result.tasks.find(
        (t: { id: string }) => t.id === created.id
      )
      expect(listed).toBeDefined()
      expect(listed.artifacts).toBeUndefined()

      const { json: withArtifacts } = await callRpc(
        rpcBody('tasks/list', { includeArtifacts: true })
      )
      const listedWith = withArtifacts.result.tasks.find((t: { id: string }) => t.id === created.id)
      expect(listedWith.artifacts).toHaveLength(1)
    })
  })

  describe('tasks/cancel', () => {
    it('should cancel a task', async () => {
      const store = getTaskStore()
      const created = store.createTask('ctx-cancel-1')

      const { status, json } = await callRpc(rpcBody('tasks/cancel', { id: created.id }))

      expect(status).toBe(200)
      expect(json.result.id).toBe(created.id)
      expect(json.result.status.state).toBe('canceled')
    })

    it('should return an error when id is missing', async () => {
      const { status, json } = await callRpc(rpcBody('tasks/cancel', {}))

      expect(status).toBe(500)
      expect(json.error.code).toBe(-32603)
      expect(json.error.message).toContain('Missing required field: id')
    })

    it('should return an error when the task does not exist', async () => {
      const { status, json } = await callRpc(
        rpcBody('tasks/cancel', { id: 'no-such-task-to-cancel' })
      )

      expect(status).toBe(500)
      expect(json.error.code).toBe(-32603)
      expect(json.error.message).toContain('Task not found: no-such-task-to-cancel')
    })

    it('should refuse to cancel a task in a terminal state', async () => {
      const store = getTaskStore()
      const created = store.createTask('ctx-cancel-2')
      store.updateTaskStatus(created.id, {
        state: 'completed',
        timestamp: new Date().toISOString(),
      })

      const { status, json } = await callRpc(rpcBody('tasks/cancel', { id: created.id }))

      expect(status).toBe(500)
      expect(json.error.code).toBe(-32603)
      expect(json.error.message).toContain('Task cannot be canceled in state: completed')
    })
  })
})

describe('A2A JSON-RPC API - Unknown Methods', () => {
  beforeEach(() => {
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult() as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return method not found error', async () => {
    const { status, json } = await callRpc(rpcBody('unknown.method', {}, 'unknown-1'))

    expect(status).toBe(404)
    expect(json.jsonrpc).toBe('2.0')
    expect(json.error.code).toBe(-32601)
    expect(json.error.message).toBe('Method not found: unknown.method')
    expect(json.id).toBe('unknown-1')
  })

  it('should return method not found for the legacy agent.* method names', async () => {
    for (const method of [
      'agent.list',
      'agent.get',
      'agent.discover',
      'agent.heartbeat',
      'task.create',
      'task.get',
      'task.status',
      'task.update',
      'task.cancel',
      'queue.stats',
    ]) {
      const { status, json } = await callRpc(rpcBody(method, {}, method))
      expect(status).toBe(404)
      expect(json.error.code).toBe(-32601)
      expect(json.error.message).toBe(`Method not found: ${method}`)
    }
  })
})

describe('A2A JSON-RPC API - CORS Support', () => {
  it('should handle OPTIONS request', async () => {
    const response = await OPTIONS()

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
  })

  it('should set CORS headers on POST responses', async () => {
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult() as never)
    const { headers } = await callRpcWithHeaders(rpcBody('agent/getCard'))

    expect(headers.get('Access-Control-Allow-Origin')).toBeTruthy()
    expect(headers.get('Access-Control-Allow-Methods')).toContain('POST')

    vi.clearAllMocks()
  })
})

describe('A2A JSON-RPC API - Integration Tests', () => {
  beforeEach(() => {
    vi.mocked(authenticateToken).mockResolvedValue(authenticatedResult() as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should complete full task lifecycle via JSON-RPC', async () => {
    // 1. create
    const create = await callRpc(
      rpcBody('message/send', {
        message: {
          kind: 'message',
          messageId: 'lifecycle-msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: 'Hello lifecycle' }],
        },
      })
    )
    expect(create.status).toBe(200)
    const taskId = resultTask(create.json).id
    expect(taskId).toBeDefined()

    // 2. read back
    const get = await callRpc(rpcBody('tasks/get', { id: taskId }))
    expect(get.status).toBe(200)
    expect(resultTask(get.json).id).toBe(taskId)

    // 3. list
    const list = await callRpc(rpcBody('tasks/list', {}))
    expect(list.status).toBe(200)
    expect(
      list.json.result.tasks.some((t: { id: string }) => t.id === taskId)
    ).toBe(true)

    // 4. cancel
    // 注意：message/send 走的是同步执行，任务在返回时已经是 'completed'
    // 终态，而实现侧明确拒绝取消终态任务（'Task cannot be canceled in state: completed'）。
    // 所以这里另建一个非终态任务来验证取消链路。
    const cancellable = getTaskStore().createTask('ctx-lifecycle-cancel')
    const cancel = await callRpc(rpcBody('tasks/cancel', { id: cancellable.id }))
    expect(cancel.status).toBe(200)
    expect(cancel.json.result.status.state).toBe('canceled')

    // 5. verify the new state
    const after = await callRpc(rpcBody('tasks/get', { id: cancellable.id }))
    expect(resultTask(after.json).status.state).toBe('canceled')
  })

  it('should handle multiple sequential requests', async () => {
    const first = await callRpc(
      rpcBody('message/send', {
        message: {
          kind: 'message',
          messageId: 'seq-msg-1',
          role: 'user',
          parts: [{ kind: 'text', text: 'first' }],
        },
      })
    )
    expect(first.status).toBe(200)

    const second = await callRpc(
      rpcBody('message/send', {
        message: {
          kind: 'message',
          messageId: 'seq-msg-2',
          role: 'user',
          parts: [{ kind: 'text', text: 'second' }],
        },
      })
    )
    expect(second.status).toBe(200)

    const list = await callRpc(rpcBody('tasks/list', {}))
    expect(list.status).toBe(200)
    expect(list.json.result.totalSize).toBeGreaterThanOrEqual(2)
  })

  it('should maintain request ID correlation', async () => {
    const ids = ['id-1', 'id-2', 'id-3']
    for (const id of ids) {
      const { json } = await callRpc(rpcBody('agent/getCard', {}, id))
      expect(json.id).toBe(id)
      expect(json.result.name).toBe('7zi Agent')
    }
  })

  it('should keep tasks isolated per request id', async () => {
    const a = await callRpc(
      rpcBody('message/send', {
        message: {
          kind: 'message',
          messageId: 'iso-a',
          role: 'user',
          parts: [{ kind: 'text', text: 'a' }],
        },
      })
    )
    const b = await callRpc(
      rpcBody('message/send', {
        message: {
          kind: 'message',
          messageId: 'iso-b',
          role: 'user',
          parts: [{ kind: 'text', text: 'b' }],
        },
      })
    )

    expect(resultTask(a.json).id).not.toBe(resultTask(b.json).id)
  })
})
