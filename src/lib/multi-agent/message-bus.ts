/**
 * Agent 消息总线 - Multi-Agent 协作框架的核心
 * 支持 Agent 间异步消息传递、路由、订阅、广播
 */

import { EventEmitter } from 'events';
import {
  Message,
  MessageHeaders,
  MessageType,
  MessagePriority,
  Subscription,
  TransportType,
  MessageBusEvent,
  MultiAgentError,
  MultiAgentErrorType,
} from './types';

// 优先级队列实现
class PriorityQueue<T> {
  private queues: Map<MessagePriority, T[]> = new Map();

  constructor() {
    Object.values(MessagePriority).forEach(priority => {
      this.queues.set(priority as MessagePriority, []);
    });
  }

  enqueue(item: T, priority: MessagePriority): void {
    const queue = this.queues.get(priority);
    if (queue) {
      queue.push(item);
    }
  }

  dequeue(): T | null {
    for (const priority of Object.values(MessagePriority)) {
      const queue = this.queues.get(priority as MessagePriority);
      if (queue && queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }

  size(): number {
    let total = 0;
    this.queues.forEach(queue => (total += queue.length));
    return total;
  }

  clear(): void {
    this.queues.forEach(queue => queue.length = 0);
  }
}

// 传输接口
interface ITransport {
  send(message: Message): Promise<void>;
  subscribe(callback: (message: Message) => void): () => void;
  close(): Promise<void>;
}

// 内存传输实现
class MemoryTransport implements ITransport {
  private subscribers: Set<(message: Message) => void> = new Set();
  private eventBus: EventEmitter;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
  }

  send(message: Message): Promise<void> {
    // 内存传输直接调用订阅者回调
    this.subscribers.forEach(callback => {
      try {
        callback(message);
      } catch (_error) {
        this.eventBus.emit('error', error);
      }
    });
    return Promise.resolve();
  }

  subscribe(callback: (message: Message) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  async close(): Promise<void> {
    this.subscribers.clear();
  }
}

// WebSocket 传输实现
class WebSocketTransport implements ITransport {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscribers: Set<(message: Message) => void> = new Set();
  private eventBus: EventEmitter;
  private url: string;
  private reconnectInterval: number;
  private maxRetries: number;
  private retryCount: number = 0;

  constructor(
    url: string,
    eventBus: EventEmitter,
    reconnectInterval: number = 5000,
    maxRetries: number = 10
  ) {
    this.url = url;
    this.eventBus = eventBus;
    this.reconnectInterval = reconnectInterval;
    this.maxRetries = maxRetries;
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.retryCount = 0;
          this.eventBus.emit('transport.connected', { url: this.url });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: Message = JSON.parse(event.data);
            this.subscribers.forEach(callback => {
              try {
                callback(message);
              } catch (_error) {
                this.eventBus.emit('error', error);
              }
            });
          } catch (_error) {
            this.eventBus.emit('error', new MultiAgentError(
              MultiAgentErrorType.VALIDATION_ERROR,
              'Failed to parse WebSocket message',
              error
            ));
          }
        };

        this.ws.onclose = () => {
          this.eventBus.emit('transport.disconnected', { url: this.url });
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          this.eventBus.emit('error', new MultiAgentError(
            MultiAgentErrorType.TRANSPORT_ERROR,
            'WebSocket error',
            error
          ));
          reject(error);
        };
      } catch (_error) {
        reject(error);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.retryCount >= this.maxRetries) {
      this.eventBus.emit('error', new MultiAgentError(
        MultiAgentErrorType.TRANSPORT_ERROR,
        `Max reconnection attempts (${this.maxRetries}) reached`
      ));
      return;
    }

    this.retryCount++;
    this.reconnectTimer = setTimeout(() => {
      this.eventBus.emit('transport.reconnecting', {
        url: this.url,
        attempt: this.retryCount,
      });
      this.connect().catch(error => {
        this.eventBus.emit('error', error);
      });
    }, this.reconnectInterval);
  }

  async send(message: Message): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws!.send(JSON.stringify(message));
        resolve();
      } catch (_error) {
        reject(new MultiAgentError(
          MultiAgentErrorType.TRANSPORT_ERROR,
          'Failed to send WebSocket message',
          error
        ));
      }
    });
  }

  subscribe(callback: (message: Message) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  async close(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscribers.clear();
    this.retryCount = 0;
  }
}

