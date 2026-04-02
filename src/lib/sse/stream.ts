/**
 * SSE Stream Manager
 * Manages Server-Sent Event streams and clients
 */

import { getSSEHeaders, formatSSEEvent } from './utils'

/**
 * SSE Client
 */
export interface SSEClient {
  id: string
  controller: ReadableStreamDefaultController
  encoder: TextEncoder
  lastEventId?: string
  connectedAt: number
}

/**
 * SSE Stream Manager
 */
export class SSEStreamManager {
  private clients: Map<string, SSEClient> = new Map()
  private eventQueue: Map<string, string[]> = new Map() // event history per client
  private maxQueueSize = 100 // max events to keep in history

  /**
   * Add a new client
   */
  addClient(id: string, controller: ReadableStreamDefaultController): SSEClient {
    const client: SSEClient = {
      id,
      controller,
      encoder: new TextEncoder(),
      connectedAt: Date.now(),
    }

    this.clients.set(id, client)
    this.eventQueue.set(id, [])

    return client
  }

  /**
   * Remove a client
   */
  removeClient(id: string): void {
    const client = this.clients.get(id)
    if (client) {
      try {
        client.controller.close()
      } catch (error) {
        // Client already closed
      }
    }
    this.clients.delete(id)
    this.eventQueue.delete(id)
  }

  /**
   * Get a client by ID
   */
  getClient(id: string): SSEClient | undefined {
    return this.clients.get(id)
  }

  /**
   * Get all connected clients
   */
  getAllClients(): SSEClient[] {
    return Array.from(this.clients.values())
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * Send event to a specific client
   */
  sendToClient(clientId: string, data: unknown, eventType?: string, eventId?: string): boolean {
    const client = this.clients.get(clientId)

    if (!client) {
      return false
    }

    try {
      const message = formatSSEEvent(data, eventType, eventId)
      const encoded = client.encoder.encode(message)

      client.controller.enqueue(encoded)

      // Store in history
      const history = this.eventQueue.get(clientId)
      if (history) {
        if (history.length >= this.maxQueueSize) {
          history.shift()
        }
        history.push(message)
      }

      return true
    } catch (error) {
      // Client disconnected
      this.removeClient(clientId)
      return false
    }
  }

  /**
   * Broadcast event to all clients
   */
  broadcast(data: unknown, eventType?: string, eventId?: string): number {
    let successCount = 0

    for (const [clientId] of this.clients) {
      if (this.sendToClient(clientId, data, eventType, eventId)) {
        successCount++
      }
    }

    return successCount
  }

  /**
   * Send keep-alive comment to keep connection alive
   */
  sendKeepAlive(clientId?: string): void {
    if (clientId) {
      const client = this.clients.get(clientId)
      if (client) {
        try {
          client.controller.enqueue(client.encoder.encode(': keep-alive\n\n'))
        } catch (error) {
          this.removeClient(clientId)
        }
      }
    } else {
      // Send to all clients
      for (const [id] of this.clients) {
        this.sendKeepAlive(id)
      }
    }
  }

  /**
   * Get event history for a client
   */
  getEventHistory(clientId: string): string[] {
    return this.eventQueue.get(clientId) || []
  }

  /**
   * Clear event history for a client
   */
  clearEventHistory(clientId: string): void {
    this.eventQueue.set(clientId, [])
  }

  /**
   * Cleanup disconnected clients
   */
  cleanup(): void {
    const now = Date.now()
    const staleThreshold = 5 * 60 * 1000 // 5 minutes

    for (const [clientId, client] of this.clients) {
      if (now - client.connectedAt > staleThreshold) {
        this.removeClient(clientId)
      }
    }
  }
}

// Global stream manager instance
let globalStreamManager: SSEStreamManager | null = null

/**
 * Get or create the global stream manager
 */
export function getGlobalStreamManager(): SSEStreamManager {
  if (!globalStreamManager) {
    globalStreamManager = new SSEStreamManager()

    // Start periodic cleanup
    setInterval(() => {
      globalStreamManager?.cleanup()
    }, 60 * 1000) // Every minute
  }

  return globalStreamManager
}

/**
 * Reset the global stream manager (useful for testing)
 */
export function resetGlobalStreamManager(): void {
  globalStreamManager = null
}
