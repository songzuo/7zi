/**
 * MCP (Model Context Protocol) Server
 *
 * 实现基于 JSON-RPC 2.0 的 MCP Server
 * 参考: https://modelcontextprotocol.io/specification
 */

import { ToolExecutor } from '@/lib/tools/executor'

export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: Record<string, unknown> | ToolResult
  error?: {
    code: number
    message: string
    data?: Record<string, unknown>
  }
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

/**
 * MCP Server 主类
 */
export class MCPServer {
  private tools: Map<string, ToolDefinition> = new Map()

  constructor() {
    this.registerBuiltinTools()
  }

  /**
   * 注册内置工具
   */
  private registerBuiltinTools(): void {
    // 读取文件工具
    this.registerTool({
      name: 'read_file',
      description: 'Read the contents of a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read',
          },
          offset: {
            type: 'number',
            description: 'Line number to start reading from (1-indexed, optional)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of lines to read (optional)',
          },
        },
        required: ['path'],
      },
    })

    // 写入文件工具
    this.registerTool({
      name: 'write_file',
      description: "Write content to a file. Creates file if doesn't exist, overwrites if it does.",
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
    })

    // 列出文件工具
    this.registerTool({
      name: 'list_files',
      description: 'List files and directories in a given path',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list',
          },
        },
        required: ['path'],
      },
    })

    // 执行命令工具
    this.registerTool({
      name: 'exec_command',
      description: 'Execute a shell command',
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell command to execute',
          },
          workdir: {
            type: 'string',
            description: 'Working directory (optional)',
          },
          timeout: {
            type: 'number',
            description: 'Command timeout in milliseconds (optional)',
          },
        },
        required: ['command'],
      },
    })

    // Web 搜索工具
    this.registerTool({
      name: 'web_search',
      description: 'Search the web using Brave Search API',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query string',
          },
          count: {
            type: 'number',
            description: 'Number of results to return (1-10, optional)',
          },
        },
        required: ['query'],
      },
    })

    // Web 获取工具
    this.registerTool({
      name: 'web_fetch',
      description: 'Fetch and extract readable content from a URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'HTTP or HTTPS URL to fetch',
          },
          extractMode: {
            type: 'string',
            enum: ['markdown', 'text'],
            description: 'Extraction mode (markdown or text)',
          },
        },
        required: ['url'],
      },
    })

    // 浏览器控制工具
    this.registerTool({
      name: 'browser_control',
      description: "Control web browser via OpenClaw's browser control",
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Browser action (start, stop, open, navigate, etc.)',
          },
          url: {
            type: 'string',
            description: 'URL to navigate to (for navigate action)',
          },
        },
        required: ['action'],
      },
    })
  }

  /**
   * 注册工具
   */
  registerTool(definition: ToolDefinition): void {
    this.tools.set(definition.name, definition)
  }

  /**
   * 获取工具列表
   */
  async listTools(): Promise<{ tools: ToolDefinition[] }> {
    return {
      tools: Array.from(this.tools.values()),
    }
  }

  /**
   * 调用工具
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name)

    if (!tool) {
      return {
        content: [{ type: 'text', text: `Tool "${name}" not found` }],
        isError: true,
      }
    }

    try {
      // 这里需要集成 OpenClaw 的实际工具
      // 目前返回示例结果
      return await this.executeTool(name, args)
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool "${name}": ${error}`,
          },
        ],
        isError: true,
      }
    }
  }

  /**
   * 执行工具（实际实现）
   */
  private async executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    // 使用真实的工具执行器
    return await ToolExecutor.execute(name, args)
  }

  /**
   * 处理 JSON-RPC 请求
   */
  async handleRequest(request: MCPRequest | MCPRequest[]): Promise<MCPResponse | MCPResponse[]> {
    // 批量请求处理
    if (Array.isArray(request)) {
      return Promise.all(request.map(req => this.handleSingleRequest(req)))
    }

    return this.handleSingleRequest(request)
  }

  /**
   * 处理单个 JSON-RPC 请求
   */
  private async handleSingleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: await this.listTools(),
          }

        case 'tools/call':
          if (!request.params?.name || typeof request.params.name !== 'string') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32602,
                message: 'Invalid params: name is required',
              },
            }
          }
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: await this.callTool(
              request.params.name as string,
              (request.params.arguments || {}) as Record<string, unknown>
            ),
          }

        default:
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          }
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: `Internal error: ${error}`,
        },
      }
    }
  }
}

/**
 * 创建全局 MCP Server 实例
 */
export const mcpServer = new MCPServer()
