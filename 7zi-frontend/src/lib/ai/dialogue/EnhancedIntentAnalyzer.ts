/**
 * Enhanced Intent Analyzer
 * 增强意图理解分析器
 * v1.13.0
 */

import type {
  IntentResult,
  IntentCategory,
  Entity,
  DialogueContext,
  DialogueEnhancementConfig,
} from './types'
import { DEFAULT_CONFIG, ERROR_CODES } from './types'

/**
 * 意图模式匹配规则
 */
interface IntentPattern {
  category: IntentCategory
  patterns: string[]
  keywords: string[]
  priority: number
}

/**
 * 实体提取规则
 */
interface EntityPattern {
  type: string
  patterns: RegExp[]
  priority: number
}

export class EnhancedIntentAnalyzer {
  private config: DialogueEnhancementConfig
  private intentPatterns: IntentPattern[]
  private entityPatterns: EntityPattern[]
  private confidenceThreshold: number

  constructor(config: Partial<DialogueEnhancementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.confidenceThreshold = this.config.intentThreshold

    this.intentPatterns = this.initializeIntentPatterns()
    this.entityPatterns = this.initializeEntityPatterns()
  }

  /**
   * 分析意图
   */
  analyzeIntent(
    content: string,
    context?: DialogueContext
  ): IntentResult {
    // 1. 模式匹配
    const patternResult = this.matchPatterns(content)

    // 2. 上下文增强
    const contextEnhanced = this.enhanceWithContext(patternResult, context)

    // 3. 实体提取
    const entities = this.extractEntities(content)

    // 4. 关键词提取
    const keywords = this.extractKeywords(content)

    // 5. 计算最终置信度
    const confidence = this.calculateConfidence(
      contextEnhanced,
      entities,
      keywords,
      context
    )

    return {
      category: contextEnhanced.category,
      confidence,
      details: {
        subIntent: this.detectSubIntent(content, contextEnhanced.category),
        entities,
        keywords,
      },
    }
  }

  /**
   * 批量分析意图
   */
  analyzeBatch(
    contents: string[],
    context?: DialogueContext
  ): IntentResult[] {
    return contents.map(content => this.analyzeIntent(content, context))
  }

  /**
   * 模式匹配
   */
  private matchPatterns(content: string): IntentResult {
    const normalizedContent = content.toLowerCase().trim()
    let bestMatch: IntentResult = {
      category: 'unknown',
      confidence: 0,
    }

    for (const pattern of this.intentPatterns) {
      // 检查模式匹配
      let patternScore = 0
      for (const patternStr of pattern.patterns) {
        if (normalizedContent.includes(patternStr.toLowerCase())) {
          patternScore += 0.5
        }
      }

      // 检查关键词匹配
      let keywordScore = 0
      for (const keyword of pattern.keywords) {
        if (normalizedContent.includes(keyword.toLowerCase())) {
          keywordScore += 0.3
        }
      }

      const totalScore = Math.min(patternScore + keywordScore, 1)

      if (totalScore > bestMatch.confidence) {
        bestMatch = {
          category: pattern.category,
          confidence: totalScore,
        }
      }
    }

    return bestMatch
  }

  /**
   * 上下文增强
   */
  private enhanceWithContext(
    result: IntentResult,
    context?: DialogueContext
  ): IntentResult {
    if (!context) {
      return result
    }

    const recentTurns = context.turns.slice(-3)

    // 检查对话状态
    if (context.state === 'clarifying') {
      // 如果处于澄清状态，倾向于识别为澄清或确认
      if (result.confidence < 0.7) {
        result.category = 'clarification'
        result.confidence = 0.7
      }
    }

    // 检查话题一致性
    if (recentTurns.length > 0) {
      const lastIntent = recentTurns[recentTurns.length - 1].intent
      if (lastIntent && result.category === 'unknown') {
        // 如果当前意图不明确，倾向于与上一轮保持一致
        result.category = lastIntent as IntentCategory
        result.confidence = 0.5
      }
    }

    return result
  }

