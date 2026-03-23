/**
 * Example: L1 Cache + Bull Queue Integration
 *
 * This example demonstrates how to use L1 cache within Bull queue processors
 * to improve performance and reduce database queries.
 */

import { Job } from 'bull';
import { L1Cache } from '../../cache/l1-cache';
import { logger } from '../../logger';
import { QueueName } from '../queue-manager';
import { NotificationJobData, NotificationPriority } from './notification-processor';

/**
 * Cache instance for notification processor
 * Cache user preferences, rate limits, and metadata
 */
const notificationCache = new L1Cache({
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute
  enableStats: true,
});

/**
 * Check if user has muted notifications
 * Cached to avoid repeated database queries
 */
async function isUserMuted(userId: string): Promise<boolean> {
  const cacheKey = `user:muted:${userId}`;

  // Check cache first
  let isMuted = await notificationCache.get(cacheKey);

  if (isMuted === null) {
    // Cache miss - simulate database query
    // In production: isMuted = await db.getUserSetting(userId, 'notifications.muted');
    isMuted = false; // Default: not muted

    // Cache result
    await notificationCache.set(cacheKey, isMuted, 10 * 60 * 1000); // 10 minutes

    logger.debug('[Cache] Cached user muted status', { userId, isMuted });
  }

  return isMuted;
}

/**
 * Get user notification preferences
 * Cached to avoid repeated database queries
 */
async function getUserPreferences(userId: string): Promise<{
  channels: string[];
  quietHours: { start: string; end: string } | null;
}> {
  const cacheKey = `user:preferences:${userId}`;

  // Check cache first
  let preferences = await notificationCache.get(cacheKey);

  if (preferences === null) {
    // Cache miss - simulate database query
    // In production: preferences = await db.getUserNotificationPreferences(userId);
    preferences = {
      channels: ['email', 'push', 'inApp'],
      quietHours: null,
    };

    // Cache result
    await notificationCache.set(cacheKey, preferences, 15 * 60 * 1000); // 15 minutes

    logger.debug('[Cache] Cached user preferences', { userId, preferences });
  }

  return preferences;
}

/**
 * Check rate limit for notifications
 * Prevent spam by caching notification counts
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  const cacheKey = `rate:limit:${userId}:${new Date().getHours()}`;

  // Get current count
  let count = await notificationCache.get(cacheKey);

  if (count === null) {
    // First notification this hour
    count = 0;
  }

  // Check limit (max 10 notifications per hour)
  if (count >= 10) {
    logger.warn('[RateLimit] User exceeded notification limit', { userId, count });
    return false;
  }

  // Increment count
  await notificationCache.set(cacheKey, count + 1, 60 * 60 * 1000); // 1 hour TTL

  return true;
}

/**
 * Check if user is in quiet hours
 */
async function isInQuietHours(userId: string): Promise<boolean> {
  const preferences = await getUserPreferences(userId);

  if (!preferences.quietHours) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();

  // Parse quiet hours (format: "HH:MM")
  const [startHour] = preferences.quietHours.start.split(':').map(Number);
  const [endHour] = preferences.quietHours.end.split(':').map(Number);

  // Check if current time is within quiet hours
  if (startHour <= endHour) {
    // Simple case: 22:00 - 06:00 (same day)
    return currentHour >= startHour && currentHour < endHour;
  } else {
    // Overnight case: 22:00 - 06:00 (crosses midnight)
    return currentHour >= startHour || currentHour < endHour;
  }
}

/**
 * Invalidate user cache when settings change
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await notificationCache.delete(`user:muted:${userId}`);
  await notificationCache.delete(`user:preferences:${userId}`);

  logger.info('[Cache] Invalidated user cache', { userId });
}

/**
 * Cached notification processor
 * Enhanced with L1 cache for performance optimization
 */
