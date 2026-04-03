/**
 * AI Agent 调用节点执行器
 * 支持多模型、提示词模板、工具调用、上下文管理
 */

import { NodeExecutor, ExecutionContext, ExecutionResult, addLog } from '../../lib/workflow/types'
import { NodeType, NodeStatus, WorkflowNode } from '@/types/workflow'

/**
 * AI 模型提供商
 */
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  AZURE = 'azure',
  LOCAL = 'local',
  CUSTOM = 'custom',
  VOLCENGINE = 'volcengine',
  MINIMAX = 'minimax',
  BAIDU = 'baidu',
  ALIBABA = 'alibaba',
}

/**
 * AI Agent 配置
 */
export interface AIAgentConfig {
  // 模型配置
  provider: AIProvider // 提供商
  model: string // 模型名称
  apiKey?: string // API Key（可从环境变量获取）
  baseUrl?: string // 自定义 API 地址
  deploymentId?: string // Azure 部署 ID

  // Agent 配置
  agentId?: string // Agent ID（如果是预定义的 Agent）
  agentType?: string // Agent 类型
  systemPrompt?: string // 系统提示词
  userPrompt?: string // 用户提示词
  promptTemplate?: string // 提示词模板（支持变量插值）

  // 模型参数
  temperature?: number // 温度 (0-2)
  maxTokens?: number // 最大输出 Token 数
  topP?: number // Top-p 采样
  frequencyPenalty?: number // 频率惩罚
  presencePenalty?: number // 存在惩罚
  stopSequences?: string[] // 停止序列

  // 工具调用
  tools?: AITool[] // 可用工具
  toolChoice?: 'auto' | 'none' | { type: 'function'; name: string } // 工具选择策略

  // 上下文管理
  includeHistory?: boolean // 是否包含历史对话
  maxHistoryMessages?: number // 最大历史消息数
  contextWindow?: number // 上下文窗口大小

  // 执行配置
  timeout?: number // 超时时间（秒）
  retryCount?: number // 重试次数
  streamOutput?: boolean // 是否流式输出

  // 输出配置
  outputFormat?: 'text' | 'json' | 'markdown' // 输出格式
  jsonSchema?: Record<string, unknown> // JSON Schema（用于结构化输出）
}

/**
 * AI 工具定义
 */
export interface AITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/**
 * AI Agent 执行结果
 */
export interface AIAgentExecutionResult {
  provider: AIProvider
  model: string
  status: NodeStatus

  // 生成的回复
  response?: {
    content: string
    role: 'assistant'
    tokens?: {
      prompt: number
      completion: number
      total: number
    }
  }

  // 工具调用结果
  toolCalls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
    result?: unknown
  }>

  // 执行元数据
  metadata: {
    duration: number
    retryCount?: number
    finishReason?: string
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
  }
}

