/**
 * Mock ToolExecutor for MCP compatibility
 * Placeholder for tool execution
 */

export class ToolExecutor {
  constructor() {}

  async execute(toolName: string, args: Record<string, unknown>) {
    return { success: true, result: {} };
  }
}
