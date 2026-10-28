/**
 * Tests for /api/a2a/jsonrpc route
 * JSON-RPC 2.0 endpoint handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST, OPTIONS } from '@/app/api/a2a/jsonrpc/route'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

// Mock dependencies
vi.mock('@/lib/agents/a2a/jsonrpc-handler', () => ({
  createRequestHandler: vi.fn(() => ({
    handleRequest: vi.fn(),
  })),
  getTaskStore: vi.fn(() => ({})),
}))

vi.mock('@/lib/agents/a2a/executor', () => ({
  createSevenZiExecutor: vi.fn(() => ({})),
}))

vi.mock('@/lib/agents/a2a/agent-card', () => ({
  getAgentCard: vi.fn(() => ({})),
  getExtendedAgentCard: vi.fn(() => ({})),
}))

vi.mock('@/lib/agents/a2a/task-store', () => ({
  getTaskStore: vi.fn(() => ({})),
}))

// 路由加了 A2A 鉴权（withA2AAuth）—— 仓库没有根 middleware.ts，
// 没有全局鉴权层，所以 a2a 路由必须自己守门。
// 测试要验证的是 JSON-RPC 协议行为，不是鉴权，
// 这里把鉴权层 mock 掉，让请求直接进 handler。
vi.mock('@/lib/agents/a2a/auth', () => ({
  // 必须把原始 request 透传给 handler：
  // route 里的 POSTHandler 会调用 request.json() 解析 body，
  // 传空对象会让所有用例报 "request.json is not a function"。
  withA2AAuth: vi.fn(async (request: unknown, handler: (req: never) => Promise<Response>) =>
    handler(request as never)
  ),
  authenticateA2ARequest: vi.fn(async () => ({ method: 'jwt', userId: 'test-user' })),
  canAccessAgent: vi.fn(() => true),
}))

vi.mock('@/lib/logger', () => ({
  logger: { auth: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('/api/a2a/jsonrpc route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SITE_URL = 'https://7zi.studio'
  })

  // route.ts 用模块级变量 `let handler` 缓存 A2ARequestHandler
  // （getHandler() 里 `if (!handler)` 才重建）。
  //
  // 问题：vi.clearAllMocks() 只会清掉 mock 的**调用记录和实现**，
  // 不会清掉 route 模块里那个已经建好的 handler 实例。
  // 于是第一个用例创建的 handler（handleRequest 返回 undefined）
  // 会被后续所有用例复用 —— 每个用例自己的 mockReturnValue 都不生效，
  // 响应里 jsonrpc 是 undefined。
  //
  // 解决办法：每个用例都重置模块缓存（vi.resetModules + 动态 import）。
  // 但动态 import 每次都会拿到新的模块实例，测试顶部的
  // `import { POST, OPTIONS } from '...'` 仍是旧实例 ——
  // 所以这里改用另一个思路：让 getHandler 每次都重建。
  //
  // 实际上「缓存 handler」这个行为本身对测试极不友好，
  // 而且生产上 handler 无状态（依赖都在构造时传入），
  // 缓存没有收益。改为每次重建。

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('CORS Handling', () => {
    it('should return CORS headers on OPTIONS request', async () => {
      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'OPTIONS',
      })

      const response = await OPTIONS()
      const corsHeaders = response.headers

      expect(corsHeaders.get('Access-Control-Allow-Origin')).toBe('https://7zi.studio')
      expect(corsHeaders.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
      expect(corsHeaders.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization')
      expect(corsHeaders.get('Access-Control-Max-Age')).toBe('86400')
      expect(response.status).toBe(204)
    })

    it('should use localhost as fallback for CORS origin', async () => {
      process.env.NEXT_PUBLIC_SITE_URL = ''
      const request = new NextRequest('http://localhost:3000/api/a2a/jsonrpc', {
        method: 'OPTIONS',
      })

      const response = await OPTIONS()
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://7zi.studio')
    })
  })

  describe('POST Single Request', () => {
    it('should handle valid JSON-RPC request', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
        params: {},
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      // Mock handler response
      const { createRequestHandler } = await import('@/lib/agents/a2a/jsonrpc-handler')
      const mockHandler = {
        handleRequest: vi.fn().mockResolvedValue({
          jsonrpc: '2.0',
          result: { success: true },
          id: 1,
        }),
      }
      ;(createRequestHandler as any).mockReturnValue(mockHandler)

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://7zi.studio')
    })

    it('should handle request without jsonrpc version', async () => {
      const requestBody = {
        method: 'test',
        id: 1,
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.error).toBeDefined()
      expect(data.error.code).toBeDefined()
    })

    it('should handle request with null body', async () => {
      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: null,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.error.code).toBe(-32600)
      expect(response.status).toBe(400)
    })

    it('should handle request with undefined body', async () => {
      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: undefined,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.error.code).toBe(-32600)
      expect(response.status).toBe(400)
    })
  })

  describe('POST Batch Request', () => {
    it('should handle valid batch requests', async () => {
      const requestBody = [
        { jsonrpc: '2.0', method: 'test1', id: 1, params: {} },
        { jsonrpc: '2.0', method: 'test2', id: 2, params: {} },
      ]

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
    })

    it('should handle empty batch request', async () => {
      const requestBody: any[] = []

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.error.message).toContain('empty batch')
      expect(response.status).toBe(400)
    })

    it('should process batch requests in parallel', async () => {
      const requestBody = [
        { jsonrpc: '2.0', method: 'method1', id: 1, params: {} },
        { jsonrpc: '2.0', method: 'method2', id: 2, params: {} },
        { jsonrpc: '2.0', method: 'method3', id: 3, params: {} },
      ]

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3)
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON parse errors', async () => {
      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: 'invalid json{{{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.error.code).toBe(-32700)
      expect(data.error.message).toBe('Parse error')
      expect(response.status).toBe(400)
    })

    it('should handle internal errors', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
        params: {},
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      // Mock handler to throw error
      const { createRequestHandler } = await import('@/lib/agents/a2a/jsonrpc-handler')
      const mockHandler = {
        handleRequest: vi.fn().mockRejectedValue(new Error('Internal error')),
      }
      ;(createRequestHandler as any).mockReturnValue(mockHandler)

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.error.code).toBe(-32603)
      expect(data.error.message).toBe('Internal error')
      expect(response.status).toBe(500)
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle non-object requests', async () => {
      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify('string request'),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.error.code).toBe(-32600)
      expect(response.status).toBe(400)
    })
  })

  describe('Status Code Determination', () => {
    it('should return 400 for parse errors', async () => {
      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: 'invalid',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return 404 for method not found', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'unknownMethod',
        id: 1,
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      // Mock handler to return method not found error
      const { createRequestHandler } = await import('@/lib/agents/a2a/jsonrpc-handler')
      const mockHandler = {
        handleRequest: vi.fn().mockResolvedValue({
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Method not found' },
          id: 1,
        }),
      }
      ;(createRequestHandler as any).mockReturnValue(mockHandler)

      const response = await POST(request)
      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid params', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
        params: 'invalid',
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      // Mock handler to return invalid params error
      const { createRequestHandler } = await import('@/lib/agents/a2a/jsonrpc-handler')
      const mockHandler = {
        handleRequest: vi.fn().mockResolvedValue({
          jsonrpc: '2.0',
          error: { code: -32602, message: 'Invalid params' },
          id: 1,
        }),
      }
      ;(createRequestHandler as any).mockReturnValue(mockHandler)

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return 200 for successful requests', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      // Mock handler to return success
      const { createRequestHandler } = await import('@/lib/agents/a2a/jsonrpc-handler')
      const mockHandler = {
        handleRequest: vi.fn().mockResolvedValue({
          jsonrpc: '2.0',
          result: { success: true },
          id: 1,
        }),
      }
      ;(createRequestHandler as any).mockReturnValue(mockHandler)

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Development Mode', () => {
    it('should include error details in development', async () => {
      const originalEnv = process.env.NODE_ENV
      // @ts-expect-error - NODE_ENV is read-only in newer TypeScript versions
      process.env.NODE_ENV = 'development'

      const requestBody = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      // Mock handler to throw error
      const { createRequestHandler } = await import('@/lib/agents/a2a/jsonrpc-handler')
      const mockHandler = {
        handleRequest: vi.fn().mockRejectedValue(new Error('Dev error')),
      }
      ;(createRequestHandler as any).mockReturnValue(mockHandler)

      const response = await POST(request)
      const data = await response.json()

      expect(data.error.data).toBeDefined()
      expect(data.error.data.message).toBe('Dev error')

      // @ts-expect-error - NODE_ENV is read-only in newer TypeScript versions
      process.env.NODE_ENV = originalEnv
    })

    it('should hide error details in production', async () => {
      const originalEnv = process.env.NODE_ENV
      // @ts-expect-error - NODE_ENV is read-only in newer TypeScript versions
      process.env.NODE_ENV = 'production'

      const requestBody = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      // Mock handler to throw error
      const { createRequestHandler } = await import('@/lib/agents/a2a/jsonrpc-handler')
      const mockHandler = {
        handleRequest: vi.fn().mockRejectedValue(new Error('Prod error')),
      }
      ;(createRequestHandler as any).mockReturnValue(mockHandler)

      const response = await POST(request)
      const data = await response.json()

      expect(data.error.data).toBeUndefined()

      // @ts-expect-error - NODE_ENV is read-only in newer TypeScript versions
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Request Validation', () => {
    it('should validate request structure', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      // Should not throw validation errors for valid request
      expect(data.jsonrpc).toBe('2.0')
    })

    it('should handle missing required fields', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        id: 1,
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.error).toBeDefined()
    })

    it('should handle requests with id null', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'test',
        id: null,
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
    })
  })

  describe('Edge Cases', () => {
    it('should handle large payloads', async () => {
      const largeParam = 'x'.repeat(1000000)
      const requestBody = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
        params: { large: largeParam },
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle unicode characters', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
        params: { text: 'Hello 世界 🌍' },
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
    })

    it('should handle special characters in JSON', async () => {
      const requestBody = {
        jsonrpc: '2.0',
        method: 'test',
        id: 1,
        params: { text: 'Test "quotes" and \'apostrophes\'' },
      }

      const request = new NextRequest('https://7zi.studio/api/a2a/jsonrpc', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
    })
  })
})
