/**
 * Dialogue Enhancement System Integration Tests
 * 对话增强系统集成测试
 * v1.13.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AIDialogueEnhancementSystem } from '../index'

describe('AIDialogueEnhancementSystem - Integration', () => {
  let system: AIDialogueEnhancementSystem
  const dialogueId = 'test-dialogue-1'
  const userId = 'user-1'

  beforeEach(() => {
    system = new AIDialogueEnhancementSystem()
  })

  describe('系统初始化', () => {
    it('应该正确初始化系统', () => {
      expect(system).toBeInstanceOf(AIDialogueEnhancementSystem)
    })

    it('应该初始化所有子模块', () => {
      expect(system.getDialogueManager()).toBeDefined()
      expect(system.getIntentAnalyzer()).toBeDefined()
      expect(system.getSentimentAnalyzer()).toBeDefined()
      expect(system.getStateMachine()).toBeDefined()
      expect(system.getResponseGenerator()).toBeDefined()
      expect(system.getTemplateEngine()).toBeDefined()
    })
  })

  describe('完整对话流程', () => {
    it('应该处理完整的对话流程', async () => {
      // 创建对话
      system.createDialogue(dialogueId, userId)

      // 处理第一条消息
      const result1 = await system.processMessage(
        dialogueId,
        userId,
        '你好，我想了解工作流'
      )

      expect(result1.turn).toBeDefined()
      expect(result1.intent).toBeDefined()
      expect(result1.sentiment).toBeDefined()
      expect(result1.response).toBeDefined()
      expect(result1.coherence).toBeDefined()

      // 处理第二条消息
      const result2 = await system.processMessage(
        dialogueId,
        userId,
        '如何创建一个新的工作流？'
      )

      expect(result2.turn.turnNumber).toBe(2)
      expect(result2.intent.category).toBe('question')
    })

    it('应该识别不同的意图', async () => {
      system.createDialogue(dialogueId, userId)

      const tests = [
        ['你好', 'greeting'],
        ['如何使用工作流？', 'question'],
        ['请帮我创建一个工作流', 'request'],
        ['停止执行', 'command'],
        ['这个功能有问题', 'complaint'],
        ['这个功能很好', 'compliment'],
        ['再见', 'farewell'],
      ]

      for (const [content, expectedIntent] of tests) {
        const result = await system.processMessage(dialogueId, userId, content)
        expect(result.intent.category).toBe(expectedIntent)
      }
    })

    it('应该分析不同的情感', async () => {
      system.createDialogue(dialogueId, userId)

      const tests = [
        ['这个功能很好', 'positive'],
        ['这个功能很差', 'negative'],
        ['这是什么？', 'neutral'],
      ]

      for (const [content, expectedSentiment] of tests) {
        const result = await system.processMessage(dialogueId, userId, content)
        expect(result.sentiment.label).toBe(expectedSentiment)
      }
    })
  })

  describe('连贯性评分', () => {
    it('应该计算连贯性评分', async () => {
      system.createDialogue(dialogueId, userId)

      await system.processMessage(dialogueId, userId, '你好')
      await system.processMessage(dialogueId, userId, '我想了解工作流')
      await system.processMessage(dialogueId, userId, '如何创建工作流？')

      const coherence = system.getCoherenceScore(dialogueId)

      expect(coherence.overall).toBeGreaterThanOrEqual(0)
      expect(coherence.overall).toBeLessThanOrEqual(5)
    })

    it('应该检查连贯性是否达标', async () => {
      system.createDialogue(dialogueId, userId)

      await system.processMessage(dialogueId, userId, '你好')
      await system.processMessage(dialogueId, userId, '我想了解工作流')

      const isAboveTarget = system.isCoherenceAboveTarget(dialogueId)

      expect(typeof isAboveTarget).toBe('boolean')
    })
  })

  describe('对话统计', () => {
    it('应该获取对话统计', async () => {
      system.createDialogue(dialogueId, userId)

      await system.processMessage(dialogueId, userId, '你好')
      await system.processMessage(dialogueId, userId, '我想了解工作流')

      const stats = system.getDialogueStats(dialogueId)

      expect(stats).toBeDefined()
      expect(stats.totalTurns).toBe(2)
      expect(stats.coherenceScore).toBeDefined()
    })
  })

  describe('模板渲染', () => {
    it('应该使用模板渲染响应', () => {
      // 创建默认对话上下文
      system.createDialogue('__default__', 'test-user')

      const response = system.renderTemplate('greeting_default', {
        userName: '张三',
      })

      expect(response).toContain('张三')
    })

    it('应该智能选择并渲染模板', () => {
      system.createDialogue(dialogueId, userId)

      const response = system.renderSmartTemplate(
        'greeting',
        dialogueId,
        { userName: '张三' }
      )

      expect(response).toBeDefined()
    })
  })

  describe('快速响应', () => {
    it('应该生成快速响应', () => {
      const response = system.generateQuickResponse(
        '这个功能很好',
        dialogueId
      )

      expect(response.content).toBeDefined()
      expect(response.strategy).toBeDefined()
      expect(response.sentimentAdaptation).toBeDefined()
    })
  })

  describe('对话历史', () => {
    it('应该获取对话历史', async () => {
      system.createDialogue(dialogueId, userId)

      await system.processMessage(dialogueId, userId, '你好')
      await system.processMessage(dialogueId, userId, '我想了解工作流')

      const history = system.getDialogueHistory(dialogueId)

      expect(history).toHaveLength(2)
      expect(history[0].content).toBe('你好')
      expect(history[1].content).toBe('我想了解工作流')
    })
  })

  describe('清除对话', () => {
    it('应该清除对话', async () => {
      system.createDialogue(dialogueId, userId)
      await system.processMessage(dialogueId, userId, '你好')

      system.clearDialogue(dialogueId)

      const history = system.getDialogueHistory(dialogueId)
      expect(history).toHaveLength(0)
    })
  })

  describe('配置管理', () => {
    it('应该获取配置', () => {
      const config = system.getConfig()

      expect(config).toBeDefined()
      expect(config.maxTurns).toBeDefined()
      expect(config.coherenceTarget).toBeDefined()
    })

    it('应该更新配置', () => {
      system.updateConfig({
        maxTurns: 200,
        coherenceTarget: 4.5,
      })

      const config = system.getConfig()
      expect(config.maxTurns).toBe(200)
      expect(config.coherenceTarget).toBe(4.5)
    })
  })

  describe('性能测试', () => {
    it('应该在合理时间内处理消息', async () => {
      system.createDialogue(dialogueId, userId)

      const startTime = Date.now()
      await system.processMessage(dialogueId, userId, '你好')
      const endTime = Date.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(500) // 500ms内完成
    })

    it('应该处理批量消息', async () => {
      system.createDialogue(dialogueId, userId)

      const messages = Array.from({ length: 10 }, (_, i) => `消息 ${i}`)

      const startTime = Date.now()
      for (const message of messages) {
        await system.processMessage(dialogueId, userId, message)
      }
      const endTime = Date.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(3000) // 3秒内完成10条消息
    })
  })

  describe('边界情况', () => {
    it('应该处理空消息', async () => {
      system.createDialogue(dialogueId, userId)

      const result = await system.processMessage(dialogueId, userId, '')

      expect(result.turn).toBeDefined()
      expect(result.intent).toBeDefined()
    })

    it('应该处理长消息', async () => {
      system.createDialogue(dialogueId, userId)

      const longMessage = '测试消息，'.repeat(100)
      const result = await system.processMessage(dialogueId, userId, longMessage)

      expect(result.turn).toBeDefined()
    })

    it('应该处理特殊字符', async () => {
      system.createDialogue(dialogueId, userId)

      const specialMessage = '测试消息！@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'
      const result = await system.processMessage(dialogueId, userId, specialMessage)

      expect(result.turn).toBeDefined()
    })

    it('应该处理不存在的对话', () => {
      const history = system.getDialogueHistory('non-existent')
      expect(history).toHaveLength(0)
    })
  })

  describe('多轮对话连贯性', () => {
    it('应该保持话题连贯性', async () => {
      system.createDialogue(dialogueId, userId)

      await system.processMessage(dialogueId, userId, '你好')
      await system.processMessage(dialogueId, userId, '我想了解工作流')
      await system.processMessage(dialogueId, userId, '如何创建工作流？')
      await system.processMessage(dialogueId, userId, '节点有哪些类型？')

      const coherence = system.getCoherenceScore(dialogueId)
      expect(coherence.overall).toBeGreaterThan(3)
    })

    it('应该检测话题转换', async () => {
      system.createDialogue(dialogueId, userId)

      await system.processMessage(dialogueId, userId, '你好')
      await system.processMessage(dialogueId, userId, '我想了解工作流')
      await system.processMessage(dialogueId, userId, '这个功能很好')
      await system.processMessage(dialogueId, userId, '关于数据库分析呢？')

      const coherence = system.getCoherenceScore(dialogueId)
      expect(coherence.analysis.topicTransitions).toBeGreaterThan(0)
    })
  })

  describe('意图识别准确率', () => {
    it('应该达到合理的准确率', async () => {
      system.createDialogue(dialogueId, userId)

      const testCases = [
        ['你好', 'greeting'],
        ['再见', 'farewell'],
        ['如何使用', 'question'],
        ['请帮助', 'request'],
        ['停止', 'command'],
        ['有问题', 'complaint'],
        ['很好', 'compliment'],
        ['什么意思', 'clarification'],
        ['是的', 'confirmation'],
        ['不', 'negation'],
      ]

      let correct = 0
      for (const [content, expected] of testCases) {
        const result = await system.processMessage(dialogueId, userId, content)
        if (result.intent.category === expected) {
          correct++
        }
      }

      const accuracy = correct / testCases.length
      // 期望至少达到 70% 的准确率（考虑到模式匹配的局限性）
      expect(accuracy).toBeGreaterThan(0.7)
    })
  })
})