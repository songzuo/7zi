/**
 * A2A Registry API Route Tests
 *
 * 测试 A2A 注册表 API 端点
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/agents/scheduler/registry', () => ({
  agentRegistry: {
    register: vi.fn(() => ({ success: true, agentId: 'agent-1' })),
    unregister: vi.fn(() => true),
    getAgent: vi.fn(() => null),
    getAllAgents: vi.fn(() => []),
  },
}))

vi.mock('@/lib/agents/scheduler/scheduler', () => ({
  agentScheduler: {
    registerAgent: vi.fn(() => ({
      id: 'agent-1',
      name: 'Test Agent',
      type: 'task',
      status: 'idle',
      capabilities: ['search', 'analysis'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastHeartbeat: Date.now(),
    })),
    unregisterAgent: vi.fn(() => ({ success: true })),
    getAgent: vi.fn(() => null),
    getAllAgents: vi.fn(() => []),
    getAgentsByCapability: vi.fn(() => []),
  },
}))

vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn(async req => ({
    authenticated: true,
    userId: 'user-1',
    role: 'admin',
  })),
}))

import { authenticateJWT } from '@/lib/auth/api-auth'
import { agentScheduler } from '@/lib/agents/scheduler/scheduler'

describe('A2A Registry API - GET /api/a2a/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      role: 'admin',
    })
  })

  it('应该返回已注册的代理列表', async () => {
    vi.mocked(agentScheduler.getAllAgents).mockReturnValue([])

    const request = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.agents).toBeInstanceOf(Array)
  })
})

describe('A2A Registry API - POST /api/a2a/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      role: 'admin',
    })
  })

  it('应该注册新代理', async () => {
    vi.mocked(agentScheduler.registerAgent).mockReturnValue({
      success: true,
      agentId: 'agent-1',
    })

    const request = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'agent-1',
        name: 'Test Agent',
        type: 'task',
        capabilities: ['search', 'analysis'],
        endpoint: 'http://localhost:3001',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect([200, 201]).toContain(response.status)
    expect(data.success).toBe(true)
    expect(data.data.agent).toBeDefined()
  })

  it('应该验证代理注册数据', async () => {
    const request = new NextRequest('http://localhost:3000/api/a2a/registry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Agent',
        // 缺少必填字段
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})
