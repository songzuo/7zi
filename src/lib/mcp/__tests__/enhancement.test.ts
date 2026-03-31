/**
 * MCP Server Enhancement Tests
 * 
 * Tests for the new MCP Server features:
 * - Tool Registry
 * - Resource Management
 * - Prompt Templates
 * - Authentication & Authorization
 * - Streaming Support
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  mcpRegistry,
  mcpResourceManager,
  mcpPromptsManager,
  mcpAuthManager,
  mcpStreamServer,
  streamingExecutor,
  defineTool,
  z,
} from '../index';

describe('MCP Tool Registry', () => {
  beforeEach(() => {
    // Clear registry before each test
    const tools = mcpRegistry.getNames();
    for (const name of tools) {
      mcpRegistry.unregister(name);
    }
  });

  it('should register a tool', () => {
    const tool = defineTool({
      name: 'test_tool',
      title: 'Test Tool',
      description: 'A test tool',
      category: 'custom',
      inputSchema: z.object({
        input: z.string(),
      }),
      output: { type: 'string', description: 'Output' },
      handler: async () => ({
        content: [{ type: 'text', text: 'Result' }],
      }),
    });

    mcpRegistry.register(tool);

    expect(mcpRegistry.has('test_tool')).toBe(true);
    expect(mcpRegistry.get('test_tool')).toBeDefined();
  });

  it('should get tools by category', () => {
    const tool = defineTool({
      name: 'test_tool',
      title: 'Test Tool',
      description: 'A test tool',
      category: 'file',
      inputSchema: z.object({}),
      output: { type: 'string', description: 'Output' },
      handler: async () => ({
        content: [{ type: 'text', text: 'Result' }],
      }),
    });

    mcpRegistry.register(tool);

    const fileTools = mcpRegistry.getByCategory('file');
    expect(fileTools).toHaveLength(1);
    expect(fileTools[0].metadata.name).toBe('test_tool');
  });

  it('should search tools by query', () => {
    const tool = defineTool({
      name: 'file_reader',
      title: 'File Reader',
      description: 'Read files from the filesystem',
      category: 'file',
      inputSchema: z.object({}),
      output: { type: 'string', description: 'Output' },
      handler: async () => ({
        content: [{ type: 'text', text: 'Result' }],
      }),
    });

    mcpRegistry.register(tool);

    const results = mcpRegistry.search('file');
    expect(results).toHaveLength(1);
    expect(results[0].metadata.name).toBe('file_reader');
  });

  it('should export tools in MCP format', () => {
    const tool = defineTool({
      name: 'test_tool',
      title: 'Test Tool',
      description: 'A test tool',
      category: 'custom',
      inputSchema: z.object({
        input: z.string(),
      }),
      output: { type: 'string', description: 'Output' },
      handler: async () => ({
        content: [{ type: 'text', text: 'Result' }],
      }),
    });

    mcpRegistry.register(tool);

    const exported = mcpRegistry.exportMcpFormat();
    expect(exported).toHaveLength(1);
    expect(exported[0].name).toBe('test_tool');
    expect(exported[0].title).toBe('Test Tool');
    expect(exported[0].inputSchema).toBeDefined();
  });
});

describe('MCP Resource Manager', () => {
  it('should list resources', async () => {
    const resources = await mcpResourceManager.list({
      types: ['file'],
      pattern: '*.md',
    });

    expect(Array.isArray(resources)).toBe(true);
  });

  it('should read a resource', async () => {
    const content = await mcpResourceManager.read(
      'file:///root/.openclaw/workspace/package.json',
      { metadataOnly: true }
    );

    expect(content).toBeDefined();
    expect(content.metadata).toBeDefined();
    expect(content.metadata.uri).toContain('package.json');
  });

  it('should create and manage subscriptions', async () => {
    const subscriptionId = await mcpResourceManager.subscribe(
      'test-session',
      { types: ['file'] }
    );

    expect(subscriptionId).toBeDefined();
    expect(typeof subscriptionId).toBe('string');

    const subscription = mcpResourceManager.getSubscription(subscriptionId);
    expect(subscription).toBeDefined();
    expect(subscription?.active).toBe(true);

    mcpResourceManager.unsubscribe(subscriptionId);
    expect(mcpResourceManager.getSubscription(subscriptionId)).toBeUndefined();
  });

  it('should manage cache', () => {
    const stats = mcpResourceManager.getCacheStats();
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('hitRate');

    mcpResourceManager.clearCache();
    const clearedStats = mcpResourceManager.getCacheStats();
    expect(clearedStats.size).toBe(0);
  });
});

describe('MCP Prompts Manager', () => {
  it('should get built-in templates', () => {
    const codeReview = mcpPromptsManager.get('code-review');
    expect(codeReview).toBeDefined();
    expect(codeReview?.metadata.title).toBe('Code Review');
    expect(codeReview?.parameters).toHaveLength(3);
  });

  it('should compile a template', () => {
    const compiled = mcpPromptsManager.compile('code-review', {
      code: 'function test() {}',
      language: 'typescript',
    });

    expect(compiled).toBeDefined();
    expect(compiled.content).toContain('function test() {}');
    expect(compiled.content).toContain('typescript');
    expect(compiled.metadata.id).toBe('code-review');
  });

  it('should search templates', () => {
    const results = mcpPromptsManager.search('code');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].metadata.tags).toContain('code');
  });

  it('should validate parameters', () => {
    const template = mcpPromptsManager.get('code-review');
    expect(template).toBeDefined();

    // Valid parameters
    expect(() => {
      mcpPromptsManager.compile('code-review', {
        code: 'test',
        language: 'typescript',
      });
    }).not.toThrow();

    // Invalid enum value
    expect(() => {
      mcpPromptsManager.compile('code-review', {
        code: 'test',
        language: 'invalid',
      });
    }).toThrow();
  });

  it('should get templates by category', () => {
    const codingTemplates = mcpPromptsManager.getByCategory('coding');
    expect(codingTemplates.length).toBeGreaterThan(0);
  });
});

describe('MCP Auth Manager', () => {
  beforeEach(() => {
    // Clear sessions before each test
    const sessions = mcpAuthManager.getSessions();
    for (const session of sessions) {
      mcpAuthManager.deleteSession(session.id);
    }
  });

  it('should create a session', () => {
    const sessionId = mcpAuthManager.createSession('user-123', ['user']);
    expect(sessionId).toBeDefined();

    const session = mcpAuthManager.getSession(sessionId);
    expect(session).toBeDefined();
    expect(session?.userId).toBe('user-123');
    expect(session?.roles).toContain('user');
  });

  it('should check access permissions', async () => {
    const sessionId = mcpAuthManager.createSession('user-123', ['user']);

    const decision = await mcpAuthManager.checkAccess({
      sessionId,
      scope: 'tools',
      resource: 'read_file',
      action: 'execute',
      level: 'execute',
    });

    expect(decision).toBeDefined();
    expect(decision.auditId).toBeDefined();
    expect(decision.reason).toBeDefined();
  });

  it('should deny access for insufficient permissions', async () => {
    const sessionId = mcpAuthManager.createSession('user-123', ['guest']);

    const decision = await mcpAuthManager.checkAccess({
      sessionId,
      scope: 'admin',
      resource: '*',
      action: 'configure',
      level: 'admin',
    });

    expect(decision.granted).toBe(false);
    expect(decision.reason).toContain('insufficient');
  });

  it('should grant access for admin role', async () => {
    const sessionId = mcpAuthManager.createSession('user-123', ['admin']);

    const decision = await mcpAuthManager.checkAccess({
      sessionId,
      scope: 'admin',
      resource: '*',
      action: 'configure',
      level: 'admin',
    });

    expect(decision.granted).toBe(true);
    expect(decision.matchedPermissions.length).toBeGreaterThan(0);
  });

  it('should query audit logs', async () => {
    const sessionId = mcpAuthManager.createSession('user-123', ['user']);

    // Make an access check
    await mcpAuthManager.checkAccess({
      sessionId,
      scope: 'tools',
      resource: 'read_file',
      action: 'execute',
      level: 'read',
    });

    // Query audit logs
    const logs = await mcpAuthManager.queryAuditLogs({
      sessionId,
      limit: 10,
    });

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].sessionId).toBe(sessionId);
    expect(logs[0].timestamp).toBeDefined();
  });
});

describe('MCP Streaming', () => {
  beforeEach(() => {
    // Cleanup old streams
    mcpStreamServer.cleanupOldStreams(0);
  });

  it('should create a stream', () => {
    const streamId = mcpStreamServer.createStream({
      sessionId: 'test-session',
      requestId: 'test-request',
    });

    expect(streamId).toBeDefined();

    const stream = mcpStreamServer.getStream(streamId);
    expect(stream).toBeDefined();
    expect(stream?.state).toBe('pending');
  });

  it('should send events to a stream', async () => {
    const streamId = mcpStreamServer.createStream({
      sessionId: 'test-session',
      requestId: 'test-request',
    });

    await mcpStreamServer.sendEvent(streamId, {
      event: 'message',
      data: 'Hello, world!',
    });

    const stream = mcpStreamServer.getStream(streamId);
    expect(stream?.eventsSent).toBe(1);
    expect(stream?.state).toBe('active');
  });

  it('should send progress updates', async () => {
    const streamId = mcpStreamServer.createStream({
      sessionId: 'test-session',
      requestId: 'test-request',
    });

    await mcpStreamServer.sendProgress(streamId, {
      id: 'progress-1',
      current: 5,
      total: 10,
      percentage: 50,
      message: 'Processing...',
    });

    const stream = mcpStreamServer.getStream(streamId);
    expect(stream?.eventsSent).toBe(1);
  });

  it('should execute tools with streaming', async () => {
    const result = await streamingExecutor.executeWithStreaming(
      {
        toolName: 'test-tool',
        arguments: { test: 'value' },
        onProgress: async (progress) => {
          // Progress callback
          expect(progress).toHaveProperty('percentage');
        },
      },
      async (params, reportProgress) => {
        await reportProgress({ current: 1, percentage: 50, message: 'Processing' });
        await reportProgress({ current: 2, percentage: 100, message: 'Done' });
        return { result: 'success' };
      }
    );

    expect(result.toolName).toBe('test-tool');
    expect(result.result).toEqual({ result: 'success' });
    expect(result.progress.length).toBe(2);
    expect(result.cancelled).toBe(false);
  });

  it('should format SSE events', () => {
    const event = {
      id: '1',
      event: 'message' as const,
      data: 'Hello, world!',
      retry: 3000,
    };

    const formatted = mcpStreamServer.formatSSE(event);

    expect(formatted).toContain('id: 1');
    expect(formatted).toContain('event: message');
    expect(formatted).toContain('data: Hello, world!');
    expect(formatted).toContain('retry: 3000');
    expect(formatted.endsWith('\n\n')).toBe(true);
  });

  it('should close a stream', async () => {
    const streamId = mcpStreamServer.createStream({
      sessionId: 'test-session',
      requestId: 'test-request',
    });

    await mcpStreamServer.closeStream(streamId, 'Test close');

    const stream = mcpStreamServer.getStream(streamId);
    expect(stream?.state).toBe('closed');
  });

  it('should get stream statistics', () => {
    const streamId = mcpStreamServer.createStream({
      sessionId: 'test-session',
      requestId: 'test-request',
    });

    const stats = mcpStreamServer.getStats();

    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('active');
    expect(stats).toHaveProperty('totalEvents');
    expect(stats.total).toBeGreaterThan(0);
  });
});
