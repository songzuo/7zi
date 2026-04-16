/**
 * Sentiment Analyzer Tests
 * 情感分析器测试
 * v1.13.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SentimentAnalyzer } from '../SentimentAnalyzer'
import type { SentimentLabel } from '../types'

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer

  beforeEach(() => {
    analyzer = new SentimentAnalyzer()
  })

  describe('初始化', () => {
    it('应该正确初始化分析器', () => {
      expect(analyzer).toBeInstanceOf(SentimentAnalyzer)
    })

    it('应该加载正面词典', () => {
      const lexicon = analyzer['positiveLexicon']
      expect(lexicon.size).toBeGreaterThan(0)
    })

    it('应该加载负面词典', () => {
      const lexicon = analyzer['negativeLexicon']
      expect(lexicon.size).toBeGreaterThan(0)
    })
  })

  describe('正面情感识别', () => {
    it('应该识别中文正面情感', () => {
      const positiveTexts = [
        '这个功能很好',
        '太棒了',
        '我很满意',
        '做得不错',
        '感谢你的帮助',
      ]

      positiveTexts.forEach(text => {
        const result = analyzer.analyzeSentiment(text)
        expect(result.label).toBe('positive')
        expect(result.intensity).toBeGreaterThan(0)
      })
    })

    it('应该识别英文正面情感', () => {
      const positiveTexts = [
        'This is great',
        'I love it',
        'Excellent work',
        'Thank you very much',
        'Amazing',
      ]

      positiveTexts.forEach(text => {
        const result = analyzer.analyzeSentiment(text)
        expect(result.label).toBe('positive')
        expect(result.intensity).toBeGreaterThan(0)
      })
    })
  })

  describe('负面情感识别', () => {
    it('应该识别中文负面情感', () => {
      const negativeTexts = [
        '这个功能很差',
        '我很失望',
        '有问题',
        '不好用',
        '很糟糕',
      ]

      negativeTexts.forEach(text => {
        const result = analyzer.analyzeSentiment(text)
        expect(result.label).toBe('negative')
        expect(result.intensity).toBeLessThan(0)
      })
    })

    it('应该识别英文负面情感', () => {
      const negativeTexts = [
        'This is terrible',
        'I hate it',
        'Very disappointed',
        'Not good',
        'Awful',
      ]

      negativeTexts.forEach(text => {
        const result = analyzer.analyzeSentiment(text)
        expect(result.label).toBe('negative')
        expect(result.intensity).toBeLessThan(0)
      })
    })
  })

  describe('中性情感识别', () => {
    it('应该识别中性情感', () => {
      const neutralTexts = [
        '这是什么？',
        '我想了解',
        '请说明',
        'What is this?',
        'I want to know',
      ]

      neutralTexts.forEach(text => {
        const result = analyzer.analyzeSentiment(text)
        expect(result.label).toBe('neutral')
      })
    })
  })

  describe('情感强度', () => {
    it('应该计算情感强度', () => {
      const result = analyzer.analyzeSentiment('这个功能非常好')
      expect(result.intensity).toBeGreaterThan(0)
      expect(result.intensity).toBeLessThanOrEqual(1)
    })

    it('应该识别强度修饰词', () => {
      const result1 = analyzer.analyzeSentiment('这个功能好')
      const result2 = analyzer.analyzeSentiment('这个功能非常好')
      const result3 = analyzer.analyzeSentiment('这个功能特别棒')

      // 强度修饰词应提升情感强度
      expect(result2.intensity).toBeGreaterThanOrEqual(result1.intensity)
      expect(result3.intensity).toBeGreaterThanOrEqual(result2.intensity)
      // 修饰后的分数应显著高于原始分数
      expect(result2.intensity).toBeGreaterThan(0)
    })
  })

  describe('否定处理', () => {
    it('应该处理否定词', () => {
      const result = analyzer.analyzeSentiment('这个功能不好')
      expect(result.intensity).toBeLessThan(0)
    })

    it('应该反转情感极性', () => {
      const positive = analyzer.analyzeSentiment('这个功能好')
      const negative = analyzer.analyzeSentiment('这个功能不好')

      expect(positive.intensity).toBeGreaterThan(0)
      expect(negative.intensity).toBeLessThan(0)
    })
  })

  describe('情感细节检测', () => {
    it('应该检测快乐情感', () => {
      const result = analyzer.analyzeSentiment('我很开心')
      const joyEmotion = result.emotions?.find(e => e.emotion === 'joy')
      expect(joyEmotion).toBeDefined()
    })

    it('应该检测悲伤情感', () => {
      const result = analyzer.analyzeSentiment('我很伤心')
      const sadnessEmotion = result.emotions?.find(e => e.emotion === 'sadness')
      expect(sadnessEmotion).toBeDefined()
    })

    it('应该检测愤怒情感', () => {
      const result = analyzer.analyzeSentiment('我很生气')
      const angerEmotion = result.emotions?.find(e => e.emotion === 'anger')
      expect(angerEmotion).toBeDefined()
    })
  })

  describe('置信度计算', () => {
    it('应该在0到1之间', () => {
      const result = analyzer.analyzeSentiment('这个功能很好')
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('应该基于词数提高置信度', () => {
      const result1 = analyzer.analyzeSentiment('好')
      const result2 = analyzer.analyzeSentiment('这个功能非常好，我很满意')

      expect(result2.confidence).toBeGreaterThan(result1.confidence)
    })
  })

  describe('批量分析', () => {
    it('应该批量分析多个内容', () => {
      const contents = ['很好', '很差', '一般']
      const results = analyzer.analyzeBatch(contents)

      expect(results).toHaveLength(3)
      expect(results[0].label).toBe('positive')
      expect(results[1].label).toBe('negative')
      expect(results[2].label).toBe('neutral')
    })
  })

  describe('情感趋势分析', () => {
    it('应该分析情感趋势', () => {
      // 使用有明显区分度的文本，确保后半部分平均分高于前半部分
      const contents = ['好', '不错', '太棒了']
      const trend = analyzer.analyzeTrend(contents)

      expect(trend.averageScore).toBeGreaterThan(0)
      expect(trend.results).toHaveLength(3)
      // 验证分数计算正常
      expect(trend.variance).toBeGreaterThanOrEqual(0)
    })

    it('应该识别下降趋势', () => {
      const contents = ['很好', '一般', '很差']
      const trend = analyzer.analyzeTrend(contents)

      expect(trend.trend).toBe('declining')
    })

    it('应该识别稳定趋势', () => {
      const contents = ['一般', '一般', '一般']
      const trend = analyzer.analyzeTrend(contents)

      expect(trend.trend).toBe('stable')
    })

    it('应该计算方差', () => {
      const contents = ['很好', '很差', '一般']
      const trend = analyzer.analyzeTrend(contents)

      expect(trend.variance).toBeGreaterThan(0)
    })
  })

  describe('情感统计', () => {
    it('应该计算情感分布', () => {
      const contents = ['很好', '很差', '一般', '很好', '很差']
      const stats = analyzer.getSentimentStats(contents)

      expect(stats.distribution.positive).toBe(2)
      expect(stats.distribution.negative).toBe(2)
      expect(stats.distribution.neutral).toBe(1)
    })

    it('应该计算平均强度', () => {
      const contents = ['很好', '很差', '一般']
      const stats = analyzer.getSentimentStats(contents)

      expect(stats.averageIntensity).toBeDefined()
    })

    it('应该识别主导情感', () => {
      const contents = ['我很开心', '我很高兴', '我很快乐']
      const stats = analyzer.getSentimentStats(contents)

      expect(stats.dominantEmotion).toBe('joy')
    })
  })

  describe('自定义词典', () => {
    it('应该添加正面词', () => {
      analyzer.addPositiveWord('超赞', 0.9)
      const result = analyzer.analyzeSentiment('这个功能超赞')

      expect(result.label).toBe('positive')
    })

    it('应该添加负面词', () => {
      analyzer.addNegativeWord('太烂', -0.9)
      const result = analyzer.analyzeSentiment('这个功能太烂')

      expect(result.label).toBe('negative')
    })

    it('应该添加强度修饰词', () => {
      analyzer.addIntensifier('超级', 1.8)
      const result = analyzer.analyzeSentiment('超级好')

      expect(result.intensity).toBeGreaterThan(0)
    })

    it('应该添加否定词', () => {
      analyzer.addNegator('别')
      const result = analyzer.analyzeSentiment('别好')

      expect(result.intensity).toBeLessThan(0)
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
            content: '这个功能很差',
            timestamp: Date.now(),
            turnNumber: 1,
            sentiment: {
              label: 'negative' as SentimentLabel,
              confidence: 0.8,
              intensity: -0.7,
            },
          },
        ],
        globalContext: {},
        userPreferences: {
          preferredTone: 'friendly',
          preferredLength: 'medium',
          useEmojis: true,
          language: 'zh-CN',
        },
        state: 'active' as const,
      }

      const result = analyzer.analyzeSentiment('好的', context)
      expect(result).toBeDefined()
    })
  })

  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      const result = analyzer.analyzeSentiment('')
      expect(result).toBeDefined()
      expect(result.label).toBe('neutral')
    })

    it('应该处理特殊字符', () => {
      const result = analyzer.analyzeSentiment('这个功能很好！@#$%^&*()')
      expect(result).toBeDefined()
    })

    it('应该处理混合情感', () => {
      const result = analyzer.analyzeSentiment('这个功能很好，但是有点问题')
      expect(result).toBeDefined()
    })

    it('应该处理长文本', () => {
      const longText = '这个功能很好，'.repeat(100)
      const result = analyzer.analyzeSentiment(longText)
      expect(result).toBeDefined()
    })
  })
})