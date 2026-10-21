/**
 * Webhook 交付模块
 * 负责发送 HTTP POST 请求到 Webhook URL
 * 7zi-frontend v1.12.2
 */

import type {
  WebhookDelivery,
  CreateDeliveryInput,
  DeliveryStatus,
} from './types';

// ==================== 配置常量 ====================

/** 默认超时时间 (毫秒) */
export const DEFAULT_TIMEOUT = 10000;

/** 默认最大重试次数 */
export const DEFAULT_MAX_ATTEMPTS = 3;

/** 重试延迟基数 (毫秒) */
export const RETRY_DELAY_BASE = 1000;

/** 重试延迟最大值 (毫秒) */
export const RETRY_DELAY_MAX = 30000;

// ==================== 工具函数 ====================

/**
 * 计算指数退避延迟
 * @param attempt 当前尝试次数 (从 1 开始)
 * @param base 基数 (默认 1000ms)
 * @param max 最大值 (默认 30000ms)
 * @returns 延迟时间 (毫秒)
 */
export function calculateBackoffDelay(
  attempt: number,
  base: number = RETRY_DELAY_BASE,
  max: number = RETRY_DELAY_MAX
): number {
  const delay = base * Math.pow(2, attempt - 1);
  return Math.min(delay, max);
}

/**
 * 生成随机抖动 (避免惊群效应)
 * @param delay 基础延迟
 * @returns 带抖动的延迟
 */
export function addJitter(delay: number): number {
  const jitter = delay * 0.1; // 10% 抖动
  return delay + (Math.random() - 0.5) * jitter;
}

/**
 * 判断是否应该重试
 * @param status HTTP 状态码
 * @param attempt 当前尝试次数
 * @param maxAttempts 最大尝试次数
 * @returns 是否应该重试
 */
export function shouldRetry(
  status: number | undefined,
  attempt: number,
  maxAttempts: number
): boolean {
  // 超过最大重试次数
  if (attempt >= maxAttempts) {
    return false;
  }

  // 没有状态码 (网络错误)
  if (!status) {
    return true;
  }

  // 5xx 服务器错误可以重试
  if (status >= 500 && status < 600) {
    return true;
  }

  // 429 Too Many Requests 可以重试
  if (status === 429) {
    return true;
  }

  // 408 Request Timeout 可以重试
  if (status === 408) {
    return true;
  }

  return false;
}

// ==================== 交付类 ====================

/**
 * Webhook 交付器
 */
export class WebhookDeliveryService {
  private deliveries: Map<string, WebhookDelivery> = new Map();

  /**
   * 发送 Webhook 请求
   * @param input 交付输入
   * @param timeout 超时时间 (毫秒)
   * @returns 交付记录
   */
  async send(
    input: CreateDeliveryInput,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<WebhookDelivery> {
    const deliveryId = this.generateDeliveryId();
    const startedAt = new Date().toISOString();

    // 创建初始交付记录
    const delivery: WebhookDelivery = {
      id: deliveryId,
      subscriptionId: input.subscriptionId,
      eventId: input.eventId,
      eventType: input.eventType,
      url: input.url,
      payload: input.payload,
      headers: input.headers,
      status: 'pending',
      attempt: input.attempt,
      maxAttempts: input.maxAttempts,
      startedAt,
    };

    this.deliveries.set(deliveryId, delivery);

    try {
      // 解析 payload
      const payload = JSON.parse(input.payload);

      // 发送请求
      const response = await this.fetchWithTimeout(
        input.url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...input.headers,
          },
          body: JSON.stringify(payload),
        },
        timeout
      );

      const completedAt = new Date().toISOString();
      const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

      // 更新交付记录
      delivery.statusCode = response.status;
      delivery.responseBody = await response.text().catch(() => '');
      delivery.completedAt = completedAt;
      delivery.duration = duration;

      // 判断状态
      if (response.ok) {
        delivery.status = 'success';
      } else if (shouldRetry(response.status, input.attempt, input.maxAttempts)) {
        delivery.status = 'retrying';
        delivery.error = `HTTP ${response.status}: ${response.statusText}`;
      } else {
        delivery.status = 'failed';
        delivery.error = `HTTP ${response.status}: ${response.statusText}`;
      }

    } catch (error) {
      const completedAt = new Date().toISOString();
      const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

      delivery.completedAt = completedAt;
      delivery.duration = duration;

      // 判断错误类型
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          delivery.status = 'timeout';
          delivery.error = 'Request timeout';
        } else {
          delivery.status = shouldRetry(undefined, input.attempt, input.maxAttempts)
            ? 'retrying'
            : 'failed';
          delivery.error = error.message;
        }
      } else {
        delivery.status = 'failed';
        delivery.error = String(error);
      }
    }

    this.deliveries.set(deliveryId, delivery);
    return delivery;
  }

  /**
   * 带超时的 fetch
   * @param url 目标 URL
   * @param options fetch 选项
   * @param timeout 超时时间 (毫秒)
   * @returns fetch 响应
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 获取交付记录
   * @param deliveryId 交付 ID
   * @returns 交付记录
   */
  getDelivery(deliveryId: string): WebhookDelivery | undefined {
    return this.deliveries.get(deliveryId);
  }

  /**
   * 获取订阅的所有交付记录
   * @param subscriptionId 订阅 ID
   * @returns 交付记录列表
   */
  getDeliveriesBySubscription(subscriptionId: string): WebhookDelivery[] {
    const result: WebhookDelivery[] = [];
    for (const delivery of this.deliveries.values()) {
      if (delivery.subscriptionId === subscriptionId) {
        result.push(delivery);
      }
    }
    return result;
  }

  /**
   * 获取事件的所有交付记录
   * @param eventId 事件 ID
   * @returns 交付记录列表
   */
  getDeliveriesByEvent(eventId: string): WebhookDelivery[] {
    const result: WebhookDelivery[] = [];
    for (const delivery of this.deliveries.values()) {
      if (delivery.eventId === eventId) {
        result.push(delivery);
      }
    }
    return result;
  }

  /**
   * 清理旧的交付记录
   * @param olderThan 清理早于此时间的记录 (ISO 8601)
   * @returns 清理的记录数
   */
  cleanupOldDeliveries(olderThan: string): number {
    const cutoff = new Date(olderThan).getTime();
    let count = 0;

    for (const [id, delivery] of this.deliveries.entries()) {
      const deliveryTime = new Date(delivery.startedAt).getTime();
      if (deliveryTime < cutoff) {
        this.deliveries.delete(id);
        count++;
      }
    }

    return count;
  }

  /**
   * 生成交付 ID
   * @returns 交付 ID
   */
  private generateDeliveryId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 获取所有交付记录
   * @returns 交付记录列表
   */
  getAllDeliveries(): WebhookDelivery[] {
    const result: WebhookDelivery[] = [];
    for (const delivery of this.deliveries.values()) {
      result.push(delivery);
    }
    return result;
  }

  /**
   * 清空所有交付记录
   */
  clearAllDeliveries(): void {
    this.deliveries.clear();
  }
}

// ==================== 单例 ====================

/** 全局交付服务实例 */
export const webhookDeliveryService = new WebhookDeliveryService();