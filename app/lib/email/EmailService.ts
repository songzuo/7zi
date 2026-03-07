/**
 * 邮件服务 - 统一邮件发送入口
 * 集成邮件发送器和模板系统
 */

import {
  createEmailSender,
  EmailSender,
  EmailConfig,
  EmailOptions,
  EmailResult,
  EmailAddress,
} from './EmailSender';
import { renderTemplate, TemplateData } from './templates';

export type { EmailConfig, EmailOptions, EmailResult, EmailAddress };

export interface SendTemplateOptions {
  to: EmailAddress | EmailAddress[];
  cc?: EmailAddress | EmailAddress[];
  bcc?: EmailAddress | EmailAddress[];
  templateId: string;
  data: TemplateData;
  attachments?: EmailOptions['attachments'];
  headers?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailQueueItem {
  id: string;
  options: EmailOptions | SendTemplateOptions;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  lastError?: string;
  status: 'pending' | 'sent' | 'failed';
}

/**
 * 邮件服务类
 */
export class EmailService {
  private sender: EmailSender;
  private config: EmailConfig;
  private queue: EmailQueueItem[] = [];
  private processing = false;
  private queueInterval?: NodeJS.Timeout;

  constructor(config: EmailConfig) {
    this.config = config;
    this.sender = createEmailSender(config);
  }

  /**
   * 发送邮件
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    // 设置默认发件人
    const emailOptions: EmailOptions = {
      ...options,
      replyTo: options.replyTo || (this.config.replyTo ? { email: this.config.replyTo } : undefined),
    };

    return this.sender.send(emailOptions);
  }

  /**
   * 使用模板发送邮件
   */
  async sendTemplate(options: SendTemplateOptions): Promise<EmailResult> {
    const { templateId, data, ...emailOptions } = options;

    // 渲染模板
    const rendered = renderTemplate(templateId, data);
    if (!rendered) {
      return {
        success: false,
        error: `Template not found: ${templateId}`,
      };
    }

    return this.send({
      ...emailOptions,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: options.attachments,
      headers: options.headers,
      priority: options.priority,
    });
  }

  /**
   * 批量发送邮件
   */
  async sendBatch(emails: EmailOptions[]): Promise<EmailResult[]> {
    return this.sender.sendBatch(emails);
  }

  /**
   * 发送任务分配通知
   */
  async sendTaskAssigned(data: {
    to: EmailAddress;
    userName: string;
    taskTitle: string;
    taskId: string;
    priority: string;
    dueDate?: string;
    description?: string;
    creatorName?: string;
    baseUrl?: string;
  }): Promise<EmailResult> {
    const baseUrl = data.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return this.sendTemplate({
      to: data.to,
      templateId: 'task-assigned',
      data: {
        userName: data.userName,
        taskTitle: data.taskTitle,
        taskId: data.taskId,
        priority: data.priority,
        dueDate: data.dueDate,
        description: data.description,
        creatorName: data.creatorName,
        taskUrl: `${baseUrl}/tasks/${data.taskId}`,
      },
    });
  }

  /**
   * 发送任务状态更新通知
   */
  async sendTaskStatusUpdated(data: {
    to: EmailAddress;
    userName: string;
    taskTitle: string;
    taskId: string;
    oldStatus: string;
    newStatus: string;
    priority?: string;
    updatedBy: string;
    baseUrl?: string;
  }): Promise<EmailResult> {
    const baseUrl = data.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return this.sendTemplate({
      to: data.to,
      templateId: 'task-status-updated',
      data: {
        userName: data.userName,
        taskTitle: data.taskTitle,
        taskId: data.taskId,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        priority: data.priority,
        updatedBy: data.updatedBy,
        taskUrl: `${baseUrl}/tasks/${data.taskId}`,
      },
    });
  }

  /**
   * 发送任务到期提醒
   */
  async sendTaskDueReminder(data: {
    to: EmailAddress;
    userName: string;
    taskTitle: string;
    taskId: string;
    dueDate: string;
    remainingTime: string;
    status?: string;
    baseUrl?: string;
  }): Promise<EmailResult> {
    const baseUrl = data.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return this.sendTemplate({
      to: data.to,
      templateId: 'task-due-reminder',
      priority: 'high',
      data: {
        userName: data.userName,
        taskTitle: data.taskTitle,
        taskId: data.taskId,
        dueDate: data.dueDate,
        remainingTime: data.remainingTime,
        status: data.status,
        taskUrl: `${baseUrl}/tasks/${data.taskId}`,
      },
    });
  }

