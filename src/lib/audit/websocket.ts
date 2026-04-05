/**
 * 审计日志 WebSocket 服务 - 实时审计事件推送
 * @module lib/audit/websocket
 * @version 1.12.0
 */

import type { AuditLogEntry, AuditAction, AuditStatus } from './types.js';

// ============================================================================
// WebSocket 消息类型
// ============================================================================

/**
 * WebSocket 消息类型
 */
export type AuditWsMessageType = 'audit_event' | 'audit_batch' | 'stats_update' | 'error';

/**
 * 审计 WebSocket 消息
 */
export interface AuditWsMessage {
  /** 消息类型 */
  type: AuditWsMessageType;
  /** 时间戳 */
  timestamp: number;
  /** 数据 */
  data: AuditLogEntry | AuditLogEntry[] | AuditWsStats | AuditWsError;
}

/**
 * 审计统计信息
 */
export interface AuditWsStats {
  /** 总日志数 */
  totalLogs: number;
  /** 最近一分钟日志数 */
  recentLogs: number;
  /** 按操作类型统计 */
  byAction: Record<AuditAction, number>;
  /** 按状态统计 */
  byStatus: Record<AuditStatus, number>;
}

/**
 * 错误信息
 */
export interface AuditWsError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
}

// ============================================================================
// 订阅者管理
// ============================================================================

/**
 * WebSocket 订阅者
 */
interface WsSubscriber {
  /** 连接ID */
  id: string;
  /** WebSocket 发送函数 */
  send: (data: string) => void;
  /** 订阅的过滤条件 */
  filters?: {
    userId?: string;
    actions?: AuditAction[];
    resources?: string[];
  };
}

/**
 * 审计日志 WebSocket 服务
 */
export class AuditWebSocketService {
  private subscribers: Map<string, WsSubscriber> = new Map();
  private stats: AuditWsStats = {
    totalLogs: 0,
    recentLogs: 0,
    byAction: {
      CREATE: 0,
      READ: 0,
      UPDATE: 0,
      DELETE: 0,
      LOGIN: 0,
      LOGOUT: 0,
      EXPORT: 0,
      ADMIN: 0,
    },
    byStatus: {
      success: 0,
      failure: 0,
    },
  };
  private recentLogsQueue: AuditLogEntry[] = [];
  private recentLogsLimit = 1000;
  private statsUpdateInterval: NodeJS.Timeout | null = null;
  private broadcastStatsInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 启动统计更新定时器
    this.startStatsUpdate();
  }

  /**
   * 添加订阅者
   */
  public addSubscriber(
    id: string,
    send: (data: string) => void,
    filters?: WsSubscriber['filters']
  ): void {
    this.subscribers.set(id, { id, send, filters });
  }

  /**
   * 移除订阅者
   */
  public removeSubscriber(id: string): void {
    this.subscribers.delete(id);
  }

  /**
   * 广播审计事件
   */
  public broadcast(event: AuditLogEntry): void {
    // 更新统计
    this.updateStats(event);

    // 添加到最近日志队列
    this.recentLogsQueue.unshift(event);
    if (this.recentLogsQueue.length > this.recentLogsLimit) {
      this.recentLogsQueue.pop();
    }

    // 序列化消息
    const message: AuditWsMessage = {
      type: 'audit_event',
      timestamp: Date.now(),
      data: event,
    };

    // 广播给所有订阅者
    this.broadcastMessage(message, (subscriber) => {
      // 检查过滤条件
      if (subscriber.filters) {
        if (subscriber.filters.userId && subscriber.filters.userId !== event.userId) {
          return false;
        }
        if (subscriber.filters.actions && !subscriber.filters.actions.includes(event.action)) {
          return false;
        }
        if (subscriber.filters.resources && !subscriber.filters.resources.includes(event.resource)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 广播批量审计事件
   */
  public broadcastBatch(events: AuditLogEntry[]): void {
    // 更新统计
    events.forEach((event) => this.updateStats(event));

    // 添加到最近日志队列
    this.recentLogsQueue = [...events, ...this.recentLogsQueue].slice(0, this.recentLogsLimit);

    // 序列化消息
    const message: AuditWsMessage = {
      type: 'audit_batch',
      timestamp: Date.now(),
      data: events,
    };

    // 广播给所有订阅者
    this.broadcastMessage(message);
  }

  /**
   * 获取当前统计信息
   */
  public getStats(): AuditWsStats {
    return { ...this.stats };
  }

  /**
   * 获取最近日志
   */
  public getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.recentLogsQueue.slice(0, limit);
  }

  /**
   * 获取订阅者数量
   */
  public getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * 关闭服务
   */
  public shutdown(): void {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }

    if (this.broadcastStatsInterval) {
      clearInterval(this.broadcastStatsInterval);
      this.broadcastStatsInterval = null;
    }

    this.subscribers.clear();
  }

  /**
   * 广播消息
   */
  private broadcastMessage(
    message: AuditWsMessage,
    filter?: (subscriber: WsSubscriber) => boolean
  ): void {
    const data = JSON.stringify(message);

    for (const subscriber of this.subscribers.values()) {
      if (!filter || filter(subscriber)) {
        try {
          subscriber.send(data);
        } catch (error) {
          console.error('Failed to send audit message to subscriber:', subscriber.id, error);
        }
      }
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(event: AuditLogEntry): void {
    this.stats.totalLogs++;
    this.stats.recentLogs++;
    this.stats.byAction[event.action]++;
    this.stats.byStatus[event.status]++;
  }

  /**
   * 启动统计更新
   */
  private startStatsUpdate(): void {
    // 每分钟重置最近日志计数
    this.statsUpdateInterval = setInterval(() => {
      this.stats.recentLogs = 0;
    }, 60000);

    // 每10秒广播统计信息
    this.broadcastStatsInterval = setInterval(() => {
      const message: AuditWsMessage = {
        type: 'stats_update',
        timestamp: Date.now(),
        data: this.getStats(),
      };
      this.broadcastMessage(message);
    }, 10000);
  }
}

// ============================================================================
// 全局实例
// ============================================================================

let globalAuditWsService: AuditWebSocketService | null = null;

/**
 * 获取全局审计 WebSocket 服务
 */
export function getAuditWebSocketService(): AuditWebSocketService {
  if (!globalAuditWsService) {
    globalAuditWsService = new AuditWebSocketService();
  }
  return globalAuditWsService;
}

/**
 * 关闭全局审计 WebSocket 服务
 */
export function shutdownAuditWebSocketService(): void {
  if (globalAuditWsService) {
    globalAuditWsService.shutdown();
    globalAuditWsService = null;
  }
}

/**
 * 重置全局审计 WebSocket 服务 (主要用于测试)
 */
export function resetAuditWebSocketService(): void {
  shutdownAuditWebSocketService();
}
