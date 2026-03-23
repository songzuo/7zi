import Queue, { Queue as BullQueue, Job, JobOptions } from 'bull';
import { logger } from '../logger';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Global queue configuration
const defaultQueueConfig = {
  connection: redisConfig,
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600, // Remove completed jobs after 1 hour
      count: 1000, // Keep at most 1000 completed jobs
    },
    removeOnFail: {
      age: 24 * 3600, // Remove failed jobs after 24 hours
      count: 5000, // Keep at most 5000 failed jobs
    },
  },
};

/**
 * Queue configuration interface
 */
export interface QueueConfig {
  name: string;
  retries: number;
  backoff: {
    type: 'exponential';
    delay: number;
  };
  limiter?: {
    max: number;
    duration: number;
  };
}

/**
 * Supported queue names
 */
export enum QueueName {
  EMAIL = 'email',
  NOTIFICATION = 'notification',
  ANALYTICS = 'analytics',
}

/**
 * Queue configurations
 */
export const queueConfigs: Record<QueueName, QueueConfig> = {
  [QueueName.EMAIL]: {
    name: 'email',
    retries: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    limiter: {
      max: 10, // Max 10 emails per minute
      duration: 60000,
    },
  },
  [QueueName.NOTIFICATION]: {
    name: 'notification',
    retries: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    limiter: {
      max: 50, // Max 50 notifications per minute
      duration: 60000,
    },
  },
  [QueueName.ANALYTICS]: {
    name: 'analytics',
    retries: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    limiter: {
      max: 100, // Max 100 analytics events per minute
      duration: 60000,
    },
  },
};

/**
 * Queue Manager Class
 * Manages all Bull queues in the application
 */
export class QueueManager {
  private queues: Map<QueueName, BullQueue> = new Map();
  private isInitialized = false;

  /**
   * Initialize all queues
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('[QueueManager] Already initialized');
      return;
    }

    try {
      logger.info('[QueueManager] Initializing queues...');

      // Initialize all configured queues
      for (const [queueName, config] of Object.entries(queueConfigs)) {
        await this.createQueue(queueName as QueueName, config);
      }

      this.isInitialized = true;
      logger.info('[QueueManager] All queues initialized successfully');
    } catch (error) {
      logger.error('[QueueManager] Failed to initialize queues:', error);
      throw error;
    }
  }

  /**
   * Create a single queue
   */
  private async createQueue(queueName: QueueName, config: QueueConfig): Promise<void> {
    try {
      logger.info(`[QueueManager] Creating queue: ${queueName}`);

      const queue = new Queue(config.name, defaultQueueConfig);

      // Setup event listeners for monitoring
      this.setupQueueEventListeners(queue, queueName);

      // Store the queue
      this.queues.set(queueName, queue);

      logger.info(`[QueueManager] Queue created: ${queueName}`);
    } catch (error) {
      logger.error(`[QueueManager] Failed to create queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Setup event listeners for a queue
   */
  private setupQueueEventListeners(queue: BullQueue, queueName: QueueName): void {
    // Job completed
    queue.on('completed', (job: Job) => {
      logger.info(`[Queue:${queueName}] Job completed`, {
        jobId: job.id,
        data: job.data,
        attempts: job.attemptsMade,
      });
    });

    // Job failed
    queue.on('failed', (job: Job | undefined, error: Error) => {
      logger.error(`[Queue:${queueName}] Job failed`, {
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
        attempts: job?.attemptsMade,
      });

      if (job && job.attemptsMade < (job.opts.attempts || 0)) {
        logger.warn(`[Queue:${queueName}] Job will retry`, {
          jobId: job.id,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          nextRetry: job.opts.backoff,
        });
      }
    });

    // Job stalled
    queue.on('stalled', (job: Job) => {
      logger.warn(`[Queue:${queueName}] Job stalled`, {
        jobId: job.id,
        data: job.data,
      });
    });

    // Job progress
    queue.on('progress', (job: Job, progress: number | object) => {
      logger.debug(`[Queue:${queueName}] Job progress`, {
        jobId: job.id,
        progress,
      });
    });

    // Queue error (connection issues, etc.)
    queue.on('error', (error: Error) => {
      logger.error(`[Queue:${queueName}] Queue error:`, error);
    });

    // Waiting job
    queue.on('waiting', (jobId: string) => {
      logger.debug(`[Queue:${queueName}] Job waiting`, { jobId });
    });

    // Active job
    queue.on('active', (job: Job) => {
      logger.info(`[Queue:${queueName}] Job started`, {
        jobId: job.id,
        data: job.data,
      });
    });
  }

  /**
   * Get a queue by name
   */
  getQueue(queueName: QueueName): BullQueue | undefined {
    return this.queues.get(queueName);
  }

  /**
   * Add a job to a queue
   */
  async addJob<T = any>(
    queueName: QueueName,
    data: T,
    options?: JobOptions
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found. Make sure the queue manager is initialized.`);
    }

    try {
      const job = await queue.add(data, options);
      logger.info(`[QueueManager] Job added to ${queueName}`, {
        jobId: job.id,
        data,
        options,
      });
      return job;
    } catch (error) {
      logger.error(`[QueueManager] Failed to add job to ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Process jobs for a queue
   */
  async processQueue<T = any>(
    queueName: QueueName,
    processor: (job: Job<T>) => Promise<void> | void,
    concurrency?: number
  ): Promise<void> {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found. Make sure the queue manager is initialized.`);
    }

    try {
      logger.info(`[QueueManager] Starting processor for ${queueName}`);
      queue.process(concurrency || 1, processor);
    } catch (error) {
      logger.error(`[QueueManager] Failed to start processor for ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: QueueName): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getPausedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info(`[QueueManager] Queue paused: ${queueName}`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info(`[QueueManager] Queue resumed: ${queueName}`);
  }

  /**
   * Clean up queues
   */
  async close(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      logger.info('[QueueManager] Closing queues...');

      const closePromises = Array.from(this.queues.values()).map((queue) => queue.close());
      await Promise.all(closePromises);

      this.queues.clear();
      this.isInitialized = false;

      logger.info('[QueueManager] All queues closed');
    } catch (error) {
      logger.error('[QueueManager] Failed to close queues:', error);
      throw error;
    }
  }

  /**
   * Check if the manager is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const queueManager = new QueueManager();
