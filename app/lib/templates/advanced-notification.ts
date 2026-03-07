/**
 * Advanced Notification Templates
 * 
 * Extended notification templates for specific use cases.
 */

import {
  NotificationTemplate,
  NotificationContext,
  NotificationResult,
  NotificationTemplateConfig,
  NotificationAction,
} from './notification';

/**
 * Announcement Template - For important announcements
 */
export class AnnouncementNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'info',
      title: '公告',
      icon: '📢',
      priority: 'high',
      channels: ['in-app', 'email', 'push'],
    });
  }

  render(context: NotificationContext): NotificationResult {
    const announcement = context.data?.announcement as string | undefined;
    const link = context.data?.link as string | undefined;
    const priority = context.data?.priority as 'normal' | 'high' | 'urgent' | undefined;

    const title = announcement || this.config.title;
    const message = context.message;

    const actions: NotificationAction[] = link ? [
      { label: '查看详情', url: link, style: 'primary' },
    ] : [];

    return {
      title,
      message,
      type: this.config.type,
      icon: this.config.icon,
      priority: priority || 'high',
      channels: this.config.channels,
      actions,
      html: this.generateHtml(title, message, actions),
      text: `[${this.config.icon} ${title}] ${message}`,
      push: this.generatePushPayload(title, message, context.data),
      metadata: { notificationType: 'announcement', link },
    };
  }
}

/**
 * Achievement Template - For gamification achievements
 */
export class AchievementNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'success',
      title: '成就解锁',
      icon: '🏆',
      priority: 'normal',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const achievementName = context.data?.achievement as string | undefined;
    const points = context.data?.points as number | undefined;
    const badge = context.data?.badge as string | undefined;

    const title = achievementName ? `🏆 ${achievementName}` : this.config.title;
    let message = context.message;
    
    if (points) {
      message += ` (+${points} 积分)`;
    }
    if (badge) {
      message = `${badge} ${message}`;
    }

    return {
      title,
      message,
      type: this.config.type,
      icon: '🏆',
      priority: this.config.priority,
      channels: this.config.channels,
      actions: this.config.actions,
      html: this.generateHtml(title, message, this.config.actions),
      text: `[🏆 成就] ${message}`,
      push: this.generatePushPayload(title, message, context.data),
      metadata: { notificationType: 'achievement', achievementName, points },
    };
  }
}

/**
 * Security Alert Template - For security notifications
 */
export class SecurityAlertNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'warning',
      title: '安全警告',
      icon: '🔒',
      priority: 'urgent',
      channels: ['in-app', 'email', 'sms', 'push'],
    });
  }

  render(context: NotificationContext): NotificationResult {
    const securityType = context.data?.securityType as string | undefined;
    const location = context.data?.location as string | undefined;
    const device = context.data?.device as string | undefined;
    const timestamp = context.data?.timestamp as string | undefined;

    let title = this.config.title;
    if (securityType) {
      title = `🔒 ${securityType}`;
    }

    let message = context.message;
    const details: string[] = [];
    
    if (location) details.push(`📍 位置: ${location}`);
    if (device) details.push(`💻 设备: ${device}`);
    if (timestamp) details.push(`⏰ 时间: ${new Date(timestamp).toLocaleString('zh-CN')}`);
    
    if (details.length > 0) {
      message += '\n\n' + details.join('\n');
    }

    const actions: NotificationAction[] = [
      { label: '查看详情', action: 'view-security', style: 'primary' },
      { label: '不是我', action: 'report-suspicious', style: 'danger' },
    ];

    return {
      title,
      message,
      type: 'warning',
      icon: '🔒',
      priority: 'urgent',
      channels: this.config.channels,
      actions,
      html: this.generateHtml(title, message, actions),
      text: `[🔒 安全警告] ${message}`,
      push: this.generatePushPayload(title, context.message, context.data),
      metadata: { notificationType: 'security-alert', securityType, location, device },
    };
  }
}

/**
 * System Update Template - For system maintenance/updates
 */
