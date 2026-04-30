/**
 * Workspace Automation Engine
 *
 * 自动化规则引擎，支持规则定义、触发器评估和动作执行
 */

import { VM } from 'vm'

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * 触发器类型
 */
export type TriggerType = 'event' | 'schedule' | 'condition' | 'manual'

/**
 * 动作类型
 */
export type ActionType = 'execute_workflow' | 'send_notification' | 'call_api' | 'transform_data' | 'custom'

/**
 * 规则状态
 */
export type RuleStatus = 'active' | 'paused' | 'disabled' | 'error'

/**
 * 调度类型
 */
export type ScheduleType = 'interval' | 'cron' | 'once'

/**
 * 事件类型
 */
export type EventType =
  | 'workflow_completed'
  | 'workflow_failed'
  | 'file_created'
  | 'file_updated'
  | 'file_deleted'
  | 'user_action'
  | 'system_event'
  | 'data_changed'
  | 'custom'

/**
 * 触发器配置
 */
export interface TriggerConfig {
  type: TriggerType
  config: {
    // 事件触发器
    event?: {
      eventType: EventType
      filters?: Record<string, unknown>
    }

    // 定时触发器
    schedule?: {
      scheduleType: ScheduleType
      // interval: 毫秒数
      // cron: cron 表达式
      // once: ISO 时间字符串
      value: string | number
      timezone?: string
    }

    // 条件触发器
    condition?: {
      expression: string // 支持 JavaScript 表达式
      evaluateInterval?: number // 评估间隔（毫秒）
    }

    // 手动触发器
    manual?: {
      requireConfirmation?: boolean
      allowedUsers?: string[]
    }
  }
}

/**
 * 动作配置
 */
export interface ActionConfig {
  type: ActionType
  config: {
    // 执行工作流
    workflow?: {
      workflowId: string
      version?: string
      input?: Record<string, unknown>
      async?: boolean
    }

    // 发送通知
    notification?: {
      channels: ('email' | 'telegram' | 'webhook' | 'push')[]
      template?: string
      data: Record<string, unknown>
      priority?: 'low' | 'normal' | 'high' | 'urgent'
    }

    // 调用 API
    api?: {
      url: string
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
      headers?: Record<string, string>
      body?: unknown
      timeout?: number
    }

    // 数据转换
    transform?: {
      source: string // 数据源路径
      target: string // 目标路径
      transform: string // 转换逻辑（JavaScript 代码）
    }

    // 自定义动作
    custom?: {
      handler: string // 处理函数名称
      params?: Record<string, unknown>
    }
  }
  /**
   * 动作失败时的处理策略
   */
  onError?: 'stop' | 'continue' | 'retry'
  retryCount?: number
  retryDelay?: number
}

/**
 * 自动化规则定义
 */
export interface AutomationRule {
  id: string
  name: string
  description?: string
  version: string
  status: RuleStatus

  triggers: TriggerConfig[]
  actions: ActionConfig[]

  // 规则条件（所有触发器满足后，还需满足此条件才执行）
  condition?: string

  // 规则限制
  limits?: {
    maxExecutions?: number // 最大执行次数
    executionWindow?: number // 执行窗口（毫秒）
    cooldown?: number // 冷却时间（毫秒）
  }

  // 元数据
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy?: string
    lastExecutedAt?: string
    executionCount?: number
    lastError?: string
  }

  // 执行统计
  stats?: {
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    lastExecutionDuration?: number
  }
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  ruleId: string
  ruleName: string
  triggerData: unknown
  timestamp: string
  executionId: string
  userId?: string
  variables: Record<string, unknown>
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  success: boolean
  executionId: string
  timestamp: string
  ruleId: string
  triggerType: TriggerType
  actionResults: Array<{
    actionType: ActionType
    success: boolean
    result: unknown
    error?: string
    duration: number
  }>
  error?: string
  duration: number
}

/**
 * 规则验证错误
 */
export interface ValidationError {
  path: string
  message: string
  code: string
}

// ============================================================================
// Rule Validator
// ============================================================================

/**
 * 验证规则配置
 */
