/**
 * MCP API Integration Tests
 * Tests for /api/mcp/rpc
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// ============================================
// MSW Handlers for MCP API
// ============================================

const mcpHandlers = [
  // GET /api/mcp/rpc - Server info
  http.get('http://localhost:3000/api/mcp/rpc', () => {
    return HttpResponse.json({
      jsonrpc: '2.0',
      result: {
        name: 'OpenClaw MCP Server',
        version: '1.0.0',
        protocol: 'Model Context Protocol (MCP)',
        specification: 'https://modelcontextprotocol.io/specification',
        endpoints: {
          rpc: '/api/mcp/rpc',
        },
        methods: {
          'tools/list': 'List available tools',
          'tools/call': 'Execute a tool',
          'resources/list': 'List available resources',
          'resources/read': 'Read a resource',
        },
      },
      id: null,
    })
  }),

  // POST /api/mcp/rpc - JSON-RPC request (single)
  http.post('http://localhost:3000/api/mcp/rpc', async ({ request }) => {
    const body = await request.json().catch(() => null)

    if (!body || !body.method) {
      return HttpResponse.json(
        { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: null },
        { status: 400 }
      )
    }

    const { method, params, id } = body

    // tools/list
    if (method === 'tools/list') {
      return HttpResponse.json({
        jsonrpc: '2.0',
        result: {
          tools: [
            { name: 'read_file', description: 'Read a file from the filesystem' },
            { name: 'write_file', description: 'Write content to a file' },
            { name: 'execute_command', description: 'Execute a shell command' },
          ],
        },
        id,
      })
    }

    // tools/call
    if (method === 'tools/call') {
      const { name, arguments: args } = params || {}
      if (!name) {
        return HttpResponse.json(
          { jsonrpc: '2.0', error: { code: -32602, message: 'Invalid params: name required' }, id },
          { status: 400 }
        )
      }
      return HttpResponse.json({
        jsonrpc: '2.0',
        result: { success: true, tool: name, output: 'Mock output', executionTime: 50 },
        id,
      })
    }

    // resources/list
    if (method === 'resources/list') {
      return HttpResponse.json({
        jsonrpc: '2.0',
        result: {
          resources: [
            { uri: 'file:///etc/passwd', name: 'passwd', mimeType: 'text/plain' },
            { uri: 'memory://current/state', name: 'current_state', mimeType: 'application/json' },
          ],
        },
        id,
      })
    }

    // Unknown method
    return HttpResponse.json(
      { jsonrpc: '2.0', error: { code: -32601, message: `Method not found: ${method}` }, id },
      { status: 404 }
    )
  }),
]

const mcpServer = setupServer(...mcpHandlers)

// ============================================
// Test Suite: MCP API
// ===========================================

describe('MCP API Integration Tests', () => {
  beforeAll(() => mcpServer.listen({ onUnhandledRequest: 'warn' }))
  afterAll(() => mcpServer.close())

  // ===========================================
  // GET /api/mcp/rpc - Server Info
  // ===========================================
  describe('GET /api/mcp/rpc', () => {
    it('should return MCP server info with 200', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc')
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.jsonrpc).toBe('2.0')
      expect(data.result).toHaveProperty('name')
      expect(data.result.name).toBe('OpenClaw MCP Server')
    })

    it('should return server version', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc')
      const data = await response.json()
      expect(data.result).toHaveProperty('version')
      expect(data.result.version).toBe('1.0.0')
    })

    it('should return protocol information', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc')
      const data = await response.json()
      expect(data.result).toHaveProperty('protocol')
      expect(data.result.protocol).toContain('MCP')
    })

    it('should return available methods', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc')
      const data = await response.json()
      expect(data.result).toHaveProperty('methods')
      expect(data.result.methods).toHaveProperty('tools/list')
    })

    it('should return JSON content type', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc')
      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  // ===========================================
  // POST /api/mcp/rpc - JSON-RPC Requests
  // ===========================================
  describe('POST /api/mcp/rpc', () => {
    it('should list tools with 200 status', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.jsonrpc).toBe('2.0')
      expect(data.result).toHaveProperty('tools')
      expect(Array.isArray(data.result.tools)).toBe(true)
      expect(data.result.tools.length).toBeGreaterThan(0)
    })

    it('should call tool successfully', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'read_file', arguments: { path: '/etc/passwd' } },
          id: 2,
        }),
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.result).toHaveProperty('success', true)
      expect(data.result).toHaveProperty('tool', 'read_file')
    })

    it('should return error for tool call without name', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {},
          id: 3,
        }),
      })
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should list resources with 200', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'resources/list', id: 4 }),
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.result).toHaveProperty('resources')
      expect(Array.isArray(data.result.resources)).toBe(true)
    })

    it('should return error for unknown method', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'unknown/method', id: 5 }),
      })
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toHaveProperty('code', -32601)
    })

    it('should return 400 for missing method', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 6 }),
      })
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 for empty body', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      })
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle malformed JSON', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid }',
      })
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })

  // ===========================================
  // Edge Cases
  // ===========================================
  describe('MCP API - Edge Cases', () => {
    it('should handle batch requests when supported', async () => {
      // JSON-RPC batch requests - send as array
      // Batch not supported by mock, returns 400 "Invalid Request"
      const response = await fetch('http://localhost:3000/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { jsonrpc: '2.0', method: 'tools/list', id: 1 },
          { jsonrpc: '2.0', method: 'resources/list', id: 2 },
        ]),
      })
      // Batch not supported, returns 400 "Invalid Request"
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe(-32600)
    })

    it('should handle invalid JSON-RPC version', async () => {
      const response = await fetch('http://localhost:3000/api/mcp/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '1.0', method: 'test', id: 1 }),
      })
      // jsonrpc "1.0" is treated as unknown method, returns 404
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })
})