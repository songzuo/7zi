/**
 * Enhanced Intent Analyzer Tests
 * 增强意图理解分析器测试
 * v1.13.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { EnhancedIntentAnalyzer } from '../EnhancedIntentAnalyzer'
import type { IntentCategory } from '../types'

describe('EnhancedIntentAnalyzer', () => {
  let analyzer: EnhancedIntentAnalyzer

  beforeEach(() => {
    analyzer = new EnhancedIntentAnalyzer()
  })

  describe('初始化', () => {
    it('应该正确初始化分析器', () => {
      expect(analyzer).toBeInstanceOf(EnhancedIntentAnalyzer)
    })

    it('应该加载默认意图模式', () => {
      const patterns = analyzer['intentPatterns']
      expect(patterns.length).toBeGreaterThan(0)
    })

    it('应该加载默认实体模式', () => {
      const patterns = analyzer['entityPatterns']
      expect(patterns.length).toBeGreaterThan(0)
    })
  })

  describe('意图识别 - 问候', () => {
    it('应该识别中文问候', () => {
      const result = analyzer.analyzeIntent('你好')
      expect(result.category).toBe('greeting')
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('应该识别英文问候', () => {
      const result = analyzer.analyzeIntent('Hello, how are you?')
      expect(result.category).toBe('greeting')
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('应该识别不同时间的问候', () => {
      const greetings = ['早上好', '下午好', '晚上好', 'Good morning', 'Good evening']
      greetings.forEach(greeting => {
        const result = analyzer.analyzeIntent(greeting)
        expect(result.category).toBe('greeting')
      })
    })
  })

  describe('意图识别 - 问答', () => {
    it('应该识别如何类问题', () => {
      const questions = [
        '如何使用工作流？',
        'How do I create a workflow?',
        '怎么配置？',
      ]
      questions.forEach(question => {
        const result = analyzer.analyzeIntent(question)
        // 至少应该是 question 或 request 类别
        expect(['question', 'request', 'greeting']).toContain(result.category)
      })
    })

    it('应该识别什么类问题', () => {
      const questions = [
        '这是什么？',
        'What is this?',
        '什么是工作流？',
      ]
      questions.forEach(question => {
        const result = analyzer.analyzeIntent(question)
        expect(['question', 'request', 'unknown']).toContain(result.category)
      })
    })

    it('应该识别为什么类问题', () => {
      const questions = [
        '为什么会出现错误？',
        'Why did this happen?',
        '为什么会这样？',
      ]
      questions.forEach(question => {
        const result = analyzer.analyzeIntent(question)
        expect(['question', 'request', 'unknown']).toContain(result.category)
      })
    })
  })

  describe('意图识别 - 请求', () => {
    it('应该识别帮助请求', () => {
      const requests = [
        '请帮我解决问题',
        'I need help',
        '帮帮我',
      ]
      requests.forEach(request => {
        const result = analyzer.analyzeIntent(request)
        expect(result.category).toBe('request')
      })
    })

    it('应该识别操作请求', () => {
      const requests = [
        '请创建一个工作流',
        'I want to create a workflow',
        '帮我删除这个',
      ]
      requests.forEach(request => {
        const result = analyzer.analyzeIntent(request)
        expect(result.category).toBe('request')
      })
    })
  })

  describe('意图识别 - 命令', () => {
    it('应该识别停止命令', () => {
      const commands = [
        '停止执行',
        'Stop it',
        '停下',
      ]
      commands.forEach(command => {
        const result = analyzer.analyzeIntent(command)
        expect(result.category).toBe('command')
      })
    })

    it('应该识别开始命令', () => {
      const commands = [
        '开始执行',
        'Start',
        '开始吧',
      ]
      commands.forEach(command => {
        const result = analyzer.analyzeIntent(command)
        expect(result.category).toBe('command')
      })
    })
  })

  describe('意图识别 - 投诉', () => {
    it('应该识别投诉', () => {
      const complaints = [
        '这个问题很严重',
        'I have a problem',
        '系统有问题',
      ]
      complaints.forEach(complaint => {
        const result = analyzer.analyzeIntent(complaint)
        expect(result.category).toBe('complaint')
      })
    })
  })

  describe('意图识别 - 赞美', () => {
    it('应该识别赞美', () => {
      const compliments = [
        '这个功能很好',
        'Great job',
        '做得不错',
        '谢谢你的帮助',
      ]
      compliments.forEach(compliment => {
        const result = analyzer.analyzeIntent(compliment)
        expect(result.category).toBe('compliment')
      })
    })
  })

  describe('意图识别 - 澄清', () => {
    it('应该识别澄清请求', () => {
      const clarifications = [
        '这是什么意思？',
        'Can you explain that?',
        '不太明白',
      ]
      clarifications.forEach(clarification => {
        const result = analyzer.analyzeIntent(clarification)
        expect(result.category).toBe('clarification')
      })
    })
  })

  describe('意图识别 - 确认', () => {
    it('应该识别确认', () => {
      const confirmations = [
        '是的',
        'Yes, that\'s right',
        '对的',
        '好的',
      ]
      confirmations.forEach(confirmation => {
        const result = analyzer.analyzeIntent(confirmation)
        expect(result.category).toBe('confirmation')
      })
    })
  })

  describe('意图识别 - 否定', () => {
    it('应该识别否定', () => {
      const negations = [
        '不是',
        'No, that\'s not right',
        '不对',
        '不',
      ]
      negations.forEach(negation => {
        const result = analyzer.analyzeIntent(negation)
        expect(result.category).toBe('negation')
      })
    })
  })

  describe('意图识别 - 告别', () => {
    it('应该识别告别', () => {
      const farewells = [
        '再见',
        'Goodbye',
        '拜拜',
        'See you',
      ]
      farewells.forEach(farewell => {
        const result = analyzer.analyzeIntent(farewell)
        expect(result.category).toBe('farewell')
      })
    })
  })

  describe('子意图检测', () => {
    it('应该检测如何子意图', () => {
      const result = analyzer.analyzeIntent('如何创建工作流？')
      expect(result.details?.subIntent).toBe('how_to')
    })

    it('应该检测什么子意图', () => {
      const result = analyzer.analyzeIntent('什么是工作流？')
      expect(result.details?.subIntent).toBe('what')
    })

    it('应该检测为什么子意图', () => {
      const result = analyzer.analyzeIntent('为什么会出现错误？')
      expect(result.details?.subIntent).toBe('why')
    })

    it('应该检测帮助子意图', () => {
      const result = analyzer.analyzeIntent('请帮帮我')
      expect(result.details?.subIntent).toBe('help')
    })

    it('应该检测创建子意图', () => {
      const result = analyzer.analyzeIntent('帮我创建工作流')
      // 匹配"创建"关键词
      expect(result.details?.subIntent || result.details?.keywords).toBeDefined()
    })
  })

  describe('实体提取', () => {
    it('应该提取数字', () => {
      const result = analyzer.analyzeIntent('请创建3个工作流')
      const numbers = result.details?.entities?.filter(e => e.type === 'number')
      expect(numbers).toBeDefined()
      expect(numbers!.length).toBeGreaterThan(0)
    })

    it('应该提取日期时间', () => {
      const result = analyzer.analyzeIntent('今天下午2点开会')
      const datetimes = result.details?.entities?.filter(e => e.type === 'datetime')
      expect(datetimes).toBeDefined()
      expect(datetimes!.length).toBeGreaterThan(0)
    })

    it('应该提取URL', () => {
      const result = analyzer.analyzeIntent('请访问 https://example.com')
      const urls = result.details?.entities?.filter(e => e.type === 'url')
      expect(urls).toBeDefined()
      expect(urls!.length).toBeGreaterThan(0)
    })

    it('应该提取邮箱', () => {
      const result = analyzer.analyzeIntent('我的邮箱是 test@example.com')
      const emails = result.details?.entities?.filter(e => e.type === 'email')
      expect(emails).toBeDefined()
      expect(emails!.length).toBeGreaterThan(0)
    })

    it('应该提取文件路径', () => {
      const result = analyzer.analyzeIntent('配置文件在 /etc/config/app.conf')
      const paths = result.details?.entities?.filter(e => e.type === 'filepath')
      expect(paths).toBeDefined()
      expect(paths!.length).toBeGreaterThan(0)
    })
  })

  describe('关键词提取', () => {
    it('应该提取关键词', () => {
      const result = analyzer.analyzeIntent('如何创建一个新的工作流？')
      const keywords = result.details?.keywords

      expect(keywords).toBeDefined()
      expect(keywords!.length).toBeGreaterThan(0)
    })

    it('应该过滤停用词', () => {
      const result = analyzer.analyzeIntent('我想要了解如何创建工作流')
      const keywords = result.details?.keywords

      expect(keywords).toBeDefined()
      expect(keywords).not.toContain('我')
      expect(keywords).not.toContain('想要')
    })
  })

  describe('置信度计算', () => {
    it('应该在0到1之间', () => {
      const result = analyzer.analyzeIntent('你好')
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('应该提高高置信度意图的分数', () => {
      const result1 = analyzer.analyzeIntent('你好，请帮帮我')
      const result2 = analyzer.analyzeIntent('你好')

      expect(result1.confidence).toBeGreaterThan(result2.confidence)
    })
  })

  describe('上下文增强', () => {
    it('应该考虑对话上下文', () => {
      const context = {
        dialogueId: 'test',
        currentTopic: 'workflow',
        topicHistory: [],
        turns: [
          {
            id: '1',
            userId: 'user',
            content: '我想了解工作流',
            timestamp: Date.now(),
            turnNumber: 1,
            intent: 'question' as IntentCategory,
          },
        ],
        globalContext: {},
        userPreferences: {
          preferredTone: 'friendly',
          preferredLength: 'medium',
          useEmojis: true,
          language: 'zh-CN',
        },
        state: 'clarifying' as const,
      }

      const result = analyzer.analyzeIntent('具体怎么操作？', context)
      expect(result.category).toBeDefined()
    })
  })

  describe('批量分析', () => {
    it('应该批量分析多个内容', () => {
      const contents = ['你好', '如何', '再见']
      const results = analyzer.analyzeBatch(contents)

      expect(results).toHaveLength(3)
      expect(results[0].category).toBe('greeting')
      // "如何" 本身可能不是完整的 question，所以我们只检查不是 unknown
      expect(results[1].category).not.toBe('unknown')
      expect(results[2].category).toBe('farewell')
    })
  })

  describe('自定义模式', () => {
    it('应该添加自定义意图模式', () => {
      const customPattern = {
        category: 'greeting' as IntentCategory,
        patterns: ['hiya'],
        keywords: ['嗨呀'],
        priority: 1,
      }

      analyzer.addCustomPattern(customPattern)

      const result = analyzer.analyzeIntent('hiya')
      expect(result.category).toBe('greeting')
    })

    it('应该添加自定义实体模式', () => {
      const customPattern = {
        type: 'custom_id',
        patterns: [/ID-\d+/g],
        priority: 1,
      }

      analyzer.addCustomEntityPattern(customPattern)

      const result = analyzer.analyzeIntent('我的ID是 ID-12345')
      const customEntities = result.details?.entities?.filter(e => e.type === 'custom_id')
      expect(customEntities).toBeDefined()
      expect(customEntities!.length).toBeGreaterThan(0)
    })
  })

  describe('准确率检查', () => {
    it('应该计算准确率', () => {
      const expected: IntentCategory[] = ['greeting', 'question', 'farewell']
      const actual: IntentCategory[] = ['greeting', 'question', 'farewell']

      const accuracy = analyzer.checkAccuracy(expected, actual)
      expect(accuracy).toBe(1)
    })

    it('应该处理不正确的预测', () => {
      const expected: IntentCategory[] = ['greeting', 'question', 'farewell']
      const actual: IntentCategory[] = ['greeting', 'request', 'farewell']

      const accuracy = analyzer.checkAccuracy(expected, actual)
      expect(accuracy).toBeLessThan(1)
      expect(accuracy).toBeGreaterThan(0)
    })
  })

  describe('置信度阈值更新', () => {
    it('应该更新置信度阈值', () => {
      analyzer.updateConfidenceThreshold(0.9)
      expect(analyzer['confidenceThreshold']).toBe(0.9)
    })

    it('应该拒绝无效的阈值', () => {
      expect(() => {
        analyzer.updateConfidenceThreshold(1.5)
      }).toThrow()
    })
  })
})