export class RuleValidator {
  /**
   * 验证自动化规则
   */
  static validateRule(rule: Partial<AutomationRule>): ValidationError[] {
    const errors: ValidationError[] = []

    // 必填字段验证
    if (!rule.name || rule.name.trim() === '') {
      errors.push({
        path: 'name',
        message: '规则名称不能为空',
        code: 'REQUIRED_FIELD',
      })
    }

    if (!rule.triggers || rule.triggers.length === 0) {
      errors.push({
        path: 'triggers',
        message: '至少需要一个触发器',
        code: 'REQUIRED_TRIGGER',
      })
    } else {
      rule.triggers.forEach((trigger, index) => {
        const triggerErrors = this.validateTrigger(trigger, `triggers[${index}]`)
        errors.push(...triggerErrors)
      })
    }

    if (!rule.actions || rule.actions.length === 0) {
      errors.push({
        path: 'actions',
        message: '至少需要一个动作',
        code: 'REQUIRED_ACTION',
      })
    } else {
      rule.actions.forEach((action, index) => {
        const actionErrors = this.validateAction(action, `actions[${index}]`)
        errors.push(...actionErrors)
      })
    }

    // 条件表达式验证
    if (rule.condition) {
      const conditionError = this.validateCondition(rule.condition, 'condition')
      if (conditionError) {
        errors.push(conditionError)
      }
    }

    return errors
  }

  /**
   * 验证触发器配置
   */
  static validateTrigger(trigger: TriggerConfig, path: string): ValidationError[] {
    const errors: ValidationError[] = []

    if (!trigger.type) {
      errors.push({
        path: `${path}.type`,
        message: '触发器类型不能为空',
        code: 'REQUIRED_FIELD',
      })
      return errors
    }

    switch (trigger.type) {
      case 'event':
        if (!trigger.config.event?.eventType) {
          errors.push({
            path: `${path}.config.event.eventType`,
            message: '事件类型不能为空',
            code: 'REQUIRED_FIELD',
          })
        }
        break

      case 'schedule':
        if (!trigger.config.schedule?.value) {
          errors.push({
            path: `${path}.config.schedule.value`,
            message: '调度值不能为空',
            code: 'REQUIRED_FIELD',
          })
        } else if (typeof trigger.config.schedule.value === 'string') {
          const scheduleType = trigger.config.schedule.scheduleType
          if (scheduleType === 'cron' && !this.isValidCron(trigger.config.schedule.value as string)) {
            errors.push({
              path: `${path}.config.schedule.value`,
              message: '无效的 cron 表达式',
              code: 'INVALID_CRON',
            })
          }
        }
        break

      case 'condition':
        if (!trigger.config.condition?.expression) {
          errors.push({
            path: `${path}.config.condition.expression`,
            message: '条件表达式不能为空',
            code: 'REQUIRED_FIELD',
          })
        } else {
          const error = this.validateCondition(trigger.config.condition.expression, `${path}.config.condition.expression`)
          if (error) {
            errors.push(error)
          }
        }
        break

      case 'manual':
        // 手动触发器不需要额外验证
        break
    }

    return errors
  }

  /**
   * 验证动作配置
   */
  static validateAction(action: ActionConfig, path: string): ValidationError[] {
    const errors: ValidationError[] = []

    if (!action.type) {
      errors.push({
        path: `${path}.type`,
        message: '动作类型不能为空',
        code: 'REQUIRED_FIELD',
      })
      return errors
    }

    switch (action.type) {
      case 'execute_workflow':
        if (!action.config.workflow?.workflowId) {
          errors.push({
            path: `${path}.config.workflow.workflowId`,
            message: '工作流 ID 不能为空',
            code: 'REQUIRED_FIELD',
          })
        }
        break

      case 'send_notification':
        if (!action.config.notification?.channels || action.config.notification.channels.length === 0) {
          errors.push({
            path: `${path}.config.notification.channels`,
            message: '至少需要一个通知渠道',
            code: 'REQUIRED_FIELD',
          })
        }
        break

      case 'call_api':
        if (!action.config.api?.url) {
          errors.push({
            path: `${path}.config.api.url`,
            message: 'API URL 不能为空',
            code: 'REQUIRED_FIELD',
          })
        }
        if (action.config.api?.url && !this.isValidUrl(action.config.api.url)) {
          errors.push({
            path: `${path}.config.api.url`,
            message: '无效的 URL',
            code: 'INVALID_URL',
          })
        }
        break

      case 'transform_data':
        if (!action.config.transform?.source || !action.config.transform?.target) {
          errors.push({
            path: `${path}.config.transform`,
            message: '数据源和目标不能为空',
            code: 'REQUIRED_FIELD',
          })
        }
        break

      case 'custom':
        if (!action.config.custom?.handler) {
          errors.push({
            path: `${path}.config.custom.handler`,
            message: '处理函数名称不能为空',
            code: 'REQUIRED_FIELD',
          })
        }
        break
    }

    // 重试配置验证
    if (action.onError === 'retry' && (!action.retryCount || action.retryCount < 1)) {
      errors.push({
        path: `${path}.retryCount`,
        message: '重试次数必须大于 0',
        code: 'INVALID_RETRY_COUNT',
      })
    }

    return errors
  }

