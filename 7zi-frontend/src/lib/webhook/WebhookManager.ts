/**
 * Webhook 管理器
 * 负责 Webhook 注册、事件触发、重试机制和签名验证
 * 7zi-frontend v1.12.2
 */

import {
  WebhookSubscription,
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookEvent,
  WebhookEventType,
  WebhookDelivery,
  WebhookLog,
  WebhookLogLevel,
  TestEventResult,
  SignatureValidationResult,
} from './types';
import { WebhookDeliveryService, webhookDeliveryService } from './delivery';

// ==================== 配置常量 ====================

/** 签名算法 */
const SIGNATURE_ALGORITHM = 'sha256';

/** 签名前缀 */
const SIGNATURE_PREFIX = 'sha256=';

/** 签名头名称 */
const SIGNATURE_HEADER = 'X-7zi-Signature';

/** 时间戳头名称 */
const TIMESTAMP_HEADER = 'X-7zi-Timestamp';

/** 默认最大重试次数 */
const DEFAULT_MAX_RETRIES = 3;

/** 最大事件队列大小 */
const MAX_EVENT_QUEUE_SIZE = 1000;

// ==================== Webhook 管理器 ====================

/**
 * Webhook 管理器
 */
export class WebhookManager {
  private subscriptions: Map<string, WebhookSubscription> = new Map();
  public deliveryService: WebhookDeliveryService;
  private eventQueue: WebhookEvent[] = [];
  private logs: WebhookLog[] = [];
  private isProcessing: boolean = false;

  constructor(deliveryService?: WebhookDeliveryService) {
    this.deliveryService = deliveryService || webhookDeliveryService;
    this.loadFromStorage();
  }

  // ==================== 订阅管理 ====================

  /**
   * 创建 Webhook 订阅
   * @param input 创建输入
   * @returns 创建的订阅
   */
  async createSubscription(input: CreateWebhookInput): Promise<WebhookSubscription> {
    const subscription: WebhookSubscription = {
      id: this.generateSubscriptionId(),
      name: input.name,
      description: input.description,
      url: input.url,
      secret: input.secret || this.generateSecret(),
      events: input.events,
      isActive: input.isActive ?? true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      headers: input.headers,
      retryCount: input.retryCount ?? DEFAULT_MAX_RETRIES,
      timeout: input.timeout ?? 10000,
    };

    this.subscriptions.set(subscription.id, subscription);
    await this.saveToStorage();

    this.log('info', `Webhook subscription created: ${subscription.id}`, {
      subscriptionId: subscription.id,
      name: subscription.name,
      url: subscription.url,
      events: subscription.events,
    });

    return subscription;
  }

  /**
   * 更新 Webhook 订阅
   * @param subscriptionId 订阅 ID
   * @param input 更新输入
   * @returns 更新后的订阅
   */
  async updateSubscription(
    subscriptionId: string,
    input: UpdateWebhookInput
  ): Promise<WebhookSubscription> {
    const subscription = this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    // 更新字段
    if (input.name !== undefined) subscription.name = input.name;
    if (input.description !== undefined) subscription.description = input.description;
    if (input.url !== undefined) subscription.url = input.url;
    if (input.secret !== undefined) subscription.secret = input.secret;
    if (input.events !== undefined) subscription.events = input.events;
    if (input.isActive !== undefined) subscription.isActive = input.isActive;
    if (input.headers !== undefined) subscription.headers = input.headers;
    if (input.retryCount !== undefined) subscription.retryCount = input.retryCount;
    if (input.timeout !== undefined) subscription.timeout = input.timeout;

    subscription.updatedAt = new Date().toISOString();
    subscription.status = subscription.isActive ? 'active' : 'inactive';

    await this.saveToStorage();

    this.log('info', `Webhook subscription updated: ${subscriptionId}`, {
      subscriptionId,
    });

    return subscription;
  }

  /**
   * 删除 Webhook 订阅
   * @param subscriptionId 订阅 ID
   * @returns 是否删除成功
   */
  async deleteSubscription(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    this.subscriptions.delete(subscriptionId);
    await this.saveToStorage();

    this.log('info', `Webhook subscription deleted: ${subscriptionId}`, {
      subscriptionId,
    });

    return true;
  }

  /**
   * 批量删除 Webhook 订阅
   * @param subscriptionIds 订阅 ID 列表
   * @returns 删除结果
   */
  async batchDeleteSubscriptions(subscriptionIds: string[]): Promise<{
    deleted: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const deleted: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of subscriptionIds) {
      const success = await this.deleteSubscription(id);
      if (success) {
        deleted.push(id);
      } else {
        failed.push({ id, error: 'Subscription not found' });
      }
    }

