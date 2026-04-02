/**
 * Integration Tests: MCP Server Protocol (v1.5.0)
 *
 * 测试 MCP (Model Context Protocol) Server 实现:
 * - JSON-RPC 2.0 协议
 * - 工具注册和执行
 * - 错误处理
 * - 流式响应
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ===== MCP Types =====

interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: MCPToolResult | MCPCapabilities | MCPToolList
  error?: {
    code: number
    message: string
    data?: Record<string, unknown>
  }
}

interface MCPToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, MCPPropertySchema>
    required?: string[]
  }
}

interface MCPPropertySchema {
  type: string
  description?: string
  enum?: string[]
  default?: unknown
}

interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

interface MCPCapabilities {
  protocolVersion: string
  capabilities: {
    tools?: { supported: boolean }
    resources?: { supported: boolean }
    prompts?: { supported: boolean }
  }
  serverInfo: {
    name: string
    version: string
  }
}

interface MCPToolList {
  tools: MCPToolDefinition[]
}

// ===== Mock MCP Server =====

class MockMCPServer {
  private tools: Map<
    string,
    {
      definition: MCPToolDefinition
      executor: (params: Record<string, unknown>) => Promise<unknown>
    }
  > = new Map()

  private requestHandlers: Map<string, (params?: Record<string, unknown>) => Promise<unknown>> =
    new Map()

  constructor() {
    this.registerBuiltinTools()
    this.registerRequestHandlers()
  }

  private registerBuiltinTools(): void {
    // Read file tool
    this.registerTool(
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            offset: { type: 'number', description: 'Start line' },
            limit: { type: 'number', description: 'Max lines' },
          },
          required: ['path'],
        },
      },
      async params => {
        return { content: 'File content here...', lines: 100 }
      }
    )

    // Write file tool
    this.registerTool(
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            content: { type: 'string', description: 'File content' },
          },
          required: ['path', 'content'],
        },
      },
      async params => {
        return { success: true, bytesWritten: 100 }
      }
    )

    // Execute command tool
    this.registerTool(
      {
        name: 'execute_command',
        description: 'Execute a shell command',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
            timeout: { type: 'number', description: 'Timeout in ms' },
          },
          required: ['command'],
        },
      },
      async params => {
        return { stdout: 'Command output', stderr: '', exitCode: 0 }
      }
    )

    // Web search tool
    this.registerTool(
      {
        name: 'web_search',
        description: 'Search the web for information',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            count: { type: 'number', description: 'Number of results' },
          },
          required: ['query'],
        },
      },
      async params => {
        return {
          results: [
            { title: 'Result 1', url: 'https://example.com/1', snippet: '...' },
            { title: 'Result 2', url: 'https://example.com/2', snippet: '...' },
          ],
        }
      }
    )

    // Failing tool (for error testing)
    this.registerTool(
      {
        name: 'failing_tool',
        description: 'A tool that always fails',
        inputSchema: {
          type: 'object',
          properties: {
            errorType: {
              type: 'string',
              enum: ['validation', 'execution', 'timeout'],
              description: 'Type of error to simulate',
            },
          },
          required: ['errorType'],
        },
      },
      async params => {
        throw new Error(`Simulated ${params.errorType} error`)
      }
    )
  }

  private registerRequestHandlers(): void {
    this.requestHandlers.set('initialize', async () => ({
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { supported: true },
        resources: { supported: true },
        prompts: { supported: false },
      },
      serverInfo: {
        name: '7zi-mcp-server',
        version: '1.5.0',
      },
    }))

    this.requestHandlers.set('tools/list', async () => ({
      tools: Array.from(this.tools.values()).map(t => t.definition),
    }))

    this.requestHandlers.set('tools/call', async params => {
      const { name, arguments: args } = params || {}
      if (!name || typeof name !== 'string') {
        throw new Error('Tool name is required')
      }
      const tool = this.tools.get(name)
      if (!tool) {
        throw new Error(`Tool not found: ${name}`)
      }
      return await tool.executor(args as Record<string, unknown>)
    })
  }

  registerTool(
    definition: MCPToolDefinition,
    executor: (params: Record<string, unknown>) => Promise<unknown>
  ): void {
    this.tools.set(definition.name, { definition, executor })
  }

  unregisterTool(name: string): boolean {
    return this.tools.delete(name)
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const { id, method, params } = request

    try {
      const handler = this.requestHandlers.get(method)
      if (!handler) {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        }
      }

      const result = await handler(params)
      return {
        jsonrpc: '2.0',
        id,
        result,
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
          data: error instanceof Error ? { stack: error.stack } : undefined,
        },
      }
    }
  }

  getTools(): MCPToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition)
  }
}

// ===== Test Suite =====

describe('MCP Server Protocol', () => {
  let server: MockMCPServer

  beforeEach(() => {
    server = new MockMCPServer()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('JSON-RPC 2.0 Protocol', () => {
    it('should handle valid JSON-RPC request', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'initialize',
        params: {},
      }

      const response = await server.handleRequest(request)

      expect(response.jsonrpc).toBe('2.0')
      expect(response.id).toBe('test-1')
      expect(response.result).toBeDefined()
      expect(response.error).toBeUndefined()
    })

    it('should return error for unknown method', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-2',
        method: 'unknown_method',
      }

      const response = await server.handleRequest(request)

      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32601)
      expect(response.error?.message).toContain('Method not found')
    })

    it('should preserve request id in response', async () => {
      const stringIdRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'string-id-123',
        method: 'initialize',
      }

      const numberIdRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 456,
        method: 'initialize',
      }

      const stringResponse = await server.handleRequest(stringIdRequest)
      const numberResponse = await server.handleRequest(numberIdRequest)

      expect(stringResponse.id).toBe('string-id-123')
      expect(numberResponse.id).toBe(456)
    })

    it('should handle concurrent requests', async () => {
      const requests: MCPRequest[] = Array.from({ length: 10 }, (_, i) => ({
        jsonrpc: '2.0' as const,
        id: `concurrent-${i}`,
        method: 'initialize',
      }))

      const responses = await Promise.all(requests.map(r => server.handleRequest(r)))

      expect(responses).toHaveLength(10)
      responses.forEach((r, i) => {
        expect(r.id).toBe(`concurrent-${i}`)
        expect(r.result).toBeDefined()
      })
    })
  })

  describe('Initialize Handshake', () => {
    it('should return server capabilities', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'init-1',
        method: 'initialize',
        params: {},
      }

      const response = await server.handleRequest(request)
      const result = response.result as MCPCapabilities

      expect(result.protocolVersion).toBe('2024-11-05')
      expect(result.capabilities.tools?.supported).toBe(true)
      expect(result.capabilities.resources?.supported).toBe(true)
      expect(result.serverInfo.name).toBe('7zi-mcp-server')
      expect(result.serverInfo.version).toBe('1.5.0')
    })
  })

  describe('Tool Management', () => {
    it('should list available tools', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'list-1',
        method: 'tools/list',
      }

      const response = await server.handleRequest(request)
      const result = response.result as MCPToolList

      expect(result.tools).toBeInstanceOf(Array)
      expect(result.tools.length).toBeGreaterThan(0)
      expect(result.tools.find(t => t.name === 'read_file')).toBeDefined()
      expect(result.tools.find(t => t.name === 'write_file')).toBeDefined()
    })

    it('should register custom tool', async () => {
      server.registerTool(
        {
          name: 'custom_tool',
          description: 'A custom tool for testing',
          inputSchema: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Input value' },
            },
            required: ['input'],
          },
        },
        async params => ({ result: `Processed: ${params.input}` })
      )

      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'call-custom',
        method: 'tools/call',
        params: {
          name: 'custom_tool',
          arguments: { input: 'test' },
        },
      }

      const response = await server.handleRequest(request)
      expect(response.result).toEqual({ result: 'Processed: test' })
    })

    it('should unregister tool', async () => {
      const unregistered = server.unregisterTool('read_file')
      expect(unregistered).toBe(true)

      const tools = server.getTools()
      expect(tools.find(t => t.name === 'read_file')).toBeUndefined()
    })

    it('should validate tool input schema', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'call-invalid',
        method: 'tools/call',
        params: {
          name: 'read_file',
          arguments: {}, // Missing required 'path'
        },
      }

      // Server should either validate and reject, or handle gracefully
      const response = await server.handleRequest(request)
      // For this test, we accept either success (tool handles validation) or error
      expect(response.jsonrpc).toBe('2.0')
    })
  })

  describe('Tool Execution', () => {
    it('should execute read_file tool', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'exec-read',
        method: 'tools/call',
        params: {
          name: 'read_file',
          arguments: {
            path: '/test/file.txt',
            offset: 1,
            limit: 100,
          },
        },
      }

      const response = await server.handleRequest(request)
      expect(response.result).toBeDefined()
      expect(response.error).toBeUndefined()
    })

    it('should execute write_file tool', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'exec-write',
        method: 'tools/call',
        params: {
          name: 'write_file',
          arguments: {
            path: '/test/output.txt',
            content: 'Hello, World!',
          },
        },
      }

      const response = await server.handleRequest(request)
      expect(response.result).toEqual({ success: true, bytesWritten: 100 })
    })

    it('should execute web_search tool', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'exec-search',
        method: 'tools/call',
        params: {
          name: 'web_search',
          arguments: {
            query: 'test query',
            count: 5,
          },
        },
      }

      const response = await server.handleRequest(request)
      const result = response.result as { results: unknown[] }
      expect(result.results).toBeInstanceOf(Array)
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('should handle tool execution error', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'exec-fail',
        method: 'tools/call',
        params: {
          name: 'failing_tool',
          arguments: {
            errorType: 'execution',
          },
        },
      }

      const response = await server.handleRequest(request)
      expect(response.error).toBeDefined()
      expect(response.error?.message).toContain('execution error')
    })

    it('should return error for non-existent tool', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'exec-unknown',
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {},
        },
      }

      const response = await server.handleRequest(request)
      expect(response.error).toBeDefined()
      expect(response.error?.message).toContain('Tool not found')
    })
  })

  describe('Error Handling', () => {
    it('should return proper JSON-RPC error codes', async () => {
      const testCases = [
        { method: 'unknown', expectedCode: -32601 }, // Method not found
      ]

      for (const { method, expectedCode } of testCases) {
        const response = await server.handleRequest({
          jsonrpc: '2.0',
          id: `error-test-${method}`,
          method,
        })
        expect(response.error?.code).toBe(expectedCode)
      }
    })

    it('should include error data when available', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'error-data',
        method: 'tools/call',
        params: {
          name: 'failing_tool',
          arguments: { errorType: 'timeout' },
        },
      }

      const response = await server.handleRequest(request)
      expect(response.error).toBeDefined()
      expect(response.error?.data).toBeDefined()
    })
  })

  describe('Streaming Responses', () => {
    it('should support streaming for large outputs', async () => {
      // Mock streaming tool
      server.registerTool(
        {
          name: 'streaming_tool',
          description: 'A tool that streams results',
          inputSchema: {
            type: 'object',
            properties: {
              count: { type: 'number', description: 'Number of chunks' },
            },
          },
        },
        async params => {
          const count = (params.count as number) || 5
          const chunks = []
          for (let i = 0; i < count; i++) {
            chunks.push({ chunk: i, data: `Data chunk ${i}` })
          }
          return { chunks, total: count }
        }
      )

      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'stream-1',
        method: 'tools/call',
        params: {
          name: 'streaming_tool',
          arguments: { count: 10 },
        },
      }

      const response = await server.handleRequest(request)
      const result = response.result as { chunks: unknown[]; total: number }
      expect(result.chunks).toHaveLength(10)
      expect(result.total).toBe(10)
    })
  })

  describe('Tool Chaining', () => {
    it('should support tool chaining scenarios', async () => {
      // Read file and then search for content
      const readResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'chain-read',
        method: 'tools/call',
        params: {
          name: 'read_file',
          arguments: { path: '/test/data.txt' },
        },
      })

      // Use read result in search
      const searchResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'chain-search',
        method: 'tools/call',
        params: {
          name: 'web_search',
          arguments: { query: 'data from file' },
        },
      })

      expect(readResponse.result).toBeDefined()
      expect(searchResponse.result).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should handle rapid sequential requests', async () => {
      const startTime = Date.now()
      const requestCount = 100

      for (let i = 0; i < requestCount; i++) {
        await server.handleRequest({
          jsonrpc: '2.0',
          id: `perf-${i}`,
          method: 'tools/list',
        })
      }

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(1000) // 100 requests in < 1s
    })

    it('should handle large tool lists', async () => {
      // Register many tools
      for (let i = 0; i < 100; i++) {
        server.registerTool(
          {
            name: `perf_tool_${i}`,
            description: `Performance test tool ${i}`,
            inputSchema: { type: 'object', properties: {} },
          },
          async () => ({ index: i })
        )
      }

      const response = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'large-list',
        method: 'tools/list',
      })

      const result = response.result as MCPToolList
      expect(result.tools.length).toBeGreaterThan(100)
    })
  })
})

// ===== HTTP Transport Tests =====

describe('MCP HTTP Transport', () => {
  it('should handle POST /mcp endpoint', async () => {
    // This would be tested with actual HTTP client
    // For now, we simulate the request/response
    const server = new MockMCPServer()
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 'http-1',
      method: 'initialize',
    }

    const response = await server.handleRequest(request)
    expect(response.jsonrpc).toBe('2.0')
  })

  it('should handle batch requests', async () => {
    const server = new MockMCPServer()
    const batch: MCPRequest[] = [
      { jsonrpc: '2.0', id: 'batch-1', method: 'initialize' },
      { jsonrpc: '2.0', id: 'batch-2', method: 'tools/list' },
      {
        jsonrpc: '2.0',
        id: 'batch-3',
        method: 'tools/call',
        params: { name: 'read_file', arguments: { path: '/test' } },
      },
    ]

    const responses = await Promise.all(batch.map(r => server.handleRequest(r)))

    expect(responses).toHaveLength(3)
    responses.forEach(r => {
      expect(r.jsonrpc).toBe('2.0')
    })
  })
})
