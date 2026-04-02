/**
 * Mock ToolExecutor for MCP compatibility
 * Placeholder for tool execution
 */

import type { ToolResult } from '@/features/mcp/lib/server'

export class ToolExecutor {
  private static instance: ToolExecutor

  private constructor() {}

  static getInstance(): ToolExecutor {
    if (!ToolExecutor.instance) {
      ToolExecutor.instance = new ToolExecutor()
    }
    return ToolExecutor.instance
  }

  static async execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    // Placeholder implementation
    console.log(`[ToolExecutor] Executing tool: ${toolName}`, args)
    return {
      content: [
        {
          type: 'text',
          text: `Tool ${toolName} executed successfully`,
        },
      ],
    }
  }
}
