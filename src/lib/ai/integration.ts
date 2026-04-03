/**
 * 多模型智能路由系统 - 集成
 * v1.10.0
 */

// 注意：routing 已通过 index.ts 导出，不要在此重复导出

// 保留现有的路由系统（向后兼容）
export * from './router'
export * from './models'
export * from './types'
export * from './classifier'
export * from './complexity'
export * from './cache'
export * from './rate-limiter'
export * from './fallback'

// 新路由系统集成
import {
  ModelRouter as NewModelRouter,
  modelRouter as newModelRouter,
  routeRequest as newRouteRequest,
} from './routing'

import {
  ModelRouter as OldModelRouter,
  modelRouter as oldModelRouter,
} from './router'

import {
  RouteRequest,
  RouteDecision,
  TaskType,
  TaskComplexity,
  RoutingStrategy,
  ModelCapability,
} from './routing/types'

/**
 * AI 服务接口
 */
interface AIService {
  generate(prompt: string, model: string): Promise<string>
  generateStream(prompt: string, model: string): AsyncGenerator<string>
}

/**
 * 智能路由 AI 服务包装器（使用新的路由系统）
 */
export class SmartRoutingAIService implements AIService {
  private router: NewModelRouter
  private underlyingService: AIService

  constructor(underlyingService: AIService, router?: NewModelRouter) {
    this.underlyingService = underlyingService
    this.router = router || newModelRouter
  }

  /**
   * 生成响应 (自动路由)
   */
  async generate(prompt: string): Promise<string> {
    // 使用新的路由系统
    const decision = this.router.route({
      taskType: TaskType.CONVERSATION,
      prompt,
    })

    const result = await this.underlyingService.generate(
      prompt,
      decision.selectedModel.model
    )

    return result
  }

  /**
   * 流式生成 (自动路由)
   */
  async *generateStream(prompt: string): AsyncGenerator<string> {
    const decision = this.router.route({
      taskType: TaskType.CONVERSATION,
      prompt,
    })

    yield* this.underlyingService.generateStream(
      prompt,
      decision.selectedModel.model
    )
  }

  /**
   * 高级路由（带完整参数）
   */
  async generateWithRouting(request: {
    prompt: string
    taskType?: TaskType
    complexity?: TaskComplexity
    budget?: number
    strategy?: RoutingStrategy
    requiredCapabilities?: ModelCapability[]
  }): Promise<{ response: string; decision: RouteDecision }> {
    const decision = this.router.route({
      taskType: request.taskType ?? TaskType.CONVERSATION,
      prompt: request.prompt,
      complexity: request.complexity,
      budget: request.budget,
      strategy: request.strategy,
      requiredCapabilities: request.requiredCapabilities,
    })

    const response = await this.underlyingService.generate(
      request.prompt,
      decision.selectedModel.model
    )

    return { response, decision }
  }

  /**
   * 执行带降级的请求
   */
  async generateWithFallback(prompt: string): Promise<{
    response: string
    model: string
    retries: number
  }> {
    const decision = this.router.route({
      taskType: TaskType.CONVERSATION,
      prompt,
    })

    let lastError: Error | null = null
    let retries = 0

    // 尝试主模型
    try {
      const response = await this.underlyingService.generate(
        prompt,
        decision.selectedModel.model
      )
      return { response, model: decision.selectedModel.model, retries }
    } catch (error) {
      lastError = error as Error
      retries++
    }

    // 尝试备用模型
    for (const fallback of decision.fallbackModels) {
      try {
        const response = await this.underlyingService.generate(
          prompt,
          fallback.model
        )
        return { response, model: fallback.model, retries }
      } catch (error) {
        lastError = error as Error
        retries++
      }
    }

    throw lastError || new Error('All models failed')
  }

  /**
   * 获取路由统计
   */
  getStats() {
    return this.router.getStats()
  }
}

/**
 * Agent 集成示例
 */
export class AgentWithSmartRouting {
  private aiService: SmartRoutingAIService
  private agentId: string

  constructor(agentId: string, aiService: AIService) {
    this.agentId = agentId
    this.aiService = new SmartRoutingAIService(aiService)
  }

  /**
   * 处理用户消息
   */
  async handleMessage(message: string): Promise<string> {
    return this.aiService.generate(message)
  }

  /**
   * 流式处理用户消息
   */
  async *handleMessageStream(message: string): AsyncGenerator<string> {
    yield* this.aiService.generateStream(message)
  }

  /**
   * 执行任务（带完整路由参数）
   */
  async executeTask(task: {
    prompt: string
    taskType?: TaskType
    budget?: number
    strategy?: RoutingStrategy
  }): Promise<{
    response: string
    decision: RouteDecision
  }> {
    return this.aiService.generateWithRouting(task)
  }