  /**
   * 发送周报摘要
   */
  async sendWeeklyDigest(data: {
    to: EmailAddress;
    userName: string;
    weekNumber: number;
    completedTasks: number;
    createdTasks: number;
    inProgressTasks: number;
    totalHours?: string;
    highlights?: string;
    todos?: string;
    baseUrl?: string;
  }): Promise<EmailResult> {
    const baseUrl = data.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return this.sendTemplate({
      to: data.to,
      templateId: 'weekly-digest',
      data: {
        ...data,
        dashboardUrl: `${baseUrl}/dashboard`,
      },
    });
  }

  /**
   * 发送欢迎邮件
   */
  async sendWelcome(data: {
    to: EmailAddress;
    userName: string;
    baseUrl?: string;
  }): Promise<EmailResult> {
    const baseUrl = data.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return this.sendTemplate({
      to: data.to,
      templateId: 'welcome',
      data: {
        userName: data.userName,
        loginUrl: `${baseUrl}/login`,
      },
    });
  }

  /**
   * 发送系统通知
   */
  async sendSystemNotification(data: {
    to: EmailAddress | EmailAddress[];
    title: string;
    message: string;
    actionText?: string;
    actionUrl?: string;
  }): Promise<EmailResult> {
    return this.sendTemplate({
      to: data.to,
      templateId: 'system-notification',
      data: {
        title: data.title,
        message: data.message,
        actionText: data.actionText,
        actionUrl: data.actionUrl,
      },
    });
  }

  // ========== 队列功能 ==========

  /**
   * 添加邮件到队列
   */
  enqueue(options: EmailOptions | SendTemplateOptions): string {
    const item: EmailQueueItem = {
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      options,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      status: 'pending',
    };

    this.queue.push(item);
    this.startQueueProcessor();

    return item.id;
  }

  /**
   * 启动队列处理器
   */
  private startQueueProcessor(): void {
    if (this.processing) return;

    this.processing = true;
    this.queueInterval = setInterval(() => this.processQueue(), 5000);
  }

  /**
   * 停止队列处理器
   */
  stopQueueProcessor(): void {
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
      this.queueInterval = undefined;
    }
    this.processing = false;
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    const pending = this.queue.filter(item => item.status === 'pending');
    
    for (const item of pending) {
      try {
        let result: EmailResult;

        if ('templateId' in item.options) {
          result = await this.sendTemplate(item.options as SendTemplateOptions);
        } else {
          result = await this.send(item.options as EmailOptions);
        }

        if (result.success) {
          item.status = 'sent';
        } else {
          item.attempts++;
          item.lastError = result.error;
          item.lastAttemptAt = new Date();

          if (item.attempts >= item.maxAttempts) {
            item.status = 'failed';
          }
        }
      } catch (error) {
        item.attempts++;
        item.lastError = error instanceof Error ? error.message : 'Unknown error';
        item.lastAttemptAt = new Date();

        if (item.attempts >= item.maxAttempts) {
          item.status = 'failed';
        }
      }
    }

    // 清理已发送和失败的邮件
    this.queue = this.queue.filter(item => 
      item.status === 'pending' || 
      (item.status === 'sent' && Date.now() - item.createdAt.getTime() < 3600000) // 保留1小时
    );

    // 如果队列为空，停止处理器
    if (this.queue.filter(item => item.status === 'pending').length === 0) {
      this.stopQueueProcessor();
    }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    pending: number;
    sent: number;
    failed: number;
    total: number;
  } {
    return {
      pending: this.queue.filter(i => i.status === 'pending').length,
      sent: this.queue.filter(i => i.status === 'sent').length,
      failed: this.queue.filter(i => i.status === 'failed').length,
      total: this.queue.length,
    };
  }

  /**
   * 获取可用的模板列表
   */
  getAvailableTemplates() {
    const { getAllTemplates } = require('./templates');
    return getAllTemplates().map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
    }));
  }
}

// 默认配置
const defaultConfig: EmailConfig = {
  fromEmail: process.env.EMAIL_FROM || 'noreply@example.com',
  fromName: process.env.EMAIL_FROM_NAME || 'AI Team Dashboard',
  replyTo: process.env.EMAIL_REPLY_TO,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
};

// 单例实例
let emailServiceInstance: EmailService | null = null;

/**
 * 获取邮件服务实例
 */
export function getEmailService(config?: Partial<EmailConfig>): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService({
      ...defaultConfig,
      ...config,
    });
  }
  return emailServiceInstance;
}

/**
 * 重置邮件服务实例（用于测试）
 */
export function resetEmailService(): void {
  if (emailServiceInstance) {
    emailServiceInstance.stopQueueProcessor();
  }
  emailServiceInstance = null;
}

// 默认导出
export default EmailService;