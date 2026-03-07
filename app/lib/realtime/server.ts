/**
 * WebSocket 服务端
 * 
 * 基于 Socket.io 的实时通信服务
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { WebSocketMessage, ClientSocketEvent } from './types';
import { verifyTokenAndGetUserId, extractToken } from './jwt-verify';
import { readStatusStore } from './read-status';

/** 用户会话信息 */
interface UserSession {
  userId: string;
  socketId: string;
  channels: Set<string>;
  lastActivity: Date;
}

/** 通知服务配置 */
interface NotificationServerOptions {
  cors?: {
    origin: string | string[];
    methods?: string[];
    credentials?: boolean;
  };
  heartbeatInterval?: number;
  authTimeout?: number;
}

/** 默认配置 */
const DEFAULT_OPTIONS: NotificationServerOptions = {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  heartbeatInterval: 30000,
  authTimeout: 10000,
};

/**
 * 实时通知服务类
 */
export class NotificationServer {
  private io: SocketIOServer | null = null;
  private sessions: Map<string, UserSession> = new Map();
  private userSocketMap: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private options: NotificationServerOptions;

  constructor(options: NotificationServerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 初始化 Socket.io 服务
   */
  initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: this.options.cors,
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startHeartbeat();

    console.log('[NotificationServer] WebSocket server initialized');
  }

