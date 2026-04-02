/**
 * A2A JSON-RPC API Route Tests
 *
 * 测试 A2A JSON-RPC API 端点：
 * - POST /api/a2a/jsonrpc (JSON-RPC 2.0)
 * - OPTIONS (CORS)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST, OPTIONS } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/agents/scheduler/scheduler', () => ({
  agentScheduler: {
    getAllAgents: vi.fn(() => []),
    getAgent: vi.fn(() => null),
    getAgentsByCapability: vi.fn(() => []),
    heartbeat: vi.fn(() => false),
    scheduleTask: vi.fn(() => ({ success: true, taskId: 'task-1' })),
    getTask: vi.fn(() => null),
    updateTask: vi.fn(() => false),
    cancelTask: vi.fn(() => false),
    getQueueStats: vi.fn(() => ({})),
    getAllTasks: vi.fn(() => []),
  },
}))

vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn(async () => ({ authenticated: true, userId: 'user-1' })),
}))

import { authenticateJWT } from '@/lib/auth/api-auth'
import { agentScheduler } from '@/lib/agents/scheduler/scheduler'

describe('A2A JSON-RPC API - POST /api/a2a/jsonrpc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
    })
  })

  it('应该返回 JSON-RPC 2.0 格式错误（无效版本）', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '1.0',
        method: 'agent.list',
        id: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.jsonrpc).toBe('2.0')
    expect(data.error).toBeDefined()
    expect(data.error.code).toBe(-32600)
  })

  it('应该返回方法不存在错误', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'nonexistent.method',
        id: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.jsonrpc).toBe('2.0')
    expect(data.error.code).toBe(-32601)
  })

  it('应该列出所有代理', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'agent.list',
        id: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.jsonrpc).toBe('2.0')
    expect(data.result).toBeDefined()
    expect(data.result.agents).toBeInstanceOf(Array)
    expect(data.result.count).toBeDefined()
  })

  it('应该获取指定代理', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'agent.get',
        params: { agentId: 'agent-1' },
        id: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.jsonrpc).toBe('2.0')
    // 可能返回代理信息或404错误
    expect(data.result || data.error).toBeDefined()
  })

  it('应该验证 agent.get 的参数', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'agent.get',
        params: {},
        id: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.jsonrpc).toBe('2.0')
    expect(data.error.code).toBe(-32602)
  })

  it('应该根据能力发现代理', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'agent.discover',
        params: { capability: 'search' },
        id: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.jsonrpc).toBe('2.0')
    expect(data.result).toBeDefined()
  })

  it('应该创建任务', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'task.create',
        params: {
          type: 'search',
          input: { query: 'test' },
          priority: 'normal',
        },
        id: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.jsonrpc).toBe('2.0')
    expect(data.result.taskId).toBeDefined()
  })

  it('应该验证任务创建参数', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'task.create',
        params: {},
        id: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.jsonrpc).toBe('2.0')
    expect(data.error.code).toBe(-32602)
  })

  it('应该获取任务状态', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'task.status',
        params: { taskId: 'task-1' },
        id: 1,
      }),
    })

    const response = await POST(request)

    const data = await response.json()
    expect(data.jsonrpc).toBe('2.0')
    expect(data.result || data.error).toBeDefined()
  })

  it('应该验证任务状态查询参数', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'task.status',
        params: {},
        id: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.jsonrpc).toBe('2.0')
    expect(data.error.code).toBe(-32602)
  })

  it('应该解析错误', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: 'invalid json{{',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.jsonrpc).toBe('2.0')
    expect(data.error.code).toBe(-32700)
  })

  it('应该拒绝未认证的私有方法调用', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({ authenticated: false })

    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'task.delete', // 私有方法
        params: { taskId: 'task-1' },
        id: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.jsonrpc).toBe('2.0')
    expect(data.error.code).toBe(-32001)
  })
})

describe('A2A JSON-RPC API - OPTIONS /api/a2a/jsonrpc', () => {
  it('应该返回 CORS 头', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
      method: 'OPTIONS',
    })

    const response = await OPTIONS(request)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
  })
})
