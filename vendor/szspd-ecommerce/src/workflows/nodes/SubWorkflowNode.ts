/**
 * 子工作流调用节点执行器
 * 支持嵌套工作流、参数传递、结果返回
 */

import { NodeExecutor, ExecutionContext, ExecutionResult, addLog } from '../../lib/workflow/types'
import { NodeType, NodeStatus, WorkflowNode } from '@/types/workflow'

/**
 * 子工作流调用配置
 */
export interface SubWorkflowConfig {
  workflowId: string // 子工作流ID
  workflowVersion?: number // 子工作流版本（可选，默认最新）
  inputMapping?: Record<string, string> // 输入参数映射 {子工作流参数: 当前工作流变量}
  outputMapping?: Record<string, string> // 输出参数映射 {当前工作流变量: 子工作流输出}
  timeout?: number // 超时时间（秒）
  async?: boolean // 是否异步执行
  waitForCompletion?: boolean // 是否等待完成
  onError?: 'fail' | 'continue' | 'retry' // 错误处理策略
  retryCount?: number // 重试次数
  retryDelay?: number // 重试延迟（秒）
}

/**
 * 子工作流执行结果
 */
export interface SubWorkflowExecutionResult {
  workflowId: string
  workflowVersion: number
  instanceId: string
  status: NodeStatus
  inputs: Record<string, unknown>
  outputs?: Record<string, unknown>
  error?: {
    code: string
    message: string
  }
  duration?: number
  startedAt: string
  completedAt?: string
  retryCount?: number
}

export class SubWorkflowNodeExecutor implements NodeExecutor {
  canHandle(nodeType: string): boolean {
    return nodeType === 'subworkflow'
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!node.id) {
      errors.push('子工作流节点必须包含 ID')
    }

    if (!node.name) {
      errors.push('子工作流节点必须包含名称')
    }

