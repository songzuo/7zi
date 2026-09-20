/**
 * 循环节点执行器
 * 支持 while、do-while、for 循环
 */

import { NodeExecutor, ExecutionContext, ExecutionResult, addLog } from '../types'
import { NodeType, NodeStatus, WorkflowNode } from '@/types/workflow'

export type LoopType = 'while' | 'doWhile' | 'for' | 'foreach'

export interface LoopConfig {
  loopType: LoopType
  // while/doWhile 条件
  condition?: string
  // for 循环配置
  forConfig?: {
    start: number
    end: number
    step?: number
    variableName?: string // 循环变量名
  }
  // forEach 配置
  forEachConfig?: {
    array: string // 数组变量名或表达式
    variableName: string // 元素变量名
    indexVariableName?: string // 索引变量名
  }
  // 通用配置
  maxIterations?: number // 最大迭代次数
  timeout?: number // 超时时间（秒）
  continueOnError?: boolean // 遇到错误是否继续
  collectResults?: boolean // 是否收集所有迭代结果
}

export interface LoopIterationResult {
  iteration: number
  status: NodeStatus
  output?: Record<string, unknown>
  error?: {
    code: string
    message: string
  }
  duration?: number
}

export interface LoopExecutionResult {
  totalIterations: number
  successfulIterations: number
  failedIterations: number
  results: LoopIterationResult[]
  earlyExit?: boolean
  exitReason?: string
}

