/**
 * A2A Server - Agent-to-Agent Server Implementation
 */

import { EventEmitter } from 'events';
import {
  A2AMessage,
  A2AServerConfig,
  A2AConnection,
  A2AEvent
} from './A2ATypes';

export class A2AServer extends EventEmitter {
  private config: Required<A2AServerConfig>;
  private connections: Map<string, A2AConnection> = new Map();
  private messageHandlers: Map<string, (msg: A2AMessage) => Promise<unknown>> = new Map();
  private isRunning: boolean = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private messageHistory: A2AMessage[] = [];
  private maxHistorySize: number = 1000;

  constructor(config?: A2AServerConfig) {
    super();
    this.config = {
      port: config?.port || 8080,
      host: config?.host || 'localhost',
      heartbeatInterval: config?.heartbeatInterval || 30000,
      maxConnections: config?.maxConnections || 100
    };

    // 注册默认处理器
    this.registerDefaultHandlers();
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // 启动心跳检查
    this.startHeartbeatCheck();

    this.emitEvent('connected', {
      host: this.config.host,
      port: this.config.port
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // 停止心跳检查
    this.stopHeartbeatCheck();

    // 断开所有连接
    this.connections.forEach((connection, id) => {
      this.disconnectAgent(id);
    });

    this.isRunning = false;

    this.emitEvent('disconnected', {
      host: this.config.host,
      port: this.config.port
    });
  }

  /**
   * 注册代理连接
   */
  async registerAgent(agentId: string, metadata?: Record<string, unknown>): Promise<string> {
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    const connectionId = this.generateId();
    const connection: A2AConnection = {
      id: connectionId,
      agentId,
      status: 'connected',
      lastSeen: Date.now(),
      metadata
    };

    this.connections.set(agentId, connection);

    this.emitEvent('message', {
      type: 'agent_connected',
      agentId,
      connectionId
    });

    return connectionId;
  }

  /**
   * 断开代理连接
   */
  async disconnectAgent(agentId: string): Promise<void> {
    const connection = this.connections.get(agentId);
    if (!connection) {
      return;
    }

    connection.status = 'disconnected';
    this.connections.delete(agentId);

    this.emitEvent('message', {
      type: 'agent_disconnected',
      agentId
    });
  }

  /**
   * 处理接收到的消息
   */
  async handleMessage(message: A2AMessage): Promise<void> {
    // 更新连接的最后活跃时间
    const connection = this.connections.get(message.from);
    if (connection) {
      connection.lastSeen = Date.now();
    }

    // 记录消息历史
    this.addToHistory(message);

    this.emit('message:received', message);

    // 处理心跳
    if (message.type === 'heartbeat') {
      await this.handleHeartbeat(message);
      return;
    }

    // 查找目标代理并转发消息
    if (message.to !== '__server__') {
      await this.forwardMessage(message);
      return;
    }

    // 服务器处理的消息
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        const response = await handler(message);
        if (message.type === 'request') {
          await this.sendResponse(message.from, message.id, response);
        }
      } catch (error) {
        await this.sendError(message.from, message.id, error as Error);
      }
    }
  }

  /**
   * 发送消息
   */
  async send(
    to: string,
    payload: unknown,
    type: A2AMessage['type'] = 'notification',
    correlationId?: string
  ): Promise<A2AMessage> {
    const message: A2AMessage = {
      id: this.generateId(),
      from: '__server__',
      to,
      type,
      timestamp: Date.now(),
      payload,
      correlationId
    };

    await this.forwardMessage(message);
    return message;
  }

  /**
   * 发送响应
   */
  async sendResponse(
    to: string,
    correlationId: string,
    payload: unknown
  ): Promise<A2AMessage> {
    return this.send(to, payload, 'response', correlationId);
  }

  /**
   * 发送错误
   */
  async sendError(
    to: string,
    correlationId: string,
    error: Error
  ): Promise<A2AMessage> {
    return this.send(to, {
      message: error.message,
      stack: error.stack
    }, 'error', correlationId);
  }

  /**
   * 转发消息到目标代理
   */
  private async forwardMessage(message: A2AMessage): Promise<void> {
    const targetConnection = this.connections.get(message.to);
    if (!targetConnection || targetConnection.status !== 'connected') {
      // 目标代理不存在或未连接
      if (message.type === 'request' && message.from !== '__server__') {
        await this.sendError(
          message.from,
          message.id,
          new Error(`Target agent not available: ${message.to}`)
        );
      }
      return;
    }

    this.emitEvent('message', message);
    this.emit('message:forward', message);
  }

  /**
   * 处理心跳
   */
  private async handleHeartbeat(message: A2AMessage): Promise<void> {
    const connection = this.connections.get(message.from);
    if (connection) {
      connection.lastSeen = Date.now();
    }

    // 发送心跳响应
    await this.send(message.from, { timestamp: Date.now() }, 'heartbeat');
  }

  /**
   * 注册默认处理器
   */
  private registerDefaultHandlers(): void {
    // 注册请求处理器
    this.messageHandlers.set('request', async (msg: A2AMessage) => {
      // 默认处理逻辑
      return { received: true, timestamp: Date.now() };
    });

    // 注册通知处理器
    this.messageHandlers.set('notification', async (msg: A2AMessage) => {
      this.emit('notification', msg);
      return { received: true };
    });
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
   * 启动心跳检查
   */
  private startHeartbeatCheck(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.heartbeatInterval * 3;

      this.connections.forEach((connection, agentId) => {
        if (now - connection.lastSeen > timeout) {
          this.disconnectAgent(agentId);
        }
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳检查
   */
  private stopHeartbeatCheck(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 添加消息到历史记录
   */
  private addToHistory(message: A2AMessage): void {
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
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
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取连接列表
   */
  getConnections(): A2AConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 获取连接数量
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * 获取消息历史
   */
  getMessageHistory(limit?: number): A2AMessage[] {
    if (limit) {
      return this.messageHistory.slice(-limit);
    }
    return [...this.messageHistory];
  }

  /**
   * 检查代理是否在线
   */
  isAgentOnline(agentId: string): boolean {
    const connection = this.connections.get(agentId);
    return connection?.status === 'connected';
  }

  /**
   * 获取服务器状态
   */
  getStatus(): {
    running: boolean;
    connections: number;
    maxConnections: number;
    uptime: number;
  } {
    return {
      running: this.isRunning,
      connections: this.connections.size,
      maxConnections: this.config.maxConnections,
      uptime: Date.now()
    };
  }
}
