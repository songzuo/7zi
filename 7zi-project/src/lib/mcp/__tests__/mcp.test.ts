/**
 * MCP Server Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SevenZiMcpServer, getMcpServer } from '../server';
import { MCPHttpTransport, sessionManager } from '../http-transport';
import { toolRegistry, ToolRegistry } from '../tools';
import { z } from 'zod';

describe('SevenZiMcpServer', () => {
  it('should create server instance', () => {
    const server = new SevenZiMcpServer();
    expect(server).toBeDefined();
  });

  it('should have default tools registered', () => {
    const server = new SevenZiMcpServer();
    const tools = server.getTools();
    
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.find(t => t.name === 'read_file')).toBeDefined();
    expect(tools.find(t => t.name === 'write_file')).toBeDefined();
    expect(tools.find(t => t.name === 'execute_command')).toBeDefined();
  });

  it('should register custom tools', () => {
    const server = new SevenZiMcpServer();
    
    server.registerTool({
      name: 'custom_test_tool',
      description: 'A test tool',
      inputSchema: z.object({ value: z.string() }),
      handler: async (params) => ({
        content: [{ type: 'text', text: `Got: ${params.value}` }],
      }),
    });
    
    const tools = server.getTools();
    expect(tools.find(t => t.name === 'custom_test_tool')).toBeDefined();
  });

  it('should return singleton from getMcpServer', () => {
    const server1 = getMcpServer();
    const server2 = getMcpServer();
    expect(server1).toBe(server2);
  });
});

describe('MCPHttpTransport', () => {
  it('should validate localhost origins', () => {
    expect(MCPHttpTransport.validateOrigin('http://localhost:3000')).toBe(true);
    expect(MCPHttpTransport.validateOrigin('http://127.0.0.1:3000')).toBe(true);
    expect(MCPHttpTransport.validateOrigin('https://example.com', ['https://example.com'])).toBe(true);
  });

  it('should create valid JSON-RPC responses', () => {
    const response = MCPHttpTransport.createResponse(1, { success: true });
    const parsed = JSON.parse(response);
    
    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.id).toBe(1);
    expect(parsed.result).toEqual({ success: true });
  });

  it('should create error responses', () => {
    const response = MCPHttpTransport.createError(1, -32600, 'Invalid Request');
    const parsed = JSON.parse(response);
    
    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.error.code).toBe(-32600);
    expect(parsed.error.message).toBe('Invalid Request');
  });

  it('should parse JSON-RPC messages', () => {
    const message = MCPHttpTransport.parseMessage('{"jsonrpc":"2.0","id":1,"method":"test"}');
    
    expect(message).not.toBeNull();
    expect(message?.jsonrpc).toBe('2.0');
    expect(message?.method).toBe('test');
  });

  it('should identify request types', () => {
    const request = MCPHttpTransport.parseMessage('{"jsonrpc":"2.0","id":1,"method":"test"}');
    const notification = MCPHttpTransport.parseMessage('{"jsonrpc":"2.0","method":"test"}');
    const response = MCPHttpTransport.parseMessage('{"jsonrpc":"2.0","id":1,"result":{}}');
    
    expect(MCPHttpTransport.isRequest(request)).toBe(true);
    expect(MCPHttpTransport.isNotification(notification)).toBe(true);
    expect(MCPHttpTransport.isResponse(response)).toBe(true);
  });
});

describe('MCPSessionManager', () => {
  it('should create sessions', () => {
    const sessionId = sessionManager.createSession();
    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
  });

  it('should retrieve sessions', () => {
    const sessionId = sessionManager.createSession();
    const session = sessionManager.getSession(sessionId);
    
    expect(session).toBeDefined();
    expect(session?.id).toBe(sessionId);
  });

  it('should delete sessions', () => {
    const sessionId = sessionManager.createSession();
    expect(sessionManager.hasSession(sessionId)).toBe(true);
    
    sessionManager.deleteSession(sessionId);
    expect(sessionManager.hasSession(sessionId)).toBe(false);
  });
});

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register tools', () => {
    registry.register({
      name: 'test_tool',
      description: 'A test tool',
      category: 'custom',
      inputSchema: z.object({}),
      handler: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });
    
    expect(registry.has('test_tool')).toBe(true);
  });

  it('should prevent duplicate registration', () => {
    registry.register({
      name: 'duplicate_tool',
      description: 'First',
      category: 'custom',
      inputSchema: z.object({}),
      handler: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });
    
    expect(() => registry.register({
      name: 'duplicate_tool',
      description: 'Second',
      category: 'custom',
      inputSchema: z.object({}),
      handler: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    })).toThrow();
  });

  it('should get tools by category', () => {
    registry.register({
      name: 'file_tool',
      description: 'File tool',
      category: 'file',
      inputSchema: z.object({}),
      handler: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });
    
    registry.register({
      name: 'network_tool',
      description: 'Network tool',
      category: 'network',
      inputSchema: z.object({}),
      handler: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });
    
    const fileTools = registry.getByCategory('file');
    expect(fileTools.length).toBe(1);
    expect(fileTools[0].name).toBe('file_tool');
  });
});