  /**
   * 获取 Agent 统计
   */
  getStats() {
    return {
      agentId: this.agentId,
      ...this.aiService.getStats(),
    }
  }
}

/**
 * 使用示例
 */
export async function exampleUsage() {
  // 1. 创建底层 AI 服务 (需要实现)
  const mockAIService: AIService = {
    async generate(prompt, model) {
      return `[${model}] Response to: ${prompt}`
    },
    async *generateStream(prompt, model) {
      yield `[${model}] Streaming: ${prompt}`
    },
  }

  // 2. 创建带智能路由的 Agent
  const agent = new AgentWithSmartRouting('agent-1', mockAIService)

  // 3. 处理不同类型的消息
  const codeResponse = await agent.executeTask({
    prompt: 'Write a function to calculate fibonacci',
    taskType: TaskType.CODE_GENERATION,
    budget: 100,
  })
  console.log('Code response:', codeResponse.response)
  console.log('Selected model:', codeResponse.decision.selectedModel.displayName)

  const chatResponse = await agent.handleMessage('Hello, how are you?')
  console.log('Chat response:', chatResponse)

  // 4. 流式处理
  for await (const chunk of agent.handleMessageStream('Tell me a story')) {
    console.log('Stream chunk:', chunk)
  }

  // 5. 查看统计
  console.log('Stats:', agent.getStats())
}

/**
 * 高级用法: 自定义路由配置
 */
export function advancedUsage() {
  const customRouter = new NewModelRouter({
    defaultStrategy: RoutingStrategy.COST_OPTIMIZED,
    defaultModelId: 'gpt-4o',
    concurrency: {
      maxConcurrent: 20,
      maxQueueSize: 200,
      queueTimeout: 60000,
    },
    enableCache: true,
    cacheTTL: 600000, // 10 分钟
    enableFallback: true,
    maxFallbackAttempts: 5,
    enableCostOptimization: true,
    dailyBudgetLimit: 10000, // 100 元
  })

  // 使用自定义路由器
  const decision = customRouter.route({
    taskType: TaskType.CODE_GENERATION,
    prompt: 'Write a complex algorithm',
    budget: 100,
    strategy: RoutingStrategy.QUALITY_OPTIMIZED,
    requiredCapabilities: [ModelCapability.CODE],
  })

  console.log('Selected model:', decision.selectedModel.displayName)
  console.log('Estimated cost:', decision.estimatedCost)
  console.log('Reasoning:', decision.reasoning)

  // 获取可视化数据
  const viz = customRouter.getVisualization({
    taskType: TaskType.CODE_GENERATION,
    prompt: 'Write code',
  })

  console.log('Candidates:', viz.candidates.map((c) => ({
    model: c.model.displayName,
    score: c.score,
    reasons: c.reasons,
  })))
}

/**
 * 与现有 Agent 系统集成
 */
export function integrateWithExistingAgents() {
  // 假设现有系统有 AgentExecutor 接口
  interface AgentExecutor {
    execute(task: string): Promise<string>
  }

  // 包装现有 Agent
  class SmartRoutingAgentWrapper implements AgentExecutor {
    private agent: AgentWithSmartRouting

    constructor(agent: AgentWithSmartRouting) {
      this.agent = agent
    }

    async execute(task: string): Promise<string> {
      return this.agent.handleMessage(task)
    }
  }

  // 使用
  const mockAIService: AIService = {
    async generate(prompt, model) {
      return `[${model}] ${prompt}`
    },
    async *generateStream(prompt, model) {
      yield `[${model}] ${prompt}`
    },
  }

  const agent = new AgentWithSmartRouting('agent-1', mockAIService)
  const wrapper = new SmartRoutingAgentWrapper(agent)

  // 现有代码无需修改
  wrapper.execute('Write code').then(console.log)
}

/**
 * 监控和调试
 */
export function monitoringExample() {
  const router = newModelRouter

  // 路由一些请求
  router.route({
    taskType: TaskType.CODE_GENERATION,
    prompt: 'Write a function',
  })

  router.route({
    taskType: TaskType.CONVERSATION,
    prompt: 'Hello',
  })

  // 查看统计
  const stats = router.getStats()
  console.log('Total requests:', stats.totalRequests)
  console.log('Cache hits:', stats.cacheHits)
  console.log('Average latency:', stats.avgLatency)
  console.log('Total cost:', stats.totalCost)
  console.log('By model:', Object.fromEntries(stats.byModel))
  console.log('By strategy:', Object.fromEntries(stats.byStrategy))
}

/**
 * 向后兼容：导出旧的接口
 */
export const modelRouterCompat = oldModelRouter