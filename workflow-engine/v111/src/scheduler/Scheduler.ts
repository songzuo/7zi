/**
 * OpenClaw Workflow Engine v1.11.0
 * Scheduler for Cron-based Workflow Triggers
 */

import cron from 'node-cron';
import cronParser from 'cron-parser';
import { ILogger } from '../logging/Logger';
import { QueueManager } from '../queue/QueueManager';
import { RedisStorage } from '../storage/RedisStorage';
import { IWorkflow, ISchedule, TriggerType, ITriggerInfo } from '../types/workflow.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 调度器
 * 管理 Cron 表达式触发的工作流
 */
export class Scheduler {
  private logger: ILogger;
  private queueManager: QueueManager;
  private storage: RedisStorage;
  private scheduledTasks: Map<string, cron.ScheduledTask>;
  private schedules: Map<string, ISchedule>;

  constructor(
    queueManager: QueueManager,
    storage: RedisStorage,
    logger: ILogger
  ) {
    this.logger = logger;
    this.queueManager = queueManager;
    this.storage = storage;
    this.scheduledTasks = new Map();
    this.schedules = new Map();
  }

  /**
   * 初始化调度器
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing scheduler...');
    
    // 从存储加载所有调度
    const schedules = await this.storage.getAllSchedules();
    for (const schedule of schedules) {
      if (schedule.enabled) {
        await this.scheduleWorkflow(schedule);
      }
    }
    
    this.logger.info(`Scheduler initialized with ${this.scheduledTasks.size} active schedules`);
  }

  /**
   * 创建调度
   */
  async createSchedule(
    workflowId: string,
    cronExpression: string,
    timezone: string = 'UTC'
  ): Promise<ISchedule> {
    // 验证 Cron 表达式
    try {
      cronParser.parseExpression(cronExpression);
    } catch (error) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // 检查工作流是否存在
    const workflow = await this.storage.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const schedule: ISchedule = {
      id: uuidv4(),
      workflowId,
      cronExpression,
      timezone,
      enabled: true,
      nextRun: this.getNextRunTime(cronExpression, timezone),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.storage.saveSchedule(schedule);
    await this.scheduleWorkflow(schedule);
    
    this.logger.info('Schedule created', { 
      scheduleId: schedule.id, 
      workflowId,
      cronExpression 
    });

    return schedule;
  }

  /**
   * 调度工作流
   */
  private async scheduleWorkflow(schedule: ISchedule): Promise<void> {
    if (this.scheduledTasks.has(schedule.id)) {
      this.logger.warn('Schedule already exists', { scheduleId: schedule.id });
      return;
    }

    const task = cron.schedule(
      schedule.cronExpression,
      async () => {
        await this.executeScheduledWorkflow(schedule);
      },
      {
        scheduled: true,
        timezone: schedule.timezone
      }
    );

    this.scheduledTasks.set(schedule.id, task);
    this.schedules.set(schedule.id, schedule);
    
    this.logger.info('Workflow scheduled', { 
      scheduleId: schedule.id, 
      workflowId: schedule.workflowId 
    });
  }

  /**
   * 执行调度的工作流
   */
  private async executeScheduledWorkflow(schedule: ISchedule): Promise<void> {
    const executionId = uuidv4();
    const trigger: ITriggerInfo = {
      type: TriggerType.CRON,
      triggerId: schedule.id
    };

    this.logger.info('Executing scheduled workflow', {
      scheduleId: schedule.id,
      workflowId: schedule.workflowId,
      executionId
    });

    try {
      // 添加到队列
      await this.queueManager.addWorkflowJob(
        schedule.workflowId,
        executionId,
        {
          trigger,
          variables: {}
        }
      );

      // 更新调度信息
      schedule.lastRun = new Date();
      schedule.nextRun = this.getNextRunTime(schedule.cronExpression, schedule.timezone);
      schedule.updatedAt = new Date();
      await this.storage.saveSchedule(schedule);

    } catch (error) {
      this.logger.error('Failed to execute scheduled workflow', {
        scheduleId: schedule.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 计算下次运行时间
   */
  private getNextRunTime(cronExpression: string, timezone: string): Date {
    const interval = cronParser.parseExpression(cronExpression, {
      tz: timezone
    });
    return interval.next().toDate();
  }

  /**
   * 更新调度
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<Pick<ISchedule, 'cronExpression' | 'timezone' | 'enabled'>>
  ): Promise<ISchedule> {
    const schedule = await this.storage.getSchedule(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // 如果修改了 Cron 表达式，需要验证
    if (updates.cronExpression && updates.cronExpression !== schedule.cronExpression) {
      try {
        cronParser.parseExpression(updates.cronExpression);
      } catch (error) {
        throw new Error(`Invalid cron expression: ${updates.cronExpression}`);
      }
    }

    // 更新调度
    const updatedSchedule: ISchedule = {
      ...schedule,
      ...updates,
      updatedAt: new Date()
    };

    // 如果禁用了调度，取消任务
    if (updates.enabled === false && schedule.enabled) {
      await this.unscheduleWorkflow(scheduleId);
    }

    // 如果启用了调度，重新调度
    if (updates.enabled === true && !schedule.enabled) {
      await this.scheduleWorkflow(updatedSchedule);
    }

    // 如果修改了 Cron 表达式或时区，重新调度
    if ((updates.cronExpression || updates.timezone) && schedule.enabled) {
      await this.unscheduleWorkflow(scheduleId);
      updatedSchedule.nextRun = this.getNextRunTime(
        updatedSchedule.cronExpression,
        updatedSchedule.timezone
      );
      await this.scheduleWorkflow(updatedSchedule);
    }

    await this.storage.saveSchedule(updatedSchedule);
    this.logger.info('Schedule updated', { scheduleId });

    return updatedSchedule;
  }

  /**
   * 取消调度
   */
  private async unscheduleWorkflow(scheduleId: string): Promise<void> {
    const task = this.scheduledTasks.get(scheduleId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(scheduleId);
      this.schedules.delete(scheduleId);
      this.logger.info('Workflow unscheduled', { scheduleId });
    }
  }

  /**
   * 删除调度
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    await this.unscheduleWorkflow(scheduleId);
    await this.storage.deleteSchedule(scheduleId);
    this.logger.info('Schedule deleted', { scheduleId });
  }

  /**
   * 获取调度
   */
  async getSchedule(scheduleId: string): Promise<ISchedule | null> {
    return await this.storage.getSchedule(scheduleId);
  }

  /**
   * 获取所有调度
   */
  async getAllSchedules(): Promise<ISchedule[]> {
    return await this.storage.getAllSchedules();
  }

  /**
   * 获取工作流的调度
   */
  async getSchedulesByWorkflow(workflowId: string): Promise<ISchedule[]> {
    const allSchedules = await this.getAllSchedules();
    return allSchedules.filter(s => s.workflowId === workflowId);
  }

  /**
   * 手动触发调度
   */
  async triggerSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.storage.getSchedule(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    await this.executeScheduledWorkflow(schedule);
    this.logger.info('Schedule manually triggered', { scheduleId });
  }

  /**
   * 获取即将运行的调度
   */
  async getUpcomingSchedules(limit: number = 10): Promise<ISchedule[]> {
    const allSchedules = await this.getAllSchedules();
    const enabledSchedules = allSchedules.filter(s => s.enabled && s.nextRun);
    
    return enabledSchedules
      .sort((a, b) => {
        if (!a.nextRun) return 1;
        if (!b.nextRun) return -1;
        return a.nextRun.getTime() - b.nextRun.getTime();
      })
      .slice(0, limit);
  }

  /**
   * 关闭调度器
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down scheduler...');
    
    // 停止所有调度任务
    for (const [scheduleId, task] of this.scheduledTasks) {
      task.stop();
      this.logger.debug('Stopped scheduled task', { scheduleId });
    }
    
    this.scheduledTasks.clear();
    this.schedules.clear();
    
    this.logger.info('Scheduler shutdown complete');
  }
}