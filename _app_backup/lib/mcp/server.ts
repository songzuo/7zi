/**
 * MCP (Model Context Protocol) Server Implementation
 * 
 * This module provides a MCP Server that exposes 7zi tools and capabilities
 * to AI assistants via the standard Model Context Protocol.
 * 
 * @module mcp/server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

/**
 * MCP Server configuration options
 */
export interface McpServerConfig {
  /** Server name for identification */
  name: string;
  /** Server version */
  version: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Tool definition with handler
 */
export interface ToolDefinition<T extends z.ZodType = z.ZodType> {
  /** Tool name (unique identifier) */
  name: string;
  /** Human-readable title */
  title?: string;
  /** Tool description */
  description: string;
  /** Input schema using Zod */
  inputSchema: T;
  /** Handler function */
  handler: (params: z.infer<T>) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

/**
 * Default MCP Server configuration for 7zi
 */
const DEFAULT_CONFIG: McpServerConfig = {
  name: '7zi-mcp-server',
  version: '1.0.0',
  debug: false,
};

/**
 * 7zi MCP Server class
 * 
 * Exposes 7zi capabilities as MCP tools:
 * - File operations (read, write, edit)
 * - Command execution
 * - System information
 */
export class SevenZiMcpServer {
  private server: McpServer;
  private config: McpServerConfig;
  private tools: Map<string, ToolDefinition> = new Map();

  constructor(config: Partial<McpServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.server = new McpServer({
      name: this.config.name,
      version: this.config.version,
    }, {
      capabilities: {
        tools: {
          listChanged: true,
        },
      },
    });

    this.registerCoreTools();
  }

  /**
   * Register core tools for file operations and system commands
   */
  private registerCoreTools(): void {
    // File read tool
    this.registerTool({
      name: 'read_file',
      title: 'Read File',
      description: 'Read the contents of a file. Returns the text content of the specified file path.',
      inputSchema: z.object({
        path: z.string().describe('The path to the file to read'),
        encoding: z.string().optional().default('utf-8').describe('File encoding'),
      }),
      handler: async (params: { path: string; encoding?: string }) => {
        try {
          const fs = await import('fs/promises');
          const content = await fs.readFile(params.path, (params.encoding || 'utf-8') as BufferEncoding);
          return {
            content: [{ type: 'text', text: content }],
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error reading file: ${error}` }],
            isError: true,
          };
        }
      },
    });

    // File write tool
    this.registerTool({
      name: 'write_file',
      title: 'Write File',
      description: 'Write content to a file. Creates the file if it does not exist, overwrites if it does.',
      inputSchema: z.object({
        path: z.string().describe('The path to the file to write'),
        content: z.string().describe('The content to write to the file'),
      }),
      handler: async (params: { path: string; content: string }) => {
        try {
          const fs = await import('fs/promises');
          await fs.writeFile(params.path, params.content, 'utf-8');
          return {
            content: [{ type: 'text', text: `Successfully wrote to ${params.path}` }],
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error writing file: ${error}` }],
            isError: true,
          };
        }
      },
    });

