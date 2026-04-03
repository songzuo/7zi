/**
 * A2A Protocol v2 - Agent-to-Agent Communication Protocol
 */

import { EventEmitter } from 'events';
import { A2AMessage, A2ARequestOptions } from './A2ATypes';

// Re-export types for backward compatibility
export type { A2AMessage, A2ARequestOptions };

export class A2AProtocol extends EventEmitter {
  private messageHandlers: Map<string, (msg: A2AMessage) => Promise<unknown>> = new Map();
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();

  /**
   * 发送消息
   */
  async send(
    from: string,
    to: string,
    type: A2AMessage['type'],
    payload: unknown,
    options?: A2ARequestOptions
  ): Promise<A2AMessage> {
    const message: A2AMessage = {
      id: this.generateId(),
      from,
      to,
      type,
      timestamp: Date.now(),
      payload,
      correlationId: options?.metadata?.correlationId as string
    };

    this.emit('message:sent', message);
    return message;
  }

  /**
   * 发送请求并等待响应
   */
  async request(
    from: string,
    to: string,
    payload: unknown,
    options?: A2ARequestOptions
  ): Promise<unknown> {
    const requestMessage = await this.send(from, to, 'request', payload, options);

    return new Promise((resolve, reject) => {
      const timeoutMs = options?.timeout || 30000;

      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestMessage.id);
        reject(new Error(`Request timeout: ${requestMessage.id}`));
      }, timeoutMs);

      this.pendingRequests.set(requestMessage.id, { resolve, reject, timeout: timer });
    });
  }

  /**
   * 发送响应
   */
  async respond(
    from: string,
    to: string,
    correlationId: string,
    payload: unknown
  ): Promise<A2AMessage> {
    const message = await this.send(from, to, 'response', payload, {
      metadata: { correlationId }
    });

    // 检查是否有等待的请求
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
  async notify(
    from: string,
    to: string,
    payload: unknown
  ): Promise<A2AMessage> {
    return this.send(from, to, 'notification', payload);
  }

  /**
   * 发送错误
   */
  async error(
    from: string,
    to: string,
    correlationId: string,
    error: Error
  ): Promise<A2AMessage> {
    const message = await this.send(from, to, 'error', {
      message: error.message,
      stack: error.stack
    }, { metadata: { correlationId } });

    const pending = this.pendingRequests.get(correlationId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(correlationId);
      pending.reject(error);
    }

    return message;
  }

  /**
   * 注册消息处理器
   */
  onMessage(
    messageType: string,
    handler: (msg: A2AMessage) => Promise<unknown>
  ): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * 处理接收到的消息
   */
  async handleMessage(message: A2AMessage): Promise<void> {
    this.emit('message:received', message);

    // 根据消息类型处理
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        await handler(message);
      } catch (error) {
        this.emit('message:error', message, error);
      }
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理待处理的请求
   */
  cleanup(): void {
    this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingRequests.clear();
  }
}