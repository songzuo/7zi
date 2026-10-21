/**
 * Multi-Turn Dialogue Manager
 * 多轮对话管理器
 * v1.13.0
 */

import { generateSecureId } from '@/lib/utils'
import type {
  DialogueTurn,
  DialogueContext,
  CoherenceScore,
  CoherenceAnalysis,
  DialogueEnhancementConfig,
  DialogueEnhancementError,
} from './types'
import { DEFAULT_CONFIG, ERROR_CODES } from './types'

export class MultiTurnDialogueManager {
  private contexts: Map<string, DialogueContext>
  private config: DialogueEnhancementConfig

  constructor(config: Partial<DialogueEnhancementConfig> = {}) {
    this.contexts = new Map()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 创建新对话上下文
   */
  createDialogueContext(
    dialogueId: string,
    userId: string,
    initialTopic: string = 'general'
  ): DialogueContext {
    const context: DialogueContext = {
      dialogueId,
      currentTopic: initialTopic,
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

    this.contexts.set(dialogueId, context)
    return context
  }

  /**
   * 获取对话上下文
   */
  getDialogueContext(dialogueId: string): DialogueContext | undefined {
    return this.contexts.get(dialogueId)
  }

  /**
   * 添加对话轮次
   */
  addTurn(
    dialogueId: string,
    userId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): DialogueTurn {
    const context = this.contexts.get(dialogueId)
    if (!context) {
      throw new Error(`Dialogue context not found: ${dialogueId}`)
    }

    const turn: DialogueTurn = {
      id: this.generateTurnId(),
      userId,
      content,
      timestamp: Date.now(),
      turnNumber: context.turns.length + 1,
      metadata,
    }

    context.turns.push(turn)

    // 限制上下文长度
    if (context.turns.length > this.config.maxContextLength) {
      context.turns = context.turns.slice(-this.config.maxContextLength)
    }

    return turn
  }

  /**
   * 更新对话轮次
   */
  updateTurn(
    dialogueId: string,
    turnId: string,
    updates: Partial<DialogueTurn>
  ): DialogueTurn | null {
    const context = this.contexts.get(dialogueId)
    if (!context) {
      return null
    }

    const turnIndex = context.turns.findIndex(t => t.id === turnId)
    if (turnIndex === -1) {
      return null
    }

    context.turns[turnIndex] = {
      ...context.turns[turnIndex],
      ...updates,
    }

    return context.turns[turnIndex]
  }

  /**
   * 获取对话轮次
   */
  getTurn(dialogueId: string, turnId: string): DialogueTurn | null {
    const context = this.contexts.get(dialogueId)
    if (!context) {
      return null
    }

    return context.turns.find(t => t.id === turnId) || null
  }

  /**
   * 获取最近的N轮对话
   */
  getRecentTurns(dialogueId: string, count: number = 5): DialogueTurn[] {
    const context = this.contexts.get(dialogueId)
    if (!context) {
      return []
    }

    return context.turns.slice(-count)
  }

  /**
   * 获取对话历史
   */
  getDialogueHistory(dialogueId: string): DialogueTurn[] {
    const context = this.contexts.get(dialogueId)
    if (!context) {
      return []
    }

    return [...context.turns]
  }

  /**
   * 更新当前话题
   */
  updateCurrentTopic(
    dialogueId: string,
    newTopic: string,
    transitionType: 'gradual' | 'abrupt' | 'return' | 'branch' = 'gradual'
  ): void {
    const context = this.contexts.get(dialogueId)
    if (!context) {
      return
    }

    const oldTopic = context.currentTopic

    // 记录话题转换
    context.topicHistory.push({
      fromTopic: oldTopic,
      toTopic: newTopic,
      transitionType,
      timestamp: Date.now(),
      confidence: 0.8, // 默认置信度
    })

    context.currentTopic = newTopic
  }

  /**
   * 更新对话状态
   */
  updateDialogueState(
    dialogueId: string,
    newState: 'greeting' | 'active' | 'clarifying' | 'resolving' | 'closing' | 'error'
  ): void {
    const context = this.contexts.get(dialogueId)
    if (!context) {
      return
    }

    context.state = newState
  }

  /**
   * 更新全局上下文
   */
  updateGlobalContext(
    dialogueId: string,
    updates: Record<string, unknown>
  ): void {
    const context = this.contexts.get(dialogueId)
    if (!context) {
      return
    }

    context.globalContext = {
      ...context.globalContext,
      ...updates,
    }
  }

  /**
   * 更新用户偏好
   */
  updateUserPreferences(
    dialogueId: string,
    preferences: Partial<DialogueContext['userPreferences']>
  ): void {
    const context = this.contexts.get(dialogueId)
    if (!context) {
      return
    }

    context.userPreferences = {
      ...context.userPreferences,
      ...preferences,
    }
  }

  /**
   * 计算对话连贯性评分
   */
  calculateCoherenceScore(dialogueId: string): CoherenceScore {
    const context = this.contexts.get(dialogueId)
    if (!context || context.turns.length < 2) {
      return {
        overall: 0,
        topicCoherence: 0,
        intentCoherence: 0,
        sentimentCoherence: 0,
        referenceCoherence: 0,
        analysis: {
          topicTransitions: 0,
          avgTopicDuration: 0,
          intentConsistency: 0,
          sentimentStability: 0,
          referenceAccuracy: 0,
        },
      }
    }

    const analysis = this.analyzeCoherence(context)
    const overall = this.calculateOverallScore(analysis)

    return {
      overall,
      topicCoherence: analysis.topicTransitions > 0 ? 5 - analysis.topicTransitions * 0.5 : 5,
      intentCoherence: analysis.intentConsistency * 5,
      sentimentCoherence: analysis.sentimentStability * 5,
      referenceCoherence: analysis.referenceAccuracy * 5,
      analysis,
    }
  }

  /**
   * 分析对话连贯性
   */
  private analyzeCoherence(context: DialogueContext): CoherenceAnalysis {
    const turns = context.turns

    // 话题转换次数
    const topicTransitions = context.topicHistory.length

    // 平均话题持续时间
    let avgTopicDuration = 0
    if (topicTransitions > 0) {
      const totalDuration = turns[turns.length - 1].timestamp - turns[0].timestamp
      avgTopicDuration = totalDuration / (topicTransitions + 1)
    }

    // 意图一致性
    let intentConsistency = 0
    const intents = turns.filter(t => t.intent).map(t => t.intent!)
    if (intents.length > 1) {
      const uniqueIntents = new Set(intents)
      intentConsistency = 1 - (uniqueIntents.size / intents.length) * 0.5
    }

    // 情感稳定性
    let sentimentStability = 0
    const sentiments = turns.filter(t => t.sentiment).map(t => t.sentiment!)
    if (sentiments.length > 1) {
      let totalChange = 0
      for (let i = 1; i < sentiments.length; i++) {
        totalChange += Math.abs(sentiments[i].intensity - sentiments[i - 1].intensity)
      }
      sentimentStability = 1 - Math.min(totalChange / sentiments.length, 1)
    }

    // 引用准确性
    let referenceAccuracy = 0
    const references = turns.filter(t => t.references && t.references.length > 0)
    if (references.length > 0) {
      const validReferences = references.filter(t =>
        t.references!.every(r => r.confidence > 0.7)
      )
      referenceAccuracy = validReferences.length / references.length
    }

    return {
      topicTransitions,
      avgTopicDuration,
      intentConsistency,
      sentimentStability,
      referenceAccuracy,
    }
  }

  /**
   * 计算总体评分
   */
  private calculateOverallScore(analysis: CoherenceAnalysis): number {
    const weights = {
      topicTransitions: 0.3,
      intentConsistency: 0.25,
      sentimentStability: 0.25,
      referenceAccuracy: 0.2,
    }

    const topicScore = Math.max(0, 5 - analysis.topicTransitions * 0.5)
    const intentScore = analysis.intentConsistency * 5
    const sentimentScore = analysis.sentimentStability * 5
    const referenceScore = analysis.referenceAccuracy * 5

    const overall =
      topicScore * weights.topicTransitions +
      intentScore * weights.intentConsistency +
      sentimentScore * weights.sentimentStability +
      referenceScore * weights.referenceAccuracy

    return Math.round(overall * 100) / 100
  }

  /**
   * 检查连贯性是否达标
   */
  isCoherenceAboveTarget(dialogueId: string): boolean {
    const score = this.calculateCoherenceScore(dialogueId)
    return score.overall >= this.config.coherenceTarget
  }

  /**
   * 清除对话上下文
   */
  clearDialogueContext(dialogueId: string): void {
    this.contexts.delete(dialogueId)
  }

  /**
   * 获取所有对话上下文
   */
  getAllContexts(): DialogueContext[] {
    return Array.from(this.contexts.values())
  }

  /**
   * 获取对话统计信息
   */
  getDialogueStats(dialogueId: string): {
    totalTurns: number
    totalDuration: number
    avgTurnDuration: number
    topicChanges: number
    coherenceScore: CoherenceScore
  } | null {
    const context = this.contexts.get(dialogueId)
    if (!context || context.turns.length === 0) {
      return null
    }

    const turns = context.turns
    const totalDuration = turns[turns.length - 1].timestamp - turns[0].timestamp
    const avgTurnDuration = totalDuration / turns.length

    return {
      totalTurns: turns.length,
      totalDuration,
      avgTurnDuration,
      topicChanges: context.topicHistory.length,
      coherenceScore: this.calculateCoherenceScore(dialogueId),
    }
  }

  /**
   * 生成轮次ID
   */
  private generateTurnId(): string {
    return generateSecureId('turn')
  }

  /**
   * 导出对话上下文
   */
  exportContext(dialogueId: string): string | null {
    const context = this.contexts.get(dialogueId)
    if (!context) {
      return null
    }

    return JSON.stringify(context, null, 2)
  }

  /**
   * 导入对话上下文
   */
  importContext(dialogueId: string, data: string): boolean {
    try {
      const context = JSON.parse(data) as DialogueContext
      this.contexts.set(dialogueId, context)
      return true
    } catch (error) {
      console.error('Failed to import dialogue context:', error)
      return false
    }
  }
}