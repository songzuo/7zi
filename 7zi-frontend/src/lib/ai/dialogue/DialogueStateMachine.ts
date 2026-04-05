/**
 * Dialogue State Machine
 * 对话状态机 - 话题转换检测、引用消解
 * v1.13.0
 */

import type {
  DialogueContext,
  DialogueState,
  StateTransition,
  TransitionRule,
  TopicDetectionResult,
  TopicTransition,
  Reference,
  DialogueEnhancementConfig,
} from './types'
import { DEFAULT_CONFIG } from './types'

/**
 * 话题关键词映射
 */
interface TopicKeywordMap {
  topic: string
  keywords: string[]
  weight: number
}

export class DialogueStateMachine {
  private config: DialogueEnhancementConfig
  private transitionRules: TransitionRule[]
  private stateHistory: Map<string, StateTransition[]>
  private topicKeywords: TopicKeywordMap[]

  constructor(config: Partial<DialogueEnhancementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.transitionRules = this.initializeTransitionRules()
    this.stateHistory = new Map()
    this.topicKeywords = this.initializeTopicKeywords()
  }

  /**
   * 状态机处理
   */
  process(
    dialogueId: string,
    content: string,
    context: DialogueContext
  ): {
    state: DialogueState
    transitions: StateTransition[]
    topic: TopicDetectionResult
    references: Reference[]
  } {
    // 1. 检测话题
    const topicResult = this.detectTopic(content, context)

    // 2. 更新话题
    if (topicResult.isTransition) {
      context.currentTopic = topicResult.topic
      if (topicResult.transition) {
        context.topicHistory.push(topicResult.transition)
      }
    }

    // 3. 引用消解
    const references = this.resolveReferences(content, context)

    // 4. 状态转换
    const { state, transitions } = this.calculateStateTransition(
      dialogueId,
      context,
      topicResult,
      references
    )

    return { state, transitions, topic: topicResult, references }
  }

  /**
   * 检测话题
   */
  detectTopic(
    content: string,
    context: DialogueContext
  ): TopicDetectionResult {
    const normalizedContent = content.toLowerCase()

    // 计算每个话题的匹配分数
    const scores: { topic: string; score: number; keywords: string[] }[] = []

    for (const topicMap of this.topicKeywords) {
      let score = 0
      const matchedKeywords: string[] = []

      for (const keyword of topicMap.keywords) {
        if (normalizedContent.includes(keyword.toLowerCase())) {
          score += topicMap.weight
          matchedKeywords.push(keyword)
        }
      }

      if (score > 0) {
        scores.push({ topic: topicMap.topic, score, keywords: matchedKeywords })
      }
    }

    // 按分数排序
    scores.sort((a, b) => b.score - a.score)

    const bestMatch = scores[0]
    const currentTopic = context.currentTopic

    // 判断是否话题转换
    let isTransition = false
    let transition: TopicTransition | undefined

    if (bestMatch && bestMatch.topic !== currentTopic) {
      const confidence = Math.min(bestMatch.score / 3, 1)

      if (confidence >= this.config.topicTransitionThreshold) {
        isTransition = true
        transition = {
          fromTopic: currentTopic,
          toTopic: bestMatch.topic,
          transitionType: this.determineTransitionType(
            context.topicHistory,
            bestMatch.topic
          ),
          timestamp: Date.now(),
          confidence,
        }
      }
    }

    return {
      topic: bestMatch?.topic || currentTopic,
      confidence: bestMatch ? Math.min(bestMatch.score / 3, 1) : 0.3,
      keywords: bestMatch?.keywords || [],
      isTransition,
      transition,
    }
  }

