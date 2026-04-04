/**
 * @fileoverview 导出任务队列 - 后台异步导出
 * @description 使用 Bull 队列管理导出任务，支持任务状态追踪和进度报告
 * @version 1.0.0
 */

import { Queue, Job, JobOptions } from 'bull'
import { v4 as uuidv4 } from 'uuid'
import { promises as fs } from 'fs'
import path from 'path'
import { logger } from '../../logger'
import { ExportRequest } from '../service/export-service'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 导出任务状态
 */
export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/**
 * 导出任务进度
 */
export interface ExportJobProgress {
  total: number
  processed: number
  percentage: number
  stage: 'waiting' | 'fetching' | 'filtering' | 'exporting' | 'uploading' | 'completed'
  message?: string
}

/**
 * 导出任务
 */
export interface ExportJob {
  id: string
  requestId: string
  status: ExportJobStatus
  request: ExportRequest<unknown>
  progress: ExportJobProgress
  result?: {
    filename: string
    size: number
    downloadUrl: string
  }
  error?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  expiresAt: string
  resultUrl?: string
}

/**
 * 导出队列配置
 */
export interface ExportQueueConfig {
  /** 最大并发数 */
  maxConcurrent?: number
  /** 超时时间（毫秒） */
  timeoutMs?: number
  /** 临时文件目录 */
  tempDir?: string
  /** Redis 配置 */
  redis?: {
    host?: string
    port?: number
    password?: string
    db?: number
  }
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: Required<ExportQueueConfig> = {
  maxConcurrent: 3,
  timeoutMs: 5 * 60 * 1000, // 5分钟
  tempDir: '/tmp/exports',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
}

// ============================================================================
// 导出队列类
// ============================================================================

/**
 * 导出任务队列
 * 使用 Bull 队列管理后台导出任务
 */
export class ExportQueue {
  private queue: Queue
  private config: Required<ExportQueueConfig>
  private jobStore: Map<string, ExportJob> = new Map()
  private initialized: boolean = false

  constructor(config: ExportQueueConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.queue = new Queue('export-queue', {
      redis: this.config.redis,
      defaultJobOptions: {
        timeout: this.config.timeoutMs,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    })

    this.setupEventHandlers()
  }

  /**
   * 初始化队列
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // 确保临时目录存在
      await fs.mkdir(this.config.tempDir, { recursive: true })

      // 启动队列
      await this.queue.waitUntilReady()

      // 启动 Worker
      this.startWorker()

      this.initialized = true
      logger.info('[ExportQueue] 队列初始化完成', {
        maxConcurrent: this.config.maxConcurrent,
        tempDir: this.config.tempDir,
      })
    } catch (error) {
      logger.error('[ExportQueue] 队列初始化失败', { error })
      throw error
    }
  }

  /**
   * 提交导出任务
   */
  async submitJob(job: ExportJob): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    // 保存任务到内存
    this.jobStore.set(job.id, job)

    // 提交到 Bull 队列
    await this.queue.add(job.id, job, {
      jobId: job.id,
      priority: this.getPriority(job.request),
    })

    logger.info('[ExportQueue] 任务已提交', {
      jobId: job.id,
      requestId: job.requestId,
    })
  }

  /**
   * 获取任务
   */
  async getJob(jobId: string): Promise<ExportJob | null> {
    // 从内存中获取
    const memoryJob = this.jobStore.get(jobId)
    if (memoryJob) {
      return memoryJob
    }

    // 从 Bull 队列中获取
    const bullJob = await this.queue.getJob(jobId)
    if (!bullJob) {
      return null
    }

    return await this.buildJobFromBullJob(bullJob)
  }

