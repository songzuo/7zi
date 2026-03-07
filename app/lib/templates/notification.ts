/**
 * Notification Template System
 * 
 * Provides a flexible notification template system for generating various types of notifications.
 */

import { BaseTemplate, TemplateContext, TemplateResult } from './types';

/**
 * Notification Types
 */
export type NotificationType = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'reminder'
  | 'update'
  | 'milestone'
  | 'mention';

/**
 * Notification Channels
 */
export type NotificationChannel = 
  | 'in-app'
  | 'email'
  | 'sms'
  | 'push'
  | 'slack'
  | 'discord';

/**
 * Notification Priority
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Notification Template Configuration
 */
export interface NotificationTemplateConfig {
  type: NotificationType;
  title: string;
  icon?: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  ttl?: number; // Time to live in seconds
  actions?: NotificationAction[];
}

/**
 * Notification Action
 */
export interface NotificationAction {
  label: string;
  url?: string;
  action?: string;
  style?: 'default' | 'primary' | 'danger';
}

/**
 * Notification Context Data
 */
export interface NotificationContext extends TemplateContext {
  userId?: string;
  userName?: string;
  message: string;
  timestamp?: Date;
  source?: string;
  data?: Record<string, unknown>;
}

/**
 * Notification Template Result
 */
export interface NotificationResult extends TemplateResult {
  title: string;
  message: string;
  type: NotificationType;
  icon: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  actions?: NotificationAction[];
  html: string;
  text: string;
  push?: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
  };
}

/**
 * Icon mappings for notification types
 */
const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  reminder: '⏰',
  update: '🔄',
  milestone: '🎯',
  mention: '@',
};

/**
 * Base Notification Template Class
 */
export abstract class NotificationTemplate implements BaseTemplate<NotificationContext, NotificationResult> {
  protected config: Required<NotificationTemplateConfig> & { icon: string };

  constructor(config: NotificationTemplateConfig) {
    this.config = {
      priority: 'normal',
      channels: ['in-app'],
      ttl: 7 * 24 * 60 * 60, // 7 days default
      icon: NOTIFICATION_ICONS[config.type] || '📢',
      actions: [],
      ...config,
    } as Required<NotificationTemplateConfig> & { icon: string };
  }

  abstract render(context: NotificationContext): NotificationResult;

  /**
   * Generate HTML for in-app notification
   */
  protected generateHtml(title: string, message: string, actions?: NotificationAction[]): string {
    const actionsHtml = actions && actions.length > 0
      ? actions.map(action => {
          const style = action.style === 'primary' 
            ? 'background: #3B82F6; color: white;' 
            : action.style === 'danger'
            ? 'background: #EF4444; color: white;'
            : 'background: #E5E7EB; color: #374151;';
          return action.url 
            ? `<a href="${action.url}" style="${style} padding: 8px 16px; border-radius: 4px; text-decoration: none; margin-right: 8px; font-size: 14px;">${action.label}</a>`
            : '';
        }).join('')
      : '';

    return `
      <div class="notification" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; border-radius: 8px; background: #F9FAFB; border-left: 4px solid #3B82F6;">
        <div style="display: flex; align-items: start; gap: 12px;">
          <span style="font-size: 24px;">${this.config.icon}</span>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 8px 0; color: #111827; font-size: 16px;">${title}</h4>
            <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.5;">${message}</p>
            ${actionsHtml ? `<div style="margin-top: 12px;">${actionsHtml}</div>` : ''}
          </div>
        </div>
      </div>
    `.trim();
  }

  /**
   * Generate push notification payload
   */
  protected generatePushPayload(title: string, message: string, data?: Record<string, unknown>): NotificationResult['push'] {
    return {
      title: `${this.config.icon} ${title}`,
      body: message,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data,
    };
  }
}

/**
 * Info Notification Template
 */
export class InfoNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'info',
      title: 'Information',
      icon: 'ℹ️',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const title = this.config.title;
    const message = context.message;

    return {
      title,
      message,
      type: this.config.type,
      icon: this.config.icon,
      priority: this.config.priority,
      channels: this.config.channels,
      actions: this.config.actions,
      html: this.generateHtml(title, message, this.config.actions),
      text: `[${this.config.icon} ${title}] ${message}`,
      push: this.generatePushPayload(title, message, context.data),
      metadata: { notificationType: 'info' },
    };
  }
}

/**
 * Success Notification Template
 */
export class SuccessNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'success',
      title: 'Success',
      icon: '✅',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const title = this.config.title;
    const message = context.message;

    return {
      title,
      message,
      type: this.config.type,
      icon: this.config.icon,
      priority: this.config.priority,
      channels: this.config.channels,
      actions: this.config.actions,
      html: this.generateHtml(title, message, this.config.actions),
      text: `[${this.config.icon} ${title}] ${message}`,
      push: this.generatePushPayload(title, message, context.data),
      metadata: { notificationType: 'success' },
    };
  }
}

/**
 * Warning Notification Template
 */
