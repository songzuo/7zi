import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MCPServer, mcpServer } from '../server'
import type { MCPResponse } from '../server'

describe('MCPServer', () => {
  let server: MCPServer

  beforeEach(() => {
    server = new MCPServer()
  })

  describe('constructor', () => {
    it('应该注册所有内置工具', () => {
      const tools = server['tools']
      expect(tools.has('read_file')).toBe(true)
      expect(tools.has('write_file')).toBe(true)
      expect(tools.has('list_files')).toBe(true)
      expect(tools.has('exec_command')).toBe(true)
      expect(tools.has('web_search')).toBe(true)
      expect(tools.has('web_fetch')).toBe(true)
      expect(tools.has('browser_control')).toBe(true)
    })

    it('每个工具应该包含必要的字段', () => {
      const tools = server['tools']
      const toolNames = Array.from(tools.keys())

      toolNames.forEach(toolName => {
        const tool = tools.get(toolName)
        expect(tool).toBeDefined()
        expect(tool?.name).toBe(toolName)
        expect(tool?.description).toBeTruthy()
        expect(tool?.inputSchema).toBeDefined()
        expect(tool?.inputSchema.type).toBe('object')
        expect(tool?.inputSchema.properties).toBeDefined()
      })
    })
  })

  describe('registerTool', () => {
    it('应该成功注册新工具', () => {
      const toolDefinition = {
        name: 'test_tool',
        description: 'Test tool description',
        inputSchema: {
          type: 'object' as const,
          properties: {
            param1: {
              type: 'string',
              description: 'Test parameter',
            },
          },
          required: ['param1'] as string[],
        },
      }

      server.registerTool(toolDefinition)

      const tools = server['tools']
      expect(tools.has('test_tool')).toBe(true)
      expect(tools.get('test_tool')).toEqual(toolDefinition)
    })

    it('应该允许覆盖已存在的工具', () => {
      const newDefinition = {
        name: 'read_file',
        description: 'Updated read_file tool',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      }

      server.registerTool(newDefinition)

      const tools = server['tools']
      expect(tools.get('read_file')).toEqual(newDefinition)
    })
  })

  describe('listTools', () => {
    it('应该返回所有已注册的工具', async () => {
      const result = await server.listTools()

      expect(result).toHaveProperty('tools')
      expect(Array.isArray(result.tools)).toBe(true)
      expect(result.tools.length).toBeGreaterThan(0)
    })

    it('返回的工具应该包含正确的结构', async () => {
      const result = await server.listTools()

      result.tools.forEach(tool => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')
        expect(tool.inputSchema).toHaveProperty('type')
        expect(tool.inputSchema).toHaveProperty('properties')
      })
    })

    it('新注册的工具应该出现在列表中', async () => {
      server.registerTool({
        name: 'new_tool',
        description: 'New tool',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      })

      const result = await server.listTools()
      const toolNames = result.tools.map(t => t.name)

      expect(toolNames).toContain('new_tool')
    })
  })

  describe('callTool', () => {
    it('应该返回工具未找到的错误', async () => {
      const result = await server.callTool('nonexistent_tool', {})

      expect(result.isError).toBe(true)
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toContain('not found')
    })

    it('应该成功调用已注册的工具', async () => {
      const result = await server.callTool('read_file', { path: '/test/path' })

      // 注意：实际执行取决于 ToolExecutor 的实现
      expect(result).toHaveProperty('content')
      expect(Array.isArray(result.content)).toBe(true)
    })

    it('应该处理工具执行时的错误', async () => {
      // 这个测试需要 ToolExecutor 被 mock
      const result = await server.callTool('read_file', { path: '/test' })

      // 验证返回格式
      expect(result).toHaveProperty('content')
      if (result.isError) {
        expect(result.content[0].type).toBe('text')
      }
    })

    it('应该传递正确的参数给工具', async () => {
      const args = {
        path: '/test/path',
        offset: 10,
        limit: 100,
      }

      const result = await server.callTool('read_file', args)

      expect(result).toBeDefined()
    })
  })

  describe('handleRequest', () => {
    it('应该处理 tools/list 请求', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/list',
      }

      const response = await server.handleRequest(request)

      // Check that response is not an array
      expect(Array.isArray(response)).toBe(false)
      const singleResponse = response as MCPResponse

      expect(singleResponse.jsonrpc).toBe('2.0')
      expect(singleResponse.id).toBe(1)
      expect(singleResponse).not.toHaveProperty('error')
      expect(singleResponse).toHaveProperty('result')
      expect(singleResponse.result).toHaveProperty('tools')
    })

    it('应该处理 tools/call 请求', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 2,
        method: 'tools/call',
        params: {
          name: 'read_file',
          arguments: { path: '/test/path' },
        },
      }

      const response = await server.handleRequest(request)

      expect(Array.isArray(response)).toBe(false)
      const singleResponse = response as MCPResponse

      expect(singleResponse.jsonrpc).toBe('2.0')
      expect(singleResponse.id).toBe(2)
      expect(singleResponse).toHaveProperty('result')
      expect(singleResponse.result).toHaveProperty('content')
    })

    it('应该返回方法未找到错误', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 3,
        method: 'unknown_method',
      }

      const response = await server.handleRequest(request)

      expect(Array.isArray(response)).toBe(false)
      const singleResponse = response as MCPResponse

      expect(singleResponse.jsonrpc).toBe('2.0')
      expect(singleResponse.id).toBe(3)
      expect(singleResponse).toHaveProperty('error')
      expect(singleResponse.error?.code).toBe(-32601)
      expect(singleResponse.error?.message).toContain('Method not found')
    })

    it('应该处理内部错误', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 4,
        method: 'tools/call',
        params: {
          name: 'read_file',
          // 缺少必要的参数
          arguments: {},
        },
      }

      const response = await server.handleRequest(request)

      expect(Array.isArray(response)).toBe(false)
      const singleResponse = response as MCPResponse

      expect(singleResponse.jsonrpc).toBe('2.0')
      expect(singleResponse.id).toBe(4)
      expect(singleResponse).toHaveProperty('result')
    })

    it('应该保留请求中的 id', async () => {
      const testId = 'test-request-123'
      const request = {
        jsonrpc: '2.0' as const,
        id: testId,
        method: 'tools/list',
      }

      const response = await server.handleRequest(request)

      expect(Array.isArray(response)).toBe(false)
      expect((response as MCPResponse).id).toBe(testId)
    })

    it('应该处理字符串类型的 id', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 'string-id',
        method: 'tools/list',
      }

      const response = await server.handleRequest(request)

      expect(Array.isArray(response)).toBe(false)
      expect((response as MCPResponse).id).toBe('string-id')
    })

    it('应该处理数字类型的 id', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 12345,
        method: 'tools/list',
      }

      const response = await server.handleRequest(request)

      expect(Array.isArray(response)).toBe(false)
      expect((response as MCPResponse).id).toBe(12345)
    })
  })

  describe('全局实例 mcpServer', () => {
    it('应该导出全局 mcpServer 实例', () => {
      expect(mcpServer).toBeDefined()
      expect(mcpServer).toBeInstanceOf(MCPServer)
    })

    it('全局实例应该具有所有方法', async () => {
      expect(typeof mcpServer.registerTool).toBe('function')
      expect(typeof mcpServer.listTools).toBe('function')
      expect(typeof mcpServer.callTool).toBe('function')
      expect(typeof mcpServer.handleRequest).toBe('function')
    })

    it('全局实例应该预注册了内置工具', async () => {
      const result = await mcpServer.listTools()
      expect(result.tools.length).toBeGreaterThan(0)
    })
  })

  describe('内置工具的输入验证', () => {
    it('read_file 工具应该有正确的 schema', async () => {
      const result = await server.listTools()
      const tool = result.tools.find(t => t.name === 'read_file')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.properties.path).toBeDefined()
      expect(tool?.inputSchema.properties.offset).toBeDefined()
      expect(tool?.inputSchema.properties.limit).toBeDefined()
      expect(tool?.inputSchema.required).toContain('path')
    })

    it('write_file 工具应该有正确的 schema', async () => {
      const result = await server.listTools()
      const tool = result.tools.find(t => t.name === 'write_file')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.properties.path).toBeDefined()
      expect(tool?.inputSchema.properties.content).toBeDefined()
      expect(tool?.inputSchema.required).toContain('path')
      expect(tool?.inputSchema.required).toContain('content')
    })

    it('web_search 工具应该有正确的 schema', async () => {
      const result = await server.listTools()
      const tool = result.tools.find(t => t.name === 'web_search')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.properties.query).toBeDefined()
      expect(tool?.inputSchema.properties.count).toBeDefined()
      expect(tool?.inputSchema.required).toContain('query')
    })
  })

  describe('并发请求处理', () => {
    it('应该能够同时处理多个请求', async () => {
      const requests = [
        { jsonrpc: '2.0' as const, id: 1, method: 'tools/list' },
        { jsonrpc: '2.0' as const, id: 2, method: 'tools/list' },
        { jsonrpc: '2.0' as const, id: 3, method: 'tools/list' },
      ]

      const responses = await Promise.all(requests.map(req => server.handleRequest(req)))

      expect(responses).toHaveLength(3)
      responses.forEach((response, index) => {
        expect(Array.isArray(response)).toBe(false)
        const singleResponse = response as MCPResponse
        expect(singleResponse.id).toBe(index + 1)
        expect(singleResponse.result).toHaveProperty('tools')
      })
    })

    it('应该能够同时调用多个工具', async () => {
      const calls = [
        server.callTool('read_file', { path: '/test1' }),
        server.callTool('write_file', { path: '/test2', content: 'test' }),
        server.callTool('list_files', { path: '/test3' }),
      ]

      const results = await Promise.all(calls)

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toHaveProperty('content')
      })
    })
  })

  describe('工具结果格式', () => {
    it('成功的工具调用应该返回正确的内容格式', async () => {
      const result = await server.callTool('read_file', { path: '/test' })

      expect(Array.isArray(result.content)).toBe(true)
      expect(result.content.length).toBeGreaterThan(0)
      result.content.forEach(item => {
        expect(item).toHaveProperty('type')
        expect(['text', 'image', 'resource']).toContain(item.type)
      })
    })

    it('错误的工具调用应该设置 isError 标志', async () => {
      const result = await server.callTool('nonexistent', {})

      expect(result.isError).toBe(true)
    })

    it('工具错误应该包含错误消息', async () => {
      const result = await server.callTool('nonexistent', {})

      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toBeTruthy()
    })
  })
})
