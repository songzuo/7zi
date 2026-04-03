/**
 * OpenClaw Workflow Engine v1.11.0
 * REST API Server
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { WorkflowEngine } from '../engine/WorkflowEngine';
import { Scheduler } from '../scheduler/Scheduler';
import { RedisStorage } from '../storage/RedisStorage';
import { QueueManager } from '../queue/QueueManager';
import { ILogger } from '../logging/Logger';
import { IWorkflow, IExecution, ISchedule, IPagination, IPaginatedResult } from '../types/workflow.types';
import { VersionControlService } from '../version/VersionControlService';
import { VersionControlRoutes } from '../version/VersionControlRoutes';
import { v4 as uuidv4 } from 'uuid';

/**
 * API 服务器
 */
export class WorkflowAPI {
  private app: express.Application;
  private engine: WorkflowEngine;
  private scheduler: Scheduler;
  private storage: RedisStorage;
  private queueManager: QueueManager;
  private logger: ILogger;
  private versionService: VersionControlService;
  private versionRoutes: VersionControlRoutes;

  constructor(
    engine: WorkflowEngine,
    scheduler: Scheduler,
    storage: RedisStorage,
    queueManager: QueueManager,
    logger: ILogger
  ) {
    this.engine = engine;
    this.scheduler = scheduler;
    this.storage = storage;
    this.queueManager = queueManager;
    this.logger = logger;
    this.app = express();

    // 初始化版本控制服务
    this.versionService = new VersionControlService(storage, logger);
    this.versionRoutes = new VersionControlRoutes(storage, logger);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 请求日志
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.logger.info('API Request', {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      next();
    });
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 健康检查
    this.app.get('/health', this.healthCheck.bind(this));

    // 工作流管理
    this.app.post('/api/workflows', this.createWorkflow.bind(this));
    this.app.get('/api/workflows', this.getWorkflows.bind(this));
    this.app.get('/api/workflows/:id', this.getWorkflow.bind(this));
    this.app.put('/api/workflows/:id', this.updateWorkflow.bind(this));
    this.app.delete('/api/workflows/:id', this.deleteWorkflow.bind(this));

    // 版本控制管理
    this.app.use('/api', this.versionRoutes.getRouter());

    // 执行管理
    this.app.post('/api/workflows/:id/execute', this.executeWorkflow.bind(this));
    this.app.get('/api/executions', this.getExecutions.bind(this));
    this.app.get('/api/executions/:id', this.getExecution.bind(this));
    this.app.post('/api/executions/:id/pause', this.pauseExecution.bind(this));
    this.app.post('/api/executions/:id/resume', this.resumeExecution.bind(this));
    this.app.post('/api/executions/:id/cancel', this.cancelExecution.bind(this));

    // 调度管理
    this.app.post('/api/schedules', this.createSchedule.bind(this));
    this.app.get('/api/schedules', this.getSchedules.bind(this));
    this.app.get('/api/schedules/:id', this.getSchedule.bind(this));
    this.app.put('/api/schedules/:id', this.updateSchedule.bind(this));
    this.app.delete('/api/schedules/:id', this.deleteSchedule.bind(this));
    this.app.post('/api/schedules/:id/trigger', this.triggerSchedule.bind(this));

    // 队列管理
    this.app.get('/api/queue/stats', this.getQueueStats.bind(this));
    this.app.post('/api/queue/pause', this.pauseQueue.bind(this));
    this.app.post('/api/queue/resume', this.resumeQueue.bind(this));
    this.app.post('/api/queue/clean', this.cleanQueue.bind(this));

    // Webhook 触发器
    this.app.all('/api/webhooks/:path', this.handleWebhook.bind(this));
  }

  /**
   * 错误处理
   */
  private setupErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('API Error', {
        error: err.message,
        stack: err.stack,
        path: req.path
      });

