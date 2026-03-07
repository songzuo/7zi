/**
 * Socket.io 客户端管理器
 * 
 * 管理与服务器的 WebSocket 连接
 */

import { io, Socket } from 'socket.io-client';
import type {
  WebSocketMessage,
  ClientSocketEvent,
  NotificationHandler,
  RealtimeConnectionOptions,
} from './types';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

interface SocketManagerEvents {
  message: NotificationHandler;
  connectionState: (state: ConnectionState) => void;
  error: (error: Error) => void;
}

class SocketManager {
  private socket: Socket | null = null;
  private url: string = '';
  private token: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private heartbeatInterval = 30000;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private channels: Set<string> = new Set();
  private listeners: Map<string, Set<NotificationHandler>> = new Map();
  private connectionStateListeners: Set<(state: ConnectionState) => void> = new Set();
  private errorListeners: Set<(error: Error) => void> = new Set();
  private state: ConnectionState = 'disconnected';

  /**
   * 初始化连接
   */
  connect(options: RealtimeConnectionOptions): void {
    this.url = options.url;
    this.token = options.token || '';
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.reconnectInterval = options.reconnectInterval ?? 3000;
    this.heartbeatInterval = options.heartbeatInterval ?? 30000;
    
    if (options.channels) {
      options.channels.forEach(ch => this.channels.add(ch));
    }

    this.createSocket();
  }

  /**
   * 创建 Socket 连接
   */
  private createSocket(): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    this.setState('connecting');

    this.socket = io(this.url, {
      auth: {
        token: this.token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectInterval,
      reconnectionDelayMax: this.reconnectInterval * 3,
    });

    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      this.setState('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      // 重新订阅频道
      if (this.channels.size > 0) {
        this.subscribe(Array.from(this.channels));
      }
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      this.setState('disconnected');
      this.stopHeartbeat();
      
      if (reason === 'io server disconnect') {
        // 服务器主动断开，延迟重连
        setTimeout(() => {
          this.createSocket();
        }, this.reconnectInterval);
      }
    });

    // 重连尝试
    this.socket.io.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      this.setState('reconnecting');
    });

    // 重连失败
    this.socket.io.on('reconnect_failed', () => {
      this.setState('error');
      this.emitError(new Error('WebSocket reconnection failed'));
    });

    // 错误处理
    this.socket.on('connect_error', (error) => {
      this.setState('error');
      this.emitError(error);
    });

    // 消息处理 - 注册各类消息处理器
    this.registerMessageHandlers();
  }

  /**
   * 注册消息处理器
   */
  private registerMessageHandlers(): void {
    if (!this.socket) return;

    // 任务相关消息
    this.socket.on('task:status_changed', (data) => this.handleMessage('task:status_changed', data));
    this.socket.on('task:assigned', (data) => this.handleMessage('task:assigned', data));
    this.socket.on('task:comment', (data) => this.handleMessage('task:comment', data));

    // 成员相关消息
    this.socket.on('member:online', (data) => this.handleMessage('member:online', data));
    this.socket.on('member:offline', (data) => this.handleMessage('member:offline', data));
    this.socket.on('member:status_changed', (data) => this.handleMessage('member:status_changed', data));

    // 系统消息
    this.socket.on('system:announcement', (data) => this.handleMessage('system:announcement', data));

    // 项目消息
    this.socket.on('project:updated', (data) => this.handleMessage('project:updated', data));

    // 心跳和连接确认
    this.socket.on('heartbeat', (data) => this.handleMessage('heartbeat', data));
    this.socket.on('connection:confirmed', (data) => this.handleMessage('connection:confirmed', data));
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(type: string, data: WebSocketMessage): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in message handler for ${type}:`, err);
        }
      });
    }

    // 通用处理器
    const allHandlers = this.listeners.get('*');
    if (allHandlers) {
      allHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error('Error in wildcard message handler:', err);
        }
      });
    }
  }

  /**
   * 发送消息
   */
  emit(event: ClientSocketEvent): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot emit event');
      return;
    }

    this.socket.emit(event.type, event);
  }

  /**
   * 订阅频道
   */
  subscribe(channels: string[]): void {
    channels.forEach(ch => this.channels.add(ch));
    
    if (this.socket?.connected) {
      this.emit({
        type: 'subscribe',
        channels,
      });
    }
  }

  /**
   * 取消订阅频道
   */
  unsubscribe(channels: string[]): void {
    channels.forEach(ch => this.channels.delete(ch));
    
    if (this.socket?.connected) {
      this.emit({
        type: 'unsubscribe',
        channels,
      });
    }
  }

  /**
   * 监听消息
   */
  on(type: string, handler: NotificationHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  /**
   * 监听连接状态变化
   */
  onConnectionState(callback: (state: ConnectionState) => void): () => void {
    this.connectionStateListeners.add(callback);
    callback(this.state); // 立即返回当前状态
    return () => {
      this.connectionStateListeners.delete(callback);
    };
  }

  /**
   * 监听错误
   */
  onError(callback: (error: Error) => void): () => void {
    this.errorListeners.add(callback);
    return () => {
      this.errorListeners.delete(callback);
    };
  }

  /**
   * 设置状态并通知监听器
   */
  private setState(state: ConnectionState): void {
    this.state = state;
    this.connectionStateListeners.forEach(cb => {
      try {
        cb(state);
      } catch (err) {
        console.error('Error in connection state listener:', err);
      }
    });
  }

  /**
   * 触发错误事件
   */
  private emitError(error: Error): void {
    this.errorListeners.forEach(cb => {
      try {
        cb(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.emit({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        });
      }
    }, this.heartbeatInterval);
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
   * 标记通知已读
   */
  markRead(notificationIds: string[]): void {
    this.emit({
      type: 'mark_read',
      notificationIds,
    });
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 获取当前状态
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.setState('disconnected');
  }

  /**
   * 重连
   */
  reconnect(): void {
    this.disconnect();
    this.createSocket();
  }
}

// 单例导出
export const socketManager = new SocketManager();

// 类型导出
export type { ConnectionState, SocketManagerEvents };
export { SocketManager };