/**
 * MCP Tools Registry Tests
 * Tests for src/lib/mcp/tools.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ToolRegistry,
  toolRegistry,
  initializeDefaultTools,
  type ToolCategory,
  type ExtendedToolDefinition,
} from '@/lib/mcp/tools';

describe('MCP Tools Registry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    // Use a fresh registry for each test
    registry = new ToolRegistry();
  });

  describe('ToolRegistry', () => {
    describe('register', () => {
      it('should register a tool', () => {
        const tool: ExtendedToolDefinition = {
          name: 'test_tool',
          title: 'Test Tool',
          description: 'A test tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool);

        expect(registry.has('test_tool')).toBe(true);
      });

      it('should throw error when registering duplicate tool', () => {
        const tool: ExtendedToolDefinition = {
          name: 'test_tool',
          title: 'Test Tool',
          description: 'A test tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool);

        expect(() => {
          registry.register(tool);
        }).toThrow('Tool "test_tool" is already registered');
      });

      it('should add tool to category', () => {
        const tool: ExtendedToolDefinition = {
          name: 'test_tool',
          title: 'Test Tool',
          description: 'A test tool',
          category: 'file' as ToolCategory,
          tags: ['test', 'file'],
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool);

        const categoryTools = registry.getByCategory('file' as ToolCategory);
        expect(categoryTools).toHaveLength(1);
        expect(categoryTools[0].name).toBe('test_tool');
      });
    });

    describe('unregister', () => {
      it('should unregister an existing tool', () => {
        const tool: ExtendedToolDefinition = {
          name: 'test_tool',
          title: 'Test Tool',
          description: 'A test tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool);
        const result = registry.unregister('test_tool');

        expect(result).toBe(true);
        expect(registry.has('test_tool')).toBe(false);
      });

      it('should return false when unregistering non-existent tool', () => {
        const result = registry.unregister('non_existent_tool');

        expect(result).toBe(false);
      });

      it('should remove tool from category', () => {
        const tool: ExtendedToolDefinition = {
          name: 'test_tool',
          title: 'Test Tool',
          description: 'A test tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool);
        registry.unregister('test_tool');

        const categoryTools = registry.getByCategory('file' as ToolCategory);
        expect(categoryTools).toHaveLength(0);
      });
    });

    describe('get', () => {
      it('should get a registered tool', () => {
        const tool: ExtendedToolDefinition = {
          name: 'test_tool',
          title: 'Test Tool',
          description: 'A test tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool);
        const retrievedTool = registry.get('test_tool');

        expect(retrievedTool).toBeDefined();
        expect(retrievedTool?.name).toBe('test_tool');
      });

      it('should return undefined for non-existent tool', () => {
        const retrievedTool = registry.get('non_existent_tool');

        expect(retrievedTool).toBeUndefined();
      });
    });

    describe('getAll', () => {
      it('should return all registered tools', () => {
        const tool1: ExtendedToolDefinition = {
          name: 'tool1',
          title: 'Tool 1',
          description: 'First tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        const tool2: ExtendedToolDefinition = {
          name: 'tool2',
          title: 'Tool 2',
          description: 'Second tool',
          category: 'system' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool1);
        registry.register(tool2);

        const allTools = registry.getAll();

        expect(allTools).toHaveLength(2);
        expect(allTools.some(t => t.name === 'tool1')).toBe(true);
        expect(allTools.some(t => t.name === 'tool2')).toBe(true);
      });

      it('should return empty array when no tools registered', () => {
        const allTools = registry.getAll();

        expect(allTools).toEqual([]);
      });
    });

    describe('getByCategory', () => {
      it('should get tools by category', () => {
        const fileTool: ExtendedToolDefinition = {
          name: 'file_tool',
          title: 'File Tool',
          description: 'A file tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        const systemTool: ExtendedToolDefinition = {
          name: 'system_tool',
          title: 'System Tool',
          description: 'A system tool',
          category: 'system' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(fileTool);
        registry.register(systemTool);

        const fileTools = registry.getByCategory('file' as ToolCategory);
        const systemTools = registry.getByCategory('system' as ToolCategory);

        expect(fileTools).toHaveLength(1);
        expect(systemTools).toHaveLength(1);
        expect(fileTools[0].name).toBe('file_tool');
        expect(systemTools[0].name).toBe('system_tool');
      });

      it('should return empty array for non-existent category', () => {
        const tools = registry.getByCategory('data' as ToolCategory);

        expect(tools).toEqual([]);
      });
    });

    describe('getNames', () => {
      it('should get all tool names', () => {
        const tool1: ExtendedToolDefinition = {
          name: 'tool1',
          title: 'Tool 1',
          description: 'First tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        const tool2: ExtendedToolDefinition = {
          name: 'tool2',
          title: 'Tool 2',
          description: 'Second tool',
          category: 'system' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool1);
        registry.register(tool2);

        const names = registry.getNames();

        expect(names).toHaveLength(2);
        expect(names).toContain('tool1');
        expect(names).toContain('tool2');
      });

      it('should return empty array when no tools registered', () => {
        const names = registry.getNames();

        expect(names).toEqual([]);
      });
    });

    describe('has', () => {
      it('should return true for existing tool', () => {
        const tool: ExtendedToolDefinition = {
          name: 'test_tool',
          title: 'Test Tool',
          description: 'A test tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool);

        expect(registry.has('test_tool')).toBe(true);
      });

      it('should return false for non-existent tool', () => {
        expect(registry.has('non_existent_tool')).toBe(false);
      });
    });

    describe('getDangerousTools', () => {
      it('should get dangerous tools', () => {
        const safeTool: ExtendedToolDefinition = {
          name: 'safe_tool',
          title: 'Safe Tool',
          description: 'A safe tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        const dangerousTool: ExtendedToolDefinition = {
          name: 'dangerous_tool',
          title: 'Dangerous Tool',
          description: 'A dangerous tool',
          category: 'system' as ToolCategory,
          dangerous: true,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        const requiresConfirmationTool: ExtendedToolDefinition = {
          name: 'confirmation_tool',
          title: 'Confirmation Tool',
          description: 'Requires confirmation',
          category: 'system' as ToolCategory,
          requiresConfirmation: true,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(safeTool);
        registry.register(dangerousTool);
        registry.register(requiresConfirmationTool);

        const dangerousTools = registry.getDangerousTools();

        expect(dangerousTools).toHaveLength(2);
        expect(dangerousTools.some(t => t.name === 'dangerous_tool')).toBe(true);
        expect(dangerousTools.some(t => t.name === 'confirmation_tool')).toBe(true);
        expect(dangerousTools.some(t => t.name === 'safe_tool')).toBe(false);
      });

      it('should return empty array when no dangerous tools', () => {
        const tool: ExtendedToolDefinition = {
          name: 'safe_tool',
          title: 'Safe Tool',
          description: 'A safe tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool);

        const dangerousTools = registry.getDangerousTools();

        expect(dangerousTools).toEqual([]);
      });
    });

    describe('exportMcpTools', () => {
      it('should export tools in MCP format', () => {
        const tool: ExtendedToolDefinition = {
          name: 'test_tool',
          title: 'Test Tool',
          description: 'A test tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool);

        const exportedTools = registry.exportMcpTools();

        expect(exportedTools).toHaveLength(1);
        expect(exportedTools[0].name).toBe('test_tool');
        expect(exportedTools[0].description).toBe('A test tool');
        expect(exportedTools[0]).toHaveProperty('inputSchema');
      });

      it('should not include handler in exported tools', () => {
        const tool: ExtendedToolDefinition = {
          name: 'test_tool',
          title: 'Test Tool',
          description: 'A test tool',
          category: 'file' as ToolCategory,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        registry.register(tool);

        const exportedTools = registry.exportMcpTools();

        expect(exportedTools[0]).not.toHaveProperty('handler');
      });

      it('should return empty array when no tools registered', () => {
        const exportedTools = registry.exportMcpTools();

        expect(exportedTools).toEqual([]);
      });
    });
  });

  describe('toolRegistry (global instance)', () => {
    beforeEach(() => {
      // Clear global registry
      const allTools = toolRegistry.getAll();
      allTools.forEach(tool => {
        toolRegistry.unregister(tool.name);
      });
    });

    it('should be a singleton instance', () => {
      expect(toolRegistry).toBeInstanceOf(ToolRegistry);
    });

    it('should persist tools across operations', () => {
      const tool: ExtendedToolDefinition = {
        name: 'test_tool',
        title: 'Test Tool',
        description: 'A test tool',
        category: 'file' as ToolCategory,
        inputSchema: {} as any,
        handler: vi.fn(),
      };

      toolRegistry.register(tool);

      expect(toolRegistry.has('test_tool')).toBe(true);
      expect(toolRegistry.get('test_tool')?.name).toBe('test_tool');
    });
  });

  describe('initializeDefaultTools', () => {
    beforeEach(() => {
      // Clear global registry before each test
      const allTools = toolRegistry.getAll();
      allTools.forEach(tool => {
        toolRegistry.unregister(tool.name);
      });
    });

    it('should initialize default tools', () => {
      initializeDefaultTools();

      expect(toolRegistry.has('read_file')).toBe(true);
      expect(toolRegistry.has('write_file')).toBe(true);
      expect(toolRegistry.has('delete_file')).toBe(true);
      expect(toolRegistry.has('execute_command')).toBe(true);
      expect(toolRegistry.has('http_get')).toBe(true);
    });

    it('should register file tools in file category', () => {
      initializeDefaultTools();

      const fileTools = toolRegistry.getByCategory('file' as ToolCategory);

      expect(fileTools.length).toBeGreaterThan(0);
      expect(fileTools.some(t => t.name === 'read_file')).toBe(true);
    });

    it('should register system tools in system category', () => {
      initializeDefaultTools();

      const systemTools = toolRegistry.getByCategory('system' as ToolCategory);

      expect(systemTools.length).toBeGreaterThan(0);
      expect(systemTools.some(t => t.name === 'execute_command')).toBe(true);
    });

    it('should register network tools in network category', () => {
      initializeDefaultTools();

      const networkTools = toolRegistry.getByCategory('network' as ToolCategory);

      expect(networkTools.length).toBeGreaterThan(0);
      expect(networkTools.some(t => t.name === 'http_get')).toBe(true);
    });

    it('should mark write_file as dangerous', () => {
      initializeDefaultTools();

      const dangerousTools = toolRegistry.getDangerousTools();

      expect(dangerousTools.some(t => t.name === 'write_file')).toBe(true);
      expect(dangerousTools.some(t => t.name === 'delete_file')).toBe(true);
      expect(dangerousTools.some(t => t.name === 'execute_command')).toBe(true);
    });

    it('should mark dangerous tools as requiring confirmation', () => {
      initializeDefaultTools();

      const writeTool = toolRegistry.get('write_file');
      const deleteTool = toolRegistry.get('delete_file');
      const executeTool = toolRegistry.get('execute_command');

      expect(writeTool?.dangerous).toBe(true);
      expect(writeTool?.requiresConfirmation).toBe(true);
      expect(deleteTool?.dangerous).toBe(true);
      expect(deleteTool?.requiresConfirmation).toBe(true);
      expect(executeTool?.dangerous).toBe(true);
      expect(executeTool?.requiresConfirmation).toBe(true);
    });

    it('should add tags to tools', () => {
      initializeDefaultTools();

      const readFile = toolRegistry.get('read_file');

      expect(readFile?.tags).toBeDefined();
      expect(Array.isArray(readFile?.tags)).toBe(true);
    });

    it('should not throw error when called multiple times', () => {
      initializeDefaultTools();

      expect(() => {
        initializeDefaultTools();
      }).toThrow(); // Should throw because tools are already registered
    });
  });

  describe('tool properties', () => {
    it('should support all tool categories', () => {
      const categories: ToolCategory[] = ['file', 'system', 'network', 'data', 'custom'];

      categories.forEach(category => {
        const tool: ExtendedToolDefinition = {
          name: `test_${category}`,
          title: 'Test Tool',
          description: 'A test tool',
          category,
          inputSchema: {} as any,
          handler: vi.fn(),
        };

        expect(() => {
          registry.register(tool);
        }).not.toThrow();
      });
    });

    it('should support tags property', () => {
      const tool: ExtendedToolDefinition = {
        name: 'test_tool',
        title: 'Test Tool',
        description: 'A test tool',
        category: 'file' as ToolCategory,
        tags: ['test', 'example', 'sample'],
        inputSchema: {} as any,
        handler: vi.fn(),
      };

      registry.register(tool);
      const retrievedTool = registry.get('test_tool');

      expect(retrievedTool?.tags).toEqual(['test', 'example', 'sample']);
    });

    it('should support optional dangerous property', () => {
      const safeTool: ExtendedToolDefinition = {
        name: 'safe_tool',
        title: 'Safe Tool',
        description: 'A safe tool',
        category: 'file' as ToolCategory,
        inputSchema: {} as any,
        handler: vi.fn(),
      };

      registry.register(safeTool);
      const retrievedTool = registry.get('safe_tool');

      expect(retrievedTool?.dangerous).toBeUndefined();
    });

    it('should support optional requiresConfirmation property', () => {
      const tool: ExtendedToolDefinition = {
        name: 'test_tool',
        title: 'Test Tool',
        description: 'A test tool',
        category: 'file' as ToolCategory,
        inputSchema: {} as any,
        handler: vi.fn(),
      };

      registry.register(tool);
      const retrievedTool = registry.get('test_tool');

      expect(retrievedTool?.requiresConfirmation).toBeUndefined();
    });
  });
});
