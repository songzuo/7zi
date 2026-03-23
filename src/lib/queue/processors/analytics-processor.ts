import { Job } from 'bull';
import { logger } from '../../logger';
import { QueueName } from '../queue-manager';

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'page_view'
  | 'user_action'
  | 'conversion'
  | 'error'
  | 'performance'
  | 'custom';

/**
 * Analytics event data structure
 */
export interface AnalyticsEventData {
  userId?: string;
  sessionId?: string;
  eventType: AnalyticsEventType;
  eventName?: string;
  properties: Record<string, any>;
  timestamp: Date;
  metadata?: Record<string, any>;
  source?: string;
  version?: string;
}

/**
 * Analytics batch data structure
 */
export interface AnalyticsBatchData {
  events: AnalyticsEventData[];
  flush?: boolean;
}

/**
 * Simulated analytics service
 * In production, this would integrate with Google Analytics, Mixpanel, Segment, etc.
 */
class AnalyticsService {
  private eventBuffer: AnalyticsEventData[] = [];
  private batchSize = 100;
  private flushInterval = 60000; // 1 minute

  /**
   * Track a single event
   */
  async track(event: AnalyticsEventData): Promise<{ eventId: string }> {
    // Simulate tracking delay
    await this.delay(10 + Math.random() * 20);

    logger.debug('[AnalyticsService] Tracking event', {
      eventType: event.eventType,
      eventName: event.eventName,
      userId: event.userId,
    });

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In production, send to analytics service
    logger.info('[AnalyticsService] Event tracked successfully', {
      eventId,
      eventType: event.eventType,
    });

    return { eventId };
  }

  /**
   * Track multiple events in batch
   */
  async trackBatch(events: AnalyticsEventData[]): Promise<{
    success: number;
    failed: number;
    eventIds: string[];
  }> {
    logger.info('[AnalyticsService] Tracking batch of events', {
      count: events.length,
    });

    const results = {
      success: 0,
      failed: 0,
      eventIds: [] as string[],
    };

    for (const event of events) {
      try {
        const result = await this.track(event);
        results.success++;
        results.eventIds.push(result.eventId);
      } catch (error) {
        results.failed++;
        logger.error('[AnalyticsService] Failed to track event', {
          eventType: event.eventType,
          error,
        });
      }
    }

    logger.info('[AnalyticsService] Batch tracking completed', results);

    return results;
  }

  /**
   * Aggregate analytics data
   */
  async aggregate(events: AnalyticsEventData[]): Promise<Record<string, any>> {
    logger.info('[AnalyticsService] Aggregating analytics data', {
      count: events.length,
    });

    const aggregation: Record<string, any> = {
      totalEvents: events.length,
      eventTypeCounts: {} as Record<string, number>,
      uniqueUsers: new Set<string>(),
    };

    for (const event of events) {
      // Count event types
      aggregation.eventTypeCounts[event.eventType] =
        (aggregation.eventTypeCounts[event.eventType] || 0) + 1;

      // Track unique users
      if (event.userId) {
        aggregation.uniqueUsers.add(event.userId);
      }
    }

    aggregation.uniqueUsers = aggregation.uniqueUsers.size;

    logger.info('[AnalyticsService] Aggregation completed', aggregation);

    return aggregation;
  }