  /**
   * 引用消解
   */
  resolveReferences(content: string, context: DialogueContext): Reference[] {
    const references: Reference[] = []

    if (!this.config.enableReferenceResolution || context.turns.length === 0) {
      return references
    }

    const normalizedContent = content.toLowerCase()

    // 1. 指代消解 (anaphora)
    const anaphoraPatterns = [
      /它/,
      /这个/,
      /那个/,
      /这些/,
      /那些/,
      /这个(东西|事|问题)?/,
      /那个(东西|事|问题)?/,
      /它(的)?/,
      /this/,
      /that/,
      /it/,
      /these/,
      /those/,
    ]

    for (const pattern of anaphoraPatterns) {
      if (pattern.test(normalizedContent)) {
        // 查找最近的相关轮次
        const recentTurns = context.turns.slice(-5).reverse()
        const referenced = recentTurns.find(t => {
          const content = t.content.toLowerCase()
          return content.includes('问题') || content.includes('功能') || content.includes('错误')
        })

        if (referenced) {
          references.push({
            type: 'anaphora',
            content: pattern.source,
            referencedTurnId: referenced.id,
            referencedContent: referenced.content,
            confidence: 0.7,
          })
        }
      }
    }

    // 2. 省略消解 (ellipsis)
    const ellipsisPatterns = [
      /^(好的|OK|好|是的|对)$/,
      /^(可以|行|没问题)$/,
      /^(不要|不行|不用)$/,
    ]

    for (const pattern of ellipsisPatterns) {
      if (pattern.test(normalizedContent)) {
        const lastUserTurn = context.turns
          .slice(-10)
          .reverse()
          .find(t => t.content.length > 10)

        if (lastUserTurn) {
          references.push({
            type: 'ellipsis',
            content: content,
            referencedTurnId: lastUserTurn.id,
            referencedContent: lastUserTurn.content,
            confidence: 0.6,
          })
        }
      }
    }

    // 3. 共指消解 (coreference)
    const coreferencePatterns = [
      /(我|你|他|她|它)们?/,
      /(这个|那个)(功能|问题|错误)/,
      /(上述|前述)(内容|问题)/,
    ]

    for (const pattern of coreferencePatterns) {
      const match = normalizedContent.match(pattern)
      if (match) {
        const lastTurn = context.turns[context.turns.length - 1]
        if (lastTurn) {
          references.push({
            type: 'coreference',
            content: match[0],
            referencedTurnId: lastTurn.id,
            referencedContent: lastTurn.content,
            confidence: 0.65,
          })
        }
      }
    }

    return references.slice(0, 5) // 最多5个引用
  }

  /**
   * 计算状态转换
   */
  private calculateStateTransition(
    dialogueId: string,
    context: DialogueContext,
    topicResult: TopicDetectionResult,
    references: Reference[]
  ): { state: DialogueState; transitions: StateTransition[] } {
    const currentState = context.state
    let newState = currentState
    const transitions: StateTransition[] = []

    // 应用转换规则
    for (const rule of this.transitionRules) {
      if (rule.from === currentState && rule.condition(context)) {
        newState = rule.to

        // 记录转换
        const transition: StateTransition = {
          from: currentState,
          to: newState,
          trigger: this.getTriggerDescription(rule, topicResult, references),
          confidence: 0.8,
        }

        transitions.push(transition)

        // 执行动作
        if (rule.action) {
          rule.action(context)
        }

        break // 只应用第一个匹配的规则
      }
    }

    // 保存转换历史
    if (newState !== currentState) {
      const history = this.stateHistory.get(dialogueId) || []
      history.push(...transitions)
      this.stateHistory.set(dialogueId, history)
    }

    return { state: newState, transitions }
  }

  /**
   * 获取触发描述
   */
  private getTriggerDescription(
    rule: TransitionRule,
    topicResult: TopicDetectionResult,
    references: Reference[]
  ): string {
    if (topicResult.isTransition) {
      return `topic_transition: ${topicResult.topic}`
    }

    if (references.length > 0) {
      return `reference_detected: ${references[0].type}`
    }

    return 'state_condition_met'
  }

  /**
   * 确定转换类型
   */
  private determineTransitionType(
    history: TopicTransition[],
    newTopic: string
  ): 'gradual' | 'abrupt' | 'return' | 'branch' {
    // 检查是否是返回之前的话题
    const previousTopics = history.map(t => t.toTopic)
    if (previousTopics.includes(newTopic)) {
      return 'return'
    }

    // 检查是否话题跨度太大
    if (history.length > 0) {
      const lastTopic = history[history.length - 1].toTopic
      const lastTopicIndex = this.topicKeywords.findIndex(t => t.topic === lastTopic)
      const newTopicIndex = this.topicKeywords.findIndex(t => t.topic === newTopic)

      if (Math.abs(lastTopicIndex - newTopicIndex) > 3) {
        return 'abrupt'
      }
    }

    return 'gradual'
  }