    return { deleted, failed };
  }

  /**
   * 批量更新订阅状态
   * @param subscriptionIds 订阅 ID 列表
   * @param isActive 是否激活
   * @returns 更新的订阅列表
   */
  async batchUpdateStatus(
    subscriptionIds: string[],
    isActive: boolean
  ): Promise<WebhookSubscription[]> {
    const updated: WebhookSubscription[] = [];

    for (const id of subscriptionIds) {
      const subscription = this.subscriptions.get(id);
      if (subscription) {
        subscription.isActive = isActive;
        subscription.status = isActive ? 'active' : 'inactive';
        subscription.updatedAt = new Date().toISOString();
        updated.push(subscription);
      }
    }

    await this.saveToStorage();

    this.log('info', `Batch update ${subscriptionIds.length} subscriptions to ${isActive ? 'active' : 'inactive'}`);

    return updated;
  }

  /**
   * 获取 Webhook 订阅
   * @param subscriptionId 订阅 ID
   * @returns 订阅
   */
  getSubscription(subscriptionId: string): WebhookSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * 获取所有 Webhook 订阅
   * @returns 订阅列表
   */
  getAllSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * 获取激活的订阅
   * @returns 激活的订阅列表
   */
  getActiveSubscriptions(): WebhookSubscription[] {
    return this.getAllSubscriptions().filter((s) => s.isActive && s.status === 'active');
  }

  // ==================== 事件处理 ====================

  /**
   * 触发 Webhook 事件
   * @param event Webhook 事件
   * @returns 交付记录列表
   */
  async triggerEvent(event: WebhookEvent): Promise<WebhookDelivery[]> {
    // 添加到事件队列
    this.eventQueue.push(event);

    // 限制队列大小
    if (this.eventQueue.length > MAX_EVENT_QUEUE_SIZE) {
      this.eventQueue.shift();
    }

    // 获取订阅了此事件类型的所有激活订阅
    const subscriptions = this.getActiveSubscriptions().filter(
      (s) => s.events.includes(event.type)
    );

    if (subscriptions.length === 0) {
      this.log('debug', `No subscriptions for event: ${event.type}`, {
        eventId: event.id,
      });
      return [];
    }

    this.log('info', `Triggering event ${event.type} to ${subscriptions.length} subscriptions`, {
      eventId: event.id,
      eventType: event.type,
    });

    // 并发发送到所有订阅
    const deliveries = await Promise.all(
      subscriptions.map((subscription) =>
        this.deliverEvent(event, subscription)
      )
    );

    return deliveries;
  }

  /**
   * 发送事件到单个订阅
   * @param event Webhook 事件
   * @param subscription 订阅
   * @param attempt 尝试次数
   * @returns 交付记录
   */
  private async deliverEvent(
    event: WebhookEvent,
    subscription: WebhookSubscription,
    attempt: number = 1
  ): Promise<WebhookDelivery> {
    // 生成签名
    const payload = JSON.stringify(event);
    const timestamp = Date.now();
    const signature = await this.generateSignature(payload, timestamp, subscription.secret);

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      [SIGNATURE_HEADER]: signature,
      [TIMESTAMP_HEADER]: String(timestamp),
      ...subscription.headers,
    };

    // 创建交付输入
    const deliveryInput = {
      subscriptionId: subscription.id,
      eventId: event.id,
      eventType: event.type,
      url: subscription.url,
      payload,
      headers,
      attempt,
      maxAttempts: subscription.retryCount ?? DEFAULT_MAX_RETRIES,
    };

    // 发送请求
    const delivery = await this.deliveryService.send(
      deliveryInput,
      subscription.timeout
    );

    // 更新订阅状态
    if (delivery.status === 'success') {
      subscription.lastSuccessAt = delivery.completedAt;
      subscription.status = 'active';
    } else if (delivery.status === 'failed' || delivery.status === 'timeout') {
      subscription.lastErrorAt = delivery.completedAt;
      subscription.lastErrorMessage = delivery.error;
      subscription.status = 'error';
    }

    await this.saveToStorage();

    // 记录日志
    const logLevel: WebhookLogLevel =
      delivery.status === 'success' ? 'info' : 'warn';
    this.log(
      logLevel,
      `Event ${event.type} delivery ${delivery.status} for subscription ${subscription.id}`,
      {
        subscriptionId: subscription.id,
        deliveryId: delivery.id,
        status: delivery.status,
        attempt: delivery.attempt,
        statusCode: delivery.statusCode,
      }
    );

    // 处理重试
    if (delivery.status === 'retrying') {
      const delay = 1000 * Math.pow(2, attempt - 1);
      setTimeout(() => {
        this.deliverEvent(event, subscription, attempt + 1);
      }, delay);
    }

    return delivery;
  }

  /**
   * 测试事件发送
   * @param subscriptionId 订阅 ID
   * @returns 测试结果
   */
  async testSubscription(subscriptionId: string): Promise<TestEventResult> {
    const subscription = this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    // 创建测试事件
    const testEvent: WebhookEvent = {
      id: this.generateEventId(),
      type: 'custom.event',
      timestamp: new Date().toISOString(),
      source: 'webhook-test',
      data: {
        eventName: 'webhook.test',
        data: {
          message: 'This is a test webhook event',
          subscriptionId,
          test: true,
        },
      },
    };

    const startTime = Date.now();
    const delivery = await this.deliverEvent(testEvent, subscription);
    const duration = Date.now() - startTime;

    return {
      success: delivery.status === 'success',
      deliveryId: delivery.id,
      subscriptionId,
      statusCode: delivery.statusCode,
      responseBody: delivery.responseBody,
      duration,
      error: delivery.error,
    };
  }

  // ==================== 签名验证 ====================

  /**
   * 生成签名
   * @param payload 请求体
   * @param timestamp 时间戳
   * @param secret 密钥
   * @returns 签名
   */
  async generateSignature(payload: string, timestamp: number, secret: string): Promise<string> {
    const data = `${timestamp}.${payload}`;
    const signature = await this.hmacSha256(data, secret);
    return `${SIGNATURE_PREFIX}${signature}`;
  }

  /**
   * 验证签名
   * @param payload 请求体
   * @param signature 签名
   * @param timestamp 时间戳
   * @param secret 密钥
   * @param maxAge 最大时间偏差 (毫秒)
   * @returns 验证结果
   */
  async verifySignature(
    payload: string,
    signature: string,
    timestamp: number,
    secret: string,
    maxAge: number = 5 * 60 * 1000 // 5 分钟
  ): Promise<SignatureValidationResult> {
    // 检查时间偏差
    const now = Date.now();
    const age = now - timestamp;
    if (age > maxAge || age < -maxAge) {
      return {
        isValid: false,
        algorithm: SIGNATURE_ALGORITHM,
      };
    }

    // 生成预期签名
    const expectedSignature = await this.generateSignature(payload, timestamp, secret);

    // 常量时间比较
    const isValid = this.constantTimeCompare(signature, expectedSignature);

    return {
      isValid,
      expectedSignature,
      actualSignature: signature,
      algorithm: SIGNATURE_ALGORITHM,
    };
  }

  /**
   * HMAC-SHA256 计算
   * @param data 数据
   * @param secret 密钥
   * @returns 十六进制签名字符串
   */
  private async hmacSha256(data: string, secret: string): Promise<string> {
    // 检查是否有 crypto API
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      // Node.js 环境：使用 crypto 模块
      const nodeCrypto = await import('crypto');
      const hmac = nodeCrypto.createHmac('sha256', secret);
      hmac.update(data);
      return hmac.digest('hex');
    }

    // 浏览器环境：使用 Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 常量时间比较 (防止时序攻击)
   * @param a 字符串 a
   * @param b 字符串 b
   * @returns 是否相等
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  // ==================== 日志管理 ====================

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 消息
   * @param context 上下文
   */
  log(
    level: WebhookLogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    const log: WebhookLog = {
      id: this.generateLogId(),
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(log);

    // 限制日志数量 (保留最近 1000 条)
    if (this.logs.length > 1000) {
      this.logs.shift();
    }
  }

  /**
   * 获取日志
   * @param subscriptionId 订阅 ID (可选)
   * @param deliveryId 交付 ID (可选)
   * @param level 日志级别 (可选)
   * @param limit 限制数量
   * @returns 日志列表
   */
  getLogs(
    subscriptionId?: string,
    deliveryId?: string,
    level?: WebhookLogLevel,
    limit: number = 100
  ): WebhookLog[] {
    let logs = this.logs;

    if (subscriptionId) {
      logs = logs.filter((l) => l.context?.subscriptionId === subscriptionId);
    }

    if (deliveryId) {
      logs = logs.filter((l) => l.context?.deliveryId === deliveryId);
    }

    if (level) {
      logs = logs.filter((l) => l.level === level);
    }

    return logs.slice(-limit).reverse();
  }

  // ==================== 持久化 ====================

  /**
   * 保存到本地存储
   */
  private async saveToStorage(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const data = {
        subscriptions: Array.from(this.subscriptions.entries()),
      };

      localStorage.setItem('webhook-subscriptions', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save webhooks to storage:', error);
    }
  }

  /**
   * 从本地存储加载
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const data = localStorage.getItem('webhook-subscriptions');
      if (data) {
        const parsed = JSON.parse(data);
        this.subscriptions = new Map(parsed.subscriptions);
      }
    } catch (error) {
      console.error('Failed to load webhooks from storage:', error);
    }
  }

  // ==================== 工具函数 ====================

  /**
   * 生成订阅 ID
   * @returns 订阅 ID
   */
  private generateSubscriptionId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 生成事件 ID
   * @returns 事件 ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 生成日志 ID
   * @returns 日志 ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 生成密钥
   * @returns 64 字符十六进制密钥
   */
  private generateSecret(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 获取事件队列
   * @returns 事件队列
   */
  getEventQueue(): WebhookEvent[] {
    return [...this.eventQueue];
  }

  /**
   * 清空事件队列
   */
  clearEventQueue(): void {
    this.eventQueue = [];
  }

  /**
   * 清空所有订阅
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
  }
}

// ==================== 单例 ====================

/** 全局 Webhook 管理器实例 */
export const webhookManager = new WebhookManager();
