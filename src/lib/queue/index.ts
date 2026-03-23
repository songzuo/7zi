/**
 * Bull Queue System - Main Exports
 */

// Queue Manager
export { queueManager, QueueManager } from './queue-manager';
export type { QueueConfig } from './queue-manager';
export { QueueName, queueConfigs } from './queue-manager';
export type { QueueName as QueueNameType } from './queue-manager';

// Email Processors
export {
  emailProcessor,
  createEmailJob,
  batchEmailProcessor,
  templateEmailProcessor,
} from './processors/email-processor';
export type {
  EmailJobData,
  BatchEmailJobData,
  TemplateEmailJobData,
} from './processors/email-processor';

// Notification Processors
export {
  notificationProcessor,
  createNotificationJob,
  broadcastNotificationProcessor,
  scheduledNotificationProcessor,
  priorityNotificationProcessor,
} from './processors/notification-processor';
export type {
  NotificationJobData,
  BroadcastNotificationJobData,
  ScheduledNotificationJobData,
} from './processors/notification-processor';
export { NotificationChannel, NotificationPriority } from './processors/notification-processor';

// Analytics Processors
export {
  analyticsProcessor,
  analyticsBatchProcessor,
  createAnalyticsEvent,
  createPageViewEvent,
  createUserActionEvent,
  createConversionEvent,
  createErrorEvent,
  createPerformanceEvent,
  analyticsAggregationProcessor,
} from './processors/analytics-processor';
export type {
  AnalyticsEventData,
  AnalyticsBatchData,
  AnalyticsEventType,
  AggregationJobData,
  PerformanceMetrics,
} from './processors/analytics-processor';

// Examples
export {
  sendSingleEmail,
  sendMultipleEmails,
  sendBatchEmails,
  sendDelayedEmail,
  sendEmailWithOptions,
  monitorEmailQueue,
  checkJobStatus,
  startEmailQueueProcessor,
  pauseAndResumeEmailQueue,
  runEmailQueueExamples,
} from './examples/email-queue-example';
