import { Job } from 'bull';
import { logger } from '../../logger';
import { QueueName } from '../queue-manager';

/**
 * Notification job data structure
 */
export interface NotificationJobData {
  userId?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  channels?: ('email' | 'push' | 'sms' | 'inApp')[];
  metadata?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: Date;
}

/**
 * Notification channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  IN_APP = 'inApp',
}

/**
 * Notification priority
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Simulated notification service
 * In production, this would integrate with real notification services
 */
class NotificationService {
  /**
   * Send a notification
   */
  async send(data: NotificationJobData): Promise<{ notificationId: string }> {
    // Simulate sending delay
    await this.delay(50 + Math.random() * 100);

    const channels = data.channels || ['inApp'];

    logger.info('[NotificationService] Sending notification', {
      userId: data.userId,
      type: data.type,
      title: data.title,
      channels,
      priority: data.priority || 'medium',
    });

    // Simulate sending to each channel
    const results = await Promise.allSettled(
      channels.map((channel) => this.sendToChannel(channel, data))
    );

    // Check for failures
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      logger.warn('[NotificationService] Some channels failed', {
        failures: failures.length,
        total: channels.length,
      });
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('[NotificationService] Notification sent successfully', {
      notificationId,
      channels: results.filter((r) => r.status === 'fulfilled').length,
    });

    return { notificationId };
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(
    channel: string,
    data: NotificationJobData
  ): Promise<void> {
    // Simulate channel-specific logic
    switch (channel) {
      case NotificationChannel.EMAIL:
        await this.delay(100 + Math.random() * 200);
        logger.debug('[NotificationService] Email notification sent');
        break;

      case NotificationChannel.PUSH:
        await this.delay(50 + Math.random() * 100);
        logger.debug('[NotificationService] Push notification sent');
        break;

      case NotificationChannel.SMS:
        await this.delay(200 + Math.random() * 300);
        logger.debug('[NotificationService] SMS notification sent');
        break;

      case NotificationChannel.IN_APP:
        await this.delay(20 + Math.random() * 50);
        logger.debug('[NotificationService] In-app notification sent');
        break;

      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Check if notification is expired
   */
  private isExpired(data: NotificationJobData): boolean {
    if (!data.expiresAt) {
      return false;
    }
    return new Date() > data.expiresAt;
  }

  /**
   * Simulate delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const notificationService = new NotificationService();

/**
 * Notification processor function
 * Processes notification jobs from the notification queue
 */
export async function notificationProcessor(job: Job<NotificationJobData>): Promise<void> {
  const { data } = job;

  logger.info(`[NotificationProcessor] Processing job`, {
    jobId: job.id,
    userId: data.userId,
    type: data.type,
    title: data.title,
  });

  try {
    // Validate job data
    if (!data.title || !data.message) {
      throw new Error('Missing required fields: title and message');
    }

    // Check expiration
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      logger.warn(`[NotificationProcessor] Notification expired, skipping`, {
        jobId: job.id,
        expiresAt: data.expiresAt,
      });
      return;
    }

    // Update job progress
    // await job.updateProgress(10);

    // Send notification
    // await job.updateProgress(50);
    const result = await notificationService.send(data);

    // await job.updateProgress(100);

    logger.info(`[NotificationProcessor] Notification sent successfully`, {
      jobId: job.id,
      notificationId: result.notificationId,
      channels: data.channels,
    });

    return;
  } catch (error: any) {
    logger.error(`[NotificationProcessor] Failed to send notification`, {
      jobId: job.id,
      error: error.message,
      data,
    });

    // Throw error so Bull can handle retries
    throw error;
  }
}

/**
 * Notification job builder
 * Helper function to create notification jobs with default values
 */
export function createNotificationJob(
  data: Partial<NotificationJobData>
): NotificationJobData {
  return {
    type: 'info',
    channels: ['inApp'],
    priority: 'medium',
    ...data,
  } as NotificationJobData;
}

/**
 * Broadcast notification processor
 * Send notification to multiple users
 */
export interface BroadcastNotificationJobData extends NotificationJobData {
  userIds: string[];
}

export async function broadcastNotificationProcessor(
  job: Job<BroadcastNotificationJobData>
): Promise<void> {
  const { data } = job;

  logger.info(`[BroadcastNotificationProcessor] Broadcasting to ${data.userIds.length} users`, {
    jobId: job.id,
    title: data.title,
  });

  const results = {
    sent: 0,
    failed: 0,
    errors: [] as Array<{ userId: string; error: string }>,
  };

  for (let i = 0; i < data.userIds.length; i++) {
    const userId = data.userIds[i];

    try {
      const notificationData: NotificationJobData = {
        ...data,
        userId,
      };

      await notificationService.send(notificationData);
      results.sent++;

      // Update progress
      // await job.updateProgress(((i + 1) / data.userIds.length) * 100);
    } catch (error: any) {
      results.failed++;
      results.errors.push({
        userId,
        error: error.message,
      });

      logger.warn(`[BroadcastNotificationProcessor] Failed to send notification`, {
        userId,
        error: error.message,
      });
    }
  }

  logger.info(`[BroadcastNotificationProcessor] Broadcast completed`, {
    jobId: job.id,
    results,
  });

  // If any notifications failed, throw an error
  if (results.failed > 0) {
    throw new Error(`Broadcast completed with ${results.failed} failures`);
  }
}

/**
 * Scheduled notification processor
 * Process notifications that are scheduled for later delivery
 */
export interface ScheduledNotificationJobData extends NotificationJobData {
  scheduledAt: Date;
}

export async function scheduledNotificationProcessor(
  job: Job<ScheduledNotificationJobData>
): Promise<void> {
  const { data } = job;

  logger.info(`[ScheduledNotificationProcessor] Processing scheduled notification`, {
    jobId: job.id,
    scheduledAt: data.scheduledAt,
    title: data.title,
  });

  const now = new Date();
  const scheduledTime = new Date(data.scheduledAt);

  // Check if it's time to send
  if (now < scheduledTime) {
    logger.info(`[ScheduledNotificationProcessor] Not yet time to send, rescheduling`, {
      jobId: job.id,
      scheduledAt: data.scheduledAt,
      now,
    });

    // Calculate delay until scheduled time
    const delay = scheduledTime.getTime() - now.getTime();

    // This job will be automatically retried by Bull after the delay
    // In a real implementation, you might want to use a different approach
    throw new Error(`Scheduled for ${scheduledTime.toISOString()}`);
  }

  try {
    // await job.updateProgress(50);

    // Remove scheduledAt before sending
    const { scheduledAt, ...notificationData } = data;
    const result = await notificationService.send(notificationData);

    // await job.updateProgress(100);

    logger.info(`[ScheduledNotificationProcessor] Scheduled notification sent successfully`, {
      jobId: job.id,
      notificationId: result.notificationId,
    });
  } catch (error: any) {
    logger.error(`[ScheduledNotificationProcessor] Failed to send scheduled notification`, {
      jobId: job.id,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Priority notification processor
 * Handle high-priority notifications with special routing
 */
export async function priorityNotificationProcessor(
  job: Job<NotificationJobData>
): Promise<void> {
  const { data } = job;

  logger.info(`[PriorityNotificationProcessor] Processing priority notification`, {
    jobId: job.id,
    priority: data.priority,
    title: data.title,
  });

  try {
    // Urgent notifications get special treatment
    if (data.priority === NotificationPriority.URGENT) {
      logger.warn(`[PriorityNotificationProcessor] URGENT notification`, {
        jobId: job.id,
        title: data.title,
        message: data.message,
      });

      // Urgent notifications should be sent via all available channels
      data.channels = ['email', 'push', 'sms', 'inApp'];

      // In production, you might want to:
      // - Send to a separate urgent queue
      // - Use a different email server
      // - Trigger additional monitoring/alerting
    }

    // await job.updateProgress(50);
    const result = await notificationService.send(data);

    // await job.updateProgress(100);

    logger.info(`[PriorityNotificationProcessor] Priority notification sent successfully`, {
      jobId: job.id,
      notificationId: result.notificationId,
      priority: data.priority,
    });
  } catch (error: any) {
    logger.error(`[PriorityNotificationProcessor] Failed to send priority notification`, {
      jobId: job.id,
      error: error.message,
    });
    throw error;
  }
}
