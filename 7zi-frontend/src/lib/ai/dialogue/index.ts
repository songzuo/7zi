/**
 * AI Dialogue Enhancement System
 * AI 对话增强系统 - 统一导出
 * v1.13.0
 */

export * from './types'
export { MultiTurnDialogueManager } from './MultiTurnDialogueManager'
export { EnhancedIntentAnalyzer } from './EnhancedIntentAnalyzer'
export { SentimentAnalyzer } from './SentimentAnalyzer'
export { DialogueStateMachine } from './DialogueStateMachine'
export { AdaptiveResponseGenerator } from './AdaptiveResponseGenerator'
export { DialogueTemplateEngine } from './DialogueTemplateEngine'

/**
 * AI 对话增强系统 - 主类
 * 集成所有子模块，提供统一的接口
 */

import {
  MultiTurnDialogueManager,
  EnhancedIntentAnalyzer,
  SentimentAnalyzer,
  DialogueStateMachine,
  AdaptiveResponseGenerator,
  DialogueTemplateEngine,
} from './.'
import type {
  DialogueContext,
  DialogueTurn,
  SentimentResult,
  IntentResult,
  AdaptiveResponse,
  CoherenceScore,
  DialogueEnhancementConfig,
} from './types'
import { DEFAULT_CONFIG } from './types'

export class AIDialogueEnhancementSystem {
  private dialogueManager: MultiTurnDialogueManager
  private intentAnalyzer: EnhancedIntentAnalyzer
  private sentimentAnalyzer: SentimentAnalyzer
  private stateMachine: DialogueStateMachine
  private responseGenerator: AdaptiveResponseGenerator
  private templateEngine: DialogueTemplateEngine
  private config: DialogueEnhancementConfig

  constructor(config: Partial<DialogueEnhancementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 初始化所有子模块
    this.dialogueManager = new MultiTurnDialogueManager(this.config)
    this.intentAnalyzer = new EnhancedIntentAnalyzer(this.config)
    this.sentimentAnalyzer = new SentimentAnalyzer(this.config)
    this.stateMachine = new DialogueStateMachine(this.config)
    this.responseGenerator = new AdaptiveResponseGenerator(this.config)
    this.templateEngine = new DialogueTemplateEngine(this.config)
  }

  /**
   * 创建新对话
   */
  createDialogue(
    dialogueId: string,
    userId: string,
    initialTopic: string = 'general'
  ): DialogueContext {
    return this.dialogueManager.createDialogueContext(
      dialogueId,
      userId,
      initialTopic
    )
  }

  /**
   * 处理用户消息 - 完整流程
   */
  async processMessage(
    dialogueId: string,
    userId: string,
    content: string
  ): Promise<{
    turn: DialogueTurn
    intent: IntentResult
    sentiment: SentimentResult
    response: AdaptiveResponse
    coherence: CoherenceScore
  }> {
    // 获取上下文
    let context = this.dialogueManager.getDialogueContext(dialogueId)
    if (!context) {
      context = this.createDialogue(dialogueId, userId)
    }

    // 1. 添加对话轮次
    const turn = this.dialogueManager.addTurn(dialogueId, userId, content)

    // 2. 分析意图
    const intent = this.intentAnalyzer.analyzeIntent(content, context)

    // 3. 分析情感
    const sentiment = this.sentimentAnalyzer.analyzeSentiment(content, context)

    // 4. 更新轮次信息
    this.dialogueManager.updateTurn(dialogueId, turn.id, {
      intent: intent.category,
      intentConfidence: intent.confidence,
      sentiment,
    })

    // 5. 状态机处理
    const { state, topic, references } = this.stateMachine.process(
      dialogueId,
      content,
      context
    )

    // 6. 更新话题和引用
    this.dialogueManager.updateTurn(dialogueId, turn.id, {
      topic: topic.topic,
      references,
    })

    // 7. 生成响应
    const response = this.responseGenerator.generateResponse(
      content,
      sentiment,
      intent,
      context
    )

    // 8. 计算连贯性
    const coherence = this.dialogueManager.calculateCoherenceScore(dialogueId)

    // 9. 检查连贯性是否达标
    if (!this.dialogueManager.isCoherenceAboveTarget(dialogueId)) {
      console.warn(`Dialogue coherence below target: ${coherence.overall}`)
    }

    return { turn, intent, sentiment, response, coherence }
  }