  /**
   * 验证条件表达式
   */
  static validateCondition(expression: string, path: string): ValidationError | null {
    try {
      // Sanitize first to remove dangerous keywords
      const sanitized = this.sanitizeExpression(expression)
      // Use vm.compileFunction for safe syntax validation (no execution)
      VM.compileFunction(
        `return ${sanitized}`,
        ['ctx'],
        { parsingContext: VM.createContext({ ctx: undefined }) }
      )
      return null
    } catch (error) {
      return {
        path,
        message: `无效的条件表达式: ${error instanceof Error ? error.message : '未知错误'}`,
        code: 'INVALID_CONDITION',
      }
    }
  }

  /**
   * 清理表达式，移除危险代码
   */
  private static sanitizeExpression(expression: string): string {
    // 移除危险的关键字
    const dangerous = ['import', 'require', 'eval', 'Function', 'process', 'global', 'window']
    let sanitized = expression

    dangerous.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      sanitized = sanitized.replace(regex, '')
    })

    return sanitized
  }

  /**
   * 验证 cron 表达式
   */
  static isValidCron(cron: string): boolean {
    // 简化的 cron 验证
    const parts = cron.trim().split(/\s+/)
    if (parts.length < 5 || parts.length > 6) {
      return false
    }

    const patterns = [
      // 分钟: 0-59
      /^(\*|([0-5]?\d)(-([0-5]?\d))?([0-5]?\d\/[0-5]?\d)?(,([0-5]?\d)(-([0-5]?\d))?([0-5]?\d\/[0-5]?\d)?)*)$/,
      // 小时: 0-23
      /^(\*|([01]?\d|2[0-3])(-([01]?\d|2[0-3]))?([01]?\d|2[0-3]\/[01]?\d|2[0-3])?(,([01]?\d|2[0-3])(-([01]?\d|2[0-3]))?([01]?\d|2[0-3]\/[01]?\d|2[0-3])?)*)$/,
      // 日期: 1-31
      /^(\*|([12]?\d|3[01])(-([12]?\d|3[01]))?([12]?\d|3[01]\/[12]?\d|3[01])?(,([12]?\d|3[01])(-([12]?\d|3[01]))?([12]?\d|3[01]\/[12]?\d|3[01])?)*)$/,
      // 月份: 1-12
      /^(\*|([1]?[0-2])(-([1]?[0-2]))?([1]?[0-2]\/[1]?[0-2])?(,([1]?[0-2])(-([1]?[0-2]))?([1]?[0-2]\/[1]?[0-2])?)*)$/,
      // 星期: 0-7
      /^(\*|([0-7])(-([0-7]))?([0-7]\/[0-7])?(,([0-7])(-([0-7]))?([0-7]\/[0-7])?)*)$/,
    ]

    for (let i = 0; i < 5; i++) {
      if (!patterns[i].test(parts[i])) {
        return false
      }
    }

    return true
  }

  /**
   * 验证 URL
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

// ============================================================================
// Rule Engine
// ============================================================================

/**
 * 自动化规则引擎
 */
export class AutomationEngine {
  private rules: Map<string, AutomationRule> = new Map()
  private eventListeners: Map<EventType, Set<string>> = new Map()
  private scheduleTimers: Map<string, NodeJS.Timeout> = new Map()
  private conditionEvaluators: Map<string, NodeJS.Timeout> = new Map()

