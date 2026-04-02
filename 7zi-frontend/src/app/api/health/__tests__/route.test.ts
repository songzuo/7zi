/**
 * Health API Route Tests
 *
 * 测试健康检查 API 端点：
 * - GET /api/health
 * - HEAD /api/health
 */

import { GET, HEAD } from '../route'

describe('Health API - GET /api/health', () => {
  it('应该返回健康状态', async () => {
    const response = await GET(new Request('http://localhost:3000/api/health'))
    const data = await response.json()

    // Accept any valid status code (200 for healthy/degraded, 503 for unhealthy)
    expect([200, 503]).toContain(response.status)
    expect(data.status).toBeDefined()
    expect(data.timestamp).toBeDefined()
    expect(data.responseTime).toBeDefined()
    expect(data.uptime).toBeDefined()
    expect(data.build).toBeDefined()
    expect(data.system).toBeDefined()
  })

  it('应该包含系统信息', async () => {
    const response = await GET(new Request('http://localhost:3000/api/health'))
    const data = await response.json()

    expect(data.system.platform).toBeDefined()
    expect(data.system.arch).toBeDefined()
    expect(data.system.nodeVersion).toBeDefined()
    expect(data.system.memory).toBeDefined()
    expect(data.system.cpus).toBeGreaterThan(0)
  })

  it('应该包含内存信息', async () => {
    const response = await GET(new Request('http://localhost:3000/api/health'))
    const data = await response.json()

    expect(data.system.memory.total).toBeGreaterThan(0)
    expect(data.system.memory.used).toBeGreaterThan(0)
    expect(data.system.memory.free).toBeGreaterThan(0)
    expect(data.system.memory.usage).toBeGreaterThanOrEqual(0)
    expect(data.system.memory.usage).toBeLessThanOrEqual(1)
  })

  it('应该包含构建信息', async () => {
    const response = await GET(new Request('http://localhost:3000/api/health'))
    const data = await response.json()

    expect(data.build.version).toBeDefined()
    expect(data.build.name).toBeDefined()
    expect(data.build.environment).toBeDefined()
    expect(data.build.buildTime).toBeDefined()
  })

  it('应该返回健康状态头', async () => {
    const response = await GET(new Request('http://localhost:3000/api/health'))

    expect(response.headers.get('X-Health-Status')).toBeDefined()
    expect(response.headers.get('X-Response-Time')).toBeDefined()
    expect(response.headers.get('Cache-Control')).toContain('max-age=')
  })

  it('应该包含健康问题列表', async () => {
    const response = await GET(new Request('http://localhost:3000/api/health'))
    const data = await response.json()

    expect(data.health).toBeDefined()
    expect(data.health.issues).toBeInstanceOf(Array)
    expect(data.health.warnings).toBeInstanceOf(Array)
  })
})

describe('Health API - HEAD /api/health', () => {
  it('应该返回没有正文的响应', async () => {
    const response = await HEAD()

    // Accept any valid status code (200 for healthy/degraded, 503 for unhealthy)
    expect([200, 503]).toContain(response.status)
    expect(response.headers.get('X-Health-Status')).toBeDefined()
    expect(response.headers.get('X-Response-Time')).toBeDefined()
  })
})