  /**
   * 快速生成响应（不完整流程）
   */
  generateQuickResponse(
    content: string,
    dialogueId: string
  ): AdaptiveResponse {
    const context = this.dialogueManager.getDialogueContext(dialogueId)
    const intent = this.intentAnalyzer.analyzeIntent(content, context)
    const sentiment = this.sentimentAnalyzer.analyzeSentiment(content, context)

    return this.responseGenerator.generateResponse(
      content,
      sentiment,
      intent,
      context || {
        dialogueId: '',
        currentTopic: 'general',
        topicHistory: [],
        turns: [],
        globalContext: {},
        userPreferences: {
          preferredTone: 'friendly',
          preferredLength: 'medium',
          useEmojis: true,
          language: 'zh-CN',
        },
        state: 'greeting',
      }
    )
  }

  /**
   * 使用模板渲染响应
   */
  renderTemplate(
    templateId: string,
    variables?: Record<string, string | number | boolean | string[]>
  ): string {
    // 注意：需要有效的 dialogueId 来访问上下文
    // 如果不需要上下文，可以直接调用模板引擎
    try {
      const context = this.dialogueManager.getDialogueContext('__default__')
      return this.templateEngine.render(templateId, variables, context)
    } catch {
      return this.templateEngine.render(templateId, variables)
    }
  }

  /**
   * 智能选择并渲染模板
   */
  renderSmartTemplate(
    category: 'greeting' | 'farewell' | 'clarification' | 'confirmation' | 'error' | 'success' | 'empathy' | 'general',
    dialogueId: string,
    variables?: Record<string, string | number | boolean | string[]>
  ): string | null {
    const context = this.dialogueManager.getDialogueContext(dialogueId)
    const lastTurn = context?.turns[context.turns.length - 1]

    return this.templateEngine.renderSmart(
      category,
      context,
      lastTurn?.sentiment,
      lastTurn?.intent as any,
      variables
    )
  }

  /**
   * 获取对话统计
   */
  getDialogueStats(dialogueId: string) {
    return this.dialogueManager.getDialogueStats(dialogueId)
  }

  /**
   * 获取对话连贯性
   */
  getCoherenceScore(dialogueId: string): CoherenceScore {
    return this.dialogueManager.calculateCoherenceScore(dialogueId)
  }

  /**
   * 检查连贯性是否达标
   */
  isCoherenceAboveTarget(dialogueId: string): boolean {
    return this.dialogueManager.isCoherenceAboveTarget(dialogueId)
  }

  /**
   * 获取对话历史
   */
  getDialogueHistory(dialogueId: string): DialogueTurn[] {
    return this.dialogueManager.getDialogueHistory(dialogueId)
  }

  /**
   * 清除对话
   */
  clearDialogue(dialogueId: string): void {
    this.dialogueManager.clearDialogueContext(dialogueId)
    this.stateMachine.reset(dialogueId)
  }

  /**
   * 获取配置
   */
  getConfig(): DialogueEnhancementConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<DialogueEnhancementConfig>): void {
    this.config = { ...this.config, ...updates }

    // 更新所有子模块配置
    // 注意：这里需要子模块支持动态配置更新
  }

  // ============================================
  // 子模块访问器
  // ============================================

  /**
   * 获取对话管理器
   */
  getDialogueManager(): MultiTurnDialogueManager {
    return this.dialogueManager
  }

  /**
   * 获取意图分析器
   */
  getIntentAnalyzer(): EnhancedIntentAnalyzer {
    return this.intentAnalyzer
  }

  /**
   * 获取情感分析器
   */
  getSentimentAnalyzer(): SentimentAnalyzer {
    return this.sentimentAnalyzer
  }

  /**
   * 获取状态机
   */
  getStateMachine(): DialogueStateMachine {
    return this.stateMachine
  }

  /**
   * 获取响应生成器
   */
  getResponseGenerator(): AdaptiveResponseGenerator {
    return this.responseGenerator
  }

  /**
   * 获取模板引擎
   */
  getTemplateEngine(): DialogueTemplateEngine {
    return this.templateEngine
  }
}