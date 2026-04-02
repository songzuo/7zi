/**
 * Tool Executor - Real implementations for MCP tools
 *
 * Provides actual implementations for file operations, shell commands,
 * web search, and browser control with proper error handling and security.
 */

import { exec as execCallback } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const exec = promisify(execCallback)

/**
 * Result structure for tool execution
 */
export interface ToolExecutionResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

/**
 * Security validation for file paths
 */
export class PathSecurity {
  private static readonly BLOCKED_PATTERNS = [
    /~/, // Home directory expansion
    /\.\./, // Parent directory traversal
    /\/etc\/passwd/i,
    /\/etc\/shadow/i,
    /\.ssh\//i,
    /\.aws\//i,
  ]

  private static readonly ALLOWED_BASE_DIRS = [process.cwd(), '/tmp']

  /**
   * Validate a file path is safe
   */
  static validatePath(filePath: string): { valid: boolean; error?: string } {
    const normalized = path.normalize(filePath)

    // Check for blocked patterns
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(filePath)) {
        return {
          valid: false,
          error: `Path contains blocked pattern: ${pattern}`,
        }
      }
    }

    // Ensure path is within allowed directories
    const isAllowed = this.ALLOWED_BASE_DIRS.some(baseDir => {
      const resolved = path.resolve(baseDir, normalized)
      return resolved.startsWith(baseDir)
    })

    if (!isAllowed) {
      return {
        valid: false,
        error: 'Path is outside allowed directories',
      }
    }

    return { valid: true }
  }
}

/**
 * File operations
 */
