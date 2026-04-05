/**
 * 通用 Webhook 通知渠道实现
 * 支持自定义 HTTP 方法、Headers、模板和重试机制
 */

import {
  NotificationChannel,
  NotificationPayload,
  SendResult,
  WebhookChannelConfig,
  ChannelConfig,
} from './NotificationChannel';

/**
 * 模板变量占位符
 */
export type TemplateVariables = {
  [key: string]: string | number | boolean | object;
};

/**
 * Webhook request body interface
 */
export interface WebhookBody {
  title: string;
  message: string;
  severity: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * Webhook 渠道
 */
export class WebhookChannel implements NotificationChannel {
  readonly type = 'webhook' as const;
  private config: WebhookChannelConfig;
  private readonly DEFAULT_RETRIES = 3;
  private readonly DEFAULT_METHOD = 'POST';

  constructor(config: WebhookChannelConfig) {
    this.config = config;
  }

  /**
   * 验证配置
   */
  validateConfig(config: ChannelConfig): boolean {
    if (config.type !== 'webhook') return false;
    const webhookConfig = config as WebhookChannelConfig;
    
    // 验证 URL
    if (!webhookConfig.url) {
      return false;
    }
    
    try {
      const url = new URL(webhookConfig.url);
      if (!url.href.startsWith('http://') && !url.href.startsWith('https://')) {
        return false;
      }
    } catch {
      return false;
    }

    // 验证方法
    if (webhookConfig.method) {
      const validMethods = ['POST', 'PUT', 'PATCH'];
      if (!validMethods.includes(webhookConfig.method)) {
        return false;
      }
    }

    // 验证 bodyTemplate 是有效的 JSON（如果提供）
    if (webhookConfig.bodyTemplate) {
      try {
        // 尝试解析为 JSON
        const parsed = JSON.parse(webhookConfig.bodyTemplate);
        if (typeof parsed !== 'object') {
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * 发送通知（带重试机制）
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    const retries = this.config.retries ?? this.DEFAULT_RETRIES;
    const method = this.config.method ?? this.DEFAULT_METHOD;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.sendAttempt(payload, method, attempt);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < retries) {
          const delayMs = this.calculateBackoff(attempt);
          await this.sleep(delayMs);
        }
      }
    }

    // 所有重试都失败
    return {
      success: false,
      error: lastError?.message || 'All retries failed',
      channelType: this.type,
    };
  }

  /**
   * 单次发送尝试
   */
  private async sendAttempt(
    payload: NotificationPayload,
    method: string,
    attempt: number
  ): Promise<SendResult> {
    const body = this.buildBody(payload);
    const headers = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    const response = await fetch(this.config.url, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.text();
    
    // 尝试解析 JSON 响应
    let data;
    try {
      data = responseData ? JSON.parse(responseData) : { message: 'Webhook sent successfully' };
    } catch {
      data = { message: responseData || 'Webhook sent successfully' };
    }

    return {
      success: true,
      data: { ...data, attempt: attempt + 1 },
      channelType: this.type,
    };
  }

  /**
   * 构建请求体（支持模板变量替换）
   */
  private buildBody(payload: NotificationPayload): WebhookBody {
    // 如果有自定义模板，使用模板
    if (this.config.bodyTemplate) {
      return this.applyTemplate(payload, this.config.bodyTemplate);
    }

    // 默认消息格式
    return {
      title: payload.title,
      message: payload.message,
      severity: payload.severity || 'info',
      timestamp: (payload.timestamp || new Date()).toISOString(),
      data: payload.data || {},
    };
  }

  /**
   * 应用模板变量替换
   */
  private applyTemplate(payload: NotificationPayload, template: string): WebhookBody {
    const variables: TemplateVariables = {
      title: payload.title,
      message: payload.message,
      severity: payload.severity || 'info',
      timestamp: (payload.timestamp || new Date()).toISOString(),
      ...payload.data,
    };

    // 递归替换对象中的占位符
    let templateJson = template;

    // 替换所有 {{variable}} 占位符
    templateJson = templateJson.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      if (value === undefined) {
        return match; // 未找到变量，保留原样
      }
      // 如果值是对象或数组，转换为 JSON 字符串
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    });

    // 解析替换后的 JSON
    try {
      return JSON.parse(templateJson) as WebhookBody;
    } catch (error) {
      throw new Error(`Invalid template after variable replacement: ${error}`);
    }
  }

  /**
   * 计算指数退避延迟时间
   */
  private calculateBackoff(attempt: number): number {
    // 指数退避：100ms * 2^attempt
    const baseDelay = 100;
    const maxDelay = 10000; // 最大 10 秒
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    // 添加随机抖动（±25%）
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    
    return Math.floor(delay + jitter);
  }

  /**
   * 睡眠工具函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取当前配置
   */
  getConfig(): WebhookChannelConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<WebhookChannelConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 静态方法：创建默认模板
   */
  static createDefaultTemplate(): string {
    return JSON.stringify({
      title: '{{title}}',
      message: '{{message}}',
      severity: '{{severity}}',
      timestamp: '{{timestamp}}',
      metadata: {
        // 可以添加自定义字段
        source: '7zi-frontend',
      },
    }, null, 2);
  }

  /**
   * 静态方法：验证模板语法
   */
  static validateTemplate(template: string): { valid: boolean; error?: string } {
    try {
      const parsed = JSON.parse(template);
      if (typeof parsed !== 'object' || parsed === null) {
        return { valid: false, error: 'Template must be a JSON object' };
      }
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }

  /**
   * 静态方法：提取模板中的变量名
   */
  static extractTemplateVariables(template: string): string[] {
    const matches = template.match(/\{\{(\w+)\}\}/g) || [];
    const variables = matches.map(match => match.replace(/[{}]/g, ''));
    return Array.from(new Set(variables)); // 去重
  }
}