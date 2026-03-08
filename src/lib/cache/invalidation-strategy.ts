/**
 * 缓存失效策略
 * 支持时间失效、标签失效、事件驱动失效
 */

import type { CacheInvalidateOptions } from './types';
import { CacheManager, getCacheManager } from './cache-manager';

export interface InvalidationRule {
  id: string;
  pattern?: string;
  tags?: string[];
  condition?: () => boolean | Promise<boolean>;
  action: 'invalidate' | 'refresh';
  refreshFactory?: (key: string) => Promise<unknown>;
  enabled: boolean;
  priority: number;
  description?: string;
}

export interface InvalidationSchedule {
  id: string;
  cron: string;
  rules: InvalidationRule[];
  lastRun?: Date;
  nextRun?: Date;
  enabled: boolean;
}

export interface InvalidationEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
  source?: string;
}

export interface InvalidationConfig {
  enableEventBased?: boolean;
  enableTimeBased?: boolean;
  enableTagBased?: boolean;
  eventBus?: EventEmitter;
}

type InvalidationCallback = (event: InvalidationEvent) => void | Promise<void>;

// 简单的事件发射器
class EventEmitter {
  private listeners: Map<string, Set<InvalidationCallback>> = new Map();

  on(event: string, callback: InvalidationCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: InvalidationCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data: Record<string, unknown>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const invalidationEvent: InvalidationEvent = {
        type: event,
        data,
        timestamp: new Date(),
      };
      for (const callback of callbacks) {
        callback(invalidationEvent);
      }
    }
  }
}

export class CacheInvalidationStrategy {
  private cache: CacheManager;
  private rules: Map<string, InvalidationRule> = new Map();
  private schedules: Map<string, InvalidationSchedule> = new Map();
  private eventBus: EventEmitter;
  private intervalId: NodeJS.Timeout | null = null;
  private config: Required<InvalidationConfig>;

  constructor(config: InvalidationConfig = {}) {
    this.cache = getCacheManager();
    this.eventBus = config.eventBus || new EventEmitter();
    this.config = {
      enableEventBased: config.enableEventBased ?? true,
      enableTimeBased: config.enableTimeBased ?? true,
      enableTagBased: config.enableTagBased ?? true,
      eventBus: this.eventBus,
    };

    this.setupDefaultRules();
    this.setupEventListeners();
    this.startScheduler();
  }

  /**
   * 设置默认失效规则
   */
  private setupDefaultRules(): void {
    // 任务相关失效规则
    this.addRule({
      id: 'task-update',
      tags: ['tasks'],
      action: 'invalidate',
      enabled: true,
      priority: 10,
      description: '任务更新时失效相关缓存',
    });

    // 仪表盘相关失效规则
    this.addRule({
      id: 'dashboard-update',
      tags: ['dashboard'],
      action: 'invalidate',
      enabled: true,
      priority: 10,
      description: '仪表盘数据更新时失效缓存',
    });

    // 知识图谱相关失效规则
    this.addRule({
      id: 'knowledge-update',
      tags: ['knowledge'],
      action: 'invalidate',
      enabled: true,
      priority: 10,
      description: '知识图谱更新时失效缓存',
    });

    // 健康检查失效规则
    this.addRule({
      id: 'health-check',
      pattern: 'health:*',
      action: 'invalidate',
      enabled: true,
      priority: 5,
      description: '健康检查数据定期失效',
    });
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.config.enableEventBased) return;

    // 任务事件
    this.eventBus.on('task:created', (event) => this.handleTaskEvent(event));
    this.eventBus.on('task:updated', (event) => this.handleTaskEvent(event));
    this.eventBus.on('task:deleted', (event) => this.handleTaskEvent(event));
    this.eventBus.on('task:assigned', (event) => this.handleTaskEvent(event));

    // 仪表盘事件
    this.eventBus.on('dashboard:updated', (event) => this.handleDashboardEvent(event));

    // 知识图谱事件
    this.eventBus.on('knowledge:node:created', (event) => this.handleKnowledgeEvent(event));
    this.eventBus.on('knowledge:node:updated', (event) => this.handleKnowledgeEvent(event));
    this.eventBus.on('knowledge:edge:created', (event) => this.handleKnowledgeEvent(event));

