/**
 * 任务分类器测试
 */

import { describe, it, expect } from 'vitest'
import { TaskClassifier, classifyTask } from '../classifier'
import { TaskType } from '../types'

describe('TaskClassifier', () => {
  const classifier = new TaskClassifier()

  describe('代码生成任务', () => {
    it('should classify code generation prompts', () => {
      const result = classifier.classify('Write a function to calculate fibonacci')
      expect(result.taskType).toBe(TaskType.CODE_GENERATION)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should detect code patterns', () => {
      const result = classifier.classify(`
        \`\`\`typescript
        function hello() {
          return "world"
        }
        \`\`\`
      `)
      expect(result.taskType).toBe(TaskType.CODE_GENERATION)
    })

    it('should classify Chinese code prompts', () => {
      const result = classifier.classify('帮我写一个排序算法')
      expect(result.taskType).toBe(TaskType.CODE_GENERATION)
    })
  })

  describe('对话任务', () => {
    it('should classify simple conversation', () => {
      const result = classifier.classify('Hello, how are you today?')
      expect(result.taskType).toBe(TaskType.CONVERSATION)
    })

    it('should classify Chinese greetings', () => {
      const result = classifier.classify('你好')
      expect(result.taskType).toBe(TaskType.CONVERSATION)
    })
  })

  describe('分析任务', () => {
    it('should classify analysis prompts', () => {
      const result = classifier.classify('Analyze the performance of this code')
      expect(result.taskType).toBe(TaskType.ANALYSIS)
    })

    it('should classify Chinese analysis prompts', () => {
      const result = classifier.classify('分析这段代码的问题')
      expect(result.taskType).toBe(TaskType.ANALYSIS)
    })
  })

  describe('翻译任务', () => {
    it('should classify translation prompts', () => {
      const result = classifier.classify('Translate this to Chinese')
      expect(result.taskType).toBe(TaskType.TRANSLATION)
    })
  })

  describe('摘要任务', () => {
    it('should classify summarization prompts', () => {
      const result = classifier.classify('Summarize the main points of this article')
      expect(result.taskType).toBe(TaskType.SUMMARIZATION)
    })

    it('should classify Chinese summarization prompts', () => {
      const result = classifier.classify('总结这篇文章的主要内容')
      expect(result.taskType).toBe(TaskType.SUMMARIZATION)
    })
  })

  describe('数学任务', () => {
    it('should classify math prompts', () => {
      const result = classifier.classify('Calculate the derivative of x^2 + 2x')
      expect(result.taskType).toBe(TaskType.MATH)
    })
  })

  describe('问答任务', () => {
    it('should classify Q&A prompts', () => {
      const result = classifier.classify('What is the capital of France?')
      expect(result.taskType).toBe(TaskType.QA)
    })

    it('should classify Chinese Q&A prompts', () => {
      const result = classifier.classify('什么是人工智能?')
      expect(result.taskType).toBe(TaskType.QA)
    })
  })

  describe('批量分类', () => {
    it('should classify multiple prompts', () => {
      const inputs = [
        'Write a function',
        'Hello there',
        'Analyze this data',
      ]
      const results = classifier.classifyBatch(inputs)
      expect(results).toHaveLength(3)
      expect(results[0].taskType).toBe(TaskType.CODE_GENERATION)
      expect(results[1].taskType).toBe(TaskType.CONVERSATION)
      expect(results[2].taskType).toBe(TaskType.ANALYSIS)
    })
  })

  describe('alternative suggestions', () => {
    it('should provide alternative classifications', () => {
      const result = classifier.classify('Write and analyze this code')
      expect(result.alternatives).toBeDefined()
      expect(result.alternatives.length).toBeGreaterThan(0)
    })
  })
})

describe('convenience function', () => {
  it('should classify using convenience function', () => {
    const result = classifyTask('Write a function')
    expect(result.taskType).toBe(TaskType.CODE_GENERATION)
  })
})
