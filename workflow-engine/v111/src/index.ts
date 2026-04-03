/**
 * OpenClaw Workflow Engine v1.11.0
 * Main Entry Point
 */

import 'reflect-metadata';
import dotenv from 'dotenv';
import { WorkflowEngine } from './engine/WorkflowEngine';
import { Scheduler } from './scheduler/Scheduler';
import { RedisStorage } from './storage/RedisStorage';
import { QueueManager } from './queue/QueueManager';
import { WorkflowAPI } from './api/WorkflowAPI';
import { createLogger, LogLevel, ILogger } from './logging/Logger';
import { allExecutors } from './engine/executors';

// 加载环境变量
dotenv.config();

/**
 * 工作流引擎应用
 */
export class WorkflowEngineApp {
  private engine!: WorkflowEngine;
  private scheduler!: Scheduler;
  private storage!: RedisStorage;
  private queueManager!: QueueManager;
  private api!: WorkflowAPI;
  private logger: ILogger;
  private port: number;

  constructor() {
    this.port = parseInt(process.env.PORT || '3001', 10);
    this.logger = createLogger({
      level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
      service: 'openclaw-workflow-engine'
    });
  }

  /**
   * 初始化应用
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing OpenClaw Workflow Engine v1.11.0...');

    // 初始化存储
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.storage = new RedisStorage(redisUrl, this.logger);
    this.logger.info('Redis storage initialized');

    // 初始化队列管理器
    this.queueManager = new QueueManager(redisUrl, this.logger);
    this.logger.info('Queue manager initialized');

    // 初始化执行引擎
    this.engine = new WorkflowEngine(this.storage, this.queueManager, this.logger, {
      maxParallelTasks: parseInt(process.env.MAX_PARALLEL_TASKS || '10', 10),
      checkpointInterval: parseInt(process.env.CHECKPOINT_INTERVAL || '5000', 10)
    });

    // 注册所有执行器
    for (const executor of allExecutors) {
      this.engine.registerExecutor(executor);
    }
    this.logger.info(`Registered ${allExecutors.length} node executors`);

    // 初始化调度器
    this.scheduler = new Scheduler(this.queueManager, this.storage, this.logger);
    await this.scheduler.initialize();
    this.logger.info('Scheduler initialized');

    // 设置队列处理器
    this.setupQueueProcessor();

    // 初始化 API
    this.api = new WorkflowAPI(
      this.engine,
      this.scheduler,
      this.storage,
      this.queueManager,
      this.logger
    );
    this.logger.info('API initialized');
  }

  /**
   * 设置队列处理器
   */
  private setupQueueProcessor(): void {
    const queue = this.queueManager.getQueue();

    queue.process('execute', async (job) => {
      this.logger.info('Processing workflow job', { 
        jobId: job.id, 
        workflowId: job.data.workflowId 
      });

      try {
        const execution = await this.engine.executeSync(
          job.data.workflowId,
          job.data.variables,
          job.data.trigger
        );

        return execution;
      } catch (error) {
        this.logger.error('Job processing failed', {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });
  }

  /**
   * 启动服务
   */
  async start(): Promise<void> {
    await this.initialize();

    const app = this.api.getApp();
    
    const server = app.listen(this.port, () => {
      this.logger.info(`OpenClaw Workflow Engine v1.11.0 running on port ${this.port}`);
      this.logger.info(`Health check: http://localhost:${this.port}/health`);
      this.logger.info(`API docs: http://localhost:${this.port}/api-docs`);
    });

    // 优雅关闭
    process.on('SIGTERM', () => this.shutdown(server));
    process.on('SIGINT', () => this.shutdown(server));
  }

  /**
   * 关闭服务
   */
  private async shutdown(server: any): Promise<void> {
    this.logger.info('Shutting down gracefully...');

    // 关闭 HTTP 服务器
    server.close();

    // 关闭调度器
    await this.scheduler.shutdown();

    // 关闭队列管理器
    await this.queueManager.close();

    // 关闭存储
    await this.storage.close();

    this.logger.info('Shutdown complete');
    process.exit(0);
  }
}

// 启动应用
if (require.main === module) {
  const app = new WorkflowEngineApp();
  app.start().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

export {
  WorkflowEngine,
  Scheduler,
  RedisStorage,
  QueueManager,
  WorkflowAPI
};

export * from './types/workflow.types';
