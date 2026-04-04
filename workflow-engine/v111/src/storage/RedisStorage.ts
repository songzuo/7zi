/**
 * OpenClaw Workflow Engine v1.11.0
 * Redis Storage Layer
 */

import Redis from 'ioredis';
import { ILogger } from '../logging/Logger';
import { IWorkflow, IExecution, ICheckpoint, ISchedule } from '../types/workflow.types';

/**
 * Redis 存储层
 * 提供工作流、执行状态、检查点和调度的持久化存储
 */
export class RedisStorage {
  private redis: Redis;
  private logger: ILogger;
  private readonly prefix = 'openclaw:workflow';

  constructor(redisUrl: string, logger: ILogger) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: false
    });
    this.logger = logger;

    this.redis.on('connect', () => {
      this.logger.info('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', { error });
    });
  }

  // ============================================================================
  // Workflow Operations
  // ============================================================================

  /**
   * 保存工作流
   */
  async saveWorkflow(workflow: IWorkflow): Promise<void> {
    const key = `${this.prefix}:workflow:${workflow.id}`;
    const data = JSON.stringify(workflow);
    await this.redis.set(key, data);
    await this.redis.sadd(`${this.prefix}:workflows:list`, workflow.id);
    this.logger.debug('Workflow saved', { workflowId: workflow.id });
  }

  /**
   * 获取工作流
   */
  async getWorkflow(id: string): Promise<IWorkflow | null> {
    const key = `${this.prefix}:workflow:${id}`;
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  /**
   * 获取所有工作流
   */
  async getAllWorkflows(): Promise<IWorkflow[]> {
    const ids = await this.redis.smembers(`${this.prefix}:workflows:list`);
    const workflows: IWorkflow[] = [];
    
    for (const id of ids) {
      const workflow = await this.getWorkflow(id);
      if (workflow) workflows.push(workflow);
    }
    
    return workflows;
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(id: string): Promise<void> {
    const key = `${this.prefix}:workflow:${id}`;
    await this.redis.del(key);
    await this.redis.srem(`${this.prefix}:workflows:list`, id);
    this.logger.debug('Workflow deleted', { workflowId: id });
  }

  /**
   * 检查工作流是否存在
   */
  async workflowExists(id: string): Promise<boolean> {
    const key = `${this.prefix}:workflow:${id}`;
    return await this.redis.exists(key) === 1;
  }

  // ============================================================================
  // Execution Operations
  // ============================================================================

  /**
   * 保存执行状态
   */
  async saveExecution(execution: IExecution): Promise<void> {
    const key = `${this.prefix}:execution:${execution.id}`;
    const workflowKey = `${this.prefix}:workflow:${execution.workflowId}:executions`;
    
    // 序列化 Map 对象
    const serializedExecution = {
      ...execution,
      nodeExecutions: Array.from(execution.nodeExecutions.entries()),
      checkoints: execution.checkoints.map(cp => ({
        ...cp,
        nodeExecutions: Array.from(cp.nodeExecutions.entries())
      }))
    };
    
    const data = JSON.stringify(serializedExecution);
    await this.redis.set(key, data);
    await this.redis.sadd(workflowKey, execution.id);
    await this.redis.sadd(`${this.prefix}:executions:list`, execution.id);
    
    this.logger.debug('Execution saved', { executionId: execution.id });
  }

  /**
   * 获取执行状态
   */
  async getExecution(id: string): Promise<IExecution | null> {
    const key = `${this.prefix}:execution:${id}`;
    const data = await this.redis.get(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    
    // 反序列化 Map 对象
    return {
      ...parsed,
      nodeExecutions: new Map(parsed.nodeExecutions),
      checkoints: parsed.checkoints.map((cp: any) => ({
        ...cp,
        nodeExecutions: new Map(cp.nodeExecutions)
      }))
    };
  }

  /**
   * 获取工作流的所有执行
   */
  async getExecutionsByWorkflow(workflowId: string): Promise<IExecution[]> {
    const workflowKey = `${this.prefix}:workflow:${workflowId}:executions`;
    const ids = await this.redis.smembers(workflowKey);
    const executions: IExecution[] = [];
    
    for (const id of ids) {
      const execution = await this.getExecution(id);
      if (execution) executions.push(execution);
    }
    
    return executions;
  }

  /**
   * 获取所有执行
   */
  async getAllExecutions(): Promise<IExecution[]> {
    const ids = await this.redis.smembers(`${this.prefix}:executions:list`);
    const executions: IExecution[] = [];
    
    for (const id of ids) {
      const execution = await this.getExecution(id);
      if (execution) executions.push(execution);
    }
    
    return executions;
  }

  /**
   * 删除执行
   */
  async deleteExecution(id: string): Promise<void> {
    const execution = await this.getExecution(id);
    if (!execution) return;
    
    const key = `${this.prefix}:execution:${id}`;
    const workflowKey = `${this.prefix}:workflow:${execution.workflowId}:executions`;
    
    await this.redis.del(key);
    await this.redis.srem(workflowKey, id);
    await this.redis.srem(`${this.prefix}:executions:list`, id);
    
    this.logger.debug('Execution deleted', { executionId: id });
  }

  // ============================================================================
  // Checkpoint Operations
  // ============================================================================

  /**
   * 保存检查点
   */
  async saveCheckpoint(checkpoint: ICheckpoint): Promise<void> {
    const key = `${this.prefix}:checkpoint:${checkpoint.id}`;
    const executionKey = `${this.prefix}:execution:${checkpoint.executionId}:checkpoints`;
    
    const serializedCheckpoint = {
      ...checkpoint,
      nodeExecutions: Array.from(checkpoint.nodeExecutions.entries())
    };
    
    const data = JSON.stringify(serializedCheckpoint);
    await this.redis.set(key, data);
    await this.redis.sadd(executionKey, checkpoint.id);
    await this.redis.zadd(
      `${this.prefix}:checkpoints:timeline`,
      checkpoint.timestamp.getTime(),
      checkpoint.id
    );
    
    this.logger.debug('Checkpoint saved', { checkpointId: checkpoint.id });
  }

  /**
   * 清理旧的检查点（保持最多 maxCheckpoints 个）
   */
  async cleanupOldCheckpoints(executionId: string, maxCheckpoints: number): Promise<number> {
    const executionKey = `${this.prefix}:execution:${executionId}:checkpoints`;
    const ids = await this.redis.smembers(executionKey);
    
    if (ids.length <= maxCheckpoints) {
      return 0;
    }

    // 获取所有检查点并按时间排序
    const checkpoints: { id: string; timestamp: number }[] = [];
    for (const id of ids) {
      const checkpoint = await this.getCheckpoint(id);
      if (checkpoint) {
        checkpoints.push({
          id,
          timestamp: checkpoint.timestamp.getTime()
        });
      }
    }

    // 按时间排序（最新的在前）
    checkpoints.sort((a, b) => b.timestamp - a.timestamp);

    // 移除超出限制的旧检查点
    const toRemove = checkpoints.slice(maxCheckpoints);
    let removedCount = 0;

    for (const cp of toRemove) {
      const key = `${this.prefix}:checkpoint:${cp.id}`;
      await this.redis.del(key);
      await this.redis.srem(executionKey, cp.id);
      await this.redis.zrem(`${this.prefix}:checkpoints:timeline`, cp.id);
      removedCount++;
    }

    if (removedCount > 0) {
      this.logger.debug('Cleaned up old checkpoints', {
        executionId,
        removedCount,
        remainingCount: checkpoints.length - removedCount
      });
    }

    return removedCount;
  }

  /**
   * 获取检查点
   */
  async getCheckpoint(id: string): Promise<ICheckpoint | null> {
    const key = `${this.prefix}:checkpoint:${id}`;
    const data = await this.redis.get(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      nodeExecutions: new Map(parsed.nodeExecutions)
    };
  }

  /**
   * 获取执行的最新检查点
   */
  async getLatestCheckpoint(executionId: string): Promise<ICheckpoint | null> {
    const executionKey = `${this.prefix}:execution:${executionId}:checkpoints`;
    const ids = await this.redis.smembers(executionKey);
    
    if (ids.length === 0) return null;
    
    const checkpoints: ICheckpoint[] = [];
    for (const id of ids) {
      const checkpoint = await this.getCheckpoint(id);
      if (checkpoint) checkpoints.push(checkpoint);
    }
    
    if (checkpoints.length === 0) return null;
    
    // 返回最新的检查点
    return checkpoints.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    )[0];
  }

  // ============================================================================
  // Schedule Operations
  // ============================================================================

  /**
   * 保存调度
   */
  async saveSchedule(schedule: ISchedule): Promise<void> {
    const key = `${this.prefix}:schedule:${schedule.id}`;
    const data = JSON.stringify(schedule);
    await this.redis.set(key, data);
    await this.redis.sadd(`${this.prefix}:schedules:list`, schedule.id);
    this.logger.debug('Schedule saved', { scheduleId: schedule.id });
  }

  /**
   * 获取调度
   */
  async getSchedule(id: string): Promise<ISchedule | null> {
    const key = `${this.prefix}:schedule:${id}`;
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  /**
   * 获取所有调度
   */
  async getAllSchedules(): Promise<ISchedule[]> {
    const ids = await this.redis.smembers(`${this.prefix}:schedules:list`);
    const schedules: ISchedule[] = [];
    
    for (const id of ids) {
      const schedule = await this.getSchedule(id);
      if (schedule) schedules.push(schedule);
    }
    
    return schedules;
  }

  /**
   * 删除调度
   */
  async deleteSchedule(id: string): Promise<void> {
    const key = `${this.prefix}:schedule:${id}`;
    await this.redis.del(key);
    await this.redis.srem(`${this.prefix}:schedules:list`, id);
    this.logger.debug('Schedule deleted', { scheduleId: id });
  }

  // ============================================================================
  // Cache Operations
  // ============================================================================

  /**
   * 设置缓存
   */
  async setCache(key: string, value: any, ttl?: number): Promise<void> {
    const cacheKey = `${this.prefix}:cache:${key}`;
    const data = JSON.stringify(value);
    
    if (ttl) {
      await this.redis.setex(cacheKey, ttl, data);
    } else {
      await this.redis.set(cacheKey, data);
    }
  }

  /**
   * 获取缓存
   */
  async getCache<T>(key: string): Promise<T | null> {
    const cacheKey = `${this.prefix}:cache:${key}`;
    const data = await this.redis.get(cacheKey);
    if (!data) return null;
    return JSON.parse(data);
  }

  /**
   * 删除缓存
   */
  async deleteCache(key: string): Promise<void> {
    const cacheKey = `${this.prefix}:cache:${key}`;
    await this.redis.del(cacheKey);
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', { error });
      return false;
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.redis.quit();
    this.logger.info('Redis connection closed');
  }

  /**
   * 获取 Redis 客户端（用于高级操作）
   */
  getClient(): Redis {
    return this.redis;
  }
}