  /**
   * 设置认证中间件
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
          // 允许匿名连接（受限功能）
          socket.data.userId = null;
          socket.data.isAuthenticated = false;
          return next();
        }

        // 使用 JWT 验证模块验证 token
        const cleanToken = extractToken(token);
        const userId = cleanToken ? await verifyTokenAndGetUserId(cleanToken) : null;
        
        if (userId) {
          socket.data.userId = userId;
          socket.data.isAuthenticated = true;
          console.log(`[NotificationServer] User authenticated: ${userId}`);
        } else {
          socket.data.userId = null;
          socket.data.isAuthenticated = false;
          console.log(`[NotificationServer] Anonymous connection: ${socket.id}`);
        }

        next();
      } catch (error) {
        console.error('[NotificationServer] Auth middleware error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * 验证 Token - 已迁移到 jwt-verify.ts
   * @deprecated 使用 verifyTokenAndGetUserId 替代
   */
  private verifyToken(token: string): string | null {
    // 保留同步版本用于向后兼容
    // 新代码应使用 verifyTokenAndGetUserId
    console.warn('[NotificationServer] verifyToken is deprecated, use verifyTokenAndGetUserId instead');
    
    if (token.startsWith('user-')) {
      return token.replace('user-', '');
    }
    if (token.startsWith('Bearer ')) {
      return token.slice(7);
    }
    return 'anonymous-user';
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * 处理新连接
   */
  private handleConnection(socket: Socket): void {
    const userId = socket.data.userId || socket.id;

    console.log(`[NotificationServer] Client connected: ${socket.id}, userId: ${userId}`);

    // 创建会话
    const session: UserSession = {
      userId,
      socketId: socket.id,
      channels: new Set(),
      lastActivity: new Date(),
    };
    this.sessions.set(socket.id, session);

    // 更新用户 Socket 映射
    if (!this.userSocketMap.has(userId)) {
      this.userSocketMap.set(userId, new Set());
    }
    this.userSocketMap.get(userId)!.add(socket.id);

    // 发送连接确认
    this.sendToSocket(socket.id, {
      type: 'connection:confirmed',
      id: `conn-${Date.now()}`,
      timestamp: new Date().toISOString(),
      payload: {
        userId,
        sessionId: socket.id,
        reconnectToken: `reconnect-${socket.id}`,
      },
    });

    // 设置事件监听
    this.setupSocketEvents(socket, session);
  }

  /**
   * 设置 Socket 事件监听
   */
  private setupSocketEvents(socket: Socket, session: UserSession): void {
    // 订阅频道
    socket.on('subscribe', (data: { channels: string[] }) => {
      this.handleSubscribe(socket, session, data.channels);
    });

    // 取消订阅
    socket.on('unsubscribe', (data: { channels: string[] }) => {
      this.handleUnsubscribe(socket, session, data.channels);
    });

    // 心跳
    socket.on('heartbeat', (data: { timestamp: string }) => {
      session.lastActivity = new Date();
      this.sendToSocket(socket.id, {
        type: 'heartbeat',
        id: `hb-${Date.now()}`,
        timestamp: new Date().toISOString(),
        payload: {
          serverTime: new Date().toISOString(),
        },
      });
    });

    // 标记已读
    socket.on('mark_read', (data: { notificationIds: string[] }) => {
      // TODO: 实现已读标记持久化
      console.log(`[NotificationServer] User ${session.userId} marked as read:`, data.notificationIds);
    });

    // 断开连接
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, session, reason);
    });

    // 错误处理
    socket.on('error', (error) => {
      console.error(`[NotificationServer] Socket error for ${socket.id}:`, error);
    });
  }

  /**
   * 处理订阅
   */
  private handleSubscribe(socket: Socket, session: UserSession, channels: string[]): void {
    channels.forEach(channel => {
      session.channels.add(channel);
      socket.join(channel);
    });

    console.log(`[NotificationServer] Socket ${socket.id} subscribed to:`, channels);
  }

  /**
   * 处理取消订阅
   */
  private handleUnsubscribe(socket: Socket, session: UserSession, channels: string[]): void {
    channels.forEach(channel => {
      session.channels.delete(channel);
      socket.leave(channel);
    });

    console.log(`[NotificationServer] Socket ${socket.id} unsubscribed from:`, channels);
  }

  /**
   * 处理断开连接
   */
  private handleDisconnection(socket: Socket, session: UserSession, reason: string): void {
    console.log(`[NotificationServer] Client disconnected: ${socket.id}, reason: ${reason}`);

    // 清理会话
    this.sessions.delete(socket.id);

    // 更新用户 Socket 映射
    const userSockets = this.userSocketMap.get(session.userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.userSocketMap.delete(session.userId);
        
        // 广播用户离线
        this.broadcastUserOffline(session.userId);
      }
    }
  }

  /**
   * 广播用户离线
   */
  private broadcastUserOffline(userId: string): void {
    this.broadcast({
      type: 'member:offline',
      id: `offline-${Date.now()}`,
      timestamp: new Date().toISOString(),
      payload: {
        userId,
        userName: userId,
        lastOnline: new Date().toISOString(),
      },
    });
  }

  /**
   * 启动心跳定时器
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (!this.io) return;

      const now = Date.now();
      const timeout = (this.options.heartbeatInterval || 30000) * 3;

      // 检查超时连接
      this.sessions.forEach((session, socketId) => {
        const lastActivity = session.lastActivity.getTime();
        if (now - lastActivity > timeout) {
          const socket = this.io?.sockets.sockets.get(socketId);
          if (socket) {
            console.log(`[NotificationServer] Disconnecting inactive socket: ${socketId}`);
            socket.disconnect(true);
          }
        }
      });
    }, this.options.heartbeatInterval);
  }

  // ========== 公共 API ==========

  /**
   * 向指定 Socket 发送消息
   */
  sendToSocket(socketId: string, message: WebSocketMessage): boolean {
    if (!this.io) return false;

    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit(message.type, message);
      return true;
    }
    return false;
  }

  /**
   * 向指定用户发送消息
   */
  sendToUser(userId: string, message: WebSocketMessage): number {
    const socketIds = this.userSocketMap.get(userId);
    if (!socketIds || socketIds.size === 0) return 0;

    let sent = 0;
    socketIds.forEach(socketId => {
      if (this.sendToSocket(socketId, message)) {
        sent++;
      }
    });
    return sent;
  }

  /**
   * 向频道广播消息
   */
  broadcastToChannel(channel: string, message: WebSocketMessage): void {
    if (!this.io) return;
    this.io.to(channel).emit(message.type, message);
  }

  /**
   * 向所有连接广播消息
   */
  broadcast(message: WebSocketMessage): void {
    if (!this.io) return;
    this.io.emit(message.type, message);
  }

  /**
   * 发送系统公告
   */
  sendSystemAnnouncement(options: {
    title: string;
    content: string;
    level: 'info' | 'warning' | 'critical' | 'maintenance';
    actionUrl?: string;
    actionText?: string;
  }): void {
    const message: WebSocketMessage = {
      type: 'system:announcement',
      id: `sys-${Date.now()}`,
      timestamp: new Date().toISOString(),
      payload: {
        title: options.title,
        content: options.content,
        level: options.level,
        actionUrl: options.actionUrl,
        actionText: options.actionText,
      },
    };

    this.broadcast(message);
  }

  /**
   * 发送任务状态变更通知
   */
  sendTaskStatusChange(options: {
    taskId: string;
    taskTitle: string;
    oldStatus: string;
    newStatus: string;
    changedBy: { id: string; name: string };
    projectId?: string;
    projectName?: string;
  }): void {
    const message: WebSocketMessage = {
      type: 'task:status_changed',
      id: `task-${Date.now()}`,
      timestamp: new Date().toISOString(),
      payload: {
        taskId: options.taskId,
        taskTitle: options.taskTitle,
        oldStatus: options.oldStatus as any,
        newStatus: options.newStatus as any,
        changedBy: options.changedBy,
        projectId: options.projectId,
        projectName: options.projectName,
      },
    };

    // 如果有项目，发送到项目频道
    if (options.projectId) {
      this.broadcastToChannel(`project:${options.projectId}`, message);
    } else {
      this.broadcast(message);
    }
  }

  /**
   * 发送任务分配通知
   */
  sendTaskAssignment(options: {
    taskId: string;
    taskTitle: string;
    assignedTo: { id: string; name: string };
    assignedBy: { id: string; name: string };
    projectId?: string;
  }): void {
    const message: WebSocketMessage = {
      type: 'task:assigned',
      id: `assign-${Date.now()}`,
      timestamp: new Date().toISOString(),
      payload: {
        taskId: options.taskId,
        taskTitle: options.taskTitle,
        assignedTo: options.assignedTo,
        assignedBy: options.assignedBy,
        projectId: options.projectId,
      },
    };

    // 发送给被分配的用户
    this.sendToUser(options.assignedTo.id, message);
  }

  /**
   * 获取在线用户列表
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userSocketMap.keys());
  }

  /**
   * 获取连接数
   */
  getConnectionCount(): number {
    return this.sessions.size;
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSocketMap.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * 关闭服务
   */
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.io) {
      this.io.close();
      this.io = null;
    }

    this.sessions.clear();
    this.userSocketMap.clear();

    console.log('[NotificationServer] WebSocket server closed');
  }
}

// 单例导出
export const notificationServer = new NotificationServer();

export default NotificationServer;