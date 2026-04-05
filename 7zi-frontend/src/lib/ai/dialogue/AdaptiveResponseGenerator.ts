/**
 * Adaptive Response Generator
 * 自适应响应生成器 - 基于情感和上下文的智能回复
 * v1.13.0
 */

import type {
  AdaptiveResponse,
  ResponseStrategy,
  SentimentAdaptation,
  ContextAdaptation,
  DialogueContext,
  SentimentResult,
  IntentResult,
  DialogueEnhancementConfig,
} from './types'
import { DEFAULT_CONFIG } from './types'

/**
 * 响应模板
 */
interface ResponseTemplate {
  strategy: ResponseStrategy
  sentiment: 'positive' | 'negative' | 'neutral'
  templates: string[]
}

/**
 * 语气映射
 */
const TONE_PHRASES: Record<string, Record<string, string[]>> = {
  formal: {
    positive: ['很高兴为您服务', '感谢您的反馈', '非常感谢'],
    negative: ['非常抱歉给您带来不便', '我们深表歉意', '我们会尽快处理'],
    neutral: ['好的', '明白了', '收到'],
  },
  casual: {
    positive: ['太棒了！', '不错哦', '很好！'],
    negative: ['哎呀，抱歉', '不好意思', '抱歉啦'],
    neutral: ['好的', 'OK', '没问题'],
  },
  friendly: {
    positive: ['太好了！😊', '很高兴听到这个！', '太棒了！'],
    negative: ['抱歉让你遇到这个问题 😔', '不好意思，我来帮你解决', '别担心，我们一起解决'],
    neutral: ['好的呢', '没问题', '收到啦'],
  },
  professional: {
    positive: ['感谢您的肯定', '很高兴能为您提供帮助', '感谢您的反馈'],
    negative: ['我们对此表示歉意', '我们会立即处理', '感谢您的耐心等待'],
    neutral: ['好的', '明白', '已收到'],
  },
}

export class AdaptiveResponseGenerator {
  private config: DialogueEnhancementConfig
  private responseTemplates: ResponseTemplate[]

  constructor(config: Partial<DialogueEnhancementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.responseTemplates = this.initializeResponseTemplates()
  }

  /**
   * 生成自适应响应
   */
  generateResponse(
    content: string,
    sentiment: SentimentResult,
    intent: IntentResult,
    context: DialogueContext
  ): AdaptiveResponse {
    // 1. 确定响应策略
    const strategy = this.determineStrategy(intent, sentiment, context)

    // 2. 情感适配
    const sentimentAdaptation = this.adaptToSentiment(sentiment, context)

    // 3. 上下文适配
    const contextAdaptation = this.adaptToContext(content, context)

    // 4. 生成响应内容
    const responseContent = this.generateContent(
      strategy,
      sentimentAdaptation,
      contextAdaptation,
      context
    )

    return {
      content: responseContent,
      strategy,
      sentimentAdaptation,
      contextAdaptation,
    }
  }

  /**
   * 确定响应策略
   */
  private determineStrategy(
    intent: IntentResult,
    sentiment: SentimentResult,
    context: DialogueContext
  ): ResponseStrategy {
    // 基于意图确定策略
    switch (intent.category) {
      case 'question':
        return 'educational'
      case 'request':
        return 'problem-solving'
      case 'complaint':
        return 'empathetic'
      case 'clarification':
        return 'clarifying'
      case 'confirmation':
        return 'direct'
      case 'greeting':
        return 'conversational'
      case 'farewell':
        return 'conversational'
      default:
        break
    }

    // 基于情感确定策略
    if (sentiment.label === 'negative') {
      return 'empathetic'
    }

    if (sentiment.label === 'positive') {
      return 'conversational'
    }

    // 基于上下文确定策略
    if (context.state === 'clarifying') {
      return 'clarifying'
    }

    if (context.state === 'resolving') {
      return 'problem-solving'
    }

    return 'direct'
  }

