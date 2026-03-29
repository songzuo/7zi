/**
 * Performance Alerting Types
 * 性能告警类型定义
 */

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertChannelType = 'email' | 'slack' | 'dashboard' | 'webhook' | 'telegram';

/**
 * 告警接口 (aligned with spec)
 */
export interface PerformanceAlert {
  id: string;
  severity: AlertSeverity;
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  context?: Record<string, any>;

  // Extended fields for alerter functionality
  title?: string;
  source?: 'anomaly' | 'budget' | 'threshold' | 'manual';
  acknowledged?: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolved?: boolean;
  resolvedAt?: number;
  suppressed?: boolean;
  suppressionReason?: string;
}

/**
 * 告警渠道接口
 */
export interface AlertChannel {
  send(alert: PerformanceAlert): Promise<void>;
}

/**
 * 告警抑制配置
 */
export interface SuppressionConfig {
  windowMs: number;      // 时间窗口
  maxAlerts: number;      // 最大告警数
  deduplicateBy?: string[]; // 去重字段
}

/**
 * Extended types for alerter functionality
 */
export type AlertLevel = AlertSeverity;

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  metric: string;
  condition: {
    operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
    value: number;
    duration?: number; // 持续时间（秒）
  };
  level: AlertLevel;
  channels: AlertChannelType[];
  cooldown: number; // 冷却时间（秒）
  aggregation: {
    enabled: boolean;
    window: number; // 聚合窗口（秒）
    maxAlerts: number; // 最大告警数
  };
}

export interface AlertChannelConfig {
  type: AlertChannelType;
  enabled: boolean;
  config: {
    // Email
    recipients?: string[];
    subject?: string;
    // Slack
    webhookUrl?: string;
    channel?: string;
    // Webhook
    url?: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    // Telegram
    botToken?: string;
    chatId?: string;
    // Dashboard
    showToast?: boolean;
    playSound?: boolean;
  };
}

export interface AlertingConfig {
  enabled: boolean;
  defaultChannels: AlertChannelType[];
  channels: AlertChannelConfig[];
  rules: AlertRule[];
  suppression: SuppressionConfig;
  aggregation: {
    enabled: boolean;
    window: number; // 秒
  };
}

export interface AlertStats {
  totalAlerts: number;
  alertsByLevel: Record<AlertLevel, number>;
  alertsByMetric: Record<string, number>;
  acknowledgedCount: number;
  resolvedCount;
  avgResponseTime: number;
}
