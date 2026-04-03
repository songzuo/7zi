/**
 * A2A Client - Agent-to-Agent Client Implementation
 */

import { EventEmitter } from 'events';
import {
  A2AMessage,
  A2ARequestOptions,
  A2AClientConfig,
  A2AEvent,
  A2AEventHandler
} from './A2ATypes';

export class A2AClient extends EventEmitter {
  private agentId: string;
  private config: Required<A2AClientConfig>;
  private messageQueue: A2AMessage[] = [];
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private isConnected: boolean = false;
  private connectionId: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(agentId: string, config?: A2AClientConfig) {
    super();
    this.agentId = agentId;
    this.config = {
      serverUrl: config?.serverUrl || 'localhost:8080',
      reconnectInterval: config?.reconnectInterval || 5000,
      heartbeatInterval: config?.heartbeatInterval || 30000,
      autoReconnect: config?.autoReconnect ?? true
    };
  }

  /**
   * 连接到 A2A 服务器
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    this.connectionId = this.generateId();
    this.isConnected = true;

    // 发送连接事件
    this.emitEvent('connected', { agentId: this.agentId, connectionId: this.connectionId });

    // 启动心跳
    this.startHeartbeat();

    // 处理队列中的消息
    await this.flushMessageQueue();
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    // 停止心跳
    this.stopHeartbeat();

    // 清理待处理的请求
    this.cleanupPendingRequests();

    this.isConnected = false;
    this.connectionId = null;

    this.emitEvent('disconnected', { agentId: this.agentId });
  }

  /**
   * 发送消息
   */
  async send(
    to: string,
    payload: unknown,
    type: A2AMessage['type'] = 'notification',
    options?: A2ARequestOptions
  ): Promise<A2AMessage> {
    const message: A2AMessage = {
      id: this.generateId(),
      from: this.agentId,
      to,
      type,
      timestamp: Date.now(),
      payload,
      correlationId: options?.metadata?.correlationId as string,
      priority: options?.priority || 'normal',
      metadata: options?.metadata
    };

    if (!this.isConnected) {
      this.messageQueue.push(message);
      return message;
    }

    this.emitEvent('message', message);
    return message;
  }

  /**
   * 发送请求并等待响应
   */
  async request(
    to: string,
    payload: unknown,
    options?: A2ARequestOptions
  ): Promise<unknown> {
    const message = await this.send(to, payload, 'request', options);

    return new Promise((resolve, reject) => {
      const timeoutMs = options?.timeout || 30000;
      const retries = options?.retries || 0;

      const timer = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        if (retries > 0) {
          // 重试逻辑
          this.retryRequest(message, retries - 1).then(resolve).catch(reject);
        } else {
          reject(new Error(`Request timeout: ${message.id}`));
        }
      }, timeoutMs);

      this.pendingRequests.set(message.id, { resolve, reject, timeout: timer });
    });
  }

  /**
   * 重试请求
   */
  private async retryRequest(originalMessage: A2AMessage, retriesLeft: number): Promise<unknown> {
    return this.request(originalMessage.to, originalMessage.payload, {
      ...originalMessage.metadata,
      retries: retriesLeft,
      timeout: 30000,
      priority: originalMessage.priority
    });
  }

  /**
   * 发送响应
   */
  async respond(
    to: string,
    correlationId: string,
    payload: unknown
  ): Promise<A2AMessage> {
    const message = await this.send(to, payload, 'response', {
      metadata: { correlationId }
    });

    // 通知等待的请求
    const pending = this.pendingRequests.get(correlationId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(correlationId);
      pending.resolve(payload);
    }

    return message;
  }

  /**
   * 发送通知
   */
  async notify(to: string, payload: unknown): Promise<A2AMessage> {
    return this.send(to, payload, 'notification');
  }

  /**
   * 发送错误
   */
  async sendError(
    to: string,
    correlationId: string,
    error: Error
  ): Promise<A2AMessage> {
    const message = await this.send(to, {
      message: error.message,
      stack: error.stack
    }, 'error', {
      metadata: { correlationId }
    });

    // 通知等待的请求
    const pending = this.pendingRequests.get(correlationId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(correlationId);
      pending.reject(error);
    }

    return message;
  }

  /**
   * 处理接收到的消息
   */
  async handleMessage(message: A2AMessage): Promise<void> {
    this.emit('message:received', message);

    // 处理心跳响应
    if (message.type === 'heartbeat') {
      this.emitEvent('heartbeat', message);
      return;
    }

    // 处理响应消息
    if (message.type === 'response' && message.correlationId) {
      const pending = this.pendingRequests.get(message.correlationId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.correlationId);
        pending.resolve(message.payload);
      }
      return;
    }

    // 处理错误消息
    if (message.type === 'error' && message.correlationId) {
      const pending = this.pendingRequests.get(message.correlationId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.correlationId);
        const error = new Error((message.payload as Error).message || 'Unknown error');
        pending.reject(error);
      }
      return;
    }

    // 触发消息事件
    this.emit('message', message);
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send('__server__', { timestamp: Date.now() }, 'heartbeat');
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 刷新消息队列
   */
  private async flushMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.send(message.to, message.payload, message.type);
      }
    }
  }

  /**
   * 清理待处理的请求
   */
  private cleanupPendingRequests(): void {
    this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingRequests.clear();
  }

  /**
   * 发送事件
   */
  private emitEvent(type: A2AEvent['type'], data?: unknown): void {
    const event: A2AEvent = {
      type,
      data,
      timestamp: Date.now()
    };
    this.emit('event', event);
    this.emit(type, event);
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): { connected: boolean; connectionId: string | null } {
    return {
      connected: this.isConnected,
      connectionId: this.connectionId
    };
  }

  /**
   * 获取待处理请求数量
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }
}
