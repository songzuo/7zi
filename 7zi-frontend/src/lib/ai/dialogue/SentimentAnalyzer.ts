/**
 * Sentiment Analyzer
 * 情感分析器
 * v1.13.0
 */

import type {
  SentimentResult,
  SentimentLabel,
  EmotionScore,
  DialogueContext,
  DialogueEnhancementConfig,
} from './types'
import { DEFAULT_CONFIG } from './types'

/**
 * 情感词典条目
 */
interface SentimentLexiconEntry {
  word: string
  polarity: number // -1 到 1
  intensity: number // 强度修饰词
  partOfSpeech?: string
}

/**
 * 情感规则
 */
interface SentimentRule {
  pattern: RegExp
  weight: number
  type: 'amplifier' | 'negator' | 'intensifier'
}

/**
 * 预定义情感词典
 */
const POSITIVE_LEXICON: Record<string, number> = {
  // 正面词
  '好': 0.8, '很好': 0.9, '棒': 0.9, '优秀': 0.9, '赞': 0.9, '不错': 0.7,
  '喜欢': 0.8, '爱': 0.9, '开心': 0.8, '高兴': 0.8, '快乐': 0.8,
  '满意': 0.7, '感谢': 0.6, '谢谢': 0.6, '感激': 0.7,
  '完美': 1.0, '出色': 0.9, '卓越': 0.9, '精彩': 0.8,
  '有用': 0.6, '有帮助': 0.7, '有效': 0.7, '高效': 0.7,
  '简单': 0.5, '容易': 0.5, '方便': 0.6, '便捷': 0.6,
  '强大': 0.8, '智能': 0.6, '先进': 0.7, '创新': 0.7,
  'good': 0.7, 'great': 0.8, 'excellent': 0.9, 'amazing': 0.9,
  'wonderful': 0.9, 'fantastic': 0.9, 'awesome': 0.8, 'nice': 0.6,
  'love': 0.9, 'like': 0.7, 'happy': 0.8, 'glad': 0.7,
  'thanks': 0.6, 'thank': 0.6, 'appreciate': 0.7,
}

const NEGATIVE_LEXICON: Record<string, number> = {
  // 负面词
  '差': -0.7, '糟糕': -0.8, '坏': -0.7, '烂': -0.8,
  '不好': -0.6, '不对': -0.5, '错误': -0.6, '有问题': -0.7,
  '问题': -0.5, '麻烦': -0.5, '困难': -0.4, '难': -0.4,
  '失望': -0.7, '沮丧': -0.8, '难过': -0.7, '伤心': -0.8,
  '生气': -0.8, '愤怒': -0.9, '恼火': -0.8, '不爽': -0.6,
  '没用': -0.8, '无效': -0.6, '不行': -0.5, '不可以': -0.5,
  '崩溃': -0.9, '抓狂': -0.8, '无语': -0.5, '无奈': -0.5,
  'bad': -0.6, 'terrible': -0.8, 'awful': -0.8, 'horrible': -0.9,
  'wrong': -0.6, 'error': -0.6, 'problem': -0.5, 'issue': -0.5,
  'hate': -0.9, 'dislike': -0.6, 'sad': -0.7, 'angry': -0.8,
  'disappointed': -0.7, 'frustrated': -0.7, 'annoyed': -0.6,
}

/**
 * 强度修饰词
 */
const INTENSIFIERS: Record<string, number> = {
  '非常': 1.5, '特别': 1.5, '极其': 1.8, '十分': 1.4, '很': 1.3,
  '太': 1.4, '真': 1.3, '超': 1.5, '超级': 1.6, '无比': 1.8,
  'very': 1.4, 'really': 1.4, 'extremely': 1.7, 'absolutely': 1.8,
  'quite': 1.2, 'pretty': 1.3,
}

/**
 * 否定词
 */
const NEGATORS: Set<string> = new Set([
  '不', '没', '无', '非', '未', '别', '莫', '勿',
  'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere',
])

export class SentimentAnalyzer {
  private config: DialogueEnhancementConfig
  private positiveLexicon: Map<string, number>
  private negativeLexicon: Map<string, number>
  private intensifiers: Map<string, number>
  private negators: Set<string>

  constructor(config: Partial<DialogueEnhancementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.positiveLexicon = new Map(Object.entries(POSITIVE_LEXICON))
    this.negativeLexicon = new Map(Object.entries(NEGATIVE_LEXICON))
    this.intensifiers = new Map(Object.entries(INTENSIFIERS))
    this.negators = NEGATORS
  }