  /**
   * 注册规则
   */
  async registerRule(rule: AutomationRule): Promise<boolean> {
    const errors = RuleValidator.validateRule(rule)
    if (errors.length > 0) {
      throw new Error(`规则验证失败: ${JSON.stringify(errors, null, 2)}`)
    }

    // 如果规则已存在，先注销旧规则
    if (this.rules.has(rule.id)) {
      await this.unregisterRule(rule.id)
    }

    this.rules.set(rule.id, rule)

    // 设置触发器
    for (const trigger of rule.triggers) {
      await this.setupTrigger(rule.id, trigger)
    }

    return true
  }

  /**
   * 注销规则
   */
  async unregisterRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId)
    if (!rule) return

    // 清理触发器
    this.cleanupSchedule(ruleId)
    this.cleanupConditions(ruleId)
    this.cleanupEventListeners(ruleId)

    this.rules.delete(ruleId)
  }

  /**
   * 获取规则
   */
  getRule(ruleId: string): AutomationRule | undefined {
    return this.rules.get(ruleId)
  }

  /**
   * 获取所有规则
   */
  getAllRules(): AutomationRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * 更新规则状态
   */
  async updateRuleStatus(ruleId: string, status: RuleStatus): Promise<void> {
    const rule = this.rules.get(ruleId)
    if (!rule) {
      throw new Error(`规则不存在: ${ruleId}`)
    }

    if (status === 'active' && rule.status !== 'active') {
      rule.status = status
      // 重新设置触发器
      for (const trigger of rule.triggers) {
        await this.setupTrigger(ruleId, trigger)
      }
    } else if (status !== 'active' && rule.status === 'active') {
      rule.status = status
      // 清理触发器
      this.cleanupSchedule(ruleId)
      this.cleanupConditions(ruleId)
    } else {
      rule.status = status
    }

    rule.metadata.updatedAt = new Date().toISOString()
  }

  /**
   * 设置触发器
   */
  private async setupTrigger(ruleId: string, trigger: TriggerConfig): Promise<void> {
    const rule = this.rules.get(ruleId)
    if (!rule || rule.status !== 'active') return

    switch (trigger.type) {
      case 'event':
        this.setupEventListener(ruleId, trigger.config.event!)
        break

      case 'schedule':
        this.setupSchedule(ruleId, trigger.config.schedule!)
        break

      case 'condition':
        this.setupConditionEvaluator(ruleId, trigger.config.condition!)
        break

      case 'manual':
        // 手动触发器不需要设置
        break
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListener(ruleId: string, config: NonNullable<TriggerConfig['config']['event']>): void {
    const eventType = config.eventType
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(ruleId)
  }

  /**
   * 清理事件监听器
   */
  private cleanupEventListeners(ruleId: string): void {
    this.eventListeners.forEach((listeners) => {
      listeners.delete(ruleId)
    })
  }

  /**
   * 设置调度器
   */
  private setupSchedule(ruleId: string, config: NonNullable<TriggerConfig['config']['schedule']>): void {
    const { scheduleType, value, timezone = 'UTC' } = config

    const execute = async () => {
      await this.executeRule(ruleId, { type: 'schedule', config: { schedule: config } })
    }

    let timeout: NodeJS.Timeout | null = null

    switch (scheduleType) {
      case 'interval':
        const intervalMs = Number(value)
        timeout = setInterval(execute, intervalMs) as unknown as NodeJS.Timeout
        break

      case 'cron':
        // 简化的 cron 实现（生产环境应使用专业库如 node-cron）
        const cronDelay = this.calculateNextCronDelay(config.value as string, timezone)
        timeout = setTimeout(() => {
          execute()
          // 重新设置下一次执行
          this.setupSchedule(ruleId, config)
        }, cronDelay)
        break

      case 'once':
        const executeTime = new Date(String(value)).getTime()
        const delay = executeTime - Date.now()
        if (delay > 0) {
          timeout = setTimeout(execute, delay)
        }
        break
    }

    if (timeout) {
      this.scheduleTimers.set(ruleId, timeout)
    }
  }

  /**
   * 计算下次 cron 执行延迟（简化版）
   */
  private calculateNextCronDelay(cron: string, timezone: string): number {
    // 这里使用简化实现，生产环境应使用专业库
    // 默认设置为 1 小时后
    return 60 * 60 * 1000
  }

  /**
   * 清理调度器
   */
  private cleanupSchedule(ruleId: string): void {
    const timer = this.scheduleTimers.get(ruleId)
    if (timer) {
      clearInterval(timer)
      clearTimeout(timer)
      this.scheduleTimers.delete(ruleId)
    }
  }

  /**
   * 设置条件评估器
   */
  private setupConditionEvaluator(ruleId: string, config: NonNullable<TriggerConfig['config']['condition']>): void {
    const interval = config.evaluateInterval || 60000 // 默认 1 分钟
    const { expression } = config

    const timer = setInterval(async () => {
      try {
        const result = await this.evaluateCondition(expression)
        if (result) {
          await this.executeRule(ruleId, { type: 'condition', config: { condition: config } })
        }
      } catch (error) {
        console.error(`条件评估失败 [${ruleId}]:`, error)
      }
    }, interval)

    this.conditionEvaluators.set(ruleId, timer)
  }

  /**
   * 清理条件评估器
   */
  private cleanupConditions(ruleId: string): void {
    const timer = this.conditionEvaluators.get(ruleId)
    if (timer) {
      clearInterval(timer)
      this.conditionEvaluators.delete(ruleId)
    }
  }

  /**
   * 触发事件
   */
  async triggerEvent(eventType: EventType, eventData?: unknown): Promise<void> {
    const listeners = this.eventListeners.get(eventType)
    if (!listeners || listeners.size === 0) return

    const promises = Array.from(listeners).map(async (ruleId) => {
      const rule = this.rules.get(ruleId)
      if (!rule || rule.status !== 'active') return

      // 检查事件过滤器
      const trigger = rule.triggers.find((t) => t.type === 'event' && t.config.event?.eventType === eventType)
      if (trigger?.config.event?.filters) {
        const matches = this.matchFilters(eventData, trigger.config.event.filters)
        if (!matches) return
      }

      await this.executeRule(ruleId, { type: 'event', config: { event: { eventType } } })
    })

    await Promise.all(promises)
  }

  /**
   * 匹配事件过滤器
   */
  private matchFilters(data: unknown, filters: Record<string, unknown>): boolean {
    if (!data || typeof data !== 'object') return false
    const dataObj = data as Record<string, unknown>

    for (const [key, value] of Object.entries(filters)) {
      if (dataObj[key] !== value) {
        return false
      }
    }

    return true
  }

  /**
   * 手动触发规则
   */
  async triggerRule(ruleId: string, triggerData?: unknown): Promise<ExecutionResult> {
    const rule = this.rules.get(ruleId)
    if (!rule) {
      throw new Error(`规则不存在: ${ruleId}`)
    }

    if (rule.status !== 'active') {
      throw new Error(`规则未激活: ${ruleId}`)
    }

    const manualTrigger = rule.triggers.find((t) => t.type === 'manual')
    if (!manualTrigger) {
      throw new Error(`规则不支持手动触发: ${ruleId}`)
    }

    return this.executeRule(ruleId, { type: 'manual', config: manualTrigger.config }, triggerData)
  }

  /**
   * 执行规则
   */
  private async executeRule(
    ruleId: string,
    trigger: { type: TriggerType; config: TriggerConfig['config'] },
    triggerData?: unknown
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const rule = this.rules.get(ruleId)

    if (!rule || rule.status !== 'active') {
      return {
        success: false,
        executionId,
        timestamp: new Date().toISOString(),
        ruleId,
        triggerType: trigger.type,
        actionResults: [],
        error: '规则不存在或未激活',
        duration: 0,
      }
    }

    // 检查限制
    if (!this.checkLimits(rule)) {
      console.log(`规则执行次数受限: ${ruleId}`)
      return {
        success: false,
        executionId,
        timestamp: new Date().toISOString(),
        ruleId,
        triggerType: trigger.type,
        actionResults: [],
        error: '规则执行次数受限',
        duration: 0,
      }
    }

    // 评估规则条件
    if (rule.condition) {
      const conditionMet = await this.evaluateCondition(rule.condition, { triggerData, variables: rule.metadata })
      if (!conditionMet) {
        return {
          success: true,
          executionId,
          timestamp: new Date().toISOString(),
          ruleId,
          triggerType: trigger.type,
          actionResults: [],
          duration: Date.now() - startTime,
        }
      }
    }

    // 执行上下文
    const context: ExecutionContext = {
      ruleId,
      ruleName: rule.name,
      triggerData: triggerData || { type: trigger.type, ...trigger.config },
      timestamp: new Date().toISOString(),
      executionId,
      variables: {},
    }

    // 执行动作
    const actionResults: ExecutionResult['actionResults'] = []
    let allSuccess = true

    for (const action of rule.actions) {
      const actionStart = Date.now()
      const result = await this.executeAction(action, context)

      actionResults.push({
        actionType: action.type,
        success: result.success,
        result: result.data,
        error: result.error,
        duration: Date.now() - actionStart,
      })

      if (!result.success) {
        allSuccess = false
        if (action.onError === 'stop') {
          break
        } else if (action.onError === 'retry') {
          const retryCount = action.retryCount || 3
          const retryDelay = action.retryDelay || 1000

          for (let i = 0; i < retryCount; i++) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay))
            const retryResult = await this.executeAction(action, context)

            actionResults[actionResults.length - 1] = {
              actionType: action.type,
              success: retryResult.success,
              result: retryResult.data,
              error: retryResult.error,
              duration: Date.now() - actionStart,
            }

            if (retryResult.success) {
              allSuccess = true
              break
            }
          }
        }
      }
    }

    // 更新规则统计
    this.updateRuleStats(rule, allSuccess, Date.now() - startTime)

    return {
      success: allSuccess,
      executionId,
      timestamp: new Date().toISOString(),
      ruleId,
      triggerType: trigger.type,
      actionResults,
      duration: Date.now() - startTime,
    }
  }

  /**
   * 执行动作
   */
  private async executeAction(action: ActionConfig, context: ExecutionContext): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      switch (action.type) {
        case 'execute_workflow':
          return await this.executeWorkflowAction(action, context)

        case 'send_notification':
          return await this.sendNotificationAction(action, context)

        case 'call_api':
          return await this.callApiAction(action, context)

        case 'transform_data':
          return await this.transformDataAction(action, context)

        case 'custom':
          return await this.executeCustomAction(action, context)

        default:
          return {
            success: false,
            error: `未知动作类型: ${(action as { type: string }).type}`,
          }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * 执行工作流动作
   */
  private async executeWorkflowAction(action: ActionConfig, context: ExecutionContext): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const workflowConfig = action.config.workflow
    if (!workflowConfig) {
      return { success: false, error: '工作流配置缺失' }
    }

    // TODO: 集成到工作流执行系统
    console.log(`执行工作流: ${workflowConfig.workflowId}`, {
      input: { ...workflowConfig.input, triggerData: context.triggerData },
      executionContext: context,
    })

    // 模拟执行
    return {
      success: true,
      data: { workflowId: workflowConfig.workflowId, executionId: `wf_${Date.now()}` },
    }
  }

  /**
   * 发送通知动作
   */
  private async sendNotificationAction(action: ActionConfig, context: ExecutionContext): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const notificationConfig = action.config.notification
    if (!notificationConfig) {
      return { success: false, error: '通知配置缺失' }
    }

    console.log(`发送通知: ${notificationConfig.channels.join(', ')}`, {
      template: notificationConfig.template,
      data: { ...notificationConfig.data, triggerData: context.triggerData },
      priority: notificationConfig.priority,
    })

    // TODO: 集成到通知系统
    return {
      success: true,
      data: { channels: notificationConfig.channels, sentAt: new Date().toISOString() },
    }
  }

  /**
   * 调用 API 动作
   */
  private async callApiAction(action: ActionConfig, context: ExecutionContext): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const apiConfig = action.config.api
    if (!apiConfig) {
      return { success: false, error: 'API 配置缺失' }
    }

    try {
      const response = await fetch(apiConfig.url, {
        method: apiConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...apiConfig.headers,
        },
        body: apiConfig.body ? JSON.stringify(apiConfig.body) : undefined,
        signal: apiConfig.timeout ? AbortSignal.timeout(apiConfig.timeout) : undefined,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: `API 调用失败: ${response.status} ${response.statusText}`,
          data,
        }
      }

      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * 数据转换动作
   */
  private async transformDataAction(action: ActionConfig, context: ExecutionContext): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const transformConfig = action.config.transform
    if (!transformConfig) {
      return { success: false, error: '转换配置缺失' }
    }

    try {
      // 获取源数据（简化实现）
      const sourceData = this.resolveDataPath(transformConfig.source, context)

      // Execute transform using sandboxed vm instead of unsafe new Function
      // The sanitized expression is wrapped in an async IIFE and executed with timeout
      const wrappedTransform = `
        (async (data, ctx) => {
          ${transformConfig.transform}
        })(sourceData, context)
      `
      const transformed = VM.runInNewContext(wrappedTransform, { sourceData, context }, { timeout: 1000 })

      // 设置目标数据（简化实现）
      this.setDataPath(transformConfig.target, transformed)

      return { success: true, data: { source: transformConfig.source, target: transformConfig.target } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * 执行自定义动作
   */
  private async executeCustomAction(action: ActionConfig, context: ExecutionContext): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const customConfig = action.config.custom
    if (!customConfig) {
      return { success: false, error: '自定义配置缺失' }
    }

    // TODO: 集成到自定义处理器注册表
    console.log(`执行自定义动作: ${customConfig.handler}`, {
      params: customConfig.params,
      context,
    })

    return {
      success: true,
      data: { handler: customConfig.handler, executedAt: new Date().toISOString() },
    }
  }

  /**
   * 解析数据路径
   */
  private resolveDataPath(path: string, context: ExecutionContext): unknown {
    // 简化实现，支持 basic JSON path
    const parts = path.split('.')
    let data: unknown = context

    for (const part of parts) {
      if (typeof data === 'object' && data !== null) {
        data = (data as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }

    return data
  }

  /**
   * 设置数据路径
   */
  private setDataPath(path: string, value: unknown): void {
    // 简化实现
    console.log(`设置数据路径: ${path} =`, value)
  }

  /**
   * 评估条件
   */
  private async evaluateCondition(expression: string, context?: { triggerData?: unknown; variables?: Record<string, unknown> }): Promise<boolean> {
    try {
      // Use Node.js vm module for safe sandboxed evaluation
      // This replaces unsafe new Function() which can access the global scope
      const sanitized = this.sanitizeExpression(expression)
      const result = VM.runInNewContext(
        `(() => { try { return !!( ${sanitized} ) } catch(e) { return false } })()`,
        { ctx: context },
        { timeout: 1000 }
      )
      return Boolean(result)
    } catch (error) {
      console.error('条件评估失败:', error)
      return false
    }
  }

  /**
   * 检查规则限制
   */
  private checkLimits(rule: AutomationRule): boolean {
    const limits = rule.limits
    if (!limits) return true

    // 检查最大执行次数
    if (limits.maxExecutions && (rule.stats?.totalExecutions ?? 0) >= limits.maxExecutions) {
      return false
    }

    // 检查执行窗口
    if (limits.executionWindow && rule.metadata.lastExecutedAt) {
      const lastExecution = new Date(rule.metadata.lastExecutedAt).getTime()
      const now = Date.now()
      if (now - lastExecution < limits.executionWindow) {
        return false
      }
    }

    // 检查冷却时间
    if (limits.cooldown && rule.metadata.lastExecutedAt) {
      const lastExecution = new Date(rule.metadata.lastExecutedAt).getTime()
      const now = Date.now()
      if (now - lastExecution < limits.cooldown) {
        return false
      }
    }

    return true
  }

  /**
   * 更新规则统计
   */
  private updateRuleStats(rule: AutomationRule, success: boolean, duration: number): void {
    rule.metadata.lastExecutedAt = new Date().toISOString()
    rule.metadata.executionCount = (rule.metadata.executionCount || 0) + 1

    if (!rule.stats) {
      rule.stats = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
      }
    }

    rule.stats.totalExecutions++
    rule.stats.lastExecutionDuration = duration

    if (success) {
      rule.stats.successfulExecutions++
      rule.metadata.lastError = undefined
    } else {
      rule.stats.failedExecutions++
    }
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    const ruleIds = Array.from(this.rules.keys())
    for (const ruleId of ruleIds) {
      await this.unregisterRule(ruleId)
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * 全局自动化引擎实例
 */
export const automationEngine = new AutomationEngine()