export class LoopNodeExecutor implements NodeExecutor {
  // 存储循环状态
  private loopStates: Map<string, {
    currentIteration: number
    config: LoopConfig
    results: LoopIterationResult[]
    startTime: Date
  }> = new Map()

  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.LOOP
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!node.id) {
      errors.push('循环节点必须包含 ID')
    }

    if (!node.name) {
      errors.push('循环节点必须包含名称')
    }

    const config = node.loopConfig as LoopConfig | undefined

    if (!config) {
      errors.push('循环节点必须配置 loopConfig')
      return { valid: false, errors }
    }

    // 验证循环类型
    const validLoopTypes: LoopType[] = ['while', 'doWhile', 'for', 'foreach']
    if (!validLoopTypes.includes(config.loopType)) {
      errors.push(`loopType 必须是 ${validLoopTypes.join(', ')} 之一`)
    }

    // 根据类型验证配置
    switch (config.loopType) {
      case 'while':
      case 'doWhile':
        if (!config.condition) {
          errors.push(`${config.loopType} 循环必须配置 condition`)
        } else if (!this.isSafeExpression(config.condition)) {
          errors.push('condition 表达式包含不安全的内容')
        }
        break

      case 'for':
        if (!config.forConfig) {
          errors.push('for 循环必须配置 forConfig')
        } else {
          if (typeof config.forConfig.start !== 'number') {
            errors.push('forConfig.start 必须是数字')
          }
          if (typeof config.forConfig.end !== 'number') {
            errors.push('forConfig.end 必须是数字')
          }
          if (config.forConfig.step !== undefined && config.forConfig.step === 0) {
            errors.push('forConfig.step 不能为 0')
          }
        }
        break

      case 'foreach':
        if (!config.forEachConfig) {
          errors.push('forEach 循环必须配置 forEachConfig')
        } else {
          if (!config.forEachConfig.array) {
            errors.push('forEachConfig.array 必须指定')
          }
          if (!config.forEachConfig.variableName) {
            errors.push('forEachConfig.variableName 必须指定')
          }
        }
        break
    }

    // 验证通用配置
    if (config.maxIterations !== undefined && config.maxIterations < 1) {
      errors.push('maxIterations 必须大于 0')
    }

    if (config.timeout !== undefined && config.timeout < 0) {
      errors.push('timeout 不能为负数')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = new Date()
    const { node, inputs, variables, instanceId } = context
    // @ts-ignore - LoopConfig from types/workflow uses loopType
    const config = node.loopConfig as LoopConfig

    addLog(context, 'info', `开始执行循环节点: ${node.name} (类型: ${config.loopType})`)

    try {
      // 初始化循环状态
      const stateKey = `${instanceId}_${node.id}`
      this.loopStates.set(stateKey, {
        currentIteration: 0,
        config,
        results: [],
        startTime,
      })

      // 执行循环
      const loopResult = await this.executeLoop(context, config)

      const endTime = new Date()

      addLog(
        context,
        'info',
        `循环完成: ${loopResult.totalIterations} 次迭代, 成功: ${loopResult.successfulIterations}, 失败: ${loopResult.failedIterations}`
      )

      // 清理状态
      this.loopStates.delete(stateKey)

      return {
        status: loopResult.failedIterations > 0 && !config.continueOnError
          ? NodeStatus.FAILED
          : NodeStatus.SUCCESS,
        output: {
          loopType: config.loopType,
          totalIterations: loopResult.totalIterations,
          successfulIterations: loopResult.successfulIterations,
          failedIterations: loopResult.failedIterations,
          earlyExit: loopResult.earlyExit,
          exitReason: loopResult.exitReason,
          results: config.collectResults ? loopResult.results : undefined,
        },
        logs: context.logs,
        metrics: {
          cpuTime: endTime.getTime() - startTime.getTime(),
          memoryUsage: process.memoryUsage?.().heapUsed,
        },
      }
    } catch (error) {
      addLog(
        context,
        'error',
        `循环节点执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      )

      return {
        status: NodeStatus.FAILED,
        error: {
          nodeId: node.id,
          code: 'LOOP_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : '循环节点执行失败',
          stack: error instanceof Error ? error.stack : undefined,
          retryable: true,
        },
        logs: context.logs,
      }
    }
  }

  /**
   * 执行循环
   */
  private async executeLoop(
    context: ExecutionContext,
    config: LoopConfig
  ): Promise<LoopExecutionResult> {
    const { inputs, variables, instanceId } = context
    const maxIterations = config.maxIterations || 1000
    const startTime = Date.now()
    const timeoutMs = (config.timeout || 300) * 1000

    const result: LoopExecutionResult = {
      totalIterations: 0,
      successfulIterations: 0,
      failedIterations: 0,
      results: [],
    }

    switch (config.loopType) {
      case 'while':
        await this.executeWhileLoop(context, config, maxIterations, timeoutMs, startTime, result)
        break

      case 'doWhile':
        await this.executeDoWhileLoop(context, config, maxIterations, timeoutMs, startTime, result)
        break

      case 'for':
        await this.executeForLoop(context, config, maxIterations, timeoutMs, startTime, result)
        break

      case 'foreach':
        await this.executeForEachLoop(context, config, maxIterations, timeoutMs, startTime, result)
        break
    }

    return result
  }

  /**
   * 执行 while 循环
   */
  private async executeWhileLoop(
    context: ExecutionContext,
    config: LoopConfig,
    maxIterations: number,
    timeoutMs: number,
    startTime: number,
    result: LoopExecutionResult
  ): Promise<void> {
    const { inputs, variables, instanceId, node } = context

    while (result.totalIterations < maxIterations) {
      // 检查超时
      if (Date.now() - startTime > timeoutMs) {
        result.earlyExit = true
        result.exitReason = '超时'
        break
      }

      // 检查条件
      if (!this.evaluateCondition(config.condition!, inputs, variables)) {
        break
      }

      // 执行迭代
      const iterationResult = await this.executeIteration(
        context,
        result.totalIterations,
        config,
        { ...variables, __loop_index__: result.totalIterations }
      )

      result.results.push(iterationResult)
      result.totalIterations++

      if (iterationResult.status === NodeStatus.SUCCESS) {
        result.successfulIterations++
      } else {
        result.failedIterations++
        if (!config.continueOnError) {
          result.earlyExit = true
          result.exitReason = '迭代失败'
          break
        }
      }

      // 避免 CPU 占用过高
      await this.yield()
    }

    if (result.totalIterations >= maxIterations) {
      result.earlyExit = true
      result.exitReason = '达到最大迭代次数'
    }
  }

  /**
   * 执行 do-while 循环
   */
  private async executeDoWhileLoop(
    context: ExecutionContext,
    config: LoopConfig,
    maxIterations: number,
    timeoutMs: number,
    startTime: number,
    result: LoopExecutionResult
  ): Promise<void> {
    const { inputs, variables } = context

    do {
      // 检查超时
      if (Date.now() - startTime > timeoutMs) {
        result.earlyExit = true
        result.exitReason = '超时'
        break
      }

      // 检查最大迭代次数
      if (result.totalIterations >= maxIterations) {
        result.earlyExit = true
        result.exitReason = '达到最大迭代次数'
        break
      }

      // 执行迭代
      const iterationResult = await this.executeIteration(
        context,
        result.totalIterations,
        config,
        { ...variables, __loop_index__: result.totalIterations }
      )

      result.results.push(iterationResult)
      result.totalIterations++

      if (iterationResult.status === NodeStatus.SUCCESS) {
        result.successfulIterations++
      } else {
        result.failedIterations++
        if (!config.continueOnError) {
          result.earlyExit = true
          result.exitReason = '迭代失败'
          break
        }
      }

      // 避免 CPU 占用过高
      await this.yield()
    } while (this.evaluateCondition(config.condition!, inputs, variables))
  }

  /**
   * 执行 for 循环
   */
  private async executeForLoop(
    context: ExecutionContext,
    config: LoopConfig,
    maxIterations: number,
    timeoutMs: number,
    startTime: number,
    result: LoopExecutionResult
  ): Promise<void> {
    const { variables } = context
    const forConfig = config.forConfig!
    const step = forConfig.step || 1
    const varName = forConfig.variableName || '__loop_index__'

    let current = forConfig.start

    while ((step > 0 ? current < forConfig.end : current > forConfig.end)) {
      // 检查超时
      if (Date.now() - startTime > timeoutMs) {
        result.earlyExit = true
        result.exitReason = '超时'
        break
      }

      // 检查最大迭代次数
      if (result.totalIterations >= maxIterations) {
        result.earlyExit = true
        result.exitReason = '达到最大迭代次数'
        break
      }

      // 执行迭代
      const iterationVariables = {
        ...variables,
        [varName]: current,
        __loop_index__: result.totalIterations,
        __loop_current__: current,
      }

      const iterationResult = await this.executeIteration(
        context,
        result.totalIterations,
        config,
        iterationVariables
      )

      result.results.push(iterationResult)
      result.totalIterations++

      if (iterationResult.status === NodeStatus.SUCCESS) {
        result.successfulIterations++
      } else {
        result.failedIterations++
        if (!config.continueOnError) {
          result.earlyExit = true
          result.exitReason = '迭代失败'
          break
        }
      }

      current += step
      await this.yield()
    }
  }

  /**
   * 执行 forEach 循环
   */
  private async executeForEachLoop(
    context: ExecutionContext,
    config: LoopConfig,
    maxIterations: number,
    timeoutMs: number,
    startTime: number,
    result: LoopExecutionResult
  ): Promise<void> {
    const { inputs, variables } = context
    const forEachConfig = config.forEachConfig!

    // 获取数组
    const array = this.getArray(forEachConfig.array, inputs, variables)

    if (!Array.isArray(array)) {
      result.earlyExit = true
      result.exitReason = 'forEach 数组无效或不是数组'
      return
    }

    for (let i = 0; i < array.length; i++) {
      // 检查超时
      if (Date.now() - startTime > timeoutMs) {
        result.earlyExit = true
        result.exitReason = '超时'
        break
      }

      // 检查最大迭代次数
      if (result.totalIterations >= maxIterations) {
        result.earlyExit = true
        result.exitReason = '达到最大迭代次数'
        break
      }

      const element = array[i]
      const iterationVariables = {
        ...variables,
        [forEachConfig.variableName]: element,
        [forEachConfig.indexVariableName || '__loop_index__']: i,
        __loop_index__: result.totalIterations,
        __loop_element__: element,
      }

      const iterationResult = await this.executeIteration(
        context,
        result.totalIterations,
        config,
        iterationVariables
      )

      result.results.push(iterationResult)
      result.totalIterations++

      if (iterationResult.status === NodeStatus.SUCCESS) {
        result.successfulIterations++
      } else {
        result.failedIterations++
        if (!config.continueOnError) {
          result.earlyExit = true
          result.exitReason = '迭代失败'
          break
        }
      }

      await this.yield()
    }
  }

  /**
   * 执行单次迭代
   */
  private async executeIteration(
    context: ExecutionContext,
    iteration: number,
    config: LoopConfig,
    loopVariables: Record<string, unknown>
  ): Promise<LoopIterationResult> {
    const iterStartTime = Date.now()

    try {
      // 模拟迭代执行（实际应用中应该执行子节点或子工作流）
      // 这里我们只更新变量并返回成功
      Object.assign(context.variables, loopVariables)

      addLog(context, 'info', `执行迭代 ${iteration}`)

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 10))

      return {
        iteration,
        status: NodeStatus.SUCCESS,
        output: {
          message: `迭代 ${iteration} 完成`,
          variables: { ...loopVariables },
        },
        duration: Date.now() - iterStartTime,
      }
    } catch (error) {
      return {
        iteration,
        status: NodeStatus.FAILED,
        error: {
          code: 'ITERATION_FAILED',
          message: error instanceof Error ? error.message : '迭代执行失败',
        },
        duration: Date.now() - iterStartTime,
      }
    }
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(
    expression: string,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): boolean {
    try {
      const context = {
        inputs,
        variables,
        data: { ...inputs, ...variables },
      }

      const fn = new Function('context', `with(context) { return ${expression}; }`)
      const result = fn(context)
      return Boolean(result)
    } catch (error) {
      throw new Error(`条件表达式执行错误: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 获取数组
   */
  private getArray(
    arrayExpression: string,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): unknown[] {
    try {
      const context = {
        inputs,
        variables,
        data: { ...inputs, ...variables },
      }

      const fn = new Function('context', `with(context) { return ${arrayExpression}; }`)
      const result = fn(context)

      return Array.isArray(result) ? result : []
    } catch {
      return []
    }
  }

  /**
   * 检查表达式是否安全
   */
  private isSafeExpression(expression: string): boolean {
    const dangerousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /require\s*\(/i,
      /import\s+/i,
      /process\./i,
      /global\./i,
      /window\./i,
      /document\./i,
      /fetch\s*\(/i,
    ]

    return !dangerousPatterns.some(pattern => pattern.test(expression))
  }

  /**
   * 让出 CPU
   */
  private async yield(): Promise<void> {
    await new Promise(resolve => setImmediate(resolve))
  }

  /**
   * 获取循环状态
   */
  getLoopState(instanceId: string, nodeId: string): {
    currentIteration: number
    config: LoopConfig
    results: LoopIterationResult[]
    startTime: Date
  } | undefined {
    return this.loopStates.get(`${instanceId}_${nodeId}`)
  }

  /**
   * 清理循环状态
   */
  clearLoopState(instanceId?: string): void {
    if (instanceId) {
      const keys = Array.from(this.loopStates.keys()).filter(key =>
        key.startsWith(`${instanceId}_`)
      )
      keys.forEach(key => this.loopStates.delete(key))
    } else {
      this.loopStates.clear()
    }
  }
}

// 导出单例实例
export const loopNodeExecutor = new LoopNodeExecutor()