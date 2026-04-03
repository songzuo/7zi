/**
 * WebSocket API - WebSocket 实时监控
 * 提供实时监控和事件推送
 */

import * as http from 'http';
import { WebSocketServer, WebSocket as WSWebSocket } from 'ws';
import {
  IMonitorEvent,
  MonitorEventType,
  IWSMessage
} from '../types';
import { Broker } from '../core/broker';
import { Monitor } from '../utils/monitor';

/**
 * WebSocket API 服务器
 */
export class WebSocketAPI {
  /** Broker */
  protected broker: Broker;

  /** Monitor */
  protected monitor: Monitor;

  /** HTTP 服务器 */
  protected httpServer?: http.Server;

  /** WebSocket 服务器 */
  protected wsServer?: WebSocketServer;

  /** 端口 */
  protected port: number;

  /** 连接的客户端 */
  protected clients: Set<WSWebSocket> = new Set();

  /** 是否正在运行 */
  protected running: boolean = false;

  /** 心跳间隔 (毫秒) */
  protected heartbeatInterval: number = 30000;

  /** 心跳定时器 */
  protected heartbeatTimer?: NodeJS.Timeout;

  constructor(broker: Broker, monitor: Monitor, port: number = 3001) {
    this.broker = broker;
    this.monitor = monitor;
    this.port = port;
  }

  /**
   * 启动 WebSocket 服务器
   */
  public async start(): Promise<void> {
    if (this.running) return;

    return new Promise((resolve, reject) => {
      // 创建 HTTP 服务器
      this.httpServer = http.createServer();

      // 创建 WebSocket 服务器
      this.wsServer = new WebSocketServer({ server: this.httpServer });

      // 处理连接
      this.wsServer.on('connection', (ws: WSWebSocket) => {
        this.handleConnection(ws);
      });

      // 监听端口
      this.httpServer.listen(this.port, () => {
        this.running = true;
        console.log(`WebSocket API server started on port ${this.port}`);
        this.startHeartbeat();
        resolve();
      });

      this.httpServer.on('error', reject);
    });
  }

  /**
   * 停止 WebSocket 服务器
   */
  public async stop(): Promise<void> {
    if (!this.running) return;

    // 停止心跳
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    // 关闭所有客户端连接
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    // 关闭服务器
    return new Promise((resolve) => {
      this.wsServer!.close(() => {
        this.httpServer!.close(() => {
          this.running = false;
          resolve();
        });
      });
    });
  }

  /**
   * 处理客户端连接
   */
  protected handleConnection(ws: WSWebSocket): void {
    // 添加到客户端集合
    this.clients.add(ws);

    // 发送欢迎消息
    this.sendToClient(ws, {
      type: 'connected',
      data: {
        message: 'Welcome to Message Queue WebSocket API',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });

    // 处理消息
    ws.on('message', (data: string) => {
      this.handleMessage(ws, data);
    });

    // 处理关闭
    ws.on('close', () => {
      this.clients.delete(ws);
    });

    // 处理错误
    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  /**
   * 处理客户端消息
   */
  protected handleMessage(ws: WSWebSocket, data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'ping':
          this.sendToClient(ws, {
            type: 'pong',
            data: { timestamp: Date.now() },
            timestamp: Date.now()
          });
          break;

        case 'subscribe':
          this.handleSubscribe(ws, message.data);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(ws, message.data);
          break;

        case 'get_stats':
          this.sendStats(ws);
          break;

        default:
          this.sendToClient(ws, {
            type: 'error',
            data: { message: `Unknown message type: ${message.type}` },
            timestamp: Date.now()
          });
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }

  /**
   * 处理订阅
   */
  protected handleSubscribe(ws: WSWebSocket, data: any): void {
    // 注意: 实际实现需要为每个客户端维护订阅列表
    // 这里简化处理

    this.sendToClient(ws, {
      type: 'subscribed',
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * 处理取消订阅
   */
  protected handleUnsubscribe(ws: WSWebSocket, data: any): void {
    this.sendToClient(ws, {
      type: 'unsubscribed',
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * 发送统计信息
   */
  protected sendStats(ws: WSWebSocket): void {
    const report = this.monitor.getReport();

    this.sendToClient(ws, {
      type: 'stats',
      data: report,
      timestamp: Date.now()
    });
  }

  /**
   * 广播监控事件
   */
  public broadcastEvent(event: IMonitorEvent): void {
    const message: IWSMessage = {
      type: event.type,
      data: event.data,
      timestamp: event.timestamp
    };

    this.broadcast(message);
  }

  /**
   * 广播消息
   */
  protected broadcast(message: IWSMessage): void {
    const data = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WSWebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * 发送消息给特定客户端
   */
  protected sendToClient(ws: WSWebSocket, message: IWSMessage): void {
    if (ws.readyState === WSWebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * 启动心跳
   */
  protected startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const message: IWSMessage = {
        type: 'heartbeat',
        data: {
          clientCount: this.clients.size,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };

      this.broadcast(message);
    }, this.heartbeatInterval);
  }

  /**
   * 获取客户端数量
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 获取所有客户端
   */
  public getClients(): WSWebSocket[] {
    return Array.from(this.clients);
  }
}