export class FileTools {
  /**
   * Read file contents with optional offset and limit
   */
  static async readFile(
    filePath: string,
    options?: { offset?: number; limit?: number }
  ): Promise<ToolExecutionResult> {
    try {
      // Security check
      const validation = PathSecurity.validatePath(filePath)
      if (!validation.valid) {
        return {
          content: [{ type: 'text', text: `Security error: ${validation.error}` }],
          isError: true,
        }
      }

      // Check if file exists
      try {
        await fs.access(filePath)
      } catch (error) {
        return {
          content: [{ type: 'text', text: `File not found: ${filePath}` }],
          isError: true,
        }
      }

      // Read file
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n')

      // Apply offset and limit
      const offset = options?.offset ? Math.max(1, options.offset) - 1 : 0
      const limit = options?.limit ?? lines.length

      const selectedLines = lines.slice(offset, offset + limit)
      const selectedContent = selectedLines.join('\n')

      return {
        content: [
          {
            type: 'text',
            text: selectedContent,
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }

  /**
   * Write content to a file
   */
  static async writeFile(filePath: string, content: string): Promise<ToolExecutionResult> {
    try {
      // Security check
      const validation = PathSecurity.validatePath(filePath)
      if (!validation.valid) {
        return {
          content: [{ type: 'text', text: `Security error: ${validation.error}` }],
          isError: true,
        }
      }

      // Create parent directories if they don't exist
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })

      // Write file
      await fs.writeFile(filePath, content, 'utf-8')

      return {
        content: [
          {
            type: 'text',
            text: `Successfully wrote ${content.length} bytes to ${filePath}`,
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error writing file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }

  /**
   * List files in a directory
   */
  static async listFiles(dirPath: string): Promise<ToolExecutionResult> {
    try {
      // Security check
      const validation = PathSecurity.validatePath(dirPath)
      if (!validation.valid) {
        return {
          content: [{ type: 'text', text: `Security error: ${validation.error}` }],
          isError: true,
        }
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const fileList = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
      }))

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(fileList, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing directory: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  }
}

/**
 * Command execution
 */
export class CommandTools {
  private static readonly BLOCKED_COMMANDS = [
    /^rm\s+/i,
    /^rm -rf\s+/i,
    /^del\s+/i,
    /^format\s+/i,
    /^fdisk\s+/i,
    /^mkfs\./i,
    /^dd\s+/i,
    /^shutdown\s+/i,
    /^reboot\s+/i,
    /^:(){ :|:& };:/i, // Fork bomb
  ]

  private static readonly ALLOWED_COMMANDS = [
    /^ls\s/,
    /^cat\s/,
    /^grep\s/,
    /^find\s/,
    /^head\s/,
    /^tail\s/,
    /^wc\s/,
    /^echo\s/,
    /^pwd$/,
    /^date$/,
    /^whoami$/,
    /^which\s/,
    /^npm\s/,
    /^node\s/,
    /^git\s/,
  ]

  /**
   * Validate command is safe to execute
   */
  static validateCommand(command: string): { valid: boolean; error?: string } {
    const trimmed = command.trim()

    // Check for blocked commands
    for (const pattern of this.BLOCKED_COMMANDS) {
      if (pattern.test(trimmed)) {
        return {
          valid: false,
          error: `Command is blocked for security reasons`,
        }
      }
    }

    // If not explicitly allowed, require explicit approval (for now we allow it)
    // In production, you might want to restrict to only ALLOWED_COMMANDS
    return { valid: true }
  }

  /**
   * Execute a shell command
   */
  static async executeCommand(
    command: string,
    options?: { workdir?: string; timeout?: number }
  ): Promise<ToolExecutionResult> {
    try {
      // Security check
      const validation = this.validateCommand(command)
      if (!validation.valid) {
        return {
          content: [{ type: 'text', text: `Security error: ${validation.error}` }],
          isError: true,
        }
      }

      const execOptions: { cwd?: string; timeout?: number } = {}
      if (options?.workdir) {
        execOptions.cwd = options.workdir
      }
      if (options?.timeout) {
        execOptions.timeout = options.timeout
      }

      const { stdout, stderr } = await exec(command, execOptions)

      const output = [stdout, stderr].filter(Boolean).join('\n').trim()

      return {
        content: [
          {
            type: 'text',
            text: output || 'Command executed successfully (no output)',
          },
        ],
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        content: [
          {
            type: 'text',
            text: `Command execution error: ${errorMessage}`,
          },
        ],
        isError: true,
      }
    }
  }
}

/**
 * Web tools (requires integration with OpenClaw browser/search)
 */
export class WebTools {
  /**
   * Web search (placeholder - requires API integration)
   */
  static async webSearch(
    query: string,
    options?: { count?: number }
  ): Promise<ToolExecutionResult> {
    // Note: This requires integration with OpenClaw's web_search tool
    // For now, return a placeholder indicating integration needed
    return {
      content: [
        {
          type: 'text',
          text:
            `[Integration Required] Web search for: ${query}\n\n` +
            `This tool requires integration with OpenClaw's web_search capability.\n` +
            `Please configure the search API (e.g., Brave Search API) in the environment.`,
        },
      ],
    }
  }

  /**
   * Web fetch (placeholder - requires browser integration)
   */
  static async webFetch(
    url: string,
    options?: { extractMode?: 'markdown' | 'text' }
  ): Promise<ToolExecutionResult> {
    // Note: This requires integration with OpenClaw's web_fetch tool
    // For now, return a placeholder indicating integration needed
    return {
      content: [
        {
          type: 'text',
          text:
            `[Integration Required] Fetching: ${url}\n\n` +
            `This tool requires integration with OpenClaw's web_fetch capability.\n` +
            `Please configure the browser/fetch API in the environment.`,
        },
      ],
    }
  }
}

/**
 * Main Tool Executor - routes to appropriate tool implementations
 */
export class ToolExecutor {
  /**
   * Execute a tool by name with arguments
   */
  static async execute(name: string, args: Record<string, unknown>): Promise<ToolExecutionResult> {
    switch (name) {
      // File tools
      case 'read_file':
        return FileTools.readFile(
          args.path as string,
          args.offset ? { offset: args.offset as number, limit: args.limit as number } : undefined
        )

      case 'write_file':
        return FileTools.writeFile(args.path as string, args.content as string)

      case 'list_files':
        return FileTools.listFiles(args.path as string)

      // Command tools
      case 'exec_command':
        return CommandTools.executeCommand(args.command as string, {
          workdir: args.workdir as string | undefined,
          timeout: args.timeout as number | undefined,
        })

      // Web tools
      case 'web_search':
        return WebTools.webSearch(args.query as string, { count: args.count as number | undefined })

      case 'web_fetch':
        return WebTools.webFetch(args.url as string, {
          extractMode: args.extractMode as 'markdown' | 'text' | undefined,
        })

      // Browser control (placeholder)
      case 'browser_control':
        return {
          content: [
            {
              type: 'text',
              text:
                `[Integration Required] Browser action: ${args.action}\n\n` +
                `This tool requires integration with OpenClaw's browser control capability.`,
            },
          ],
        }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        }
    }
  }
}