export class SystemUpdateNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'update',
      title: '系统更新',
      icon: '🔧',
      priority: 'normal',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const version = context.data?.version as string | undefined;
    const scheduledTime = context.data?.scheduledTime as string | undefined;
    const duration = context.data?.duration as string | undefined;
    const features = context.data?.features as string[] | undefined;

    let title = this.config.title;
    if (version) {
      title = `🔧 系统更新 v${version}`;
    }

    let message = context.message;
    const details: string[] = [];
    
    if (scheduledTime) {
      details.push(`📅 计划时间: ${new Date(scheduledTime).toLocaleString('zh-CN')}`);
    }
    if (duration) {
      details.push(`⏱️ 预计时长: ${duration}`);
    }
    if (features && features.length > 0) {
      details.push(`\n✨ 新功能:`);
      features.forEach(f => details.push(`  • ${f}`));
    }
    
    if (details.length > 0) {
      message += '\n\n' + details.join('\n');
    }

    const actions: NotificationAction[] = [
      { label: '了解更多', action: 'view-changelog', style: 'primary' },
    ];

    return {
      title,
      message,
      type: 'update',
      icon: '🔧',
      priority: this.config.priority,
      channels: this.config.channels,
      actions,
      html: this.generateHtml(title, message, actions),
      text: `[🔧 系统更新] ${message}`,
      push: this.generatePushPayload(title, context.message, context.data),
      metadata: { notificationType: 'system-update', version, scheduledTime },
    };
  }
}

/**
 * Progress Update Template - For task/project progress
 */
export class ProgressUpdateNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'info',
      title: '进度更新',
      icon: '📊',
      priority: 'normal',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const projectName = context.data?.projectName as string | undefined;
    const progress = context.data?.progress as number | undefined;
    const completedTasks = context.data?.completedTasks as number | undefined;
    const totalTasks = context.data?.totalTasks as number | undefined;

    let title = this.config.title;
    if (projectName) {
      title = `📊 ${projectName} - 进度更新`;
    }

    let message = context.message;
    const progressBar = progress !== undefined ? this.generateProgressBar(progress) : '';
    
    const details: string[] = [];
    if (progress !== undefined) {
      details.push(`完成度: ${progress}% ${progressBar}`);
    }
    if (completedTasks !== undefined && totalTasks !== undefined) {
      details.push(`任务: ${completedTasks}/${totalTasks}`);
    }
    
    if (details.length > 0) {
      message += '\n\n' + details.join('\n');
    }

    const actions: NotificationAction[] = [
      { label: '查看详情', action: 'view-progress', style: 'primary' },
    ];

    return {
      title,
      message,
      type: 'info',
      icon: '📊',
      priority: this.config.priority,
      channels: this.config.channels,
      actions,
      html: this.generateHtml(title, message, actions),
      text: `[📊 进度更新] ${message}`,
      push: this.generatePushPayload(title, context.message, context.data),
      metadata: { notificationType: 'progress-update', projectName, progress },
    };
  }

  private generateProgressBar(progress: number): string {
    const filled = Math.floor(progress / 10);
    const empty = 10 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }
}

/**
 * Deadline Notification Template - For deadline reminders
 */
export class DeadlineNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'reminder',
      title: '截止日期提醒',
      icon: '⏰',
      priority: 'high',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const taskName = context.data?.taskName as string | undefined;
    const deadline = context.data?.deadline as string | undefined;
    const timeLeft = context.data?.timeLeft as string | undefined;
    const isOverdue = context.data?.isOverdue as boolean | undefined;

    let title = this.config.title;
    if (taskName) {
      title = `${isOverdue ? '🚨' : '⏰'} ${taskName}`;
    }

    let message = context.message;
    const details: string[] = [];
    
    if (deadline) {
      const deadlineDate = new Date(deadline);
      details.push(`📅 截止时间: ${deadlineDate.toLocaleString('zh-CN')}`);
    }
    if (timeLeft) {
      details.push(`⏳ ${isOverdue ? '已超期' : '剩余时间'}: ${timeLeft}`);
    }
    
    if (details.length > 0) {
      message += '\n\n' + details.join('\n');
    }

    const priority = isOverdue ? 'urgent' : 'high';
    const actions: NotificationAction[] = [
      { label: '查看任务', action: 'view-task', style: 'primary' },
      { label: '申请延期', action: 'request-extension', style: 'default' },
    ];

    return {
      title,
      message,
      type: isOverdue ? 'error' : 'reminder',
      icon: isOverdue ? '🚨' : '⏰',
      priority,
      channels: this.config.channels,
      actions,
      html: this.generateHtml(title, message, actions),
      text: `[${isOverdue ? '🚨 超期' : '⏰ 截止'}] ${message}`,
      push: this.generatePushPayload(title, context.message, context.data),
      metadata: { notificationType: 'deadline', taskName, deadline, isOverdue },
    };
  }
}