    if (!node.subWorkflowConfig) {
      errors.push('子工作流节点必须配置 subWorkflowConfig')
    } else {
      // @ts-ignore - SubWorkflowConfig type mismatch with types/workflow.ts
      const config = node.subWorkflowConfig as SubWorkflowConfig

      if (!config.workflowId) {
        errors.push('子工作流节点必须指定 workflowId')
      }

      if (config.timeout && config.timeout <= 0) {
        errors.push('超时时间必须为正数')
      }

      if (config.retryCount && config.retryCount < 0) {
        errors.push('重试次数不能为负数')
      }

      if (config.retryDelay && config.retryDelay < 0) {
        errors.push('重试延迟不能为负数')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = new Date()
    const { node, inputs, variables } = context
    // @ts-ignore - SubWorkflowConfig type mismatch with types/workflow.ts
    const config = node.subWorkflowConfig as SubWorkflowConfig

    addLog(context, 'info', `开始执行子工作流节点: ${node.name}`)
    addLog(context, 'info', `调用子工作流: ${config.workflowId}`)

    try {
      // 准备输入参数
      const mappedInputs = this.mapInputs(config, inputs, variables)

      addLog(context, 'info', `输入参数映射完成: ${JSON.stringify(Object.keys(mappedInputs))}`)

      // 执行子工作流（带重试）
      const result = await this.executeWithRetry(config, mappedInputs, context)

      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      // 映射输出参数
      const mappedOutputs = this.mapOutputs(config, result.outputs || {})

      addLog(context, 'info', `子工作流执行完成: ${result.status}, 耗时: ${duration}ms`)

      return {
        status: result.status,
        output: {
          workflowId: result.workflowId,
          workflowVersion: result.workflowVersion,
          instanceId: result.instanceId,
          inputs: mappedInputs,
          outputs: mappedOutputs,
          duration: result.duration,
          retryCount: result.retryCount,
        },
        logs: context.logs,
        metrics: {
          cpuTime: duration,
          memoryUsage: process.memoryUsage?.().heapUsed,
        },
      }
    } catch (error) {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      addLog(
        context,
        'error',
        `子工作流执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      )

      // 根据错误处理策略决定是否失败
      // @ts-ignore - SubWorkflowConfig type mismatch with types/workflow.ts
      const config = node.subWorkflowConfig as SubWorkflowConfig
      const shouldFail = config.onError !== 'continue'

      return {
        status: shouldFail ? NodeStatus.FAILED : NodeStatus.SUCCESS,
        error: shouldFail
          ? {
              nodeId: node.id,
              code: 'SUBWORKFLOW_EXECUTION_FAILED',
              message: error instanceof Error ? error.message : '子工作流执行失败',
              stack: error instanceof Error ? error.stack : undefined,
              retryable: config.onError === 'retry',
            }
          : undefined,
        output: shouldFail
          ? undefined
          : {
              workflowId: config.workflowId,
              error: error instanceof Error ? error.message : '未知错误',
              continued: true,
            },
        logs: context.logs,
        metrics: {
          cpuTime: duration,
          memoryUsage: process.memoryUsage?.().heapUsed,
        },
      }
    }
  }

  /**
   * 映射输入参数
   */
  private mapInputs(
    config: SubWorkflowConfig,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): Record<string, unknown> {
    const mapped: Record<string, unknown> = {}

    if (config.inputMapping) {
      // 使用映射规则
      for (const [targetParam, sourceVar] of Object.entries(config.inputMapping)) {
        const value = this.resolveVariable(sourceVar, inputs, variables)
        mapped[targetParam] = value
      }
    } else {
      // 直接传递所有输入和变量
      Object.assign(mapped, inputs, variables)
    }

    return mapped
  }

  /**
   * 映射输出参数
   */
  private mapOutputs(
    config: SubWorkflowConfig,
    outputs: Record<string, unknown>
  ): Record<string, unknown> {
    const mapped: Record<string, unknown> = {}

    if (config.outputMapping) {
      // 使用映射规则
      for (const [targetVar, sourceParam] of Object.entries(config.outputMapping)) {
        mapped[targetVar] = outputs[sourceParam]
      }
    } else {
      // 直接返回所有输出
      Object.assign(mapped, outputs)
    }

    return mapped
  }

  /**
   * 解析变量
   */
  private resolveVariable(
    varPath: string,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): unknown {
    // 支持嵌套路径，如 "user.name"
    const parts = varPath.split('.')
    let value: unknown = { ...inputs, ...variables }

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }

    return value
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(
    config: SubWorkflowConfig,
    inputs: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<SubWorkflowExecutionResult> {
    const maxRetries = config.retryCount || 0
    const retryDelay = config.retryDelay || 1

    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        addLog(context, 'info', `重试第 ${attempt} 次...`)
        await this.delay(retryDelay * 1000)
      }

      try {
        return await this.executeSubWorkflow(config, inputs, context)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        addLog(context, 'warn', `执行失败: ${lastError.message}`)

        if (attempt < maxRetries) {
          continue
        }

        throw lastError
      }
    }

    throw lastError || new Error('子工作流执行失败')
  }

  /**
   * 执行子工作流
   */
  private async executeSubWorkflow(
    config: SubWorkflowConfig,
    inputs: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<SubWorkflowExecutionResult> {
    const startedAt = new Date().toISOString()

    addLog(context, 'info', `创建子工作流实例: ${config.workflowId}`)

    // 模拟创建实例（实际需要调用 WorkflowEngine）
    const instanceId = `sub_instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    addLog(context, 'info', `子工作流实例 ID: ${instanceId}`)

    // 模拟执行子工作流
    await this.simulateSubWorkflowExecution(config, context)

    const completedAt = new Date().toISOString()
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime()

    // 模拟返回结果
    return {
      workflowId: config.workflowId,
      workflowVersion: config.workflowVersion || 1,
      instanceId,
      status: NodeStatus.SUCCESS,
      inputs,
      outputs: {
        result: '子工作流执行完成',
        data: inputs,
        timestamp: completedAt,
      },
      duration,
      startedAt,
      completedAt,
    }
  }

  /**
   * 模拟子工作流执行
   */
  private async simulateSubWorkflowExecution(
    config: SubWorkflowConfig,
    context: ExecutionContext
  ): Promise<void> {
    // 模拟执行延迟
    const delay = config.timeout ? Math.min(config.timeout * 100, 2000) : 500
    await new Promise(resolve => setTimeout(resolve, delay))

    addLog(context, 'info', `子工作流执行中...`)
  }

  /**
   * 延迟辅助函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}