/**
 * 复杂度评估器
 * 根据输入长度、上下文、关键词等判断任务复杂度
 */

import { ComplexityLevel, MessageContext } from './types'

/**
 * 复杂度评估配置
 */
interface ComplexityConfig {
  // Token 阈值
  lowTokenThreshold: number
  mediumTokenThreshold: number
  highTokenThreshold: number
  
  // 关键词权重
  complexKeywords: string[]
  simpleKeywords: string[]
  
  // 历史消息影响
  historyMultiplier: number
}

const DEFAULT_CONFIG: ComplexityConfig = {
  lowTokenThreshold: 500,
  mediumTokenThreshold: 2000,
  highTokenThreshold: 8000,
  
  complexKeywords: [
    'architecture',
    'design pattern',
    'refactor',
    'optimize',
    'scale',
    'distributed',
    '架构',
    '设计模式',
    '重构',
    '优化',
    '分布式',
    '系统设计',
    'algorithm',
    '算法',
    'performance',
    '性能',
    'security',
    '安全',
    'concurrent',
    '并发',
    'microservice',
    '微服务',
  ],
  
  simpleKeywords: [
    'hello',
    'hi',
    'thanks',
    'yes',
    'no',
    '你好',
    '谢谢',
    '是的',
    '不是',
  ],
  
  historyMultiplier: 0.1,
}

/**
 * 复杂度评估结果
 */
export interface ComplexityResult {
  level: ComplexityLevel
  score: number // 0-100
  factors: {
    length: number
    keywords: number
    history: number
    codeBlocks: number
  }
  reasoning: string
}

/**
 * 复杂度评估器类
 */
export class ComplexityEvaluator {
  private config: ComplexityConfig

  constructor(config: Partial<ComplexityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 评估复杂度
   */
  evaluate(
    prompt: string,
    history?: MessageContext[],
    systemPrompt?: string
  ): ComplexityResult {
    const factors = {
      length: this.evaluateLength(prompt, systemPrompt),
      keywords: this.evaluateKeywords(prompt),
      history: this.evaluateHistory(history),
      codeBlocks: this.evaluateCodeBlocks(prompt),
    }

    // 加权计算总分
    const score =
      factors.length * 0.3 +
      factors.keywords * 0.35 +
      factors.history * 0.15 +
      factors.codeBlocks * 0.2

    const level = this.scoreToLevel(score)
    const reasoning = this.generateReasoning(factors, score)

    return {
      level,
      score,
      factors,
      reasoning,
    }
  }

  /**
   * 评估长度因素
   */
  private evaluateLength(prompt: string, systemPrompt?: string): number {
    const totalLength = prompt.length + (systemPrompt?.length || 0)
    const estimatedTokens = Math.ceil(totalLength / 4) // 粗略估计

    if (estimatedTokens < this.config.lowTokenThreshold) {
      return 20
    } else if (estimatedTokens < this.config.mediumTokenThreshold) {
      return 40
    } else if (estimatedTokens < this.config.highTokenThreshold) {
      return 70
    } else {
      return 100
    }
  }

  /**
   * 评估关键词因素
   */
  private evaluateKeywords(prompt: string): number {
    const lowerPrompt = prompt.toLowerCase()
    
    let complexCount = 0
    let simpleCount = 0

    for (const keyword of this.config.complexKeywords) {
      if (lowerPrompt.includes(keyword.toLowerCase())) {
        complexCount++
      }
    }

    for (const keyword of this.config.simpleKeywords) {
      if (lowerPrompt.includes(keyword.toLowerCase())) {
        simpleCount++
      }
    }

    // 复杂关键词加分，简单关键词减分
    const score = Math.min(100, 30 + complexCount * 15 - simpleCount * 10)
    return Math.max(0, score)
  }

  /**
   * 评估历史消息因素
   */
  private evaluateHistory(history?: MessageContext[]): number {
    if (!history || history.length === 0) {
      return 0
    }

    const historyTokens = history.reduce(
      (sum, msg) => sum + (msg.tokens || Math.ceil(msg.content.length / 4)),
      0
    )

    // 历史消息越多，复杂度越高
    return Math.min(100, historyTokens * this.config.historyMultiplier)
  }

  /**
   * 评估代码块因素
   */
  private evaluateCodeBlocks(prompt: string): number {
    const codeBlockMatches = prompt.match(/```[\s\S]*?```/g) || []
    const inlineCodeMatches = prompt.match(/`[^`]+`/g) || []

    const codeBlockCount = codeBlockMatches.length
    const inlineCodeCount = inlineCodeMatches.length

    // 代码块数量影响复杂度
    const score = Math.min(100, codeBlockCount * 25 + inlineCodeCount * 5)
    return score
  }

  /**
   * 分数转换为复杂度级别
   */
  private scoreToLevel(score: number): ComplexityLevel {
    if (score < 30) {
      return ComplexityLevel.LOW
    } else if (score < 60) {
      return ComplexityLevel.MEDIUM
    } else if (score < 85) {
      return ComplexityLevel.HIGH
    } else {
      return ComplexityLevel.EXPERT
    }
  }

  /**
   * 生成推理说明
   */
  private generateReasoning(
    factors: ComplexityResult['factors'],
    score: number
  ): string {
    const reasons: string[] = []

    if (factors.length >= 70) {
      reasons.push('输入内容较长')
    }

    if (factors.keywords >= 60) {
      reasons.push('包含复杂关键词')
    }

    if (factors.history >= 30) {
      reasons.push('历史上下文较多')
    }

    if (factors.codeBlocks >= 50) {
      reasons.push('包含多个代码块')
    }

    if (reasons.length === 0) {
      reasons.push('任务相对简单')
    }

    return `复杂度评分: ${score.toFixed(1)} (${reasons.join('、')})`
  }

  /**
   * 快速评估 (仅基于长度)
   */
  quickEvaluate(prompt: string): ComplexityLevel {
    const estimatedTokens = Math.ceil(prompt.length / 4)
    
    if (estimatedTokens < this.config.lowTokenThreshold) {
      return ComplexityLevel.LOW
    } else if (estimatedTokens < this.config.mediumTokenThreshold) {
      return ComplexityLevel.MEDIUM
    } else if (estimatedTokens < this.config.highTokenThreshold) {
      return ComplexityLevel.HIGH
    } else {
      return ComplexityLevel.EXPERT
    }
  }
}

/**
 * 默认评估器实例
 */
export const complexityEvaluator = new ComplexityEvaluator()

/**
 * 便捷评估函数
 */
export function evaluateComplexity(
  prompt: string,
  history?: MessageContext[],
  systemPrompt?: string
): ComplexityResult {
  return complexityEvaluator.evaluate(prompt, history, systemPrompt)
}

/**
 * 快速评估函数
 */
export function quickEvaluateComplexity(prompt: string): ComplexityLevel {
  return complexityEvaluator.quickEvaluate(prompt)
}