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
 * Logger utility for debug output
 */
class Logger {
  constructor(private enabled: boolean) {}

  log(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.error(`[MCP Server] ${message}`, ...args);
    }
  }

  error(message: string, error?: unknown): void {
    console.error(`[MCP Server] ERROR: ${message}`, error || '');
  }
}

/**
 * Response utility for creating standardized tool responses
 */
class ResponseUtil {
  static success(text: string): { content: Array<{ type: string; text: string }> } {
    return { content: [{ type: 'text', text }] };
  }

  static error(message: string, error?: unknown): { 
    content: Array<{ type: string; text: string }>; 
    isError: true 
  } {
    const errorMessage = error ? `${message}: ${error}` : message;
    return { 
      content: [{ type: 'text', text: errorMessage }], 
      isError: true 
    };
  }
}

/**
 * Async handler wrapper that standardizes error handling
 */
async function wrapHandler<T>(
  handler: () => Promise<string>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const result = await handler();
    return ResponseUtil.success(result);
  } catch (error) {
    return ResponseUtil.error('Operation failed', error);
  }
}

/**
 * Lazy-loaded module cache to avoid repeated dynamic imports
 */
class ModuleCache {
  private fs: typeof import('fs/promises') | null = null;
  private childProcess: typeof import('child_process') | null = null;
  private os: typeof import('os') | null = null;
  private globModule: typeof import('glob') | null = null;

  async getFs() {
    if (!this.fs) {
      this.fs = await import('fs/promises');
    }
    return this.fs;
  }

  async getChildProcess() {
    if (!this.childProcess) {
      this.childProcess = await import('child_process');
    }
    return this.childProcess;
  }

  async getOs() {
    if (!this.os) {
      this.os = await import('os');
    }
    return this.os;
  }

  async getGlob() {
    if (!this.globModule) {
      this.globModule = await import('glob');
    }
    return this.globModule;
  }
}

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
  private logger: Logger;
  private modules: ModuleCache;

  constructor(config: Partial<McpServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new Logger(this.config.debug || false);
    this.modules = new ModuleCache();
    
    this.server = new McpServer({
      name: this.config.name,
      version: this.config.version,
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.registerCoreTools();
    this.logger.log(`Initialized with ${this.tools.size} tools`);
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
      handler: async (params) => {
        return wrapHandler(async () => {
          const fs = await this.modules.getFs();
          const content = await fs.readFile(params.path, (params.encoding || 'utf-8') as BufferEncoding);
          return content;
        });
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
      handler: async (params) => {
        return wrapHandler(async () => {
          const fs = await this.modules.getFs();
          await fs.writeFile(params.path, params.content, 'utf-8');
          return `Successfully wrote to ${params.path}`;
        });
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
      handler: async (params) => {
        return wrapHandler(async () => {
          const fs = await this.modules.getFs();
          const entries = await fs.readdir(params.path, { withFileTypes: true });
          const result = entries.map(e => ({
            name: e.name,
            type: e.isDirectory() ? 'directory' : e.isFile() ? 'file' : 'other',
          }));
          return JSON.stringify(result, null, 2);
        });
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
      handler: async (params) => {
        return wrapHandler(async () => {
          const { exec } = await this.modules.getChildProcess();
          const timeout = params.timeout || 30000;
          
          this.logger.log(`Executing command: ${params.command}`);
          
          const output = await new Promise<string>((resolve, reject) => {
            const timer = setTimeout(() => {
              reject(new Error(`Command timed out after ${timeout}ms`));
            }, timeout);

            exec(
              params.command,
              {
                cwd: params.cwd,
                timeout,
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
              },
              (error, stdout, stderr) => {
                clearTimeout(timer);
                if (error) {
                  reject(new Error(`${error.message}\nstderr: ${stderr}`));
                } else {
                  resolve(stdout || stderr || '(no output)');
                }
              }
            );
          });
          
          return output;
        });
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
      handler: async (params) => {
        return wrapHandler(async () => {
          const { glob } = await this.modules.getGlob();
          const files = await glob(params.pattern, {
            cwd: params.path,
            nodir: true,
          });
          return JSON.stringify(files, null, 2);
        });
      },
    });

    // Get system info tool
    this.registerTool({
      name: 'get_system_info',
      title: 'Get System Info',
      description: 'Get system information including OS, CPU, memory, etc.',
      inputSchema: z.object({}),
      handler: async () => {
        return wrapHandler(async () => {
          const os = await this.modules.getOs();
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
          return JSON.stringify(info, null, 2);
        });
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
      handler: async (params) => {
        return wrapHandler(async () => {
          const timeout = params.timeout || 30000;
          this.logger.log(`Making ${params.method} request to ${params.url}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          try {
            const response = await fetch(params.url, {
              method: params.method,
              headers: params.headers as HeadersInit,
              body: params.body,
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            const text = await response.text();
            
            // Convert headers to plain object
            const headerObj: Record<string, string> = {};
            response.headers.forEach((value, key) => {
              headerObj[key] = value;
            });
            
            return JSON.stringify({
              status: response.status,
              statusText: response.statusText,
              headers: headerObj,
              body: text.substring(0, 10000), // Limit response size
            }, null, 2);
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        });
      },
    });
  }

  /**
   * Register a custom tool
   */
  registerTool<T extends z.ZodType>(tool: ToolDefinition<T>): void {
    this.tools.set(tool.name, tool as ToolDefinition);
    this.logger.log(`Registered tool: ${tool.name}`);
  }

  /**
   * Handle a JSON-RPC request (for HTTP transport)
   */
  async handleRequest(request: { 
    jsonrpc?: string; 
    id?: unknown; 
    method: string; 
    params?: Record<string, unknown>;
  }): Promise<unknown> {
    const id = request.id || null;
    
    // Validate JSON-RPC version
    if (request.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Invalid Request: jsonrpc version must be 2.0' },
      };
    }

    try {
      switch (request.method) {
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: this.getTools().map(t => ({
                name: t.name,
                title: t.title,
                description: t.description,
                inputSchema: t.inputSchema,
              })),
            },
          };

        case 'tools/call': {
          const { name, arguments: args } = request.params || {};
          const tool = this.tools.get(name as string);
          
          if (!tool) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Method not found: ${name}` },
            };
          }
          
          const result = await tool.handler(args);
          return { jsonrpc: '2.0', id, result };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: ${request.method}` },
          };
      }
    } catch (error) {
      this.logger.error('Request handling failed', error);
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: `Internal error: ${error}` },
      };
    }
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
    this.logger.log(`Started with stdio transport, ${this.tools.size} tools available`);
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

// Default singleton instance for HTTP transport
export const mcpServer = getMcpServer();

export default SevenZiMcpServer;