      res.status(500).json({
        success: false,
        error: {
          message: err.message,
          code: 'INTERNAL_ERROR'
        }
      });
    });
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  private async healthCheck(req: Request, res: Response): Promise<void> {
    const redisHealthy = await this.storage.healthCheck();
    const queueStats = await this.queueManager.getQueueStats();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        redis: redisHealthy ? 'healthy' : 'unhealthy',
        queue: 'healthy'
      },
      queue: queueStats
    });
  }

  // ============================================================================
  // Workflow Management
  // ============================================================================

  private async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const workflow: IWorkflow = {
        ...req.body,
        id: req.body.id || uuidv4(),
        version: req.body.version || '1.0.0',
        status: req.body.status || 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.engine.registerWorkflow(workflow);

      // 创建初始版本
      await this.versionService.createVersion(
        workflow,
        'Initial version',
        req.body.createdBy
      );

      res.status(201).json({
        success: true,
        data: workflow
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async getWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const workflows = await this.storage.getAllWorkflows();

      res.json({
        success: true,
        data: workflows,
        total: workflows.length
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async getWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const workflow = await this.storage.getWorkflow(req.params.id);
      
      if (!workflow) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Workflow not found',
            code: 'NOT_FOUND'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: workflow
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const existing = await this.storage.getWorkflow(req.params.id);
      
      if (!existing) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Workflow not found',
            code: 'NOT_FOUND'
          }
        });
        return;
      }

      const updated: IWorkflow = {
        ...existing,
        ...req.body,
        id: existing.id,
        updatedAt: new Date()
      };

      await this.engine.registerWorkflow(updated);

      // 自动创建新版本
      const changeSummary = req.body.changeSummary || 'Workflow updated';
      await this.versionService.createVersion(
        updated,
        changeSummary,
        req.body.updatedBy
      );

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      await this.storage.deleteWorkflow(req.params.id);

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // ============================================================================
  // Execution Management
  // ============================================================================

  private async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { variables, trigger } = req.body;
      const execution = await this.engine.execute(req.params.id, variables, trigger);

      res.json({
        success: true,
        data: execution
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async getExecutions(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.query;
      
      let executions: IExecution[];
      if (workflowId) {
        executions = await this.storage.getExecutionsByWorkflow(workflowId as string);
      } else {
        executions = await this.storage.getAllExecutions();
      }

      res.json({
        success: true,
        data: executions,
        total: executions.length
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async getExecution(req: Request, res: Response): Promise<void> {
    try {
      const execution = await this.engine.getExecution(req.params.id);
      
      if (!execution) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Execution not found',
            code: 'NOT_FOUND'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: execution
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async pauseExecution(req: Request, res: Response): Promise<void> {
    try {
      const execution = await this.engine.pauseExecution(req.params.id);

      res.json({
        success: true,
        data: execution
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async resumeExecution(req: Request, res: Response): Promise<void> {
    try {
      const { checkpointId } = req.body;
      const execution = await this.engine.resumeFromCheckpoint(checkpointId);

      res.json({
        success: true,
        data: execution
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async cancelExecution(req: Request, res: Response): Promise<void> {
    try {
      const execution = await this.engine.cancelExecution(req.params.id);

      res.json({
        success: true,
        data: execution
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // ============================================================================
  // Schedule Management
  // ============================================================================

  private async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId, cronExpression, timezone } = req.body;
      
      const schedule = await this.scheduler.createSchedule(
        workflowId,
        cronExpression,
        timezone
      );

      res.status(201).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async getSchedules(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.query;
      
      let schedules: ISchedule[];
      if (workflowId) {
        schedules = await this.scheduler.getSchedulesByWorkflow(workflowId as string);
      } else {
        schedules = await this.scheduler.getAllSchedules();
      }

      res.json({
        success: true,
        data: schedules,
        total: schedules.length
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      const schedule = await this.scheduler.getSchedule(req.params.id);
      
      if (!schedule) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Schedule not found',
            code: 'NOT_FOUND'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      const schedule = await this.scheduler.updateSchedule(req.params.id, req.body);

      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async deleteSchedule(req: Request, res: Response): Promise<void> {
    try {
      await this.scheduler.deleteSchedule(req.params.id);

      res.json({
        success: true,
        message: 'Schedule deleted successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async triggerSchedule(req: Request, res: Response): Promise<void> {
    try {
      await this.scheduler.triggerSchedule(req.params.id);

      res.json({
        success: true,
        message: 'Schedule triggered successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // ============================================================================
  // Queue Management
  // ============================================================================

  private async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.queueManager.getQueueStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async pauseQueue(req: Request, res: Response): Promise<void> {
    try {
      await this.queueManager.pauseQueue();

      res.json({
        success: true,
        message: 'Queue paused successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async resumeQueue(req: Request, res: Response): Promise<void> {
    try {
      await this.queueManager.resumeQueue();

      res.json({
        success: true,
        message: 'Queue resumed successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async cleanQueue(req: Request, res: Response): Promise<void> {
    try {
      await this.queueManager.cleanQueue();

      res.json({
        success: true,
        message: 'Queue cleaned successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // ============================================================================
  // Webhook Handler
  // ============================================================================

  private async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const path = req.params.path;
      const method = req.method;
      const payload = {
        method,
        path,
        headers: req.headers,
        query: req.query,
        body: req.body
      };

      // 查找匹配的 webhook 触发器工作流
      const workflows = await this.storage.getAllWorkflows();
      const matchingWorkflow = workflows.find(wf => 
        wf.triggers?.some(t => 
          t.type === 'webhook' && 
          t.config.webhook?.path === path &&
          t.config.webhook?.method === method
        )
      );

      if (!matchingWorkflow) {
        res.status(404).json({
          success: false,
          error: {
            message: 'No workflow found for this webhook',
            code: 'NOT_FOUND'
          }
        });
        return;
      }

      // 执行工作流
      const execution = await this.engine.execute(matchingWorkflow.id, {
        webhook: payload
      }, {
        type: 'webhook',
        payload
      });

      res.json({
        success: true,
        message: 'Webhook received and workflow started',
        data: {
          executionId: execution.id,
          workflowId: matchingWorkflow.id
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // ============================================================================
  // Error Handler
  // ============================================================================

  private handleError(res: Response, error: any): void {
    const message = error instanceof Error ? error.message : String(error);
    const code = error.code || 'INTERNAL_ERROR';

    this.logger.error('API Error', { error: message, code });

    res.status(error.status || 500).json({
      success: false,
      error: {
        message,
        code
      }
    });
  }

  /**
   * 获取 Express 应用实例
   */
  getApp(): express.Application {
    return this.app;
  }
}