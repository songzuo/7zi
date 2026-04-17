/**
 * 高级条件节点执行器
 * 支持复杂条件表达式、多分支、嵌套条件
 */

import { NodeExecutor, ExecutionContext, ExecutionResult, addLog } from '../../lib/workflow/types'
import { NodeType, NodeStatus, WorkflowNode } from '@/types/workflow'

/**
 * 条件分支配置
 */
export interface ConditionBranch {
  expression: string // 条件表达式
  label: string // 分支标签
  targetNodeId?: string // 目标节点ID（可选，用于路由）
}

/**
 * 高级条件节点配置
 */
export interface AdvancedConditionConfig {
  branches: ConditionBranch[] // 条件分支列表
  defaultBranch?: string // 默认分支标签
  operator?: 'AND' | 'OR' // 多条件操作符
  timeout?: number // 超时时间（秒）
}

export class AdvancedConditionNodeExecutor implements NodeExecutor {
  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.CONDITION
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!node.id) {
      errors.push('条件节点必须包含 ID')
    }

    if (!node.name) {
      errors.push('条件节点必须包含名称')
    }

    // 支持新旧两种配置格式
    const hasOldConfig = node.conditionConfig
    const hasNewConfig = node.config?.advancedCondition

    if (!hasOldConfig && !hasNewConfig) {
      errors.push('条件节点必须配置 conditionConfig 或 config.advancedCondition')
    }

    // 验证高级配置
    if (hasNewConfig) {
      const advancedConfig = node.config?.advancedCondition as AdvancedConditionConfig | undefined

      if (!advancedConfig || !advancedConfig.branches || advancedConfig.branches.length === 0) {
        errors.push('高级条件节点必须包含至少一个分支')
      }

      advancedConfig?.branches?.forEach((branch, index) => {
        if (!branch.expression) {
          errors.push(`分支 ${index + 1} 缺少表达式`)
        }
        if (!branch.label) {
          errors.push(`分支 ${index + 1} 缺少标签`)
        }
        if (!this.isSafeExpression(branch.expression)) {
          errors.push(`分支 ${index + 1} 的表达式包含不安全的内容`)
        }
      })
    }

    // 验证旧配置
    if (hasOldConfig) {
      if (!node.conditionConfig!.expression) {
        errors.push('条件节点必须包含表达式')
      }
      if (!this.isSafeExpression(node.conditionConfig!.expression)) {
        errors.push('条件表达式包含不安全的内容')
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

    addLog(context, 'info', `开始执行高级条件节点: ${node.name}`)

    try {
      // 检查是否使用高级配置
      const useAdvanced = node.config?.advancedCondition

      let result: {
        matched: boolean
        branchLabel: string
        expression: string
        branches?: ConditionBranch[]
      }

      if (useAdvanced) {
        result = await this.executeAdvancedCondition(node, inputs, variables, context)
      } else {
        result = await this.executeSimpleCondition(node, inputs, variables, context)
      }

      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      addLog(context, 'info', `条件判断完成: ${result.branchLabel}`)

      return {
        status: NodeStatus.SUCCESS,
        output: {
          matched: result.matched,
          branchLabel: result.branchLabel,
          expression: result.expression,
          branches: result.branches,
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
        `条件表达式执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      )

      return {
        status: NodeStatus.FAILED,
        error: {
          nodeId: node.id,
          code: 'CONDITION_EVALUATION_FAILED',
          message: error instanceof Error ? error.message : '条件表达式执行失败',
          stack: error instanceof Error ? error.stack : undefined,
          retryable: false,
        },
        logs: context.logs,
      }
    }
  }

  /**
   * 执行简单条件（兼容旧版）
   */
  private async executeSimpleCondition(
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<{ matched: boolean; branchLabel: string; expression: string }> {
    const config = node.conditionConfig!
    const conditionResult = this.evaluateExpression(config.expression, inputs, variables)

    const branchLabel = conditionResult ? config.trueLabel || 'true' : config.falseLabel || 'false'

    addLog(context, 'info', `简单条件判断: ${conditionResult} -> ${branchLabel}`)

    return {
      matched: conditionResult,
      branchLabel,
      expression: config.expression,
    }
  }

  /**
   * 执行高级条件（多分支）
   */
  private async executeAdvancedCondition(
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<{
    matched: boolean
    branchLabel: string
    expression: string
    branches: ConditionBranch[]
  }> {
    const advancedConfig = node.config?.advancedCondition as AdvancedConditionConfig | undefined
    if (!advancedConfig) {
      throw new Error('高级条件配置缺失')
    }
    const { branches, defaultBranch } = advancedConfig

    addLog(context, 'info', `评估 ${branches.length} 个条件分支`)

    // 依次评估每个分支
    for (const branch of branches) {
      const branchResult = this.evaluateExpression(branch.expression, inputs, variables)

      addLog(context, 'info', `分支 "${branch.label}": ${branchResult}`)

      if (branchResult) {
        return {
          matched: true,
          branchLabel: branch.label,
          expression: branch.expression,
          branches,
        }
      }
    }

    // 没有匹配的分支，使用默认分支
    const defaultLabel = defaultBranch || 'default'
    addLog(context, 'info', `没有匹配的分支，使用默认分支: ${defaultLabel}`)

    return {
      matched: false,
      branchLabel: defaultLabel,
      expression: 'default',
      branches,
    }
  }

  /**
   * 安全执行条件表达式
   */
  private evaluateExpression(
    expression: string,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): boolean {
    try {
      // 创建安全的执行环境
      const context = {
        inputs,
        variables,
        data: { ...inputs, ...variables },
        // 提供常用工具函数
        eq: (a: unknown, b: unknown) => a === b,
        ne: (a: unknown, b: unknown) => a !== b,
        gt: (a: number, b: number) => a > b,
        gte: (a: number, b: number) => a >= b,
        lt: (a: number, b: number) => a < b,
        lte: (a: number, b: number) => a <= b,
        contains: (arr: unknown[], item: unknown) => Array.isArray(arr) && arr.includes(item),
        isEmpty: (val: unknown) => val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0),
        isNotEmpty: (val: unknown) => val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0),
        matches: (str: string, pattern: string) => {
          try {
            const regex = new RegExp(pattern)
            return regex.test(str)
          } catch {
            return false
          }
        },
        in: (val: unknown, arr: unknown[]) => Array.isArray(arr) && arr.includes(val),
        notIn: (val: unknown, arr: unknown[]) => Array.isArray(arr) && !arr.includes(val),
        length: (val: unknown) => {
          if (Array.isArray(val)) return val.length
          if (typeof val === 'string') return val.length
          return 0
        },
        now: () => new Date().toISOString(),
        parseInt: (val: string) => Number.parseInt(val, 10),
        parseFloat: (val: string) => Number.parseFloat(val),
        toString: (val: unknown) => String(val),
        toNumber: (val: unknown) => Number(val),
        toBoolean: (val: unknown) => Boolean(val),
      }

      // 使用 Function 构造器安全执行
      const fn = new Function('context', `with(context) { return ${expression}; }`)

      const result = fn(context)

      // 转换为布尔值
      return Boolean(result)
    } catch (error) {
      throw new Error(`条件表达式执行错误: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 检查表达式是否安全
   */
  private isSafeExpression(expression: string): boolean {
    // 禁止危险操作
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
      /http:/i,
      /https:/i,
      /\.\.\//i, // 路径遍历
      /__proto__/i,
      /constructor/i,
    ]

    return !dangerousPatterns.some(pattern => pattern.test(expression))
  }
}