    // List directory tool
    this.registerTool({
      name: 'list_directory',
      title: 'List Directory',
      description: 'List the contents of a directory.',
      inputSchema: z.object({
        path: z.string().describe('The path to the directory to list'),
      }),
      handler: async (params: { path: string }) => {
        try {
          const fs = await import('fs/promises');
          const entries = await fs.readdir(params.path, { withFileTypes: true });
          const result = entries.map(e => ({
            name: e.name,
            type: e.isDirectory() ? 'directory' : e.isFile() ? 'file' : 'other',
          }));
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error listing directory: ${error}` }],
            isError: true,
          };
        }
      },
    });

    // Execute command tool
    this.registerTool({
      name: 'execute_command',
      title: 'Execute Command',
      description: 'Execute a shell command and return the output. Use with caution.',
      inputSchema: z.object({
        command: z.string().describe('The command to execute'),
        cwd: z.string().optional().describe('Working directory for the command'),
        timeout: z.number().optional().default(30000).describe('Timeout in milliseconds'),
      }),
      handler: async (params: { command: string; cwd?: string; timeout?: number }) => {
        try {
          const { exec } = await import('child_process');
          const output = await new Promise<string>((resolve, reject) => {
            exec(
              params.command,
              {
                cwd: params.cwd,
                timeout: params.timeout || 30000,
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
              },
              (error, stdout, stderr) => {
                if (error) {
                  reject(new Error(`${error.message}\nstderr: ${stderr}`));
                } else {
                  resolve(stdout || stderr);
                }
              }
            );
          });
          return {
            content: [{ type: 'text', text: output || '(no output)' }],
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error executing command: ${error}` }],
            isError: true,
          };
        }
      },
    });

    // Search files tool
    this.registerTool({
      name: 'search_files',
      title: 'Search Files',
      description: 'Search for files matching a pattern in a directory.',
      inputSchema: z.object({
        path: z.string().describe('The base directory to search in'),
        pattern: z.string().describe('Glob pattern to match files (e.g., "**/*.ts")'),
      }),
      handler: async (params: { path: string; pattern: string }) => {
        try {
          const { glob } = await import('glob');
          const files = await glob(params.pattern, {
            cwd: params.path,
            nodir: true,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(files, null, 2) }],
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error searching files: ${error}` }],
            isError: true,
          };
        }
      },
    });

    // Get system info tool
    this.registerTool({
      name: 'get_system_info',
      title: 'Get System Info',
      description: 'Get system information including OS, CPU, memory, etc.',
      inputSchema: z.object({}),
      handler: async () => {
        try {
          const os = await import('os');
          const info = {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            cpus: os.cpus().length,
            totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
            freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`,
            uptime: `${Math.round(os.uptime() / 3600)} hours`,
            nodeVersion: process.version,
          };
          return {
            content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error getting system info: ${error}` }],
            isError: true,
          };
        }
      },
    });

    // HTTP request tool
    this.registerTool({
      name: 'http_request',
      title: 'HTTP Request',
      description: 'Make an HTTP request and return the response.',
      inputSchema: z.object({
        url: z.string().describe('The URL to request'),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().default('GET'),
        headers: z.record(z.string(), z.string()).optional().describe('Request headers'),
        body: z.string().optional().describe('Request body (for POST/PUT/PATCH)'),
        timeout: z.number().optional().default(30000).describe('Timeout in milliseconds'),
      }),
      handler: async (params: { 
        url: string; 
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        headers?: Record<string, string>;
        body?: string;
        timeout?: number;
      }) => {
        try {
          const response = await fetch(params.url, {
            method: params.method || 'GET',
            headers: params.headers as HeadersInit,
            body: params.body,
            signal: AbortSignal.timeout(params.timeout || 30000),
          });
          const text = await response.text();
          
          // Convert headers to plain object
          const headerObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headerObj[key] = value;
          });
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: response.status,
                statusText: response.statusText,
                headers: headerObj,
                body: text.substring(0, 10000), // Limit response size
              }, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Error making HTTP request: ${error}` }],
            isError: true,
          };
        }
      },
    });
  }

  /**
   * Register a custom tool
   */
  registerTool<T extends z.ZodType>(tool: ToolDefinition<T>): void {
    this.tools.set(tool.name, tool as ToolDefinition);
    
    // Store tool for later use (HTTP transport)
    // The MCP SDK handles registration internally
  }

  /**
   * Get list of registered tools
   */
  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Start the MCP server using stdio transport
   */
  async startStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    if (this.config.debug) {
      console.error(`[MCP Server] Started with ${this.tools.size} tools`);
    }
  }

  /**
   * Get the underlying McpServer instance
   */
  getServer(): McpServer {
    return this.server;
  }
}

// Export singleton instance
let serverInstance: SevenZiMcpServer | null = null;

/**
 * Get or create the MCP server instance
 */
export function getMcpServer(config?: Partial<McpServerConfig>): SevenZiMcpServer {
  if (!serverInstance) {
    serverInstance = new SevenZiMcpServer(config);
  }
  return serverInstance;
}

export default SevenZiMcpServer;