    // 日志事件
    this.eventBus.on('log:created', (event) => this.handleLogEvent(event));
  }

  /**
   * 启动调度器
   */
  private startScheduler(): void {
    if (!this.config.enableTimeBased) return;

    // 每分钟检查一次
    this.intervalId = setInterval(() => {
      this.runScheduledInvalidations();
    }, 60000);
  }

  /**
   * 处理任务事件
   */
  private async handleTaskEvent(event: InvalidationEvent): Promise<void> {
    const options: CacheInvalidateOptions = { tags: ['tasks'] };

    if (event.data.taskId) {
      options.pattern = `task:${event.data.taskId}`;
    }

    await this.cache.invalidate(options);
  }

  /**
   * 处理仪表盘事件
   */
  private async handleDashboardEvent(_event: InvalidationEvent): Promise<void> {
    await this.cache.invalidate({ tags: ['dashboard'] });
  }

  /**
   * 处理知识图谱事件
   */
  private async handleKnowledgeEvent(event: InvalidationEvent): Promise<void> {
    const options: CacheInvalidateOptions = { tags: ['knowledge'] };

    if (event.data.nodeId) {
      options.pattern = `knowledge:node:${event.data.nodeId}`;
    }

    await this.cache.invalidate(options);
  }

  /**
   * 处理日志事件
   */
  private async handleLogEvent(_event: InvalidationEvent): Promise<void> {
    await this.cache.invalidate({ tags: ['logs'] });
  }

  /**
   * 运行定时失效
   */
  private async runScheduledInvalidations(): Promise<void> {
    const now = new Date();

    for (const [, schedule] of this.schedules) {
      if (!schedule.enabled) continue;
      if (schedule.nextRun && schedule.nextRun > now) continue;

      await this.executeSchedule(schedule);
      this.updateNextRun(schedule);
    }
  }

  /**
   * 执行定时失效
   */
  private async executeSchedule(schedule: InvalidationSchedule): Promise<void> {
    for (const rule of schedule.rules) {
      if (!rule.enabled) continue;

      if (rule.condition) {
        const shouldRun = await rule.condition();
        if (!shouldRun) continue;
      }

      await this.executeRule(rule);
    }

    schedule.lastRun = new Date();
  }

  /**
   * 更新下次运行时间
   */
  private updateNextRun(schedule: InvalidationSchedule): void {
    // 简化实现：基于 cron 表达式计算下次运行时间
    // 实际应使用 cron 库
    const nextRun = new Date();
    nextRun.setMinutes(nextRun.getMinutes() + 60);
    schedule.nextRun = nextRun;
  }

  /**
   * 执行失效规则
   */
  private async executeRule(rule: InvalidationRule): Promise<void> {
    const options: CacheInvalidateOptions = {};

    if (rule.pattern) {
      options.pattern = rule.pattern;
    }

    if (rule.tags) {
      options.tags = rule.tags;
    }

    await this.cache.invalidate(options);
  }

  /**
   * 添加失效规则
   */
  public addRule(rule: InvalidationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * 移除失效规则
   */
  public removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * 启用/禁用规则
   */
  public toggleRule(id: string, enabled: boolean): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;
    rule.enabled = enabled;
    return true;
  }

  /**
   * 添加定时失效
   */
  public addSchedule(schedule: InvalidationSchedule): void {
    this.updateNextRun(schedule);
    this.schedules.set(schedule.id, schedule);
  }

  /**
   * 移除定时失效
   */
  public removeSchedule(id: string): boolean {
    return this.schedules.delete(id);
  }

  /**
   * 手动触发事件
   */
  public emitEvent(type: string, data: Record<string, unknown> = {}): void {
    this.eventBus.emit(type, data);
  }

  /**
   * 订阅事件
   */
  public onEvent(event: string, callback: InvalidationCallback): void {
    this.eventBus.on(event, callback);
  }

  /**
   * 取消订阅事件
   */
  public offEvent(event: string, callback: InvalidationCallback): void {
    this.eventBus.off(event, callback);
  }

  /**
   * 按标签失效
   */
  public async invalidateByTag(tags: string[]): Promise<number> {
    return await this.cache.invalidate({ tags });
  }

  /**
   * 按模式失效
   */
  public async invalidateByPattern(pattern: string): Promise<number> {
    return await this.cache.invalidate({ pattern });
  }

  /**
   * 全部失效
   */
  public async invalidateAll(): Promise<number> {
    return await this.cache.invalidate({ all: true });
  }

  /**
   * 获取所有规则
   */
  public getRules(): InvalidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取所有定时任务
   */
  public getSchedules(): InvalidationSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * 停止调度器
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 获取事件总线
   */
  public getEventBus(): EventEmitter {
    return this.eventBus;
  }
}

// 单例实例
let strategyInstance: CacheInvalidationStrategy | null = null;

export function getInvalidationStrategy(
  config?: InvalidationConfig
): CacheInvalidationStrategy {
  if (!strategyInstance) {
    strategyInstance = new CacheInvalidationStrategy(config);
  }
  return strategyInstance;
}

export function resetInvalidationStrategy(): void {
  if (strategyInstance) {
    strategyInstance.stop();
    strategyInstance = null;
  }
}

// 便捷方法
export const invalidate = {
  tag: async (tags: string[]) => getInvalidationStrategy().invalidateByTag(tags),
  pattern: async (pattern: string) =>
    getInvalidationStrategy().invalidateByPattern(pattern),
  all: async () => getInvalidationStrategy().invalidateAll(),
  emit: (type: string, data?: Record<string, unknown>) =>
    getInvalidationStrategy().emitEvent(type, data),
};