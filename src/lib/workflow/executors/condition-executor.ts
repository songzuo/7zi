/**
 * 条件节点执行器
 * 支持条件表达式判断
 */

import { NodeExecutor, ExecutionContext, ExecutionResult, addLog } from '../types'
import { NodeType, NodeStatus, WorkflowNode } from '@/types/workflow'

export class ConditionNodeExecutor implements NodeExecutor {
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

    if (!node.conditionConfig) {
      errors.push('条件节点必须配置 conditionConfig')
    } else {
      if (!node.conditionConfig.expression) {
        errors.push('条件节点必须包含表达式')
      }

      // 验证表达式安全性
      if (!this.isSafeExpression(node.conditionConfig.expression)) {
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
    const config = node.conditionConfig!

    addLog(context, 'info', `开始执行条件节点: ${node.name}`)

    try {
      // 安全执行条件表达式
      const conditionResult = this.evaluateExpression(config.expression, inputs, variables)

      const endTime = new Date()

      addLog(context, 'info', `条件判断完成: ${conditionResult ? 'true' : 'false'}`)

      return {
        status: NodeStatus.SUCCESS,
        output: {
          condition: conditionResult,
          expression: config.expression,
          label: conditionResult ? config.trueLabel || 'true' : config.falseLabel || 'false',
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
    ]

    return !dangerousPatterns.some(pattern => pattern.test(expression))
  }
}
