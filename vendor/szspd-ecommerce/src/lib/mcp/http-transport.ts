/**
 * MCP HTTP Transport Implementation
 *
 * Provides Streamable HTTP transport for MCP Server
 * following the MCP 2025-06-18 specification.
 *
 * @module mcp/http-transport
 */

/**
 * SSE Event structure
 */
interface SSEEvent {
  id?: string
  event?: string
  data: string
}

/**
 * Transform JSON-RPC messages to SSE format
 */
export function toSSE(event: SSEEvent): string {
  let output = ''
  if (event.id) {
    output += `id: ${event.id}\n`
  }
  if (event.event) {
    output += `event: ${event.event}\n`
  }
  output += `data: ${event.data}\n\n`
  return output
}

/**
 * Parse SSE data from request body
 */
export function parseSSE(body: string): Array<{ event?: string; data: string }> {
  const events: Array<{ event?: string; data: string }> = []
  const lines = body.split('\n')
  let currentEvent: { event?: string; data: string } = { data: '' }

  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent.event = line.substring(6).trim()
    } else if (line.startsWith('data:')) {
      currentEvent.data += line.substring(5).trim()
    } else if (line === '') {
      if (currentEvent.data) {
        events.push(currentEvent)
      }
      currentEvent = { data: '' }
    }
  }

  if (currentEvent.data) {
    events.push(currentEvent)
  }

  return events
}

/**
 * Session manager for MCP HTTP transport
 */
export class MCPSessionManager {
  private sessions: Map<
    string,
    {
      id: string
      createdAt: Date
      lastActivity: Date
      data: Map<string, unknown>
    }
  > = new Map()

  /**
   * Create a new session
   */
  createSession(): string {
    const id = crypto.randomUUID()
    this.sessions.set(id, {
      id,
      createdAt: new Date(),
      lastActivity: new Date(),
      data: new Map(),
    })
    return id
  }

  /**
   * Get a session by ID
   */
  getSession(id: string) {
    const session = this.sessions.get(id)
    if (session) {
      session.lastActivity = new Date()
    }
    return session
  }

  /**
   * Delete a session
   */
  deleteSession(id: string): boolean {
    return this.sessions.delete(id)
  }

  /**
   * Check if a session exists
   */
  hasSession(id: string): boolean {
    return this.sessions.has(id)
  }

  /**
   * Clean up expired sessions (older than maxAgeMs)
   */
  cleanupExpired(maxAgeMs: number = 3600000): number {
    const now = Date.now()
    let cleaned = 0

    const sessionIds = Array.from(this.sessions.keys())
    for (const id of sessionIds) {
      const session = this.sessions.get(id)
      if (session && now - session.lastActivity.getTime() > maxAgeMs) {
        this.sessions.delete(id)
        cleaned++
      }
    }

    return cleaned
  }
}

/**
 * Global session manager instance
 */
export const sessionManager = new MCPSessionManager()

/**
 * MCP HTTP Transport handler utilities
 */
export class MCPHttpTransport {
  /**
   * Validate Origin header for security
   */
  static validateOrigin(origin: string | null, allowedOrigins: string[] = []): boolean {
    if (!origin) return true // Allow requests without origin

    // Allow localhost origins
    if (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('https://localhost')
    ) {
      return true
    }

    // Check allowed origins
    if (allowedOrigins.length > 0) {
      return allowedOrigins.some(allowed => {
        if (allowed === '*') return true
        try {
          const allowedUrl = new URL(allowed)
          const originUrl = new URL(origin)
          return allowedUrl.origin === originUrl.origin
        } catch (error) {
          return false
        }
      })
    }

    return false
  }

  /**
   * Create JSON-RPC response
   */
  static createResponse(
    id: string | number | null,
    result?: unknown,
    error?: {
      code: number
      message: string
      data?: unknown
    }
  ): string {
    const response: Record<string, unknown> = {
      jsonrpc: '2.0',
      id,
    }

    if (error) {
      response.error = error
    } else {
      response.result = result
    }

    return JSON.stringify(response)
  }

  /**
   * Create JSON-RPC error response
   */
  static createError(
    id: string | number | null,
    code: number,
    message: string,
    data?: unknown
  ): string {
    return this.createResponse(id, undefined, { code, message, data })
  }

  /**
   * Parse JSON-RPC message
   */
  static parseMessage(body: string): {
    jsonrpc: string
    id?: string | number | null
    method?: string
    params?: unknown
    result?: unknown
    error?: { code: number; message: string; data?: unknown }
  } | null {
    try {
      const message = JSON.parse(body)
      if (message.jsonrpc !== '2.0') {
        return null
      }
      return message
    } catch (error) {
      return null
    }
  }

  /**
   * Check if message is a JSON-RPC request
   */
  static isRequest(message: ReturnType<typeof this.parseMessage>): message is {
    jsonrpc: string
    id: string | number
    method: string
    params?: unknown
  } {
    return (
      message !== null &&
      'method' in message &&
      typeof message.method === 'string' &&
      'id' in message
    )
  }

  /**
   * Check if message is a JSON-RPC notification
   */
  static isNotification(message: ReturnType<typeof this.parseMessage>): message is {
    jsonrpc: string
    method: string
    params?: unknown
  } {
    return (
      message !== null &&
      'method' in message &&
      typeof message.method === 'string' &&
      !('id' in message)
    )
  }

  /**
   * Check if message is a JSON-RPC response
   */
  static isResponse(message: ReturnType<typeof this.parseMessage>): message is {
    jsonrpc: string
    id: string | number
    result?: unknown
    error?: { code: number; message: string; data?: unknown }
  } {
    return message !== null && 'id' in message && ('result' in message || 'error' in message)
  }
}

export default MCPHttpTransport
