/**
 * 循环节点执行器
 * 支持固定次数循环、条件循环、集合迭代
 */

import { NodeExecutor, ExecutionContext, ExecutionResult, addLog } from '../../lib/workflow/types'
import { NodeType, NodeStatus, WorkflowNode } from '@/types/workflow'

/**
 * 循环类型
 */
export enum LoopType {
  FIXED = 'fixed', // 固定次数循环
  WHILE = 'while', // 条件循环
  FOR_EACH = 'forEach', // 集合迭代
  DO_WHILE = 'doWhile', // 先执行后判断
}

/**
 * 循环节点配置
 */
export interface LoopConfig {
  type: LoopType // 循环类型
  
  // 固定次数循环
  iterations?: number // 循环次数
  
  // 条件循环
  condition?: string // 循环条件表达式
  maxIterations?: number // 最大循环次数（防止无限循环）
  
  // 集合迭代
  collection?: string // 集合变量名
  itemVariable?: string // 迭代变量名
  indexVariable?: string // 索引变量名
  
  // 循环控制
  breakCondition?: string // 跳出条件
  continueCondition?: string // 继续条件
}

/**
 * 循环执行结果
 */
export interface LoopExecutionResult {
  loopType: LoopType
  iterations: number // 实际循环次数
  conditionMet: boolean // 条件是否满足
  lastConditionValue?: boolean // 最后一次条件判断的值
  items?: unknown[] // 迭代的集合
  currentItem?: unknown // 当前迭代项
  currentIndex?: number // 当前索引
  brokeOut: boolean // 是否通过 break 跳出
  brokeAt?: number // 跳出时的索引
}

export class LoopNodeExecutor implements NodeExecutor {
  private readonly DEFAULT_MAX_ITERATIONS = 1000

  canHandle(nodeType: string): boolean {
    return nodeType === 'loop'
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!node.id) {
      errors.push('循环节点必须包含 ID')
    }

    if (!node.name) {
      errors.push('循环节点必须包含名称')
    }