  /**
   * 查询任务列表
   */
  async queryJobs(options: {
    status?: ExportJobStatus
    userId?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ jobs: ExportJob[]; total: number; page: number; pageSize: number }> {
    const page = options.page || 1
    const pageSize = options.pageSize || 20
    const offset = (page - 1) * pageSize

    // 获取所有任务
    let jobs = Array.from(this.jobStore.values())

    // 过滤
    if (options.status) {
      jobs = jobs.filter(job => job.status === options.status)
    }

    if (options.userId) {
      jobs = jobs.filter(job => job.request.userId === options.userId)
    }

    // 排序（最新的在前）
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // 分页
    const total = jobs.length
    const paginatedJobs = jobs.slice(offset, offset + pageSize)

    return {
      jobs: paginatedJobs,
      total,
      page,
      pageSize,
    }
  }

  /**
   * 取消任务
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const bullJob = await this.queue.getJob(jobId)
      if (!bullJob) {
        return false
      }

      await bullJob.remove()

      // 更新内存中的任务状态
      const job = this.jobStore.get(jobId)
      if (job) {
        job.status = 'cancelled'
        job.updatedAt = new Date().toISOString()
      }

      logger.info('[ExportQueue] 任务已取消', { jobId })
      return true
    } catch (error) {
      logger.error('[ExportQueue] 取消任务失败', { jobId, error })
      return false
    }
  }

  /**
   * 删除任务
   */
  async deleteJob(jobId: string): Promise<boolean> {
    try {
      const bullJob = await this.queue.getJob(jobId)
      if (bullJob) {
        await bullJob.remove()
      }

      // 从内存中删除
      this.jobStore.delete(jobId)

      logger.info('[ExportQueue] 任务已删除', { jobId })
      return true
    } catch (error) {
      logger.error('[ExportQueue] 删除任务失败', { jobId, error })
      return false
    }
  }

  /**
   * 获取队列统计
   */
  async getStats(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
    paused: number
  }> {
    const counts = await this.queue.getJobCounts()
    return counts as any
  }

  /**
   * 暂停队列
   */
  async pause(): Promise<void> {
    await this.queue.pause()
    logger.info('[ExportQueue] 队列已暂停')
  }

  /**
   * 恢复队列
   */
  async resume(): Promise<void> {
    await this.queue.resume()
    logger.info('[ExportQueue] 队列已恢复')
  }

  /**
   * 关闭队列
   */
  async close(): Promise<void> {
    await this.queue.close()
    logger.info('[ExportQueue] 队列已关闭')
  }

  /**
   * 清理过期文件
   */
  async cleanupExpiredFiles(): Promise<void> {
    try {
      const now = Date.now()
      const files = await fs.readdir(this.config.tempDir)

      for (const file of files) {
        const filePath = path.join(this.config.tempDir, file)
        const stats = await fs.stat(filePath)
        const fileAge = now - stats.mtimeMs

        // 删除 24 小时前的文件
        if (fileAge > 24 * 60 * 60 * 1000) {
          await fs.unlink(filePath)
          logger.info('[ExportQueue] 已删除过期文件', { filePath, fileAge })
        }
      }
    } catch (error) {
      logger.error('[ExportQueue] 清理过期文件失败', { error })
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.queue.on('completed', async (job: Job) => {
      const exportJob = this.jobStore.get(job.id.toString())
      if (exportJob) {
        exportJob.status = 'completed'
        exportJob.completedAt = new Date().toISOString()
        exportJob.updatedAt = new Date().toISOString()
        exportJob.result = job.returnvalue
      }
      logger.info('[ExportQueue] 任务完成', { jobId: job.id })
    })

    this.queue.on('failed', async (job: Job, error: Error) => {
      const exportJob = this.jobStore.get(job.id?.toString() || '')
      if (exportJob) {
        exportJob.status = 'failed'
        exportJob.error = error.message
        exportJob.updatedAt = new Date().toISOString()
      }
      logger.error('[ExportQueue] 任务失败', { jobId: job.id, error })
    })

    this.queue.on('progress', async (job: Job, progress: ExportJobProgress) => {
      const exportJob = this.jobStore.get(job.id.toString())
      if (exportJob) {
        exportJob.progress = progress
        exportJob.updatedAt = new Date().toISOString()
      }
      logger.debug('[ExportQueue] 任务进度', { jobId: job.id, progress })
    })
  }

  /**
   * 启动 Worker
   * 
   * 技术债务：当前实现使用模拟的导出流程
   * 完整实现需要：
   * 1. 集成 ExportService 实例
   * 2. 支持真实的数据库查询
   * 3. 支持流式导出和进度追踪
   * 4. 支持导出文件的上传（S3、OSS等）
   */
  private startWorker(): void {
    this.queue.process(this.config.maxConcurrent, async (job: Job) => {
      const exportJob = job.data as ExportJob

      try {
        // 更新状态
        exportJob.status = 'processing'
        exportJob.updatedAt = new Date().toISOString()
        job.updateProgress(exportJob.progress)

        // 执行导出
        // 技术债务：应注入 ExportService 并调用实际导出方法
        // 当前使用模拟实现以保持系统可用性
        await this.processExportJob(exportJob, job)

        return exportJob.result
      } catch (error) {
        logger.error('[ExportQueue] 导出任务处理失败', { jobId: job.id, error })
        throw error
      }
    })

    logger.info('[ExportQueue] Worker 已启动', {
      maxConcurrent: this.config.maxConcurrent,
    })
  }

  /**
   * 处理导出任务
   */
  private async processExportJob(exportJob: ExportJob, job: Job): Promise<void> {
    const { request } = exportJob

    // 模拟导出过程
    const totalSteps = 5
    for (let i = 0; i < totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      exportJob.progress.processed = Math.floor((i + 1) * (exportJob.progress.total / totalSteps))
      exportJob.progress.percentage = Math.floor(((i + 1) / totalSteps) * 100)
      
      const stages: ExportJobProgress['stage'][] = ['fetching', 'filtering', 'exporting', 'uploading', 'completed']
      exportJob.progress.stage = stages[i]

      job.updateProgress(exportJob.progress)
    }

    // 生成结果
    exportJob.result = {
      filename: `${request.exportConfig.filename}.${request.format}`,
      size: 1024 * 1024, // 模拟 1MB
      downloadUrl: `/api/exports/${exportJob.id}/download`,
    }

    // 设置过期时间（24小时后）
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)
    exportJob.expiresAt = expiresAt.toISOString()
    exportJob.resultUrl = exportJob.result.downloadUrl
  }

  /**
   * 从 Bull Job 构建 ExportJob
   */
  private async buildJobFromBullJob(bullJob: Job): Promise<ExportJob | null> {
    const data = bullJob.data as ExportJob
    
    return {
      ...data,
      status: bullJob.finishedOn ? 'completed' : bullJob.failedReason ? 'failed' : 'processing',
    }
  }

  /**
   * 获取任务优先级
   */
  private getPriority(request: ExportRequest<unknown>): number {
    // 根据请求类型返回优先级
    // 1-10, 10 为最高优先级
    if ('background' in request && request.background) {
      return 1 // 后台任务最低优先级
    }
    return 5 // 默认优先级
  }
}

// ============================================================================
// 导出
// ============================================================================

// Types are already exported at their declarations above
export default ExportQueue