/**
 * Collaboration Notification Template - For team collaboration
 */
export class CollaborationNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'mention',
      title: '协作通知',
      icon: '👥',
      priority: 'high',
    });
  }

  render(context: NotificationContext): NotificationResult {
    const collaborator = context.data?.collaborator as string | undefined;
    const action = context.data?.action as string | undefined;
    const resource = context.data?.resource as string | undefined;
    const link = context.data?.link as string | undefined;

    let title = this.config.title;
    if (collaborator) {
      title = `👥 ${collaborator} ${action || '邀请了您'}`;
    }

    let message = context.message;
    if (resource) {
      message = `${resource}\n\n${message}`;
    }

    const actions: NotificationAction[] = [
      { label: '查看', url: link, style: 'primary' },
      { label: '回复', action: 'reply', style: 'default' },
    ];

    return {
      title,
      message,
      type: 'mention',
      icon: '👥',
      priority: 'high',
      channels: this.config.channels,
      actions,
      html: this.generateHtml(title, message, actions),
      text: `[👥 协作] ${message}`,
      push: this.generatePushPayload(title, message, context.data),
      metadata: { notificationType: 'collaboration', collaborator, action, resource },
    };
  }
}

/**
 * Payment Notification Template - For payment/billing
 */
export class PaymentNotificationTemplate extends NotificationTemplate {
  constructor() {
    super({
      type: 'info',
      title: '支付通知',
      icon: '💳',
      priority: 'high',
      channels: ['in-app', 'email', 'sms'],
    });
  }

  render(context: NotificationContext): NotificationResult {
    const amount = context.data?.amount as number | undefined;
    const currency = context.data?.currency as string | undefined;
    const status = context.data?.status as 'success' | 'failed' | 'pending' | undefined;
    const transactionId = context.data?.transactionId as string | undefined;

    const statusIcons = {
      success: '✅',
      failed: '❌',
      pending: '⏳',
    };

    let title = this.config.title;
    if (status) {
      title = `${statusIcons[status]} ${title}`;
    }

    let message = context.message;
    const details: string[] = [];
    
    if (amount !== undefined && currency) {
      details.push(`💰 金额: ${currency} ${amount.toFixed(2)}`);
    }
    if (transactionId) {
      details.push(`🧾 交易号: ${transactionId}`);
    }
    
    if (details.length > 0) {
      message += '\n\n' + details.join('\n');
    }

    const type = status === 'failed' ? 'error' : status === 'success' ? 'success' : 'info';
    const priority = status === 'failed' ? 'urgent' : 'high';

    const actions: NotificationAction[] = [
      { label: '查看详情', action: 'view-transaction', style: 'primary' },
    ];

    return {
      title,
      message,
      type,
      icon: '💳',
      priority,
      channels: this.config.channels,
      actions,
      html: this.generateHtml(title, message, actions),
      text: `[💳 支付] ${message}`,
      push: this.generatePushPayload(title, context.message, context.data),
      metadata: { notificationType: 'payment', amount, currency, status, transactionId },
    };
  }
}

export default {
  AnnouncementNotificationTemplate,
  AchievementNotificationTemplate,
  SecurityAlertNotificationTemplate,
  SystemUpdateNotificationTemplate,
  ProgressUpdateNotificationTemplate,
  DeadlineNotificationTemplate,
  CollaborationNotificationTemplate,
  PaymentNotificationTemplate,
};
