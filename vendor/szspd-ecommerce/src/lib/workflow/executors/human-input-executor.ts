/**
 * 人工输入节点执行器
 * 支持人工审批、确认和表单输入
 */

import { NodeExecutor, ExecutionContext, ExecutionResult, addLog } from '../types'
import { NodeType, NodeStatus, WorkflowNode } from '@/types/workflow'

export interface HumanInputConfig {
  formSchema: {
    fields: Array<{
      name: string
      type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date'
      label: string
      required?: boolean
      placeholder?: string
      options?: string[] // for select type
      defaultValue?: unknown
      validation?: {
        min?: number
        max?: number
        pattern?: string
      }
    }>
  }
  requiredApprovals?: number // 需要的审批人数
  timeout?: number // 超时时间（秒）
  approvalMessage?: string // 审批提示信息
  allowSkip?: boolean // 是否允许跳过
}

export class HumanInputNodeExecutor implements NodeExecutor {
  // 存储待处理的人工输入任务
  private pendingTasks: Map<string, {
    instanceId: string
    nodeId: string
    config: HumanInputConfig
    inputs: Record<string, unknown>
    createdAt: Date
    timeoutAt?: Date
  }> = new Map()

  // 存储已完成的输入
  private completedInputs: Map<string, Record<string, unknown>> = new Map()

  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.HUMAN_INPUT
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!node.id) {
      errors.push('人工输入节点必须包含 ID')
    }

    if (!node.name) {
      errors.push('人工输入节点必须包含名称')
    }

    if (!node.humanInputConfig) {
      errors.push('人工输入节点必须配置 humanInputConfig')
    } else {
      const config = node.humanInputConfig as HumanInputConfig

      if (!config.formSchema || !Array.isArray(config.formSchema.fields)) {
        errors.push('人工输入节点必须配置 formSchema.fields')
      } else if (config.formSchema.fields.length === 0) {
        errors.push('人工输入节点必须包含至少一个表单字段')
      } else {
        // 验证每个字段
        config.formSchema.fields.forEach((field, index) => {
          if (!field.name) {
            errors.push(`表单字段 ${index} 缺少 name`)
          }
          if (!field.type) {
            errors.push(`表单字段 ${field.name} 缺少 type`)
          }
          if (!field.label) {
            errors.push(`表单字段 ${field.name} 缺少 label`)
          }

          // 验证类型
          const validTypes = ['text', 'textarea', 'number', 'select', 'checkbox', 'date']
          if (!validTypes.includes(field.type)) {
            errors.push(`表单字段 ${field.name} 的 type 无效: ${field.type}`)
          }

          // select 类型必须有 options
          if (field.type === 'select' && (!field.options || field.options.length === 0)) {
            errors.push(`表单字段 ${field.name} (select 类型) 必须包含 options`)
          }
        })
      }

      if (config.requiredApprovals !== undefined && config.requiredApprovals < 1) {
        errors.push('requiredApprovals 必须大于 0')
      }

      if (config.timeout !== undefined && config.timeout < 0) {
        errors.push('timeout 不能为负数')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = new Date()
    const { node, inputs, instanceId } = context
    const config = node.humanInputConfig as HumanInputConfig

    addLog(context, 'info', `开始执行人工输入节点: ${node.name}`)

    try {
      // 检查是否已有完成的输入
      const taskKey = `${instanceId}_${node.id}`
      const completedInput = this.completedInputs.get(taskKey)

      if (completedInput) {
        // 已有输入，直接返回
        addLog(context, 'info', `使用已提交的人工输入`)

        const endTime = new Date()

        return {
          status: NodeStatus.SUCCESS,
          output: {
            ...completedInput,
            submittedAt: new Date().toISOString(),
          },
          logs: context.logs,
          metrics: {
            cpuTime: endTime.getTime() - startTime.getTime(),
            memoryUsage: process.memoryUsage?.().heapUsed,
          },
        }
      }

      // 创建待处理任务
      const timeoutAt = config.timeout
        ? new Date(startTime.getTime() + config.timeout * 1000)
        : undefined

      const task = {
        instanceId,
        nodeId: node.id,
        config,
        inputs,
        createdAt: startTime,
        timeoutAt,
      }

      this.pendingTasks.set(taskKey, task)

      addLog(context, 'info', `创建人工输入任务，等待用户提交`)

      // 在实际应用中，这里应该等待用户输入
      // 为了测试，我们模拟一个延迟后返回
      await this.waitForInput(taskKey, config.timeout || 300)

      // 检查是否超时
      const currentTask = this.pendingTasks.get(taskKey)
      if (currentTask && currentTask.timeoutAt && new Date() > currentTask.timeoutAt) {
        this.pendingTasks.delete(taskKey)

        addLog(context, 'warn', `人工输入超时`)

        return {
          status: NodeStatus.FAILED,
          error: {
            nodeId: node.id,
            code: 'HUMAN_INPUT_TIMEOUT',
            message: '人工输入超时',
            retryable: false,
          },
          logs: context.logs,
        }
      }

      // 模拟用户输入（实际应用中应该从外部获取）
      const mockInput = this.generateMockInput(config.formSchema)

      // 保存输入
      this.completedInputs.set(taskKey, mockInput)
      this.pendingTasks.delete(taskKey)

      const endTime = new Date()

      addLog(context, 'info', `人工输入已提交`)

      return {
        status: NodeStatus.SUCCESS,
        output: {
          ...mockInput,
          submittedAt: endTime.toISOString(),
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
        `人工输入节点执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      )

      return {
        status: NodeStatus.FAILED,
        error: {
          nodeId: node.id,
          code: 'HUMAN_INPUT_FAILED',
          message: error instanceof Error ? error.message : '人工输入节点执行失败',
          stack: error instanceof Error ? error.stack : undefined,
          retryable: false,
        },
        logs: context.logs,
      }
    }
  }

  /**
   * 提交人工输入（外部调用）
   */
  submitInput(instanceId: string, nodeId: string, data: Record<string, unknown>): void {
    const taskKey = `${instanceId}_${nodeId}`
    const task = this.pendingTasks.get(taskKey)

    if (!task) {
      throw new Error(`未找到待处理的人工输入任务: ${taskKey}`)
    }

    // 验证输入
    const validation = this.validateInput(data, task.config.formSchema)
    if (!validation.valid) {
      throw new Error(`输入验证失败: ${validation.errors.join(', ')}`)
    }

    // 保存输入
    this.completedInputs.set(taskKey, data)
    this.pendingTasks.delete(taskKey)
  }

  /**
   * 获取待处理任务
   */
  getPendingTasks(): Array<{
    instanceId: string
    nodeId: string
    config: HumanInputConfig
    createdAt: Date
    timeoutAt?: Date
  }> {
    return Array.from(this.pendingTasks.values())
  }

  /**
   * 获取指定实例的待处理任务
   */
  getPendingTask(instanceId: string, nodeId: string): {
    instanceId: string
    nodeId: string
    config: HumanInputConfig
    createdAt: Date
    timeoutAt?: Date
  } | undefined {
    return this.pendingTasks.get(`${instanceId}_${nodeId}`)
  }

  /**
   * 取消待处理任务
   */
  cancelTask(instanceId: string, nodeId: string): void {
    const taskKey = `${instanceId}_${nodeId}`
    this.pendingTasks.delete(taskKey)
  }

  /**
   * 清理已完成的输入
   */
  clearCompletedInputs(instanceId?: string): void {
    if (instanceId) {
      const keys = Array.from(this.completedInputs.keys()).filter(key =>
        key.startsWith(`${instanceId}_`)
      )
      keys.forEach(key => this.completedInputs.delete(key))
    } else {
      this.completedInputs.clear()
    }
  }

  /**
   * 等待输入（模拟）
   */
  private async waitForInput(taskKey: string, timeoutMs: number): Promise<void> {
    const maxWait = Math.min(timeoutMs, 5000) // 最多 5 秒（测试用）

    // 轮询检查是否有输入
    const startTime = Date.now()
    while (Date.now() - startTime < maxWait) {
      if (this.completedInputs.has(taskKey)) {
        return
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  /**
   * 生成模拟输入（测试用）
   */
  private generateMockInput(formSchema: HumanInputConfig['formSchema']): Record<string, unknown> {
    const mockInput: Record<string, unknown> = {}

    formSchema.fields.forEach(field => {
      switch (field.type) {
        case 'text':
        case 'textarea':
          mockInput[field.name] = field.defaultValue || `模拟输入: ${field.label}`
          break
        case 'number':
          mockInput[field.name] = field.defaultValue || 42
          break
        case 'select':
          mockInput[field.name] = field.defaultValue || (field.options?.[0] || '')
          break
        case 'checkbox':
          mockInput[field.name] = field.defaultValue || true
          break
        case 'date':
          mockInput[field.name] = field.defaultValue || new Date().toISOString().split('T')[0]
          break
      }
    })

    return mockInput
  }

  /**
   * 验证输入
   */
  private validateInput(
    data: Record<string, unknown>,
    formSchema: HumanInputConfig['formSchema']
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    formSchema.fields.forEach(field => {
      const value = data[field.name]

      // 检查必填字段
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field.label} 是必填项`)
        return
      }

      // 类型验证
      if (value !== undefined && value !== null) {
        switch (field.type) {
          case 'number':
            if (typeof value !== 'number') {
              errors.push(`${field.label} 必须是数字`)
            } else if (field.validation) {
              if (field.validation.min !== undefined && value < field.validation.min) {
                errors.push(`${field.label} 不能小于 ${field.validation.min}`)
              }
              if (field.validation.max !== undefined && value > field.validation.max) {
                errors.push(`${field.label} 不能大于 ${field.validation.max}`)
              }
            }
            break

          case 'select':
            if (field.options && !field.options.includes(String(value))) {
              errors.push(`${field.label} 的值无效`)
            }
            break

          case 'text':
          case 'textarea':
            if (typeof value !== 'string') {
              errors.push(`${field.label} 必须是文本`)
            } else if (field.validation?.pattern) {
              const regex = new RegExp(field.validation.pattern)
              if (!regex.test(value)) {
                errors.push(`${field.label} 格式不正确`)
              }
            }
            break

          case 'checkbox':
            if (typeof value !== 'boolean') {
              errors.push(`${field.label} 必须是布尔值`)
            }
            break

          case 'date':
            if (typeof value !== 'string') {
              errors.push(`${field.label} 必须是日期字符串`)
            } else if (isNaN(Date.parse(value))) {
              errors.push(`${field.label} 不是有效的日期`)
            }
            break
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// 导出单例实例
export const humanInputNodeExecutor = new HumanInputNodeExecutor()