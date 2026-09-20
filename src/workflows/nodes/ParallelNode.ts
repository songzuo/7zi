/**
 * 并行执行节点执行器
 * 支持分支并行、失败策略、结果聚合
 */

import { NodeExecutor, ExecutionContext, ExecutionResult, addLog } from '../../lib/workflow/types'
import { NodeType, NodeStatus, WorkflowNode } from '@/types/workflow'

/**
 * 失败策略
 */
export enum FailureStrategy {
  CONTINUE_ON_ERROR = 'continue_on_error', // 一个失败不影响其他分支
  FAIL_FAST = 'fail_fast', // 一旦有一个失败立即停止所有分支
  WAIT_ALL = 'wait_all', // 等待所有分支完成后再判断失败
}

/**
 * 聚合策略
 */
export enum AggregationStrategy {
  FIRST = 'first', // 取第一个完成的结果
  LAST = 'last', // 取最后一个完成的结果
  ALL = 'all', // 聚合所有结果
  ANY = 'any', // 任一成功即返回
}

/**
 * 并行分支定义
 */
export interface ParallelBranch {
  id: string // 分支ID
  name: string // 分支名称
  targetNodeId?: string // 目标节点ID
  weight?: number // 权重（用于结果聚合）
  condition?: string // 执行条件
  timeout?: number // 超时时间（秒）
}

/**
 * 并行执行节点配置
 */
export interface ParallelConfig {
  branches: ParallelBranch[] // 并行分支列表
  failureStrategy: FailureStrategy // 失败策略
  aggregationStrategy: AggregationStrategy // 聚合策略
  maxConcurrency?: number // 最大并发数
  timeout?: number // 整体超时时间（秒）
  continueOnPartialFailure?: boolean // 部分失败是否继续
}

/**
 * 分支执行结果
 */
export interface BranchExecutionResult {
  branchId: string
  branchName: string
  status: NodeStatus
  output?: Record<string, unknown>
  error?: {
    code: string
    message: string
  }
  duration?: number
  startedAt: string
  completedAt?: string
}

/**
 * 并行执行结果
 */
export interface ParallelExecutionResult {
  totalBranches: number
  completedBranches: number
  failedBranches: number
  successRate: number
  branches: BranchExecutionResult[]
  aggregatedOutput?: Record<string, unknown>
  failureStrategy: FailureStrategy
  aggregationStrategy: AggregationStrategy
}