// 消息总线主类
export class MessageBus extends EventEmitter {
  private queue: PriorityQueue<Message>;
  private transport: ITransport;
  private subscriptions: Map<string, Subscription[]> = new Map();
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private messageHistory: Map<string, Message> = new Map();
  private defaultTimeout: number;
  private maxRetryCount: number;
  private retryDelay: number;
  private processing: boolean = false;

  constructor(
    transportType: TransportType = TransportType.MEMORY,
    options?: {
      transportUrl?: string;
      defaultTimeout?: number;
      maxRetryCount?: number;
      retryDelay?: number;
      bufferSize?: number;
    }
  ) {
    super();
    this.queue = new PriorityQueue();
    this.defaultTimeout = options?.defaultTimeout || 30000; // 30秒
    this.maxRetryCount = options?.maxRetryCount || 3;
    this.retryDelay = options?.retryDelay || 1000; // 1秒

    // 初始化传输层
    if (transportType === TransportType.WEBSOCKET && options?.transportUrl) {
      this.transport = new WebSocketTransport(
        options.transportUrl,
        this,
        options.retryDelay,
        this.maxRetryCount
      );
      // 连接 WebSocket
      (this.transport as WebSocketTransport).connect().catch(error => {
        this.emit('error', error);
      });
    } else {
      this.transport = new MemoryTransport(this);
    }

    // 订阅传输层的消息
    this.transport.subscribe((message: Message) => {
      this.handleIncomingMessage(message);
    });

    // 启动消息处理循环
    this.startProcessing();
  }

  /**
   * 发送消息
   */
  async send<T = any>(message: Message<T>): Promise<void> {
    // 检查消息是否过期
    if (message.headers.expiresAt && message.headers.expiresAt < Date.now()) {
      throw new MultiAgentError(
        MultiAgentErrorType.MESSAGE_EXPIRED,
        `Message ${message.headers.id} has expired`
      );
    }

    // 检查重试次数
    const retryCount = message.headers.retryCount || 0;
    if (retryCount >= (message.headers.maxRetries || this.maxRetryCount)) {
      throw new MultiAgentError(
        MultiAgentErrorType.VALIDATION_ERROR,
        `Max retry count exceeded for message ${message.headers.id}`
      );
    }

    // 保存到历史记录
    this.messageHistory.set(message.headers.id, message);

    // 通过传输层发送
    await this.transport.send(message);

    this.emit('message.sent', { message });
  }

