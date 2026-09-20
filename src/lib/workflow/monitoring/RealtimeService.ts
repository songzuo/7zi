/**
 * 实时事件推送服务
 * 支持 WebSocket 和 SSE (Server-Sent Events)
 */

import { ExecutionEvent } from './types'
import { workflowMonitoring } from './index'

/**
 * 客户端连接
 */
interface ClientConnection {
  id: string
  type: 'websocket' | 'sse'
  workflowIds: Set<string>
  executionIds: Set<string>
  send: (data: string) => void
  close: () => void
}

/**
 * 实时事件服务
 */
export class RealtimeService {
  private clients: Map<string, ClientConnection> = new Map()
  private workflowClients: Map<string, Set<string>> = new Map() // workflowId -> clientIds
  private executionClients: Map<string, Set<string>> = new Map() // executionId -> clientIds

  constructor() {
    // 注册事件监听器
    this.setupEventListeners()
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    const eventTypes = [
      'started',
      'node_started',
      'node_completed',
      'node_failed',
      'completed',
      'failed',
      'cancelled',
      'progress',
    ]

    for (const type of eventTypes) {
      workflowMonitoring.on(type, (event: ExecutionEvent) => {
        this.broadcastEvent(event)
      })
    }
  }

  /**
   * 注册客户端
   */
  registerClient(
    id: string,
    type: 'websocket' | 'sse',
    send: (data: string) => void,
    close: () => void
  ): void {
    const client: ClientConnection = {
      id,
      type,
      workflowIds: new Set(),
      executionIds: new Set(),
      send,
      close,
    }

    this.clients.set(id, client)
  }

  /**
   * 注销客户端
   */
  unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    // 从工作流订阅中移除
    for (const workflowId of client.workflowIds) {
      this.workflowClients.get(workflowId)?.delete(clientId)
    }

    // 从执行订阅中移除
    for (const executionId of client.executionIds) {
      this.executionClients.get(executionId)?.delete(clientId)
    }

    // 删除客户端
    this.clients.delete(clientId)
  }

  /**
   * 订阅工作流事件
   */
  subscribeWorkflow(clientId: string, workflowId: string): boolean {
    const client = this.clients.get(clientId)
    if (!client) return false

    client.workflowIds.add(workflowId)

    if (!this.workflowClients.has(workflowId)) {
      this.workflowClients.set(workflowId, new Set())
    }
    this.workflowClients.get(workflowId)!.add(clientId)

    return true
  }

  /**
   * 取消订阅工作流
   */
  unsubscribeWorkflow(clientId: string, workflowId: string): boolean {
    const client = this.clients.get(clientId)
    if (!client) return false

    client.workflowIds.delete(workflowId)
    this.workflowClients.get(workflowId)?.delete(clientId)

    return true
  }

  /**
   * 订阅执行事件
   */
  subscribeExecution(clientId: string, executionId: string): boolean {
    const client = this.clients.get(clientId)
    if (!client) return false

    client.executionIds.add(executionId)

    if (!this.executionClients.has(executionId)) {
      this.executionClients.set(executionId, new Set())
    }
    this.executionClients.get(executionId)!.add(clientId)

    return true
  }

  /**
   * 取消订阅执行
   */
  unsubscribeExecution(clientId: string, executionId: string): boolean {
    const client = this.clients.get(clientId)
    if (!client) return false

    client.executionIds.delete(executionId)
    this.executionClients.get(executionId)?.delete(clientId)

    return true
  }

  /**
   * 广播事件
   */
  private broadcastEvent(event: ExecutionEvent): void {
    const message = JSON.stringify({
      type: 'execution_event',
      data: event,
    })

    // 发送给订阅了该执行的客户端
    const executionClientIds = this.executionClients.get(event.executionId)
    if (executionClientIds) {
      for (const clientId of executionClientIds) {
        this.sendToClient(clientId, message)
      }
    }

    // 获取执行的工作流ID
    const execution = workflowMonitoring.getExecution(event.executionId)
    if (execution) {
      // 发送给订阅了该工作流的客户端
      const workflowClientIds = this.workflowClients.get(execution.workflowId)
      if (workflowClientIds) {
        for (const clientId of workflowClientIds) {
          // 避免重复发送
          if (!executionClientIds?.has(clientId)) {
            this.sendToClient(clientId, message)
          }
        }
      }
    }
  }

  /**
   * 发送消息给客户端
   */
  private sendToClient(clientId: string, message: string): void {
    const client = this.clients.get(clientId)
    if (client) {
      try {
        client.send(message)
      } catch (error) {
        console.error(`Error sending to client ${clientId}:`, error)
        // 移除失败的客户端
        this.unregisterClient(clientId)
      }
    }
  }

  /**
   * 发送自定义事件给客户端
   */
  sendToClientDirect(clientId: string, event: { type: string; data: unknown }): boolean {
    const client = this.clients.get(clientId)
    if (!client) return false

    try {
      client.send(JSON.stringify(event))
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取客户端统计
   */
  getStats(): {
    totalClients: number
    websocketClients: number
    sseClients: number
    workflowSubscriptions: number
    executionSubscriptions: number
  } {
    let websocketClients = 0
    let sseClients = 0

    for (const client of this.clients.values()) {
      if (client.type === 'websocket') {
        websocketClients++
      } else {
        sseClients++
      }
    }

    return {
      totalClients: this.clients.size,
      websocketClients,
      sseClients,
      workflowSubscriptions: this.workflowClients.size,
      executionSubscriptions: this.executionClients.size,
    }
  }
}

// 导出单例
export const realtimeService = new RealtimeService()