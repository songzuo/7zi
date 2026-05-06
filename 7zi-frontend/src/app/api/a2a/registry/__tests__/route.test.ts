/**
 * A2A Registry API Route Tests
 *
 * 测试 A2A 注册表 API 端点的完整功能
 *
 * 覆盖: GET, POST, PUT, DELETE
 * 路由: /api/a2a/registry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST, PUT, DELETE } from '../route'
import { NextRequest } from 'next/server'

// Mock agentScheduler
vi.mock('@/lib/agents/scheduler/scheduler', () => ({
  agentScheduler: {
    getAgent: vi.fn(),
    getAllAgents: vi.fn(),
    getAgentsByCapability: vi.fn(),
    registerAgent: vi.fn(),
    updateAgentStatus: vi.fn(),
    unregisterAgent: vi.fn(),
  },
}))

// Mock authenticateJWT
vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn(),
}))

import { agentScheduler } from '@/lib/agents/scheduler/scheduler'
import { authenticateJWT } from '@/lib/auth/api-auth'

// ============================================================
// Test Suite: 认证失败场景 (All Methods)
// ============================================================
describe('Authentication - All Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({ authenticated: false })
  })

  it('GET - 无认证返回 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/a2a/registry')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('POST - 无认证返回 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', type: 'task', capabilities: [] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('PUT - 无认证返回 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'x', status: 'idle' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('DELETE - 无认证返回 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/a2a/registry?id=test')
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })
})

// ============================================================
// Test Suite: GET /api/a2a/registry
// ============================================================
describe('GET /api/a2a/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({ authenticated: true, userId: 'u1', role: 'admin' })
  })

  it('返回全部 Agent 列表', async () => {
    const mockAgents = [
      { id: 'a1', name: 'Agent 1', type: 'task', status: 'idle' },
      { id: 'a2', name: 'Agent 2', type: 'tool', status: 'busy' },
    ]
    vi.mocked(agentScheduler.getAllAgents).mockReturnValue(mockAgents as any)

    const req = new NextRequest('http://localhost:3000/api/a2a/registry')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.agents).toEqual(mockAgents)
    expect(data.data.count).toBe(2)
  })

  it('?id=xxx - 返回单个 Agent', async () => {
    const mockAgent = { id: 'a1', name: 'Agent 1', type: 'task', status: 'idle' }
    vi.mocked(agentScheduler.getAgent).mockReturnValue(mockAgent as any)

    const req = new NextRequest('http://localhost:3000/api/a2a/registry?id=a1')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.agent).toEqual(mockAgent)
  })

  it('?id=xxx - Agent 不存在返回 404', async () => {
    vi.mocked(agentScheduler.getAgent).mockReturnValue(null)

    const req = new NextRequest('http://localhost:3000/api/a2a/registry?id=nonexistent')
    const res = await GET(req)

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Agent not found')
  })

  it('?capability=tool - 按能力过滤', async () => {
    const mockAgents = [{ id: 'a1', name: 'Tool Agent', type: 'tool', capabilities: ['tool'] }]
    vi.mocked(agentScheduler.getAgentsByCapability).mockReturnValue(mockAgents as any)

    const req = new NextRequest('http://localhost:3000/api/a2a/registry?capability=tool')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.agents).toEqual(mockAgents)
  })
})

// ============================================================
// Test Suite: POST /api/a2a/registry
// ============================================================
describe('POST /api/a2a/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({ authenticated: true, userId: 'u1', role: 'admin' })
  })

  it('有效请求 - 注册新 Agent (201)', async () => {
    const mockAgent = { id: 'agent_123_xyz', name: 'New Agent', type: 'task', status: 'idle', capabilities: ['search'], createdAt: Date.now(), updatedAt: Date.now(), lastHeartbeat: Date.now() }
    vi.mocked(agentScheduler.registerAgent).mockReturnValue(mockAgent as any)

    const req = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Agent', type: 'task', capabilities: ['search'] }),
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.agent).toBeDefined()
  })

  it('缺 name 或 type - 返回 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Only Name' }), // 缺 type
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('VALIDATION')
  })

  it('capabilities 不是数组 - 返回 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', type: 'task', capabilities: 'not-an-array' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.type).toBe('VALIDATION')
    expect(data.error.message).toContain('Capabilities')
  })
})

// ============================================================
// Test Suite: PUT /api/a2a/registry
// ============================================================
describe('PUT /api/a2a/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({ authenticated: true, userId: 'u1', role: 'admin' })
  })

  it('缺 agentId 或 status - 返回 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'a1' }), // 缺 status
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.type).toBe('VALIDATION')
  })

  it('无效 status 值 - 返回 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'a1', status: 'invalid_status' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.message).toContain('idle, busy, offline, error')
  })

  it('有效更新 - 返回更新后 Agent', async () => {
    vi.mocked(agentScheduler.updateAgentStatus).mockReturnValue(true)
    const updatedAgent = { id: 'a1', status: 'busy' }
    vi.mocked(agentScheduler.getAgent).mockReturnValue(updatedAgent as any)

    const req = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'a1', status: 'busy' }),
    })
    const res = await PUT(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.agent.status).toBe('busy')
  })

  it('Agent 不存在 - 返回 404', async () => {
    vi.mocked(agentScheduler.updateAgentStatus).mockReturnValue(false)

    const req = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'nonexistent', status: 'idle' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.success).toBe(false)
  })
})

// ============================================================
// Test Suite: DELETE /api/a2a/registry
// ============================================================
describe('DELETE /api/a2a/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({ authenticated: true, userId: 'u1', role: 'admin' })
  })

  it('缺 id 参数 - 返回 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/a2a/registry')
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error.type).toBe('VALIDATION')
    expect(data.error.message).toContain('Agent ID')
  })

  it('有效删除 - 返回成功', async () => {
    vi.mocked(agentScheduler.unregisterAgent).mockReturnValue(true)

    const req = new NextRequest('http://localhost:3000/api/a2a/registry?id=a1')
    const res = await DELETE(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.message).toContain('unregistered')
  })

  it('Agent 不存在 - 返回 404', async () => {
    vi.mocked(agentScheduler.unregisterAgent).mockReturnValue(false)

    const req = new NextRequest('http://localhost:3000/api/a2a/registry?id=nonexistent')
    const res = await DELETE(req)

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Agent not found')
  })
})