export class ParallelNodeExecutor implements NodeExecutor {
  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.PARALLEL
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!node.id) {
      errors.push('并行节点必须包含 ID')
    }

    if (!node.name) {
      errors.push('并行节点必须包含名称')
    }

    // 支持新旧配置格式
    const hasAdvancedConfig = node.config?.parallel as ParallelConfig | undefined

    if (hasAdvancedConfig && !hasAdvancedConfig.branches) {
      errors.push('高级并行节点必须配置 branches')
    }

    if (hasAdvancedConfig && hasAdvancedConfig.branches) {
      const branchIds = new Set<string>()
      hasAdvancedConfig.branches.forEach((branch, index) => {
        if (!branch.id) {
          errors.push(`分支 ${index + 1} 缺少 ID`)
        } else if (branchIds.has(branch.id)) {
          errors.push(`分支 ID 重复: ${branch.id}`)
        } else {
          branchIds.add(branch.id)
        }

        if (!branch.name) {
          errors.push(`分支 ${index + 1} 缺少名称`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = new Date()
    const { node, inputs, variables } = context

    addLog(context, 'info', `开始执行并行节点: ${node.name}`)

    try {
      // 获取配置
      const config = this.getConfig(node)

      addLog(
        context,
        'info',
        `并行执行 ${config.branches.length} 个分支, 策略: ${config.failureStrategy}`
      )

      // 执行并行分支
      const result = await this.executeBranches(config, inputs, variables, context)

      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      // 根据结果状态决定节点状态
      const hasFailures = result.failedBranches > 0
      const allFailed = result.failedBranches === result.totalBranches

      const status = allFailed
        ? NodeStatus.FAILED
        : hasFailures && !config.continueOnPartialFailure
          ? NodeStatus.FAILED
          : NodeStatus.SUCCESS

      return {
        status,
        output: {
          totalBranches: result.totalBranches,
          completedBranches: result.completedBranches,
          failedBranches: result.failedBranches,
          successRate: result.successRate,
          branches: result.branches,
          aggregatedOutput: result.aggregatedOutput,
          duration,
        },
        logs: context.logs,
        metrics: {
          cpuTime: duration,
          memoryUsage: process.memoryUsage?.().heapUsed,
          networkCalls: result.branches.length,
        },
      }
    } catch (error) {
      addLog(
        context,
        'error',
        `并行节点执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      )

      return {
        status: NodeStatus.FAILED,
        error: {
          nodeId: node.id,
          code: 'PARALLEL_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : '并行节点执行失败',
          stack: error instanceof Error ? error.stack : undefined,
          retryable: true,
        },
        logs: context.logs,
      }
    }
  }

  /**
   * 获取配置
   */
  private getConfig(node: WorkflowNode): ParallelConfig {
    const advancedConfig = node.config?.parallel as ParallelConfig | undefined

    if (advancedConfig) {
      return {
        branches: advancedConfig.branches,
        failureStrategy: advancedConfig.failureStrategy || FailureStrategy.CONTINUE_ON_ERROR,
        aggregationStrategy: advancedConfig.aggregationStrategy || AggregationStrategy.ALL,
        maxConcurrency: advancedConfig.maxConcurrency,
        timeout: advancedConfig.timeout,
        continueOnPartialFailure: advancedConfig.continueOnPartialFailure ?? true,
      }
    }

    // 默认配置
    return {
      branches: [
        { id: 'branch_1', name: '分支 1' },
        { id: 'branch_2', name: '分支 2' },
      ],
      failureStrategy: FailureStrategy.CONTINUE_ON_ERROR,
      aggregationStrategy: AggregationStrategy.ALL,
      continueOnPartialFailure: true,
    }
  }

  /**
   * 执行所有并行分支
   */
  private async executeBranches(
    config: ParallelConfig,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ParallelExecutionResult> {
    const results: BranchExecutionResult[] = []
    const maxConcurrency = config.maxConcurrency || config.branches.length

    // 如果需要限制并发数，分批执行
    if (maxConcurrency < config.branches.length) {
      return this.executeBatches(config, inputs, variables, context)
    }

    // 创建所有分支的执行任务
    const branchPromises = config.branches.map(branch =>
      this.executeSingleBranch(branch, config, inputs, variables, context)
    )

    // 根据失败策略执行
    if (config.failureStrategy === FailureStrategy.FAIL_FAST) {
      // 快速失败模式
      return this.executeWithFailFast(branchPromises, config, results, context)
    }

    // 等待所有分支完成
    const settledResults = await Promise.allSettled(branchPromises)

    settledResults.forEach((settled, index) => {
      const branch = config.branches[index]
      const startedAt = new Date().toISOString()

      if (settled.status === 'fulfilled') {
        results.push(settled.value)
      } else {
        results.push({
          branchId: branch.id,
          branchName: branch.name,
          status: NodeStatus.FAILED,
          error: {
            code: 'BRANCH_EXECUTION_FAILED',
            message: settled.reason?.message || '分支执行失败',
          },
          startedAt,
        })
      }
    })

    // 计算统计
    const completedBranches = results.filter(r => r.status === NodeStatus.SUCCESS).length
    const failedBranches = results.filter(r => r.status === NodeStatus.FAILED).length
    const totalBranches = results.length

    // 聚合输出
    const aggregatedOutput = this.aggregateResults(results, config.aggregationStrategy)

    return {
      totalBranches,
      completedBranches,
      failedBranches,
      successRate: totalBranches > 0 ? (completedBranches / totalBranches) * 100 : 0,
      branches: results,
      aggregatedOutput,
      failureStrategy: config.failureStrategy,
      aggregationStrategy: config.aggregationStrategy,
    }
  }

  /**
   * 批量执行（限制并发数）
   */
  private async executeBatches(
    config: ParallelConfig,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ParallelExecutionResult> {
    const results: BranchExecutionResult[] = []
    const maxConcurrency = config.maxConcurrency || config.branches.length
    const batches: ParallelBranch[][] = []

    // 分批
    for (let i = 0; i < config.branches.length; i += maxConcurrency) {
      batches.push(config.branches.slice(i, i + maxConcurrency))
    }

    addLog(context, 'info', `分为 ${batches.length} 批执行，每批最多 ${maxConcurrency} 个分支`)

    // 依次执行每批
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      addLog(context, 'info', `执行第 ${batchIndex + 1}/${batches.length} 批`)

      const batchPromises = batch.map(branch =>
        this.executeSingleBranch(branch, config, inputs, variables, context)
      )

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    // 计算统计
    const completedBranches = results.filter(r => r.status === NodeStatus.SUCCESS).length
    const failedBranches = results.filter(r => r.status === NodeStatus.FAILED).length
    const totalBranches = results.length
    const aggregatedOutput = this.aggregateResults(results, config.aggregationStrategy)

    return {
      totalBranches,
      completedBranches,
      failedBranches,
      successRate: totalBranches > 0 ? (completedBranches / totalBranches) * 100 : 0,
      branches: results,
      aggregatedOutput,
      failureStrategy: config.failureStrategy,
      aggregationStrategy: config.aggregationStrategy,
    }
  }

  /**
   * 执行单个分支
   */
  private async executeSingleBranch(
    branch: ParallelBranch,
    config: ParallelConfig,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<BranchExecutionResult> {
    const startedAt = new Date().toISOString()
    const branchContext = { ...inputs, ...variables }

    addLog(context, 'info', `分支 ${branch.name} 开始执行`)

    try {
      // 检查分支条件
      if (branch.condition && !this.evaluateCondition(branch.condition, branchContext)) {
        addLog(context, 'info', `分支 ${branch.name} 条件不满足，跳过`)
        return {
          branchId: branch.id,
          branchName: branch.name,
          status: NodeStatus.SKIPPED,
          startedAt,
          completedAt: new Date().toISOString(),
        }
      }

      // 模拟分支执行（实际需要调用对应的节点执行器）
      await this.simulateBranchExecution(branch, branchContext, context)

      const completedAt = new Date().toISOString()
      const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime()

      addLog(context, 'info', `分支 ${branch.name} 执行完成`)

      return {
        branchId: branch.id,
        branchName: branch.name,
        status: NodeStatus.SUCCESS,
        output: {
          result: `分支 ${branch.name} 执行完成`,
          data: branchContext,
        },
        duration,
        startedAt,
        completedAt,
      }
    } catch (error) {
      const completedAt = new Date().toISOString()

      addLog(
        context,
        'error',
        `分支 ${branch.name} 执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      )

      return {
        branchId: branch.id,
        branchName: branch.name,
        status: NodeStatus.FAILED,
        error: {
          code: 'BRANCH_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : '分支执行失败',
        },
        duration: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
        startedAt,
        completedAt,
      }
    }
  }

  /**
   * 快速失败执行
   */
  private async executeWithFailFast(
    branchPromises: Promise<BranchExecutionResult>[],
    config: ParallelConfig,
    results: BranchExecutionResult[],
    context: ExecutionContext
  ): Promise<ParallelExecutionResult> {
    // 使用 Promise.race 来检测第一个失败
    const racePromises = branchPromises.map(p =>
      p.then(result => {
        if (result.status === NodeStatus.FAILED) {
          throw new Error(`分支 ${result.branchName} 执行失败`)
        }
        return result
      })
    )

    try {
      const settledResults = await Promise.all(racePromises)
      results.push(...settledResults)
    } catch (error) {
      // 有分支失败，停止执行
      addLog(context, 'error', `检测到失败，停止执行所有分支`)

      // 收集已完成的结果
      const completedResults = await Promise.allSettled(branchPromises)
      completedResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        }
      })
    }

    const completedBranches = results.filter(r => r.status === NodeStatus.SUCCESS).length
    const failedBranches = results.filter(r => r.status === NodeStatus.FAILED).length
    const totalBranches = results.length
    const aggregatedOutput = this.aggregateResults(results, config.aggregationStrategy)

    return {
      totalBranches,
      completedBranches,
      failedBranches,
      successRate: totalBranches > 0 ? (completedBranches / totalBranches) * 100 : 0,
      branches: results,
      aggregatedOutput,
      failureStrategy: config.failureStrategy,
      aggregationStrategy: config.aggregationStrategy,
    }
  }

  /**
   * 聚合结果
   */
  private aggregateResults(
    results: BranchExecutionResult[],
    strategy: AggregationStrategy
  ): Record<string, unknown> {
    const successfulResults = results.filter(r => r.status === NodeStatus.SUCCESS)

    switch (strategy) {
      case AggregationStrategy.FIRST:
        return successfulResults[0]?.output || {}

      case AggregationStrategy.LAST:
        return successfulResults[successfulResults.length - 1]?.output || {}

      case AggregationStrategy.ANY:
        return successfulResults.length > 0 ? successfulResults[0].output || {} : {}

      case AggregationStrategy.ALL:
      default:
        return {
          branchResults: successfulResults.map(r => ({
            branchId: r.branchId,
            branchName: r.branchName,
            output: r.output,
          })),
          aggregated: true,
          count: successfulResults.length,
        }
    }
  }

  /**
   * 模拟分支执行
   */
  private async simulateBranchExecution(
    branch: ParallelBranch,
    context: Record<string, unknown>,
    _parentContext: ExecutionContext
  ): Promise<void> {
    // 模拟执行延迟
    const delay = branch.timeout ? Math.min(branch.timeout * 100, 500) : Math.random() * 200
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * 评估条件
   */
  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    try {
      const fn = new Function('context', `with(context) { return ${condition}; }`)
      return Boolean(fn(context))
    } catch {
      return false
    }
  }
}