    if (!node.loopConfig) {
      errors.push('循环节点必须配置 loopConfig')
    } else {
      const config = node.loopConfig as LoopConfig

      if (!config.type) {
        errors.push('循环节点必须指定循环类型')
      }

      switch (config.type) {
        case LoopType.FIXED:
          if (config.iterations === undefined || config.iterations <= 0) {
            errors.push('固定次数循环必须指定正整数的循环次数')
          }
          break

        case LoopType.WHILE:
        case LoopType.DO_WHILE:
          if (!config.condition) {
            errors.push('条件循环必须指定循环条件')
          }
          if (config.maxIterations && config.maxIterations <= 0) {
            errors.push('最大循环次数必须为正整数')
          }
          break

        case LoopType.FOR_EACH:
          if (!config.collection) {
            errors.push('迭代循环必须指定集合变量名')
          }
          if (!config.itemVariable) {
            errors.push('迭代循环必须指定迭代变量名')
          }
          break
      }

      // 检查条件表达式安全性
      if (config.condition && !this.isSafeExpression(config.condition)) {
        errors.push('循环条件表达式包含不安全的内容')
      }

      if (config.breakCondition && !this.isSafeExpression(config.breakCondition)) {
        errors.push('跳出条件表达式包含不安全的内容')
      }

      if (config.continueCondition && !this.isSafeExpression(config.continueCondition)) {
        errors.push('继续条件表达式包含不安全的内容')
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
    const config = node.loopConfig as LoopConfig

    addLog(context, 'info', `开始执行循环节点: ${node.name} (类型: ${config.type})`)

    try {
      let result: LoopExecutionResult

      switch (config.type) {
        case LoopType.FIXED:
          result = await this.executeFixedLoop(node, config, inputs, variables, context)
          break

        case LoopType.WHILE:
          result = await this.executeWhileLoop(node, config, inputs, variables, context)
          break

        case LoopType.DO_WHILE:
          result = await this.executeDoWhileLoop(node, config, inputs, variables, context)
          break

        case LoopType.FOR_EACH:
          result = await this.executeForEachLoop(node, config, inputs, variables, context)
          break

        default:
          throw new Error(`不支持的循环类型: ${config.type}`)
      }

      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      addLog(
        context,
        'info',
        `循环执行完成: 共 ${result.iterations} 次迭代, 跳出: ${result.brokeOut}`
      )

      return {
        status: NodeStatus.SUCCESS,
        output: {
          loopType: result.loopType,
          iterations: result.iterations,
          conditionMet: result.conditionMet,
          lastConditionValue: result.lastConditionValue,
          items: result.items,
          currentItem: result.currentItem,
          currentIndex: result.currentIndex,
          brokeOut: result.brokeOut,
          brokeAt: result.brokeAt,
        },
        logs: context.logs,
        metrics: {
          cpuTime: duration,
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
          retryable: false,
        },
        logs: context.logs,
      }
    }
  }

  /**
   * 固定次数循环
   */
  private async executeFixedLoop(
    node: WorkflowNode,
    config: LoopConfig,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<LoopExecutionResult> {
    const iterations = config.iterations || 1
    const maxIterations = Math.min(iterations, this.DEFAULT_MAX_ITERATIONS)

    addLog(context, 'info', `执行固定次数循环: ${iterations} 次`)

    for (let i = 0; i < maxIterations; i++) {
      // 检查是否需要跳出
      if (config.breakCondition) {
        const shouldBreak = this.evaluateExpression(config.breakCondition, {
          ...inputs,
          ...variables,
          index: i,
          iteration: i + 1,
        })
        if (shouldBreak) {
          addLog(context, 'info', `第 ${i + 1} 次迭代: 满足跳出条件`)
          return {
            loopType: LoopType.FIXED,
            iterations: i + 1,
            conditionMet: false,
            brokeOut: true,
            brokeAt: i,
          }
        }
      }

      // 记录当前迭代
      if (i % 10 === 0 || i === maxIterations - 1) {
        addLog(context, 'info', `执行第 ${i + 1}/${maxIterations} 次迭代`)
      }

      // 模拟循环体执行（实际需要执行循环内的子节点）
      await this.simulateLoopBody(node, i, context)
    }

    return {
      loopType: LoopType.FIXED,
      iterations: maxIterations,
      conditionMet: true,
      brokeOut: false,
    }
  }

  /**
   * 条件循环 (while)
   */
  private async executeWhileLoop(
    node: WorkflowNode,
    config: LoopConfig,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<LoopExecutionResult> {
    const maxIterations = config.maxIterations || this.DEFAULT_MAX_ITERATIONS

    addLog(context, 'info', `执行条件循环: ${config.condition}, 最大 ${maxIterations} 次`)

    let iterations = 0
    let lastConditionValue = false

    while (iterations < maxIterations) {
      // 评估循环条件
      const runtimeVars = { ...inputs, ...variables, index: iterations, iteration: iterations + 1 }
      const conditionMet = this.evaluateExpression(config.condition!, runtimeVars)
      lastConditionValue = conditionMet

      addLog(context, 'info', `第 ${iterations + 1} 次迭代: 条件 = ${conditionMet}`)

      if (!conditionMet) {
        break
      }

      // 执行循环体
      await this.simulateLoopBody(node, iterations, context)

      // 检查是否需要提前跳出
      if (config.breakCondition) {
        const shouldBreak = this.evaluateExpression(config.breakCondition, runtimeVars)
        if (shouldBreak) {
          addLog(context, 'info', `第 ${iterations + 1} 次迭代: 满足跳出条件`)
          return {
            loopType: LoopType.WHILE,
            iterations: iterations + 1,
            conditionMet: false,
            lastConditionValue: true,
            brokeOut: true,
            brokeAt: iterations,
          }
        }
      }

      iterations++
    }

    return {
      loopType: LoopType.WHILE,
      iterations,
      conditionMet: lastConditionValue,
      lastConditionValue,
      brokeOut: false,
    }
  }

  /**
   * 先执行后判断循环 (do-while)
   */
  private async executeDoWhileLoop(
    node: WorkflowNode,
    config: LoopConfig,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<LoopExecutionResult> {
    const maxIterations = config.maxIterations || this.DEFAULT_MAX_ITERATIONS

    addLog(context, 'info', `执行 do-while 循环: 最大 ${maxIterations} 次`)

    let iterations = 0
    let conditionMet = true // 在循环外部定义，用于 while 条件判断

    do {
      addLog(context, 'info', `第 ${iterations + 1} 次迭代开始`)

      // 先执行循环体
      await this.simulateLoopBody(node, iterations, context)

      // 评估循环条件
      const runtimeVars = { ...inputs, ...variables, index: iterations, iteration: iterations + 1 }
      conditionMet = this.evaluateExpression(config.condition!, runtimeVars)

      addLog(context, 'info', `第 ${iterations + 1} 次迭代: 条件 = ${conditionMet}`)

      // 检查是否需要跳出
      if (config.breakCondition) {
        const shouldBreak = this.evaluateExpression(config.breakCondition, runtimeVars)
        if (shouldBreak) {
          return {
            loopType: LoopType.DO_WHILE,
            iterations: iterations + 1,
            conditionMet: true,
            lastConditionValue: true,
            brokeOut: true,
            brokeAt: iterations,
          }
        }
      }

      iterations++
    } while (conditionMet && iterations < maxIterations)

    return {
      loopType: LoopType.DO_WHILE,
      iterations,
      conditionMet: true,
      lastConditionValue: true,
      brokeOut: false,
    }
  }

  /**
   * 集合迭代循环 (forEach)
   */
  private async executeForEachLoop(
    node: WorkflowNode,
    config: LoopConfig,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<LoopExecutionResult> {
    const allVars = { ...inputs, ...variables }
    const collection = allVars[config.collection!] as unknown[]

    if (!Array.isArray(collection)) {
      throw new Error(`集合变量 ${config.collection} 不是数组类型`)
    }

    const maxIterations = Math.min(collection.length, config.maxIterations || this.DEFAULT_MAX_ITERATIONS)

    addLog(context, 'info', `执行集合迭代: ${collection.length} 项, 变量: ${config.itemVariable}`)

    const items: unknown[] = []

    for (let i = 0; i < maxIterations; i++) {
      const currentItem = collection[i]
      const currentIndex = i

      // 设置迭代变量到上下文
      const runtimeVars = {
        ...allVars,
        [config.itemVariable!]: currentItem,
        [config.indexVariable || 'index']: currentIndex,
        [config.indexVariable ? config.indexVariable + '_0_based' : 'iteration']: currentIndex + 1,
      }

      // 检查是否需要跳出
      if (config.breakCondition) {
        const shouldBreak = this.evaluateExpression(config.breakCondition, runtimeVars)
        if (shouldBreak) {
          addLog(context, 'info', `第 ${i + 1} 项: 满足跳出条件`)
          return {
            loopType: LoopType.FOR_EACH,
            iterations: i,
            conditionMet: false,
            items,
            currentItem,
            currentIndex,
            brokeOut: true,
            brokeAt: i,
          }
        }
      }

      // 检查是否需要跳过当前项
      if (config.continueCondition) {
        const shouldContinue = this.evaluateExpression(config.continueCondition, runtimeVars)
        if (shouldContinue) {
          addLog(context, 'info', `第 ${i + 1} 项: 满足跳过条件，跳过`)
          continue
        }
      }

      addLog(context, 'info', `迭代第 ${i + 1}/${collection.length} 项`)

      // 执行循环体（传入当前迭代上下文）
      await this.simulateLoopBody(node, i, context, runtimeVars)

      items.push(currentItem)
    }

    return {
      loopType: LoopType.FOR_EACH,
      iterations: items.length,
      conditionMet: true,
      items,
      currentIndex: maxIterations - 1,
      brokeOut: false,
    }
  }

  /**
   * 模拟循环体执行
   */
  private async simulateLoopBody(
    node: WorkflowNode,
    index: number,
    context: ExecutionContext,
    runtimeVars?: Record<string, unknown>
  ): Promise<void> {
    // 模拟循环体执行延迟
    // 实际实现需要调用子工作流引擎执行循环内的节点
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  /**
   * 安全执行表达式
   */
  private evaluateExpression(
    expression: string,
    context: Record<string, unknown>
  ): boolean {
    try {
      const fn = new Function('context', `with(context) { return ${expression}; }`)
      return Boolean(fn(context))
    } catch {
      return false
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
}