/**
 * 任务分类器
 * 根据输入内容识别任务类型
 */

import { TaskType } from './types'

/**
 * 任务特征关键词映射
 */
const TASK_KEYWORDS: Record<TaskType, string[]> = {
  [TaskType.CODE_GENERATION]: [
    'write code',
    'write a function',
    'create a function',
    'implement',
    '编写代码',
    '帮我写',
    '写一个',
    '实现',
    '开发',
    'function',
    'class',
    'module',
    'api',
    'script',
    'program',
    '生成代码',
    '代码生成',
    '排序算法',
    'fibonacci',
  ],
  [TaskType.CODE_COMPLETION]: [
    'complete',
    'finish',
    '续写',
    '补全',
    'complete the code',
    'finish this',
  ],
  [TaskType.CONVERSATION]: [
    'hello',
    'hi',
    'how are you',
    '你好',
    '聊天',
    '对话',
    'discuss',
    'talk',
    'chat',
  ],
  [TaskType.ANALYSIS]: [
    'analyze',
    '分析',
    'review',
    '评估',
    'evaluate',
    'compare',
    'examine',
    'investigate',
    'audit',
    '检查',
  ],
  [TaskType.TRANSLATION]: [
    'translate',
    '翻译',
    'convert to',
    'in english',
    'in chinese',
    '中文',
    '英文',
    'language',
  ],
  [TaskType.SUMMARIZATION]: [
    'summarize',
    '总结',
    'summary',
    'brief',
    '摘要',
    '概述',
    'abstract',
    'tldr',
  ],
  [TaskType.CREATIVE_WRITING]: [
    'write a story',
    'create a poem',
    'creative',
    '小说',
    '诗歌',
    'story',
    'poem',
    'novel',
    'fiction',
  ],
  [TaskType.MATH]: [
    'calculate',
    'math',
    'equation',
    '计算',
    '数学',
    'formula',
    'solve',
    'algebra',
    'calculus',
  ],
  [TaskType.REASONING]: [
    'reasoning',
    'logic',
    '推断',
    '推理',
    'why',
    'because',
    'therefore',
    'deduce',
    'infer',
  ],
  [TaskType.QA]: [
    'what is',
    'how to',
    'when',
    'where',
    'who',
    '什么是',
    '如何',
    '怎样',
    'question',
    'answer',
  ],
  [TaskType.INSTRUCTION_FOLLOWING]: [
    'please',
    '请',
    'help me',
    '帮我',
    'do this',
    '做这个',
    'execute',
    'perform',
  ],
  [TaskType.MULTIMODAL]: [
    'image',
    'video',
    'audio',
    '图片',
    '视频',
    '音频',
    'screenshot',
    'visual',
    'see',
  ],
}

/**
 * 代码相关模式
 */
const CODE_PATTERNS = [
  /^(function|class|interface|type|const|let|var|import|export)\s/m,
  /```(typescript|javascript|python|java|go|rust|cpp)/,
  /def\s+\w+\s*\(/,
  /public\s+(class|interface)/,
  /\{\s*\n\s*\w+/,
  /=>\s*\{/,
]

/**
 * 任务分类结果
 */
export interface ClassificationResult {
  taskType: TaskType
  confidence: number
  alternatives: Array<{ type: TaskType; score: number }>
}

/**
 * 任务分类器类
 */
export class TaskClassifier {
  private keywordWeights: Map<TaskType, Map<string, number>>

  constructor() {
    this.keywordWeights = new Map()
    this.initializeWeights()
  }

  private initializeWeights(): void {
    // 初始化关键词权重
    for (const [type, keywords] of Object.entries(TASK_KEYWORDS)) {
      const weightMap = new Map<string, number>()
      keywords.forEach((keyword, index) => {
        // 前面的关键词权重更高
        weightMap.set(keyword.toLowerCase(), 1.0 - index * 0.05)
      })
      this.keywordWeights.set(type as TaskType, weightMap)
    }
  }

  /**
   * 分类任务
   */
  classify(input: string): ClassificationResult {
    const normalizedInput = input.toLowerCase()
    const scores = this.calculateScores(normalizedInput)
    const sortedScores = this.sortScores(scores)

    if (sortedScores.length === 0) {
      // 默认为对话类型
      return {
        taskType: TaskType.CONVERSATION,
        confidence: 0.5,
        alternatives: [],
      }
    }

    const [first, second] = sortedScores
    const confidence = second ? first.score / (first.score + second.score) : 1.0

    return {
      taskType: first.type,
      confidence: Math.min(confidence, 0.95),
      alternatives: sortedScores.slice(1, 4).map((s) => ({
        type: s.type,
        score: s.score,
      })),
    }
  }

  /**
   * 计算各任务类型的分数
   */
  private calculateScores(input: string): Array<{ type: TaskType; score: number }> {
    const scores: Array<{ type: TaskType; score: number }> = []

    for (const [type, weightMap] of this.keywordWeights) {
      let score = 0

      for (const [keyword, weight] of weightMap) {
        if (input.includes(keyword)) {
          score += weight
        }
      }

      // 特殊处理：检测代码模式
      if (this.hasCodePatterns(input)) {
        if (type === TaskType.CODE_GENERATION || type === TaskType.CODE_COMPLETION) {
          score += 5.0 // 代码模式加分 (提高权重)
        }
      }

      if (score > 0) {
        scores.push({ type, score })
      }
    }

    return scores
  }

  /**
   * 检测代码模式
   */
  private hasCodePatterns(input: string): boolean {
    return CODE_PATTERNS.some((pattern) => pattern.test(input))
  }

  /**
   * 排序分数
   */
  private sortScores(
    scores: Array<{ type: TaskType; score: number }>
  ): Array<{ type: TaskType; score: number }> {
    return scores.sort((a, b) => b.score - a.score)
  }

  /**
   * 批量分类
   */
  classifyBatch(inputs: string[]): ClassificationResult[] {
    return inputs.map((input) => this.classify(input))
  }

  /**
   * 获取任务类型的描述
   */
  getTaskTypeDescription(type: TaskType): string {
    const descriptions: Record<TaskType, string> = {
      [TaskType.CODE_GENERATION]: '代码生成 - 生成新的代码',
      [TaskType.CODE_COMPLETION]: '代码补全 - 完成未完成的代码',
      [TaskType.CONVERSATION]: '对话 - 普通对话交流',
      [TaskType.ANALYSIS]: '分析 - 分析和评估内容',
      [TaskType.TRANSLATION]: '翻译 - 语言翻译',
      [TaskType.SUMMARIZATION]: '摘要 - 总结和概括内容',
      [TaskType.CREATIVE_WRITING]: '创意写作 - 生成创意内容',
      [TaskType.MATH]: '数学 - 数学计算和问题求解',
      [TaskType.REASONING]: '推理 - 逻辑推理和分析',
      [TaskType.QA]: '问答 - 问答式信息检索',
      [TaskType.INSTRUCTION_FOLLOWING]: '指令执行 - 执行特定指令',
      [TaskType.MULTIMODAL]: '多模态 - 处理图像、视频等多媒体',
    }
    return descriptions[type]
  }
}

/**
 * 默认分类器实例
 */
export const taskClassifier = new TaskClassifier()

/**
 * 便捷分类函数
 */
export function classifyTask(input: string): ClassificationResult {
  return taskClassifier.classify(input)
}