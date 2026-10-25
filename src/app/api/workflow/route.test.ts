/**
 * Workflow API Tests
 *
 * Covers:
 * - POST /api/workflow            (create workflow, validation)
 * - GET  /api/workflow            (list workflows, status filter, pagination)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

function createRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  } as any)
}

/** 一个满足 WorkflowEngine.validateWorkflow 全部约束的工作流 */
const validWorkflow = {
  name: '示例工作流',
  description: '测试用',
  nodes: [
    { id: 'node_1', type: 'start', name: '开始', position: { x: 100, y: 100 } },
    { id: 'node_2', type: 'end', name: '结束', position: { x: 300, y: 100 } },
  ],
  edges: [
    { id: 'edge_1', source: 'node_1', target: 'node_2', type: 'sequence' },
  ],
  config: { timeout: 60 },
}

describe('POST /api/workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create a workflow and return 201 with the created definition', async () => {
    const request = createRequest('/api/workflow', 'POST', {
      ...validWorkflow,
      userId: 'user_1',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('示例工作流')
    expect(data.data.description).toBe('测试用')
    expect(data.data.version).toBe(1)
    expect(data.data.status).toBe('draft')
    expect(data.data.nodes).toHaveLength(2)
    expect(data.data.edges).toHaveLength(1)
    expect(data.data.config.timeout).toBe(60)
    expect(data.data.metadata.createdBy).toBe('user_1')
    expect(data.data.metadata.updatedBy).toBe('user_1')
    // id 由 Date.now()+随机串生成，只断言前缀，不做不稳定值断言
    expect(data.data.id).toMatch(/^workflow_/)
  })

  it('should fall back to default config values when config is omitted', async () => {
    const request = createRequest('/api/workflow', 'POST', {
      name: '无配置工作流',
      nodes: validWorkflow.nodes,
      edges: validWorkflow.edges,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.config.timeout).toBe(3600)
    expect(data.data.config.retryPolicy).toEqual({
      maxRetries: 3,
      backoff: 'exponential',
      interval: 5,
    })
    expect(data.data.config.variables).toEqual({})
    expect(data.data.metadata.createdBy).toBe('system')
  })

  it('should return 400 when name is missing', async () => {
    const request = createRequest('/api/workflow', 'POST', { nodes: [], edges: [] })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('工作流名称不能为空')
  })

  it('should return 400 with error details when workflow validation fails', async () => {
    const request = createRequest('/api/workflow', 'POST', {
      name: '不完整工作流',
      nodes: [],
      edges: [],
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('工作流验证失败')
    expect(Array.isArray(data.error.details.errors)).toBe(true)
    expect(data.error.details.errors).toContain('工作流必须包含至少一个节点')
    expect(data.error.details.errors).toContain('工作流必须包含至少一个开始节点')
    expect(data.error.details.errors).toContain('工作流必须包含至少一个结束节点')
  })
})

describe('GET /api/workflow', () => {
  it('should return the workflow list with default pagination', async () => {
    const request = createRequest('/api/workflow')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.total).toBe(1)
    expect(data.data.limit).toBe(50)
    expect(data.data.offset).toBe(0)
    expect(data.data.workflows).toHaveLength(1)
    expect(data.data.workflows[0].id).toBe('workflow_1')
    expect(data.data.workflows[0].status).toBe('active')
    expect(data.data.workflows[0].nodes).toHaveLength(3)
    expect(data.data.workflows[0].edges).toHaveLength(2)
  })

  it('should filter workflows by status', async () => {
    const request = createRequest('/api/workflow?status=active')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.total).toBe(1)
    expect(data.data.workflows[0].status).toBe('active')
  })

  it('should return an empty list for a status with no match', async () => {
    const request = createRequest('/api/workflow?status=archived')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.total).toBe(0)
    expect(data.data.workflows).toHaveLength(0)
  })

  it('should honour limit and offset query parameters', async () => {
    const request = createRequest('/api/workflow?limit=1&offset=0')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.limit).toBe(1)
    expect(data.data.offset).toBe(0)
    expect(data.data.workflows).toHaveLength(1)
  })
})