  /**
   * 分析情感
   */
  analyzeSentiment(
    content: string,
    context?: DialogueContext
  ): SentimentResult {
    // 分词
    const tokens = this.tokenize(content)

    // 情感评分计算
    const { score, count } = this.calculateSentimentScore(tokens)

    // 归一化
    let normalizedScore = count > 0 ? score / count : 0

    // 检测否定
    const hasNegation = this.detectNegation(tokens)
    if (hasNegation) {
      normalizedScore = -normalizedScore * 0.8
    }

    // 强度修饰
    const intensityMultiplier = this.detectIntensifier(tokens)
    normalizedScore = Math.max(-1, Math.min(1, normalizedScore * intensityMultiplier))

    // 转换为标签
    const label = this.scoreToLabel(normalizedScore)
    const confidence = this.calculateConfidence(count, normalizedScore)
    const emotions = this.detectEmotions(tokens)

    // 上下文增强
    const contextEnhanced = this.enhanceWithContext(
      { label, confidence, intensity: normalizedScore, emotions },
      context
    )

    return contextEnhanced
  }

  /**
   * 批量分析情感
   */
  analyzeBatch(
    contents: string[],
    context?: DialogueContext
  ): SentimentResult[] {
    return contents.map(content => this.analyzeSentiment(content, context))
  }

  /**
   * 分析对话历史的整体情感趋势
   */
  analyzeTrend(contents: string[]): {
    trend: 'improving' | 'declining' | 'stable'
    averageScore: number
    variance: number
    results: SentimentResult[]
  } {
    const results = contents.map(c => this.analyzeSentiment(c))
    const scores = results.map(r => r.intensity)

    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((acc, s) => acc + Math.pow(s - averageScore, 2), 0) / scores.length

    // 计算趋势
    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    if (scores.length >= 3) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
      const secondHalf = scores.slice(Math.floor(scores.length / 2))
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

      if (secondAvg - firstAvg > 0.15) {
        trend = 'improving'
      } else if (firstAvg - secondAvg > 0.15) {
        trend = 'declining'
      }
    }

