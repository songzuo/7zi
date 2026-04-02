/**
 * MCP Feature Types
 */

export interface MCPTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface MCPMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
}

export interface MCPContext {
  userId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}