export class WarningNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'warning',
      title: 'Warning',
      icon: '⚠️',
      priority: 'high',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const title = this.config.title;
    const message = context.message;

    return {
      title,
      message,
      type: this.config.type,
      icon: this.config.icon,
      priority: this.config.priority,
      channels: this.config.channels,
      actions: this.config.actions,
      html: this.generateHtml(title, message, this.config.actions),
      text: `[${this.config.icon} ${title}] ${message}`,
      push: this.generatePushPayload(title, message, context.data),
      metadata: { notificationType: 'warning' },
    };
  }
}

/**
 * Error Notification Template
 */
export class ErrorNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'error',
      title: 'Error',
      icon: '❌',
      priority: 'urgent',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const title = this.config.title;
    const message = context.message;

    return {
      title,
      message,
      type: this.config.type,
      icon: this.config.icon,
      priority: this.config.priority,
      channels: this.config.channels,
      actions: this.config.actions,
      html: this.generateHtml(title, message, this.config.actions),
      text: `[${this.config.icon} ${title}] ${message}`,
      push: this.generatePushPayload(title, message, context.data),
      metadata: { notificationType: 'error' },
    };
  }
}

/**
 * Reminder Notification Template
 */
export class ReminderNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'reminder',
      title: 'Reminder',
      icon: '⏰',
      priority: 'high',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const title = this.config.title;
    const message = context.message;
    const dueDate = context.data?.dueDate as string | undefined;

    const fullMessage = dueDate 
      ? `${message}\n\nDue: ${new Date(dueDate).toLocaleString()}`
      : message;

    return {
      title,
      message: fullMessage,
      type: this.config.type,
      icon: this.config.icon,
      priority: this.config.priority,
      channels: this.config.channels,
      actions: this.config.actions,
      html: this.generateHtml(title, fullMessage, this.config.actions),
      text: `[${this.config.icon} ${title}] ${fullMessage}`,
      push: this.generatePushPayload(title, message, context.data),
      metadata: { notificationType: 'reminder' },
    };
  }
}

/**
 * Milestone Notification Template
 */
export class MilestoneNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'milestone',
      title: 'Milestone Achieved',
      icon: '🎯',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const title = this.config.title;
    const milestone = context.data?.milestone as string | undefined;
    const message = milestone ? `🎉 ${milestone}\n\n${context.message}` : context.message;

    return {
      title,
      message,
      type: this.config.type,
      icon: this.config.icon,
      priority: this.config.priority,
      channels: this.config.channels,
      actions: this.config.actions,
      html: this.generateHtml(title, message, this.config.actions),
      text: `[${this.config.icon} ${title}] ${message}`,
      push: this.generatePushPayload(title, message, context.data),
      metadata: { notificationType: 'milestone' },
    };
  }
}

/**
 * Mention Notification Template
 */
export class MentionNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'mention',
      title: 'You were mentioned',
      icon: '@',
      priority: 'high',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const mentionedBy = context.data?.mentionedBy as string | undefined;
    const title = mentionedBy ? `${mentionedBy} mentioned you` : this.config.title;
    const message = context.message;

    return {
      title,
      message,
      type: this.config.type,
      icon: this.config.icon,
      priority: this.config.priority,
      channels: this.config.channels,
      actions: this.config.actions,
      html: this.generateHtml(title, message, this.config.actions),
      text: `[${this.config.icon} ${title}] ${message}`,
      push: this.generatePushPayload(title, message, context.data),
      metadata: { notificationType: 'mention' },
    };
  }
}

/**
 * Notification Template Factory
 */
export class NotificationTemplateFactory {
  private static templates: Map<NotificationType, () => NotificationTemplate> = new Map();

  static register(type: NotificationType, factory: () => NotificationTemplate): void {
    this.templates.set(type, factory);
  }

  static create(type: NotificationType, config?: Partial<NotificationTemplateConfig>): NotificationTemplate {
    const factory = this.templates.get(type);
    if (factory) {
      return factory();
    }

    // Default templates
    switch (type) {
      case 'info':
        return new InfoNotificationTemplate();
      case 'success':
        return new SuccessNotificationTemplate();
      case 'warning':
        return new WarningNotificationTemplate();
      case 'error':
        return new ErrorNotificationTemplate();
      case 'reminder':
        return new ReminderNotificationTemplate();
      case 'milestone':
        return new MilestoneNotificationTemplate();
      case 'mention':
        return new MentionNotificationTemplate();
      case 'update':
        return new InfoNotificationTemplate();
      default:
        throw new Error(`Unknown notification template type: ${type}`);
    }
  }

  static getAvailableTypes(): NotificationType[] {
    return ['info', 'success', 'warning', 'error', 'reminder', 'update', 'milestone', 'mention'];
  }
}

// Register default templates
NotificationTemplateFactory.register('info', () => new InfoNotificationTemplate());
NotificationTemplateFactory.register('success', () => new SuccessNotificationTemplate());
NotificationTemplateFactory.register('warning', () => new WarningNotificationTemplate());
NotificationTemplateFactory.register('error', () => new ErrorNotificationTemplate());
NotificationTemplateFactory.register('reminder', () => new ReminderNotificationTemplate());
NotificationTemplateFactory.register('milestone', () => new MilestoneNotificationTemplate());
NotificationTemplateFactory.register('mention', () => new MentionNotificationTemplate());

export default NotificationTemplateFactory;