    return { trend, averageScore, variance, results }
  }

  /**
   * 分词 - 支持中英文多字符词匹配
   */
  private tokenize(content: string): string[] {
    const tokens: string[] = []
    const segment = content.toLowerCase()

    // 匹配中文字符串或英文单词
    const matches = segment.match(/[\u4e00-\u9fa5]+|[a-z]+/g) || []

    for (const match of matches) {
      if (/[\u4e00-\u9fa5]/.test(match)) {
        // 中文：先尝试正向最大匹配 (2-4字词)
        const chinese = match
        // 尝试匹配词典中的多字符词
        let remaining = chinese
        while (remaining.length > 0) {
          let matched = false
          // 从最长开始匹配 (4->3->2->1)
          for (let len = Math.min(4, remaining.length); len >= 1; len--) {
            const substr = remaining.substring(0, len)
            if (this.positiveLexicon.has(substr) ||
                this.negativeLexicon.has(substr) ||
                this.intensifiers.has(substr) ||
                this.negators.has(substr)) {
              tokens.push(substr)
              remaining = remaining.substring(len)
              matched = true
              break
            }
          }
          if (!matched) {
            // 没匹配到词典词，取1-2字符尝试
            const substr = remaining.substring(0, 2)
            if (this.positiveLexicon.has(substr) ||
                this.negativeLexicon.has(substr) ||
                this.intensifiers.has(substr) ||
                this.negators.has(substr)) {
              tokens.push(substr)
              remaining = remaining.substring(2)
            } else {
              // 单字符
              tokens.push(remaining.substring(0, 1))
              remaining = remaining.substring(1)
            }
          }
        }
      } else {
        // 英文：按空格分割
        tokens.push(match)
      }
    }

    return tokens.filter(t => t.length > 0)
  }

  /**
   * 计算情感得分
   */
  private calculateSentimentScore(tokens: string[]): { score: number; count: number } {
    let score = 0
    let count = 0

    for (const token of tokens) {
      // 检查正面词典
      if (this.positiveLexicon.has(token)) {
        score += this.positiveLexicon.get(token)!
        count++
      }

      // 检查负面词典
      if (this.negativeLexicon.has(token)) {
        score += this.negativeLexicon.get(token)!
        count++
      }
    }

    return { score, count }
  }

  /**
   * 检测否定
   */
  private detectNegation(tokens: string[]): boolean {
    for (const token of tokens) {
      if (this.negators.has(token)) {
        return true
      }
    }
    return false
  }

  /**
   * 检测强度修饰词
   */
  private detectIntensifier(tokens: string[]): number {
    let multiplier = 1.0

    for (const token of tokens) {
      if (this.intensifiers.has(token)) {
        multiplier *= this.intensifiers.get(token)!
      }
    }

    return multiplier
  }

  /**
   * 情感分数转标签
   */
  private scoreToLabel(score: number): SentimentLabel {
    if (score > 0.25) return 'positive'
    if (score < -0.25) return 'negative'
    if (score >= -0.25 && score <= 0.25) return 'neutral'
    return 'mixed'
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(wordCount: number, score: number): number {
    // 基于词数和分数绝对值计算置信度
    const baseConfidence = Math.min(0.5 + wordCount * 0.1, 0.95)
    const scoreConfidence = Math.abs(score) * 0.3
    return Math.min(baseConfidence + scoreConfidence, 1)
  }

  /**
   * 检测情感细节
   */
  private detectEmotions(tokens: string[]): EmotionScore[] {
    const emotions: EmotionScore[] = []

    const emotionKeywords: Record<string, string[]> = {
      joy: ['开心', '高兴', '快乐', 'happy', 'glad', 'joy'],
      sadness: ['难过', '伤心', 'sad', 'upset', 'depressed'],
      anger: ['生气', '愤怒', '恼火', 'angry', 'mad', 'furious'],
      fear: ['害怕', '恐惧', 'fear', 'afraid', 'scared'],
      surprise: ['惊讶', '意外', 'surprise', 'amazed', 'shocked'],
      anticipation: ['期待', '希望', '希望', 'expect', 'hope', 'anticipate'],
    }

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const matches = tokens.filter(token =>
        keywords.some(k => token.includes(k))
      ).length

      if (matches > 0) {
        emotions.push({
          emotion,
          score: Math.min(matches * 0.3, 1),
        })
      }
    }

    return emotions.sort((a, b) => b.score - a.score).slice(0, 3)
  }

  /**
   * 上下文增强
   */
  private enhanceWithContext(
    result: SentimentResult,
    context?: DialogueContext
  ): SentimentResult {
    if (!context || context.turns.length < 2) {
      return result
    }

    // 检查历史情感趋势
    const recentSentiments = context.turns
      .slice(-3)
      .filter(t => t.sentiment)
      .map(t => t.sentiment!)

    if (recentSentiments.length >= 2) {
      // 如果连续负面，略微调整置信度
      const lastIsNegative = recentSentiments[recentSentiments.length - 1].label === 'negative'
      if (lastIsNegative && result.label !== 'negative') {
        result.confidence = Math.max(0.5, result.confidence - 0.1)
      }
    }

    return result
  }

  /**
   * 添加正面词
   */
  addPositiveWord(word: string, polarity: number): void {
    this.positiveLexicon.set(word.toLowerCase(), Math.max(-1, Math.min(1, polarity)))
  }

  /**
   * 添加负面词
   */
  addNegativeWord(word: string, polarity: number): void {
    this.negativeLexicon.set(word.toLowerCase(), Math.max(-1, Math.min(1, polarity)))
  }

  /**
   * 添加强度修饰词
   */
  addIntensifier(word: string, multiplier: number): void {
    this.intensifiers.set(word, multiplier)
  }

  /**
   * 添加否定词
   */
  addNegator(word: string): void {
    this.negators.add(word)
  }

  /**
   * 获取情感统计
   */
  getSentimentStats(contents: string[]): {
    distribution: Record<SentimentLabel, number>
    averageIntensity: number
    dominantEmotion: string | null
  } {
    const results = contents.map(c => this.analyzeSentiment(c))
    const distribution: Record<SentimentLabel, number> = {
      positive: 0,
      negative: 0,
      neutral: 0,
      mixed: 0,
    }

    let totalIntensity = 0
    const emotionCounts: Record<string, number> = {}

    for (const result of results) {
      distribution[result.label]++
      totalIntensity += result.intensity

      for (const emotion of result.emotions || []) {
        emotionCounts[emotion.emotion] = (emotionCounts[emotion.emotion] || 0) + emotion.score
      }
    }

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null

    return {
      distribution,
      averageIntensity: totalIntensity / results.length,
      dominantEmotion,
    }
  }
}