export async function cachedNotificationProcessor(
  job: Job<NotificationJobData>
): Promise<void> {
  const { data } = job;

  logger.info('[CachedNotificationProcessor] Processing job', {
    jobId: job.id,
    userId: data.userId,
    type: data.type,
    title: data.title,
  });

  try {
    // Skip if no userId (e.g., system notifications)
    if (!data.userId) {
      logger.info('[CachedNotificationProcessor] No userId, skipping cache checks');
      // Process notification normally
      // await sendNotification(data);
      return;
    }

    // Check cache 1: Is user muted?
    if (await isUserMuted(data.userId)) {
      logger.info('[CachedNotificationProcessor] User muted, skipping notification', {
        userId: data.userId,
      });
      return;
    }

    // Check cache 2: Rate limit
    if (data.priority !== NotificationPriority.URGENT) {
      // Urgent notifications bypass rate limit
      if (!(await checkRateLimit(data.userId))) {
        logger.warn('[CachedNotificationProcessor] Rate limit exceeded, skipping', {
          userId: data.userId,
        });
        return;
      }
    }

    // Check cache 3: Quiet hours
    if (!(await isInQuietHours(data.userId))) {
      // Check quiet hours (can be bypassed for urgent)
      if (data.priority !== NotificationPriority.URGENT) {
        logger.info('[CachedNotificationProcessor] User in quiet hours, skipping', {
          userId: data.userId,
        });
        return;
      }
    }

    // Get user preferences from cache
    const preferences = await getUserPreferences(data.userId);

    // Filter channels based on preferences
    const enabledChannels = data.channels?.filter(channel =>
      preferences.channels.includes(channel)
    );

    if (!enabledChannels || enabledChannels.length === 0) {
      logger.warn('[CachedNotificationProcessor] No enabled channels for user', {
        userId: data.userId,
        requestedChannels: data.channels,
        enabledChannels: preferences.channels,
      });
      return;
    }

    // Send notification with filtered channels
    const notificationData: NotificationJobData = {
      ...data,
      channels: enabledChannels as any,
    };

    // await sendNotification(notificationData);

    logger.info('[CachedNotificationProcessor] Notification sent successfully', {
      jobId: job.id,
      userId: data.userId,
      channels: enabledChannels,
    });

    // Log cache statistics
    const stats = notificationCache.getStats();
    if (stats.hits > 0 || stats.misses > 0) {
      logger.info('[Cache] Statistics', {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: (stats.hitRate * 100).toFixed(2) + '%',
        currentSize: stats.currentSize,
      });
    }
  } catch (error: any) {
    logger.error('[CachedNotificationProcessor] Failed to process notification', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Batch notification processor with cache optimization
 * Process multiple notifications efficiently using batch cache operations
 */
export interface BatchNotificationJobData {
  userIds: string[];
  baseNotification: Partial<NotificationJobData>;
}

export async function batchNotificationProcessor(
  job: Job<BatchNotificationJobData>
): Promise<void> {
  const { data } = job;

  logger.info('[BatchNotificationProcessor] Processing batch', {
    jobId: job.id,
    userCount: data.userIds.length,
    title: data.baseNotification.title,
  });

  try {
    // Batch get all user preferences
    const cacheKeys = data.userIds.map(userId => `user:preferences:${userId}`);
    const cachedPreferences = await notificationCache.getMany(cacheKeys);

    // Identify cache misses
    const userIdsWithoutCache = data.userIds.filter(userId =>
      !cachedPreferences.has(`user:preferences:${userId}`)
    );

    // Load missing preferences in batch
    if (userIdsWithoutCache.length > 0) {
      logger.debug('[Batch] Loading preferences for cache misses', {
        count: userIdsWithoutCache.length,
      });

      // Simulate batch database query
      // In production: preferences = await db.batchGetUserPreferences(userIdsWithoutCache);
      const batchPreferences = userIdsWithoutCache.map(userId => ({
        userId,
        preferences: {
          channels: ['email', 'push', 'inApp'],
          quietHours: null,
        },
      }));

      // Batch cache the loaded preferences
      const cacheEntries = batchPreferences.map(({ userId, preferences }) => [
        `user:preferences:${userId}`,
        preferences,
      ]);
      await notificationCache.setMany(
        cacheEntries as Array<[string, any]>
      );

      logger.debug('[Batch] Cached loaded preferences', { count: batchPreferences.length });
    }

    // Get all preferences again (now all should be cached)
    const allPreferences = await notificationCache.getMany(cacheKeys);

    // Process notifications for each user
    const results = {
      sent: 0,
      skipped: 0,
      failed: 0,
    };

    for (const userId of data.userIds) {
      try {
        const preferences = allPreferences.get(`user:preferences:${userId}`);

        if (!preferences) {
          logger.warn('[Batch] No preferences found for user', { userId });
          continue;
        }

        // Filter channels based on preferences
        const enabledChannels = data.baseNotification.channels?.filter(channel =>
          preferences.channels.includes(channel)
        );

        if (!enabledChannels || enabledChannels.length === 0) {
          results.skipped++;
          continue;
        }

        const notificationData: NotificationJobData = {
          ...data.baseNotification,
          userId,
          channels: enabledChannels as any,
        } as NotificationJobData;

        // await sendNotification(notificationData);
        results.sent++;

      } catch (error: any) {
        logger.error('[Batch] Failed to send notification', {
          userId,
          error: error.message,
        });
        results.failed++;
      }
    }

    logger.info('[BatchNotificationProcessor] Batch completed', {
      jobId: job.id,
      results,
    });

    // Log cache statistics
    const stats = notificationCache.getStats();
    logger.info('[Cache] Batch statistics', {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: (stats.hitRate * 100).toFixed(2) + '%',
      sets: stats.sets,
      currentSize: stats.currentSize,
    });

    // If any failed, throw error for retry
    if (results.failed > 0) {
      throw new Error(`Batch completed with ${results.failed} failures`);
    }
  } catch (error: any) {
    logger.error('[BatchNotificationProcessor] Failed to process batch', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Get cache statistics
 * Useful for monitoring and debugging
 */
export function getCacheStatistics() {
  return notificationCache.getStats();
}

/**
 * Reset cache statistics
 * Useful for testing or periodic monitoring reset
 */
export function resetCacheStatistics() {
  return notificationCache.resetStats();
}

/**
 * Clear all cache entries
 * Useful for testing or emergency cache reset
 */
export async function clearNotificationCache() {
  notificationCache.clear();
  logger.info('[Cache] Notification cache cleared');
}

/**
 * Example: How to use cached notification processor
 *
 * ```typescript
 * import { queueManager, QueueName } from '@/lib/queue/queue-manager';
 * import { cachedNotificationProcessor, invalidateUserCache } from '@/lib/queue/processors/cached-notification-processor';
 *
 * // Initialize queue manager
 * await queueManager.initialize();
 *
 * // Start processor with caching
 * await queueManager.processQueue(
 *   QueueName.NOTIFICATION,
 *   cachedNotificationProcessor,
 *   5 // concurrency
 * );
 *
 * // Add notification job
 * await queueManager.addJob(QueueName.NOTIFICATION, {
 *   userId: 'user123',
 *   type: 'success',
 *   title: 'Task Completed',
 *   message: 'Your task has been completed successfully.',
 *   channels: ['email', 'push', 'inApp'],
 * });
 *
 * // Invalidate cache when user changes settings
 * await invalidateUserCache('user123');
 *
 * // Check cache statistics
 * const stats = getCacheStatistics();
 * console.log('Cache hit rate:', stats.hitRate);
 * ```
 */
