/**
 * Dialogue Template Engine
 * 对话模板引擎
 * v1.13.0
 */

import type {
  DialogueTemplate,
  TemplateVariable,
  TemplateCategory,
  TemplateCondition,
  DialogueContext,
  SentimentResult,
  IntentResult,
  DialogueEnhancementConfig,
} from './types'
import { DEFAULT_CONFIG } from './types'

/**
 * 模板变量值
 */
interface TemplateVariableValues {
  [key: string]: string | number | boolean | string[]
}

export class DialogueTemplateEngine {
  private config: DialogueEnhancementConfig
  private templates: Map<string, DialogueTemplate>
  private variableValues: TemplateVariableValues

  constructor(config: Partial<DialogueEnhancementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.templates = new Map()
    this.variableValues = {}

    // 初始化默认模板
    this.initializeDefaultTemplates()
  }

  /**
   * 渲染模板
   */
  render(
    templateId: string,
    variables?: TemplateVariableValues,
    context?: DialogueContext
  ): string {
    const template = this.templates.get(templateId)

    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    if (!template.enabled) {
      throw new Error(`Template is disabled: ${templateId}`)
    }

    // 检查模板条件
    if (template.conditions && context) {
      if (!this.checkConditions(template.conditions, context)) {
        throw new Error(`Template conditions not met: ${templateId}`)
      }
    }

    // 合并变量
    const mergedVariables = {
      ...this.variableValues,
      ...variables,
    }

    // 验证必填变量
    this.validateVariables(template, mergedVariables)

    // 渲染模板
    return this.renderTemplate(template.content, mergedVariables)
  }

  /**
   * 查找合适的模板
   */
  findTemplate(
    category: TemplateCategory,
    context?: DialogueContext,
    sentiment?: SentimentResult,
    intent?: IntentResult
  ): DialogueTemplate | null {
    const candidates: DialogueTemplate[] = []

    // 筛选类别匹配的模板
    for (const template of this.templates.values()) {
      if (!template.enabled) continue
      if (template.category !== category) continue

      // 检查条件
      if (template.conditions && context) {
        if (!this.checkConditions(template.conditions, context)) {
          continue
        }
      }

      candidates.push(template)
    }

    if (candidates.length === 0) {
      return null
    }

    // 按优先级排序
    candidates.sort((a, b) => b.priority - a.priority)

    // 返回优先级最高的模板
    return candidates[0]
  }

  /**
   * 智能选择并渲染模板
   */
  renderSmart(
    category: TemplateCategory,
    context?: DialogueContext,
    sentiment?: SentimentResult,
    intent?: IntentResult,
    variables?: TemplateVariableValues
  ): string | null {
    const template = this.findTemplate(category, context, sentiment, intent)

    if (!template) {
      return null
    }

    return this.render(template.id, variables, context)
  }

