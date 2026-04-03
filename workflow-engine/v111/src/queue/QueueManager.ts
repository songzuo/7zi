/**
 * OpenClaw Workflow Engine v1.11.0
 * Queue Manager using Bull
 */

import Queue, { Job, QueueOptions, JobOptions } from 'bull';
import Redis from 'ioredis';
import { ILogger } from '../logging/Logger';
import { IQueueJob, TaskPriority, IJobOptions } from '../types/workflow.types';

/**
 * 队列管理器
 * 使用 Bull 实现异步任务队列
 */
export class QueueManager {
  private workflowQueue: Queue;
  private logger: ILogger;
  private redis: Redis;

  constructor(redisUrl: string, logger: ILogger) {
    this.logger = logger;
    this.redis = new Redis(redisUrl);

    const queueOptions: QueueOptions = {
      redis: {
        host: this.redis.options.host,
        port: this.redis.options.port,
        password: this.redis.options.password,
        db: 1 // 使用不同的 DB 避免冲突
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    };

    this.workflowQueue = new Queue('workflows', queueOptions);

    this.setupEventListeners();
    this.logger.info('Queue manager initialized');
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.workflowQueue.on('completed', (job: Job) => {
      this.logger.debug('Job completed', { jobId: job.id, workflowId: job.data.workflowId });
    });

    this.workflowQueue.on('failed', (job: Job | undefined, error: Error) => {
      this.logger.error('Job failed', { 
        jobId: job?.id, 
        workflowId: job?.data.workflowId, 
        error: error.message 
      });
    });

    this.workflowQueue.on('stalled', (job: Job) => {
      this.logger.warn('Job stalled', { jobId: job.id, workflowId: job.data.workflowId });
    });

    this.workflowQueue.on('progress', (job: Job, progress: number) => {
      this.logger.debug('Job progress', { jobId: job.id, progress });
    });
  }

  /**
   * 添加工作流执行任务到队列
   */
  async addWorkflowJob(
    workflowId: string,
    executionId: string,
    data: any,
    options?: Partial<IJobOptions>
  ): Promise<Job> {
    const jobData: IQueueJob = {
      id: executionId,
      workflowId,
      executionId,
      priority: options?.priority || TaskPriority.NORMAL,
      delay: options?.delay,
      attempts: 0,
      maxAttempts: options?.attempts || 3,
      data,
      opts: {
        priority: options?.priority || TaskPriority.NORMAL,
        delay: options?.delay,
        attempts: options?.attempts || 3,
        backoff: options?.backoff,
        removeOnComplete: options?.removeOnComplete !== false,
        removeOnFail: options?.removeOnFail !== false,
        timeout: options?.timeout
      }
    };

    const job = await this.workflowQueue.add('execute', jobData, jobData.opts);
    this.logger.info('Workflow job added to queue', { 
      jobId: job.id, 
      workflowId, 
      executionId,
      priority: jobData.priority 
    });

    return job;
  }

  /**
   * 添加延迟任务
   */
  async addDelayedJob(
    workflowId: string,
    executionId: string,
    data: any,
    delayMs: number,
    options?: Partial<IJobOptions>
  ): Promise<Job> {
    return this.addWorkflowJob(workflowId, executionId, data, {
      ...options,
      delay: delayMs
    });
  }

  /**
   * 获取任务状态
   */
  async getJobStatus(jobId: string): Promise<string | null> {
    const job = await this.workflowQueue.getJob(jobId);
    if (!job) return null;
    return await job.getState();
  }

  /**
   * 获取任务
   */
  async getJob(jobId: string): Promise<Job | null> {
    return await this.workflowQueue.getJob(jobId);
  }

  /**
   * 取消任务
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.workflowQueue.getJob(jobId);
    if (!job) return false;
    await job.remove();
    this.logger.info('Job cancelled', { jobId });
    return true;
  }

  /**
   * 重试失败的任务
   */
  async retryJob(jobId: string): Promise<Job | null> {
    const job = await this.workflowQueue.getJob(jobId);
    if (!job) return null;
    await job.retry();
    this.logger.info('Job retried', { jobId });
    return job;
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    const counts = await this.workflowQueue.getJobCounts();
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0
    };
  }

  /**
   * 清空队列
   */
  async cleanQueue(grace: number = 5000): Promise<void> {
    await this.workflowQueue.clean(grace, 'completed');
    await this.workflowQueue.clean(grace, 'failed');
    this.logger.info('Queue cleaned');
  }

  /**
   * 暂停队列
   */
  async pauseQueue(): Promise<void> {
    await this.workflowQueue.pause();
    this.logger.info('Queue paused');
  }

  /**
   * 恢复队列
   */
  async resumeQueue(): Promise<void> {
    await this.workflowQueue.resume();
    this.logger.info('Queue resumed');
  }

  /**
   * 获取队列实例（用于注册处理器）
   */
  getQueue(): Queue {
    return this.workflowQueue;
  }

  /**
   * 关闭队列
   */
  async close(): Promise<void> {
    await this.workflowQueue.close();
    await this.redis.quit();
    this.logger.info('Queue manager closed');
  }
}