  /**
   * 情感适配
   */
  private adaptToSentiment(
    sentiment: SentimentResult,
    context: DialogueContext
  ): SentimentAdaptation {
    const userTone = context.userPreferences.preferredTone

    // 确定目标情感
    let targetSentiment: 'positive' | 'negative' | 'neutral' = 'neutral'

    if (sentiment.label === 'negative') {
      // 如果用户负面，目标是中性或轻微正面
      targetSentiment = 'neutral'
    } else if (sentiment.label === 'positive') {
      // 如果用户正面，目标是正面
      targetSentiment = 'positive'
    }

    // 确定语气调整
    let toneAdjustment: 'formal' | 'casual' | 'friendly' | 'professional' = userTone

    // 根据情感调整语气
    if (sentiment.label === 'negative') {
      toneAdjustment = 'friendly' // 负面时更友好
    } else if (sentiment.label === 'positive') {
      toneAdjustment = userTone // 保持用户偏好
    }

    // 情感强度调整
    const intensityAdjustment = sentiment.intensity * 0.5

    return {
      targetSentiment,
      toneAdjustment,
      intensityAdjustment,
    }
  }

  /**
   * 上下文适配
   */
  private adaptToContext(
    content: string,
    context: DialogueContext
  ): ContextAdaptation {
    // 计算上下文相关性
    const relevanceScore = this.calculateRelevanceScore(content, context)

    // 获取历史引用
    const historicalReferences = this.getHistoricalReferences(context)

    // 计算话题一致性
    const topicConsistency = this.calculateTopicConsistency(context)

    return {
      relevanceScore,
      historicalReferences,
      topicConsistency,
    }
  }

  /**
   * 计算相关性分数
   */
  private calculateRelevanceScore(content: string, context: DialogueContext): number {
    const normalizedContent = content.toLowerCase()
    let score = 0

    // 检查与当前话题的相关性
    const topicKeywords = this.getTopicKeywords(context.currentTopic)
    for (const keyword of topicKeywords) {
      if (normalizedContent.includes(keyword.toLowerCase())) {
        score += 0.2
      }
    }

    // 检查与最近轮次的相关性
    const recentTurns = context.turns.slice(-3)
    for (const turn of recentTurns) {
      const turnContent = turn.content.toLowerCase()
      const words = normalizedContent.split(/\s+/)
      for (const word of words) {
        if (turnContent.includes(word) && word.length > 2) {
          score += 0.1
        }
      }
    }

    return Math.min(score, 1)
  }

  /**
   * 获取历史引用
   */
  private getHistoricalReferences(context: DialogueContext): string[] {
    const references: string[] = []

    const recentTurns = context.turns.slice(-5)
    for (const turn of recentTurns) {
      if (turn.content.length > 10) {
        references.push(turn.content.substring(0, 50))
      }
    }

    return references
  }

  /**
   * 计算话题一致性
   */
  private calculateTopicConsistency(context: DialogueContext): number {
    if (context.turns.length < 2) {
      return 1
    }

    const recentTopics = context.turns.slice(-5).map(t => t.topic)
    const currentTopic = context.currentTopic

    const sameTopicCount = recentTopics.filter(t => t === currentTopic).length
    return sameTopicCount / recentTopics.length
  }

  /**
   * 生成响应内容
   */
  private generateContent(
    strategy: ResponseStrategy,
    sentimentAdaptation: SentimentAdaptation,
    contextAdaptation: ContextAdaptation,
    context: DialogueContext
  ): string {
    // 获取语气短语
    const tonePhrases = TONE_PHRASES[sentimentAdaptation.toneAdjustment]
    const sentimentPhrases = tonePhrases[sentimentAdaptation.targetSentiment]

    // 选择开场白
    const opening = this.selectOpening(strategy, sentimentPhrases, context)

    // 生成主体内容
    const body = this.generateBody(strategy, contextAdaptation, context)

    // 生成结束语
    const closing = this.generateClosing(strategy, context)

    // 组合响应
    let response = opening

    if (body) {
      response += '\n\n' + body
    }

    if (closing) {
      response += '\n\n' + closing
    }

    // 添加表情符号（如果用户偏好）
    if (context.userPreferences.useEmojis && sentimentAdaptation.targetSentiment === 'positive') {
      response += ' 😊'
    }

    return response
  }