  /**
   * 渲染模板内容
   */
  private renderTemplate(content: string, variables: TemplateVariableValues): string {
    let rendered = content

    // 替换变量 {{variable}}
    rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key]
      if (value === undefined || value === null) {
        return match
      }
      return String(value)
    })

    // 替换条件变量 {{#if condition}}...{{/if}}
    rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, body) => {
      const value = variables[key]
      if (value === true || value === 'true' || value === 'yes') {
        return body
      }
      return ''
    })

    // 替换循环变量 {{#each items}}...{{/each}}
    rendered = rendered.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, key, body) => {
      const value = variables[key]
      if (!Array.isArray(value)) {
        return ''
      }
      return value.map((item, index) => {
        let itemBody = body
        itemBody = itemBody.replace(/\{\{this\}\}/g, String(item))
        itemBody = itemBody.replace(/\{\{@index\}\}/g, String(index + 1))
        return itemBody
      }).join('')
    })

    return rendered
  }

  /**
   * 验证变量
   */
  private validateVariables(template: DialogueTemplate, variables: TemplateVariableValues): void {
    for (const variable of template.variables) {
      if (variable.required) {
        if (!(variable.name in variables)) {
          throw new Error(`Required variable missing: ${variable.name}`)
        }
      }

      // 类型检查
      if (variable.name in variables) {
        const value = variables[variable.name]
        let isValid = false

        switch (variable.type) {
          case 'string':
            isValid = typeof value === 'string'
            break
          case 'number':
            isValid = typeof value === 'number'
            break
          case 'boolean':
            isValid = typeof value === 'boolean'
            break
          case 'array':
            isValid = Array.isArray(value)
            break
        }

        if (!isValid) {
          throw new Error(`Variable type mismatch: ${variable.name} expected ${variable.type}`)
        }
      }
    }
  }

  /**
   * 检查条件
   */
  private checkConditions(conditions: TemplateCondition[], context: DialogueContext): boolean {
    for (const condition of conditions) {
      if (!this.checkCondition(condition, context)) {
        return false
      }
    }
    return true
  }

  /**
   * 检查单个条件
   */
  private checkCondition(condition: TemplateCondition, context: DialogueContext): boolean {
    const lastTurn = context.turns[context.turns.length - 1]

    switch (condition.type) {
      case 'sentiment':
        if (lastTurn && lastTurn.sentiment) {
          const currentSentiment = lastTurn.sentiment.label
          if (Array.isArray(condition.value)) {
            return condition.value.includes(currentSentiment)
          }
          return this.compareValues(currentSentiment, condition.value, condition.operator)
        }
        return false

      case 'intent':
        if (lastTurn && lastTurn.intent) {
          const currentIntent = lastTurn.intent
          if (Array.isArray(condition.value)) {
            return condition.value.includes(currentIntent)
          }
          return this.compareValues(currentIntent, condition.value, condition.operator)
        }
        return false

      case 'topic':
        const currentTopic = context.currentTopic
        if (Array.isArray(condition.value)) {
          return condition.value.includes(currentTopic)
        }
        return this.compareValues(currentTopic, condition.value, condition.operator)

      case 'state':
        const currentState = context.state
        if (Array.isArray(condition.value)) {
          return condition.value.includes(currentState)
        }
        return this.compareValues(currentState, condition.value, condition.operator)

      default:
        return true
    }
  }

  /**
   * 比较值
   */
  private compareValues(actual: string, expected: string, operator: string): boolean {
    const normalizedActual = actual.toLowerCase()
    const normalizedExpected = expected.toLowerCase()

    switch (operator) {
      case 'equals':
        return normalizedActual === normalizedExpected
      case 'contains':
        return normalizedActual.includes(normalizedExpected)
      case 'matches':
        return new RegExp(normalizedExpected).test(normalizedActual)
      case 'in':
        // 这里expected应该是一个数组，但我们为了简单处理字符串
        return normalizedActual === normalizedExpected
      default:
        return false
    }
  }

  /**
   * 添加模板
   */
  addTemplate(template: DialogueTemplate): void {
    this.templates.set(template.id, template)
  }

  /**
   * 删除模板
   */
  removeTemplate(templateId: string): boolean {
    return this.templates.delete(templateId)
  }

  /**
   * 获取模板
   */
  getTemplate(templateId: string): DialogueTemplate | undefined {
    return this.templates.get(templateId)
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): DialogueTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * 启用模板
   */
  enableTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId)
    if (template) {
      template.enabled = true
      return true
    }
    return false
  }

  /**
   * 禁用模板
   */
  disableTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId)
    if (template) {
      template.enabled = false
      return true
    }
    return false
  }

  /**
   * 设置全局变量值
   */
  setVariable(name: string, value: string | number | boolean | string[]): void {
    this.variableValues[name] = value
  }

  /**
   * 获取全局变量值
   */
  getVariable(name: string): unknown {
    return this.variableValues[name]
  }

  /**
   * 清除所有变量
   */
  clearVariables(): void {
    this.variableValues = {}
  }

  /**
   * 验证模板
   */
  validateTemplate(template: DialogueTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!template.id) {
      errors.push('Template ID is required')
    }

    if (!template.name) {
      errors.push('Template name is required')
    }

    if (!template.content) {
      errors.push('Template content is required')
    }

    if (!template.variables || template.variables.length === 0) {
      errors.push('Template variables are required')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 初始化默认模板
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: DialogueTemplate[] = [
      {
        id: 'greeting_default',
        name: '默认问候',
        category: 'greeting',
        content: '你好，{{userName}}！我是7zi助手，很高兴为您服务。有什么我可以帮助您的吗？',
        variables: [
          { name: 'userName', type: 'string', required: false, defaultValue: '用户' },
        ],
        conditions: [],
        priority: 1,
        enabled: true,
      },
      {
        id: 'greeting_friendly',
        name: '友好问候',
        category: 'greeting',
        content: '嗨，{{userName}}！欢迎回来！😊 今天有什么我可以帮您的吗？',
        variables: [
          { name: 'userName', type: 'string', required: false, defaultValue: '朋友' },
        ],
        conditions: [],
        priority: 2,
        enabled: true,
      },
      {
        id: 'farewell_default',
        name: '默认告别',
        category: 'farewell',
        content: '再见，{{userName}}！感谢您的使用，期待下次为您服务。',
        variables: [
          { name: 'userName', type: 'string', required: false, defaultValue: '用户' },
        ],
        conditions: [],
        priority: 1,
        enabled: true,
      },
      {
        id: 'clarification_default',
        name: '默认澄清',
        category: 'clarification',
        content: '我理解您想了解{{topic}}，让我为您详细说明一下。',
        variables: [
          { name: 'topic', type: 'string', required: true, description: '需要澄清的主题' },
        ],
        conditions: [],
        priority: 1,
        enabled: true,
      },
      {
        id: 'error_default',
        name: '默认错误',
        category: 'error',
        content: '抱歉，遇到了一个错误：{{errorMessage}}。请稍后再试或联系支持团队。',
        variables: [
          { name: 'errorMessage', type: 'string', required: true, description: '错误消息' },
        ],
        conditions: [
          { type: 'sentiment', value: 'negative', operator: 'equals' },
        ],
        priority: 1,
        enabled: true,
      },
      {
        id: 'success_default',
        name: '默认成功',
        category: 'success',
        content: '太好了！{{action}}已成功完成。🎉',
        variables: [
          { name: 'action', type: 'string', required: true, description: '执行的操作' },
        ],
        conditions: [],
        priority: 1,
        enabled: true,
      },
      {
        id: 'empathy_negative',
        name: '负面情感共情',
        category: 'empathy',
        content: '我理解您的困扰，{{userName}}。让我来帮您解决这个问题。',
        variables: [
          { name: 'userName', type: 'string', required: false, defaultValue: '朋友' },
        ],
        conditions: [
          { type: 'sentiment', value: 'negative', operator: 'equals' },
        ],
        priority: 2,
        enabled: true,
      },
      {
        id: 'general_response',
        name: '通用响应',
        category: 'general',
        content: '收到您的请求。{{#if hasDetails}}这里是详细信息：{{details}}{{/if}}',
        variables: [
          { name: 'hasDetails', type: 'boolean', required: false },
          { name: 'details', type: 'string', required: false },
        ],
        conditions: [],
        priority: 1,
        enabled: true,
      },
    ]

    for (const template of defaultTemplates) {
      this.templates.set(template.id, template)
    }
  }

  /**
   * 导出所有模板
   */
  exportTemplates(): string {
    const templates = Array.from(this.templates.values())
    return JSON.stringify(templates, null, 2)
  }

  /**
   * 导入模板
   */
  importTemplates(data: string): { success: boolean; errors: string[] } {
    const errors: string[] = []

    try {
      const templates = JSON.parse(data) as DialogueTemplate[]

      for (const template of templates) {
        const validation = this.validateTemplate(template)
        if (!validation.valid) {
          errors.push(`Template ${template.id}: ${validation.errors.join(', ')}`)
          continue
        }

        this.templates.set(template.id, template)
      }

      return {
        success: errors.length === 0,
        errors,
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  }
}