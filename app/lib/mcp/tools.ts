/**
 * MCP Tools Registry
 * 
 * Central registry for all MCP tools exposed by 7zi.
 * 
 * @module mcp/tools
 */

import { z } from 'zod';
import type { ToolDefinition } from './server';

/**
 * Tool category for organization
 */
export type ToolCategory = 'file' | 'system' | 'network' | 'data' | 'custom';

/**
 * Extended tool definition with metadata
 */
export interface ExtendedToolDefinition extends ToolDefinition {
  category: ToolCategory;
  tags?: string[];
  dangerous?: boolean;
  requiresConfirmation?: boolean;
}

/**
 * Tool registry for managing available tools
 */
export class ToolRegistry {
  private tools: Map<string, ExtendedToolDefinition> = new Map();
  private categories: Map<ToolCategory, Set<string>> = new Map();

  /**
   * Register a tool
   */
  register(tool: ExtendedToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    
    this.tools.set(tool.name, tool);
    
    // Add to category
    if (!this.categories.has(tool.category)) {
      this.categories.set(tool.category, new Set());
    }
    this.categories.get(tool.category)!.add(tool.name);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) return false;
    
    this.tools.delete(name);
    this.categories.get(tool.category)?.delete(name);
    
    return true;
  }

  /**
   * Get a tool by name
   */
  get(name: string): ExtendedToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  getAll(): ExtendedToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): ExtendedToolDefinition[] {
    const names = this.categories.get(category);
    if (!names) return [];
    
    return Array.from(names)
      .map(name => this.tools.get(name))
      .filter((t): t is ExtendedToolDefinition => t !== undefined);
  }

  /**
   * Get tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get tools that require confirmation
   */
  getDangerousTools(): ExtendedToolDefinition[] {
    return this.getAll().filter(t => t.dangerous || t.requiresConfirmation);
  }

  /**
   * Export tools as MCP tool definitions
   */
  exportMcpTools(): Array<{
    name: string;
    title?: string;
    description: string;
    inputSchema: z.ZodType;
  }> {
    return this.getAll().map(tool => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistry();

/**
 * Initialize default tools
 */
export function initializeDefaultTools(): void {
  // File tools
  toolRegistry.register({
    name: 'read_file',
    title: 'Read File',
    description: 'Read the contents of a file from the filesystem',
    category: 'file',
    tags: ['file', 'read', 'filesystem'],
    inputSchema: z.object({
      path: z.string().describe('Path to the file to read'),
    }),
    handler: async (params) => {
      const fs = await import('fs/promises');
      const content = await fs.readFile(params.path, 'utf-8');
      return { content: [{ type: 'text', text: content }] };
    },
  });

  toolRegistry.register({
    name: 'write_file',
    title: 'Write File',
    description: 'Write content to a file, creating it if necessary',
    category: 'file',
    tags: ['file', 'write', 'filesystem'],
    dangerous: true,
    requiresConfirmation: true,
    inputSchema: z.object({
      path: z.string().describe('Path to the file to write'),
      content: z.string().describe('Content to write to the file'),
    }),
    handler: async (params) => {
      const fs = await import('fs/promises');
      await fs.writeFile(params.path, params.content, 'utf-8');
      return { content: [{ type: 'text', text: `File written: ${params.path}` }] };
    },
  });

  toolRegistry.register({
    name: 'delete_file',
    title: 'Delete File',
    description: 'Delete a file from the filesystem',
    category: 'file',
    tags: ['file', 'delete', 'filesystem'],
    dangerous: true,
    requiresConfirmation: true,
    inputSchema: z.object({
      path: z.string().describe('Path to the file to delete'),
    }),
    handler: async (params) => {
      const fs = await import('fs/promises');
      await fs.unlink(params.path);
      return { content: [{ type: 'text', text: `File deleted: ${params.path}` }] };
    },
  });

  // System tools
  toolRegistry.register({
    name: 'execute_command',
    title: 'Execute Command',
    description: 'Execute a shell command on the system',
    category: 'system',
    tags: ['system', 'command', 'shell'],
    dangerous: true,
    requiresConfirmation: true,
    inputSchema: z.object({
      command: z.string().describe('Command to execute'),
      cwd: z.string().optional().describe('Working directory'),
    }),
    handler: async (params) => {
      const { exec } = await import('child_process');
      const output = await new Promise<string>((resolve, reject) => {
        exec(params.command, { cwd: params.cwd }, (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve(stdout || stderr);
        });
      });
      return { content: [{ type: 'text', text: output }] };
    },
  });

  // Network tools
  toolRegistry.register({
    name: 'http_get',
    title: 'HTTP GET',
    description: 'Make an HTTP GET request',
    category: 'network',
    tags: ['network', 'http', 'request'],
    inputSchema: z.object({
      url: z.string().describe('URL to fetch'),
      headers: z.record(z.string()).optional().describe('Request headers'),
    }),
    handler: async (params) => {
      const response = await fetch(params.url, { headers: params.headers });
      const text = await response.text();
      return { content: [{ type: 'text', text }] };
    },
  });
}

export default toolRegistry;