  /**
   * 选择开场白
   */
  private selectOpening(
    strategy: ResponseStrategy,
    sentimentPhrases: string[],
    context: DialogueContext
  ): string {
    const phrases = sentimentPhrases.length > 0 ? sentimentPhrases : ['好的']

    // 根据策略选择短语
    switch (strategy) {
      case 'empathetic':
        return phrases[Math.floor(Math.random() * phrases.length)] + '，'
      case 'clarifying':
        return '让我来解释一下：'
      case 'educational':
        return '这是一个很好的问题：'
      case 'problem-solving':
        return '我来帮你解决这个问题：'
      case 'conversational':
        return phrases[Math.floor(Math.random() * phrases.length)] + '！'
      case 'direct':
        return phrases[Math.floor(Math.random() * phrases.length)] + '。'
      default:
        return phrases[Math.floor(Math.random() * phrases.length)] + '，'
    }
  }

  /**
   * 生成主体内容
   */
  private generateBody(
    strategy: ResponseStrategy,
    contextAdaptation: ContextAdaptation,
    context: DialogueContext
  ): string {
    // 这里应该调用实际的AI生成逻辑
    // 目前返回占位符

    const topic = context.currentTopic
    const state = context.state

    switch (strategy) {
      case 'educational':
        return `关于${topic}，我可以为您提供详细的说明和指导。`
      case 'problem-solving':
        return `针对您的问题，我建议按照以下步骤操作：\n1. 首先检查配置\n2. 然后查看日志\n3. 最后重启服务`
      case 'empathetic':
        return `我理解您的困扰。让我来帮您分析一下情况，并提供解决方案。`
      case 'clarifying':
        return `让我为您详细说明一下这个概念。`
      case 'conversational':
        return `很高兴与您交流！有什么我可以帮助您的吗？`
      case 'direct':
        return `已收到您的请求，正在处理中。`
      default:
        return ''
    }
  }

  /**
   * 生成结束语
   */
  private generateClosing(strategy: ResponseStrategy, context: DialogueContext): string {
    switch (strategy) {
      case 'educational':
        return '希望这个解释对您有帮助！'
      case 'problem-solving':
        return '如果还有其他问题，请随时告诉我。'
      case 'empathetic':
        return '我们会尽力为您解决这个问题。'
      case 'clarifying':
        return '明白了吗？如果还有疑问，请继续提问。'
      case 'conversational':
        return '还有什么我可以帮助您的吗？'
      case 'direct':
        return ''
      default:
        return ''
    }
  }

  /**
   * 获取话题关键词
   */
  private getTopicKeywords(topic: string): string[] {
    const topicKeywords: Record<string, string[]> = {
      workflow: ['工作流', 'workflow', '流程', '自动化'],
      code: ['代码', 'code', '编程', '开发'],
      data: ['数据', 'data', '分析', '统计'],
      debug: ['调试', 'debug', '错误', 'bug'],
      help: ['帮助', 'help', '教程', '文档'],
      settings: ['设置', '配置', 'settings'],
      account: ['账号', '账户', '用户'],
      billing: ['付费', '支付', '订阅'],
    }

    return topicKeywords[topic] || []
  }

  /**
   * 初始化响应模板
   */
  private initializeResponseTemplates(): ResponseTemplate[] {
    return [
      {
        strategy: 'empathetic',
        sentiment: 'negative',
        templates: [
          '非常抱歉给您带来不便',
          '我理解您的困扰',
          '抱歉让您遇到这个问题',
        ],
      },
      {
        strategy: 'conversational',
        sentiment: 'positive',
        templates: [
          '太好了！',
          '很高兴听到这个',
          '太棒了！',
        ],
      },
      {
        strategy: 'educational',
        sentiment: 'neutral',
        templates: [
          '这是一个很好的问题',
          '让我来解释一下',
          '关于这个问题',
        ],
      },
    ]
  }

  /**
   * 添加自定义响应模板
   */
  addResponseTemplate(template: ResponseTemplate): void {
    this.responseTemplates.push(template)
  }

  /**
   * 获取响应策略列表
   */
  getAvailableStrategies(): ResponseStrategy[] {
    return [
      'direct',
      'empathetic',
      'clarifying',
      'educational',
      'problem-solving',
      'conversational',
    ]
  }
}