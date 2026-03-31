/**
 * Feedback notification service
 * Handles sending notifications when feedback is created, updated, or resolved
 */

import { getDatabaseAsync } from '../db/index';
import { logger } from '../logger';
import { Feedback, FeedbackType, FeedbackStatus, FeedbackPriority } from '@/types/feedback';

/**
 * Notification types for feedback
 */
export enum FeedbackNotificationType {
  NEW = 'new',
  UPDATED = 'updated',
  RESOLVED = 'resolved',
  FLAGGED = 'flagged',
}

/**
 * Create a feedback notification for admin users
 */
export async function createFeedbackNotification(
  feedback: Feedback,
  type: FeedbackNotificationType
): Promise<void> {
  try {
    const db = await getDatabaseAsync();

    // Get admin users (in production, query the users table)
    // For now, we'll use a placeholder admin ID
    const adminId = 'admin';

    const notificationId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create notification
    db.exec(
      `INSERT INTO feedback_notifications (id, feedback_id, recipient_id, type, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [notificationId, feedback.id, adminId, type, now]
    );

    // Log notification creation
    logger.info('Feedback notification created', {
      category: 'feedback',
      notificationId,
      feedbackId: feedback.id,
      recipientId: adminId,
      type,
    });
  } catch (_error) {
    logger.error('Failed to create feedback notification', error, {
      category: 'feedback',
      feedbackId: feedback.id,
      type,
    });
  }
}

/**
 * Feedback notification with details
 */
interface FeedbackNotification {
  id: string;
  feedback_id: string;
  recipient_id: string;
  type: string;
  created_at: string;
  read_at: string | null;
  feedback_type?: FeedbackType;
  title?: string;
  status?: FeedbackStatus;
  priority?: number;
  rating?: number;
}

/**
 * Get unread feedback notifications for a user
 */
export async function getUnreadFeedbackNotifications(
  userId: string
): Promise<
  Array<{
    id: string;
    feedback_id: string;
    type: FeedbackNotificationType;
    created_at: string;
    feedback?: Feedback;
  }>
> {
  const db = await getDatabaseAsync();

  const notifications = db.queryRows(
    `SELECT fn.*, f.type as feedback_type, f.title, f.status, f.priority, f.rating
     FROM feedback_notifications fn
     LEFT JOIN feedbacks f ON fn.feedback_id = f.id
     WHERE fn.recipient_id = ? AND fn.read_at IS NULL
     ORDER BY fn.created_at DESC`,
    [userId]
  ) as unknown as FeedbackNotification[];

  // Map and type-cast the notifications
  return notifications.map((notif) => ({
    id: notif.id,
    feedback_id: notif.feedback_id,
    type: notif.type as FeedbackNotificationType,
    created_at: notif.created_at,
    feedback: notif.feedback_type && notif.title
      ? {
          id: notif.feedback_id,
          type: notif.feedback_type,
          title: notif.title,
          status: (notif.status || 'open') as FeedbackStatus,
          priority: (notif.priority || 'medium') as FeedbackPriority,
          rating: notif.rating || 0,
          created_at: notif.created_at,
          updated_at: notif.created_at,
          user_id: userId,
          description: '',
          helpful_count: 0,
          not_helpful_count: 0,
        }
      : undefined,
  }));
}

/**
 * Mark feedback notifications as read
 */
export async function markFeedbackNotificationsAsRead(
  notificationIds: string[]
): Promise<void> {
  const db = await getDatabaseAsync();

  const now = new Date().toISOString();

  for (const notificationId of notificationIds) {
    db.exec(
      `UPDATE feedback_notifications SET read_at = ? WHERE id = ?`,
      [now, notificationId]
    );
  }

  logger.info('Feedback notifications marked as read', {
    category: 'feedback',
    count: notificationIds.length,
  });
}

/**
 * Mark all feedback notifications as read for a user
 */
export async function markAllFeedbackNotificationsAsRead(
  userId: string
): Promise<void> {
  const db = await getDatabaseAsync();

  const now = new Date().toISOString();

  db.exec(
    `UPDATE feedback_notifications SET read_at = ?
     WHERE recipient_id = ? AND read_at IS NULL`,
    [now, userId]
  );

  logger.info('All feedback notifications marked as read', {
    category: 'feedback',
    userId,
  });
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadFeedbackNotificationCount(
  userId: string
): Promise<number> {
  const db = await getDatabaseAsync();

  const result = db.queryRows(
    `SELECT COUNT(*) as count
     FROM feedback_notifications
     WHERE recipient_id = ? AND read_at IS NULL`,
    [userId]
  )[0] as { count: number };

  return result.count;
}

/**
 * Send email notification for feedback (placeholder)
 * In production, integrate with email service
 */
export async function sendFeedbackEmail(
  feedback: Feedback,
  type: FeedbackNotificationType
): Promise<void> {
  // Placeholder for email sending logic
  // In production, integrate with your email service (SendGrid, AWS SES, etc.)

  const emailContent = {
    to: 'admin@example.com',
    subject: getFeedbackEmailSubject(feedback, type),
    body: getFeedbackEmailBody(feedback, type),
  };

  logger.info('Feedback email notification queued', {
    category: 'feedback',
    type,
    feedbackId: feedback.id,
    email: emailContent.to,
  });

  // In production: await emailService.send(emailContent);
}

/**
 * Generate email subject based on notification type
 */
function getFeedbackEmailSubject(
  feedback: Feedback,
  type: FeedbackNotificationType
): string {
  const subjects: Record<FeedbackNotificationType, string> = {
    [FeedbackNotificationType.NEW]: `新反馈: ${feedback.title}`,
    [FeedbackNotificationType.UPDATED]: `反馈更新: ${feedback.title}`,
    [FeedbackNotificationType.RESOLVED]: `反馈已解决: ${feedback.title}`,
    [FeedbackNotificationType.FLAGGED]: `需要关注: ${feedback.title}`,
  };

  return subjects[type];
}

/**
 * Generate email body based on notification type
 */
function getFeedbackEmailBody(
  feedback: Feedback,
  type: FeedbackNotificationType
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const feedbackUrl = `${baseUrl}/admin/feedback/${feedback.id}`;

  return `
新${getFeedbackNotificationTypeLabel(type)} - ${feedback.type}

标题: ${feedback.title}
评分: ${feedback.rating}/5
状态: ${feedback.status}
优先级: ${feedback.priority}

描述:
${feedback.description}

---
用户ID: ${feedback.user_id}
${feedback.email ? `邮箱: ${feedback.email}` : ''}

查看详情: ${feedbackUrl}
  `.trim();
}

/**
 * Get localized label for notification type
 */
function getFeedbackNotificationTypeLabel(type: FeedbackNotificationType): string {
  const labels: Record<FeedbackNotificationType, string> = {
    [FeedbackNotificationType.NEW]: '反馈',
    [FeedbackNotificationType.UPDATED]: '反馈更新',
    [FeedbackNotificationType.RESOLVED]: '反馈已解决',
    [FeedbackNotificationType.FLAGGED]: '需要关注',
  };

  return labels[type];
}

/**
 * Notify admins when high-priority feedback is created
 */
export async function notifyHighPriorityFeedback(feedback: Feedback): Promise<void> {
  if (feedback.priority === 'high' || feedback.priority === 'urgent') {
    await createFeedbackNotification(feedback, FeedbackNotificationType.FLAGGED);
    await sendFeedbackEmail(feedback, FeedbackNotificationType.FLAGGED);
  }
}

/**
 * Notify user when their feedback is resolved
 */
export async function notifyFeedbackResolved(feedback: Feedback): Promise<void> {
  // In production, send email to feedback.email if provided
  if (feedback.email) {
    await sendFeedbackEmail(feedback, FeedbackNotificationType.RESOLVED);
  }
}

/**
 * Batch process feedback notifications
 */
export async function processFeedbackNotifications(
  batchSize: number = 50
): Promise<void> {
  const db = await getDatabaseAsync();

  // Get unread notifications
  const unreadNotifications = db.queryRows(
    `SELECT * FROM feedback_notifications
     WHERE read_at IS NULL
     ORDER BY created_at ASC
     LIMIT ?`,
    [batchSize]
  ) as unknown as FeedbackNotification[];

  logger.info('Processing feedback notifications', {
    category: 'feedback',
    count: unreadNotifications.length,
  });

  // Process each notification
  for (const notification of unreadNotifications) {
    try {
      // Get feedback details
      const feedback = db.queryRows(
        'SELECT * FROM feedbacks WHERE id = ?',
        [notification.feedback_id]
      )[0] as unknown as Feedback | undefined;

      if (!feedback) {
        logger.warn('Feedback not found for notification', {
          category: 'feedback',
          notificationId: notification.id,
          feedbackId: notification.feedback_id,
        });
        continue;
      }

      // Send appropriate notification
      switch (notification.type) {
        case FeedbackNotificationType.NEW:
          await sendFeedbackEmail(feedback, notification.type);
          break;
        case FeedbackNotificationType.UPDATED:
          await sendFeedbackEmail(feedback, notification.type);
          break;
        case FeedbackNotificationType.RESOLVED:
          await notifyFeedbackResolved(feedback);
          break;
        case FeedbackNotificationType.FLAGGED:
          await notifyHighPriorityFeedback(feedback);
          break;
      }
    } catch (_error) {
      logger.error('Failed to process feedback notification', error, {
        category: 'feedback',
        notificationId: notification.id,
      });
    }
  }
}