  /**
   * 初始化转换规则
   */
  private initializeTransitionRules(): TransitionRule[] {
    return [
      // 问候 -> 激活
      {
        from: 'greeting',
        to: 'active',
        condition: (ctx) => ctx.turns.length >= 1,
        action: (ctx) => {
          ctx.state = 'active'
        },
      },
      // 激活 -> 澄清
      {
        from: 'active',
        to: 'clarifying',
        condition: (ctx) => {
          const lastTurn = ctx.turns[ctx.turns.length - 1]
          if (!lastTurn) return false
          const content = lastTurn.content.toLowerCase()
          return (
            content.includes('?') ||
            content.includes('吗') ||
            content.includes('什么') ||
            content.includes('怎么') ||
            content.includes('how') ||
            content.includes('what')
          )
        },
        action: (ctx) => {
          ctx.state = 'clarifying'
        },
      },
      // 澄清 -> 解决
      {
        from: 'clarifying',
        to: 'resolving',
        condition: (ctx) => {
          const lastTurn = ctx.turns[ctx.turns.length - 1]
          if (!lastTurn) return false
          const content = lastTurn.content.toLowerCase()
          return (
            content.includes('好的') ||
            content.includes('明白') ||
            content.includes('ok') ||
            content.includes('yes') ||
            content.includes('对')
          )
        },
        action: (ctx) => {
          ctx.state = 'resolving'
        },
      },
      // 任何 -> 关闭
      {
        from: 'resolving',
        to: 'closing',
        condition: (ctx) => {
          const lastTurn = ctx.turns[ctx.turns.length - 1]
          if (!lastTurn) return false
          const content = lastTurn.content.toLowerCase()
          return (
            content.includes('再见') ||
            content.includes('拜拜') ||
            content.includes('bye') ||
            content.includes('goodbye')
          )
        },
        action: (ctx) => {
          ctx.state = 'closing'
        },
      },
      // 错误 -> 激活
      {
        from: 'error',
        to: 'active',
        condition: (ctx) => ctx.turns.length >= 2,
        action: (ctx) => {
          ctx.state = 'active'
        },
      },
    ]
  }

  /**
   * 初始化话题关键词
   */
  private initializeTopicKeywords(): TopicKeywordMap[] {
    return [
      {
        topic: 'workflow',
        keywords: ['工作流', 'workflow', '流程', '自动化', '节点', '执行', '任务'],
        weight: 1.0,
      },
      {
        topic: 'code',
        keywords: ['代码', 'code', '编程', '开发', '函数', '变量', '算法'],
        weight: 1.0,
      },
      {
        topic: 'data',
        keywords: ['数据', 'data', '数据库', '分析', '统计', '报表', '导出'],
        weight: 1.0,
      },
      {
        topic: 'debug',
        keywords: ['调试', 'debug', '错误', 'bug', '问题', '修复', '排查'],
        weight: 1.2,
      },
      {
        topic: 'help',
        keywords: ['帮助', 'help', '教程', '文档', '说明', '使用', '怎么'],
        weight: 0.8,
      },
      {
        topic: 'settings',
        keywords: ['设置', '配置', 'settings', 'config', '选项', '偏好'],
        weight: 1.0,
      },
      {
        topic: 'account',
        keywords: ['账号', '账户', '用户', '登录', '注册', '权限', 'account'],
        weight: 1.0,
      },
      {
        topic: 'billing',
        keywords: ['付费', '支付', '订阅', '价格', '费用', '账单', 'billing'],
        weight: 1.2,
      },
      {
        topic: 'general',
        keywords: [],
        weight: 0.5,
      },
    ]
  }

  /**
   * 获取状态历史
   */
  getStateHistory(dialogueId: string): StateTransition[] {
    return this.stateHistory.get(dialogueId) || []
  }

  /**
   * 获取当前状态
   */
  getCurrentState(context: DialogueContext): DialogueState {
    return context.state
  }

  /**
   * 重置状态机
   */
  reset(dialogueId: string): void {
    this.stateHistory.delete(dialogueId)
  }

  /**
   * 添加自定义话题
   */
  addTopic(topic: string, keywords: string[], weight: number = 1.0): void {
    this.topicKeywords.push({ topic, keywords, weight })
    // 按权重排序
    this.topicKeywords.sort((a, b) => b.weight - a.weight)
  }

  /**
   * 添加转换规则
   */
  addTransitionRule(rule: TransitionRule): void {
    this.transitionRules.push(rule)
  }

  /**
   * 获取所有可用话题
   */
  getAvailableTopics(): string[] {
    return this.topicKeywords.map(t => t.topic)
  }
}