/**
 * 消息格式
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  toolCallId?: string
}

export class AIAgentNodeExecutor implements NodeExecutor {
  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.AGENT
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!node.id) {
      errors.push('AI Agent 节点必须包含 ID')
    }

    if (!node.name) {
      errors.push('AI Agent 节点必须包含名称')
    }

    // 支持新旧配置格式
    const hasOldConfig = node.agentConfig
    const hasNewConfig = node.config?.aiAgent as AIAgentConfig | undefined

    if (!hasOldConfig && !hasNewConfig) {
      errors.push('AI Agent 节点必须配置 agentConfig 或 config.aiAgent')
    }

    // 验证新配置
    if (hasNewConfig) {
      if (!hasNewConfig.model) {
        errors.push('AI Agent 节点必须指定模型')
      }

      if (!hasNewConfig.provider) {
        errors.push('AI Agent 节点必须指定提供商')
      }

      if (hasNewConfig.temperature !== undefined && (hasNewConfig.temperature < 0 || hasNewConfig.temperature > 2)) {
        errors.push('温度参数必须在 0-2 之间')
      }

      if (hasNewConfig.maxTokens !== undefined && hasNewConfig.maxTokens < 1) {
        errors.push('最大 Token 数必须大于 0')
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

    addLog(context, 'info', `开始执行 AI Agent 节点: ${node.name}`)

    try {
      // 获取配置
      const config = this.getConfig(node)

      addLog(context, 'info', `调用 AI 模型: ${config.provider}/${config.model}`)

      // 准备消息
      const messages = this.prepareMessages(config, inputs, variables)

      addLog(context, 'info', `准备消息完成: ${messages.length} 条消息`)

      // 执行 AI 调用（带重试）
      const result = await this.executeWithRetry(config, messages, context)

      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      addLog(context, 'info', `AI 调用完成: 耗时 ${duration}ms`)

      // 根据输出格式处理响应
      const processedOutput = this.processOutput(result, config)

      return {
        status: result.status,
        output: {
          provider: result.provider,
          model: result.model,
          response: result.response,
          toolCalls: result.toolCalls,
          duration,
          tokens: result.response?.tokens,
          finishReason: result.metadata.finishReason,
          processedOutput,
        },
        logs: context.logs,
        metrics: {
          cpuTime: duration,
          memoryUsage: process.memoryUsage?.().heapUsed,
          networkCalls: 1,
        },
      }
    } catch (error) {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      addLog(
        context,
        'error',
        `AI Agent 执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      )

      return {
        status: NodeStatus.FAILED,
        error: {
          nodeId: node.id,
          code: 'AI_AGENT_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'AI Agent 执行失败',
          stack: error instanceof Error ? error.stack : undefined,
          retryable: true,
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
   * 获取配置
   */
  private getConfig(node: WorkflowNode): AIAgentConfig {
    const aiConfig = node.config?.aiAgent as AIAgentConfig | undefined

    if (aiConfig) {
      return {
        provider: aiConfig.provider || AIProvider.OPENAI,
        model: aiConfig.model,
        temperature: aiConfig.temperature ?? 0.7,
        maxTokens: aiConfig.maxTokens || 2048,
        timeout: aiConfig.timeout || 30,
        retryCount: aiConfig.retryCount || 0,
        outputFormat: aiConfig.outputFormat || 'text',
        ...aiConfig,
      }
    }

    // 兼容旧配置
    const oldConfig = node.agentConfig!
    return {
      provider: AIProvider.OPENAI,
      model: oldConfig.model || 'gpt-4',
      agentId: oldConfig.agentId,
      agentType: oldConfig.agentType,
      systemPrompt: oldConfig.prompt,
      temperature: 0.7,
      maxTokens: 2048,
      timeout: oldConfig.timeout || 30,
      retryCount: oldConfig.retryCount || 0,
      outputFormat: 'text',
    }
  }

  /**
   * 准备消息列表
   */
  private prepareMessages(
    config: AIAgentConfig,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): ChatMessage[] {
    const messages: ChatMessage[] = []

    // 系统提示词
    if (config.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.interpolateTemplate(config.systemPrompt, inputs, variables),
      })
    }

    // 用户提示词
    const userPrompt = config.promptTemplate
      ? this.interpolateTemplate(config.promptTemplate, inputs, variables)
      : config.userPrompt
        ? this.interpolateTemplate(config.userPrompt, inputs, variables)
        : this.getDefaultUserPrompt(inputs, variables)

    messages.push({
      role: 'user',
      content: userPrompt,
    })

    return messages
  }

  /**
   * 插值模板
   */
  private interpolateTemplate(
    template: string,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): string {
    const context = { ...inputs, ...variables }

    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim()
      const value = this.resolveValue(trimmedKey, context)
      return value !== undefined ? String(value) : match
    })
  }

  /**
   * 解析值
   */
  private resolveValue(path: string, context: Record<string, unknown>): unknown {
    const parts = path.split('.')
    let value: unknown = context

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
   * 获取默认用户提示词
   */
  private getDefaultUserPrompt(
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): string {
    const context = { ...inputs, ...variables }
    return `请处理以下数据:\n${JSON.stringify(context, null, 2)}`
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(
    config: AIAgentConfig,
    messages: ChatMessage[],
    context: ExecutionContext
  ): Promise<AIAgentExecutionResult> {
    const maxRetries = config.retryCount || 0

    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        addLog(context, 'info', `重试第 ${attempt} 次...`)
        await this.delay(1000 * attempt) // 指数退避
      }

      try {
        return await this.executeAICall(config, messages, context)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        addLog(context, 'warn', `AI 调用失败: ${lastError.message}`)

        // 检查是否可重试
        if (this.isRetryableError(error) && attempt < maxRetries) {
          continue
        }

        throw lastError
      }
    }

    throw lastError || new Error('AI 调用失败')
  }

  /**
   * 执行 AI 调用
   */
  private async executeAICall(
    config: AIAgentConfig,
    messages: ChatMessage[],
    context: ExecutionContext
  ): Promise<AIAgentExecutionResult> {
    const startedAt = Date.now()

    addLog(context, 'info', `发送请求到 ${config.provider}/${config.model}`)

    // 模拟 AI 调用（实际实现需要调用具体的 AI SDK）
    const simulatedResponse = await this.simulateAICall(config, messages, context)

    const duration = Date.now() - startedAt

    return {
      provider: config.provider,
      model: config.model,
      status: NodeStatus.SUCCESS,
      response: simulatedResponse.response,
      toolCalls: simulatedResponse.toolCalls,
      metadata: {
        duration,
        finishReason: simulatedResponse.finishReason,
        usage: simulatedResponse.usage,
      },
    }
  }

  /**
   * 模拟 AI 调用
   */
  private async simulateAICall(
    config: AIAgentConfig,
    messages: ChatMessage[],
    _context: ExecutionContext
  ): Promise<{
    response: AIAgentExecutionResult['response']
    toolCalls?: AIAgentExecutionResult['toolCalls']
    finishReason: string
    usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  }> {
    // 模拟网络延迟
    const delay = config.timeout ? Math.min(config.timeout * 50, 1000) : 300
    await new Promise(resolve => setTimeout(resolve, delay))

    // 模拟 Token 计算
    const promptTokens = messages.reduce((sum, m) => sum + m.content.length / 4, 0)
    const completionTokens = 100

    // 模拟响应
    const lastMessage = messages[messages.length - 1]
    const responseContent = this.generateSimulatedResponse(lastMessage.content, config)

    return {
      response: {
        content: responseContent,
        role: 'assistant',
        tokens: {
          prompt: Math.round(promptTokens),
          completion: Math.round(completionTokens),
          total: Math.round(promptTokens + completionTokens),
        },
      },
      finishReason: 'stop',
      usage: {
        promptTokens: Math.round(promptTokens),
        completionTokens: Math.round(completionTokens),
        totalTokens: Math.round(promptTokens + completionTokens),
      },
    }
  }

  /**
   * 生成模拟响应
   */
  private generateSimulatedResponse(prompt: string, config: AIAgentConfig): string {
    if (config.outputFormat === 'json') {
      return JSON.stringify({
        success: true,
        result: '处理完成',
        input: prompt.substring(0, 100),
        timestamp: new Date().toISOString(),
      })
    }

    if (config.outputFormat === 'markdown') {
      return `# AI 响应\n\n收到输入：${prompt.substring(0, 50)}...\n\n## 处理结果\n\n处理已完成。`
    }

    return `AI 处理完成。根据输入内容，已完成分析并提供响应。`
  }

  /**
   * 处理输出
   */
  private processOutput(
    result: AIAgentExecutionResult,
    config: AIAgentConfig
  ): Record<string, unknown> {
    const content = result.response?.content || ''

    if (config.outputFormat === 'json') {
      try {
        return JSON.parse(content)
      } catch {
        return { rawContent: content, parseError: true }
      }
    }

    return { content }
  }

  /**
   * 检查是否可重试的错误
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      // 常见可重试错误
      return (
        message.includes('timeout') ||
        message.includes('rate limit') ||
        message.includes('overloaded') ||
        message.includes('service unavailable') ||
        message.includes('503') ||
        message.includes('429')
      )
    }
    return false
  }

  /**
   * 延迟辅助函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}