  /**
   * 提取实体
   */
  private extractEntities(content: string): Entity[] {
    const entities: Entity[] = []

    for (const pattern of this.entityPatterns) {
      for (const regex of pattern.patterns) {
        const matches = content.matchAll(regex)
        for (const match of matches) {
          entities.push({
            type: pattern.type,
            value: match[0],
            confidence: 0.8,
            start: match.index!,
            end: match.index! + match[0].length,
          })
        }
      }
    }

    // 按置信度和优先级排序
    return entities
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10) // 限制最多10个实体
  }

  /**
   * 提取关键词
   */
  private extractKeywords(content: string): string[] {
    // 移除标点符号和停用词
    const cleaned = content
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1)

    // 过滤停用词
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      '的', '了', '和', '是', '在', '我', '你', '他', '她', '它', '我们', '你们', '他们',
    ])

    const keywords = cleaned.filter(word => !stopWords.has(word))

    // 返回前10个关键词
    return [...new Set(keywords)].slice(0, 10)
  }

  /**
   * 检测子意图
   */
  private detectSubIntent(content: string, category: IntentCategory): string | undefined {
    const normalized = content.toLowerCase()

    switch (category) {
      case 'question':
        if (normalized.includes('how') || normalized.includes('如何')) {
          return 'how_to'
        }
        if (normalized.includes('what') || normalized.includes('什么') || normalized.includes('啥')) {
          return 'what'
        }
        if (normalized.includes('why') || normalized.includes('为什么')) {
          return 'why'
        }
        if (normalized.includes('where') || normalized.includes('哪里')) {
          return 'where'
        }
        if (normalized.includes('when') || normalized.includes('什么时候')) {
          return 'when'
        }
        break

      case 'request':
        if (normalized.includes('help') || normalized.includes('帮助')) {
          return 'help'
        }
        if (normalized.includes('create') || normalized.includes('创建')) {
          return 'create'
        }
        if (normalized.includes('delete') || normalized.includes('删除')) {
          return 'delete'
        }
        if (normalized.includes('update') || normalized.includes('更新') || normalized.includes('修改')) {
          return 'update'
        }
        break

      case 'command':
        if (normalized.includes('stop') || normalized.includes('停止')) {
          return 'stop'
        }
        if (normalized.includes('start') || normalized.includes('开始')) {
          return 'start'
        }
        if (normalized.includes('pause') || normalized.includes('暂停')) {
          return 'pause'
        }
        break
    }

    return undefined
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    result: IntentResult,
    entities: Entity[],
    keywords: string[],
    context?: DialogueContext
  ): number {
    let confidence = result.confidence

    // 实体增强
    if (entities.length > 0) {
      confidence = Math.min(confidence + 0.1, 1)
    }

    // 关键词增强
    if (keywords.length >= 3) {
      confidence = Math.min(confidence + 0.05, 1)
    }

    // 上下文增强
    if (context) {
      const recentIntents = context.turns.slice(-3).map(t => t.intent)
      const consistentIntents = recentIntents.filter(i => i === result.category).length
      if (consistentIntents >= 2) {
        confidence = Math.min(confidence + 0.15, 1)
      }
    }

    return Math.round(confidence * 100) / 100
  }

  /**
   * 初始化意图模式
   */
  private initializeIntentPatterns(): IntentPattern[] {
    return [
      {
        category: 'greeting',
        patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
        keywords: ['你好', '您好', '早上好', '下午好', '晚上好', '哈喽', '嗨'],
        priority: 1,
      },
      {
        category: 'farewell',
        patterns: ['goodbye', 'bye', 'see you', 'farewell'],
        keywords: ['再见', '拜拜', '回见', '下次见'],
        priority: 1,
      },
      {
        category: 'question',
        patterns: ['what', 'how', 'why', 'where', 'when', 'who', 'which', 'can you', 'could you'],
        keywords: ['什么', '怎么', '为什么', '哪里', '什么时候', '谁', '哪个', '能', '可以', '吗'],
        priority: 2,
      },
      {
        category: 'request',
        patterns: ['please', 'i need', 'i want', 'help me', 'can you help'],
        keywords: ['请', '需要', '想要', '帮我', '麻烦', '能否'],
        priority: 2,
      },
      {
        category: 'command',
        patterns: ['stop', 'start', 'pause', 'resume', 'cancel', 'delete'],
        keywords: ['停止', '开始', '暂停', '继续', '取消', '删除', '执行'],
        priority: 3,
      },
      {
        category: 'complaint',
        patterns: ['problem', 'issue', 'wrong', 'error', 'broken', 'not working'],
        keywords: ['问题', '错误', '不对', '坏了', '不能用', '有问题'],
        priority: 2,
      },
      {
        category: 'compliment',
        patterns: ['great', 'good', 'excellent', 'thanks', 'thank you', 'appreciate'],
        keywords: ['好', '棒', '优秀', '谢谢', '感谢', '不错'],
        priority: 2,
      },
      {
        category: 'clarification',
        patterns: ['what do you mean', 'explain', 'clarify', 'not sure', 'confused'],
        keywords: ['什么意思', '解释', '说明', '不清楚', '不明白', '搞不懂'],
        priority: 2,
      },
      {
        category: 'confirmation',
        patterns: ['yes', 'correct', 'right', 'exactly', 'agree'],
        keywords: ['是的', '对', '正确', '没错', '同意', '好的'],
        priority: 2,
      },
      {
        category: 'negation',
        patterns: ['no', 'not', 'never', 'disagree', 'wrong'],
        keywords: ['不', '不是', '没有', '不同意', '不对'],
        priority: 2,
      },
    ]
  }

  /**
   * 初始化实体模式
   */
  private initializeEntityPatterns(): EntityPattern[] {
    return [
      // 数字
      {
        type: 'number',
        patterns: [/\d+(\.\d+)?/g],
        priority: 1,
      },
      // 日期时间
      {
        type: 'datetime',
        patterns: [
          /\d{4}-\d{2}-\d{2}/g,
          /\d{2}:\d{2}/g,
          /(今天|明天|昨天)/g,
          /(今天|明天|昨天)\s*(上午|下午|晚上)/g,
        ],
        priority: 2,
      },
      // URL
      {
        type: 'url',
        patterns: [/https?:\/\/[^\s]+/g],
        priority: 2,
      },
      // 邮箱
      {
        type: 'email',
        patterns: [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g],
        priority: 2,
      },
      // 文件路径
      {
        type: 'filepath',
        patterns: [/\/[\w\-./]+/g, /[A-Za-z]:\\[\w\-./\\]+/g],
        priority: 2,
      },
      // 代码片段
      {
        type: 'code',
        patterns: [/```[\s\S]*?```/g, /`[^`]+`/g],
        priority: 3,
      },
    ]
  }

  /**
   * 添加自定义意图模式
   */
  addCustomPattern(pattern: IntentPattern): void {
    this.intentPatterns.push(pattern)
    // 按优先级排序
    this.intentPatterns.sort((a, b) => b.priority - a.priority)
  }

  /**
   * 添加自定义实体模式
   */
  addCustomEntityPattern(pattern: EntityPattern): void {
    this.entityPatterns.push(pattern)
    // 按优先级排序
    this.entityPatterns.sort((a, b) => b.priority - a.priority)
  }

  /**
   * 更新置信度阈值
   */
  updateConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Confidence threshold must be between 0 and 1')
    }
    this.confidenceThreshold = threshold
  }

  /**
   * 检查意图识别准确率
   */
  checkAccuracy(expected: IntentCategory[], actual: IntentCategory[]): number {
    if (expected.length !== actual.length) {
      throw new Error('Expected and actual arrays must have the same length')
    }

    let correct = 0
    for (let i = 0; i < expected.length; i++) {
      if (expected[i] === actual[i]) {
        correct++
      }
    }

    return correct / expected.length
  }
}