  /**
   * 发送请求并等待响应
   */
  async request<TRequest = any, TResponse = any>(
    to: string,
    body: TRequest,
    options?: {
      priority?: MessagePriority;
      timeout?: number;
      headers?: Partial<MessageHeaders>;
    }
  ): Promise<TResponse> {
    const correlationId = this.generateId();
    const headers: MessageHeaders = {
      id: this.generateId(),
      type: MessageType.REQUEST,
      from: this.generateId(), // TODO: 使用真实的 Agent ID
      to,
      correlationId,
      priority: options?.priority || MessagePriority.NORMAL,
      timestamp: Date.now(),
      expiresAt: Date.now() + (options?.timeout || this.defaultTimeout),
      ...(options?.headers || {}),
    };

    const message: Message<TRequest> = { headers, body };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new MultiAgentError(
          MultiAgentErrorType.TASK_TIMEOUT,
          `Request ${correlationId} timed out`
        ));
      }, options?.timeout || this.defaultTimeout);

      this.pendingRequests.set(correlationId, { resolve, reject, timeout });

      this.send(message).catch(error => {
        clearTimeout(timeout);
        this.pendingRequests.delete(correlationId);
        reject(error);
      });
    });
  }

  /**
   * 订阅主题
   */
  subscribe(
    topic: string,
    handler: (message: Message) => void | Promise<void>,
    filter?: (message: Message) => boolean
  ): () => void {
    const subscription: Subscription = {
      id: this.generateId(),
      subscriberId: this.generateId(), // TODO: 使用真实的 Agent ID
      topic,
      filter,
      createdAt: Date.now(),
    };

    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic)!.push(subscription);

    this.emit('subscribe', { subscription });

    // 返回取消订阅函数
    return () => {
      const subs = this.subscriptions.get(topic);
      if (subs) {
        const index = subs.findIndex(s => s.id === subscription.id);
        if (index !== -1) {
          subs.splice(index, 1);
        }
      }
      this.emit('unsubscribe', { subscriptionId: subscription.id });
    };
  }

  /**
   * 广播消息
   */
  async broadcast<T = any>(
    topic: string,
    body: T,
    options?: {
      priority?: MessagePriority;
      exclude?: string[];
    }
  ): Promise<void> {
    const headers: MessageHeaders = {
      id: this.generateId(),
      type: MessageType.BROADCAST,
      from: this.generateId(), // TODO: 使用真实的 Agent ID
      topic,
      priority: options?.priority || MessagePriority.NORMAL,
      timestamp: Date.now(),
    };

    const message: Message<T> = { headers, body };

    await this.send(message);
  }

  /**
   * 处理传入的消息
   */
  private async handleIncomingMessage(message: Message): Promise<void> {
    // 检查消息是否过期
    if (message.headers.expiresAt && message.headers.expiresAt < Date.now()) {
      this.emit('error', new MultiAgentError(
        MultiAgentErrorType.MESSAGE_EXPIRED,
        `Received expired message ${message.headers.id}`
      ));
      return;
    }

    // 处理响应消息
    if (message.headers.type === MessageType.RESPONSE) {
      const correlationId = message.headers.correlationId;
      if (correlationId && this.pendingRequests.has(correlationId)) {
        const { resolve, timeout } = this.pendingRequests.get(correlationId)!;
        clearTimeout(timeout);
        this.pendingRequests.delete(correlationId);
        resolve(message.body);
        return;
      }
    }

    // 将消息加入优先级队列
    this.queue.enqueue(message, message.headers.priority);
  }

  /**
   * 启动消息处理循环
   */
  private startProcessing(): void {
    const processNext = async () => {
      if (this.processing) {
        return;
      }

      this.processing = true;

      while (this.queue.size() > 0) {
        const message = this.queue.dequeue();
        if (message) {
          await this.deliverMessage(message);
        }
      }

      this.processing = false;

      // 继续处理（如果有新消息加入）
      if (this.queue.size() > 0) {
        setImmediate(processNext);
      }
    };

    setImmediate(processNext);
  }

  /**
   * 投递消息到订阅者
   */
  private async deliverMessage(message: Message): Promise<void> {
    // 广播消息投递到订阅者
    if (message.headers.topic) {
      const subscriptions = this.subscriptions.get(message.headers.topic);
      if (subscriptions) {
        for (const subscription of subscriptions) {
          // 应用过滤器
          if (subscription.filter && !subscription.filter(message)) {
            continue;
          }

          try {
            // 这里需要找到实际的订阅者处理函数
            // 简化版本：直接发出事件
            this.emit('message', { message, subscription });
          } catch (_error) {
            this.emit('error', error);
          }
        }
      }
    }

    // 单播消息发出事件
    if (message.headers.to) {
      this.emit('message.to.' + message.headers.to, { message });
    }

    // 通用消息事件
    this.emit('message.received', { message });
  }

  /**
   * 重试发送失败的消息
   */
  private async retryMessage(message: Message): Promise<void> {
    const updatedMessage: Message = {
      ...message,
      headers: {
        ...message.headers,
        retryCount: (message.headers.retryCount || 0) + 1,
      },
    };

    // 延迟重试
    await new Promise(resolve => setTimeout(resolve, this.retryDelay));

    try {
      await this.send(updatedMessage);
    } catch (_error) {
      // 重试失败，发出错误事件
      this.emit('error', error);
    }
  }

  /**
   * 关闭消息总线
   */
  async close(): Promise<void> {
    // 清理超时定时器
    this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingRequests.clear();

    // 清理队列
    this.queue.clear();

    // 关闭传输层
    await this.transport.close();

    // 清理订阅
    this.subscriptions.clear();

    // 清理历史记录
    this.messageHistory.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      queueSize: this.queue.size(),
      subscriptionCount: Array.from(this.subscriptions.values())
        .reduce((sum, subs) => sum + subs.length, 0),
      pendingRequests: this.pendingRequests.size,
      messageHistorySize: this.messageHistory.size,
    };
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