  /**
   * Simulate delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const analyticsService = new AnalyticsService();

/**
 * Analytics event processor
 * Processes individual analytics events
 */
export async function analyticsProcessor(job: Job<AnalyticsEventData>): Promise<void> {
  const { data } = job;

  logger.info(`[AnalyticsProcessor] Processing analytics event`, {
    jobId: job.id,
    eventType: data.eventType,
    eventName: data.eventName,
    userId: data.userId,
  });

  try {
    // Validate event data
    if (!data.eventType || !data.timestamp) {
      throw new Error('Missing required fields: eventType and timestamp');
    }

    // Update job progress
    try {
      // @ts-ignore - updateProgress may not exist on Job type
      // await job.updateProgress(10);
    } catch (e) { /* ignore */ }

    // Track event
    try {
      // @ts-ignore - updateProgress may not exist on Job type
      // await job.updateProgress(50);
    } catch (e) { /* ignore */ }
    const result = await analyticsService.track(data);

    try {
      // @ts-ignore - updateProgress may not exist on Job type
      // await job.updateProgress(100);
    } catch (e) { /* ignore */ }

    logger.info(`[AnalyticsProcessor] Analytics event tracked successfully`, {
      jobId: job.id,
      eventId: result.eventId,
      eventType: data.eventType,
    });

    return;
  } catch (error: any) {
    logger.error(`[AnalyticsProcessor] Failed to track analytics event`, {
      jobId: job.id,
      error: error.message,
      data,
    });

    throw error;
  }
}

/**
 * Analytics batch processor
 * Processes multiple analytics events in a single job
 */
export async function analyticsBatchProcessor(
  job: Job<AnalyticsBatchData>
): Promise<void> {
  const { data } = job;

  logger.info(`[AnalyticsBatchProcessor] Processing batch of ${data.events.length} events`, {
    jobId: job.id,
  });

  try {
    // Validate batch data
    if (!data.events || data.events.length === 0) {
      throw new Error('Batch is empty');
    }

    // Track events in batch
    // await job.updateProgress(50);
    const results = await analyticsService.trackBatch(data.events);

    // await job.updateProgress(80);

    // Optionally aggregate data
    const aggregation = await analyticsService.aggregate(data.events);

    // await job.updateProgress(100);

    logger.info(`[AnalyticsBatchProcessor] Batch processed successfully`, {
      jobId: job.id,
      results,
      aggregation,
    });

    // If any events failed, throw an error
    if (results.failed > 0) {
      throw new Error(`Batch completed with ${results.failed} failures`);
    }

    return;
  } catch (error: any) {
    logger.error(`[AnalyticsBatchProcessor] Failed to process batch`, {
      jobId: job.id,
      error: error.message,
    });

    throw error;
  }
}

/**
 * Analytics event builder
 * Helper function to create analytics events with default values
 */
export function createAnalyticsEvent(
  eventType: AnalyticsEventType,
  eventName: string,
  properties: Record<string, any>,
  userId?: string
): AnalyticsEventData {
  return {
    eventType,
    eventName,
    properties,
    userId,
    sessionId: generateSessionId(),
    timestamp: new Date(),
    source: '7zi',
    version: '1.0.0',
  };
}

/**
 * Page view event builder
 */
export function createPageViewEvent(
  userId: string | undefined,
  path: string,
  referrer?: string
): AnalyticsEventData {
  return createAnalyticsEvent(
    'page_view',
    'page_view',
    {
      path,
      referrer,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    },
    userId
  );
}

/**
 * User action event builder
 */
export function createUserActionEvent(
  userId: string | undefined,
  action: string,
  properties: Record<string, any>
): AnalyticsEventData {
  return createAnalyticsEvent(
    'user_action',
    action,
    properties,
    userId
  );
}

/**
 * Conversion event builder
 */
export function createConversionEvent(
  userId: string | undefined,
  conversionType: string,
  value?: number,
  currency?: string
): AnalyticsEventData {
  return createAnalyticsEvent(
    'conversion',
    conversionType,
    {
      value,
      currency,
    },
    userId
  );
}

/**
 * Error event builder
 */
export function createErrorEvent(
  userId: string | undefined,
  error: Error,
  context?: Record<string, any>
): AnalyticsEventData {
  return createAnalyticsEvent(
    'error',
    'error_occurred',
    {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      ...context,
    },
    userId
  );
}

/**
 * Performance event builder
 */
export interface PerformanceMetrics {
  loadTime?: number;
  domContentLoaded?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
}

export function createPerformanceEvent(
  userId: string | undefined,
  metrics: PerformanceMetrics
): AnalyticsEventData {
  return createAnalyticsEvent(
    'performance',
    'page_performance',
    metrics,
    userId
  );
}

/**
 * Generate a session ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Analytics aggregation processor
 * Performs aggregations on analytics data
 */
export interface AggregationJobData {
  eventType?: AnalyticsEventType;
  startTime: Date;
  endTime: Date;
  groupBy?: string[];
}

export async function analyticsAggregationProcessor(
  job: Job<AggregationJobData>
): Promise<void> {
  const { data } = job;

  logger.info(`[AnalyticsAggregationProcessor] Processing aggregation job`, {
    jobId: job.id,
    eventType: data.eventType,
    startTime: data.startTime,
    endTime: data.endTime,
  });

  try {
    // await job.updateProgress(20);

    // In production, you would query your analytics database here
    // For this example, we'll simulate the aggregation

    logger.info(`[AnalyticsAggregationProcessor] Querying analytics data`, {
      startTime: data.startTime,
      endTime: data.endTime,
    });

    // await job.updateProgress(60);

    // Simulate aggregation
    const aggregationResults = {
      totalEvents: Math.floor(Math.random() * 10000),
      uniqueUsers: Math.floor(Math.random() * 1000),
      averageEventsPerUser: 0,
    };

    if (aggregationResults.uniqueUsers > 0) {
      aggregationResults.averageEventsPerUser =
        aggregationResults.totalEvents / aggregationResults.uniqueUsers;
    }

    // await job.updateProgress(100);

    logger.info(`[AnalyticsAggregationProcessor] Aggregation completed`, {
      jobId: job.id,
      results: aggregationResults,
    });

    return;
  } catch (error: any) {
    logger.error(`[AnalyticsAggregationProcessor] Failed to process aggregation`, {
      jobId: job.id,
      error: error.message,
    });

    throw error;
  }
}
