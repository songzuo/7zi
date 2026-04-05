/**
 * Multi-Turn Dialogue Manager Tests
 * 多轮对话管理器测试
 * v1.13.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MultiTurnDialogueManager } from '../MultiTurnDialogueManager'
import type { DialogueEnhancementConfig } from '../types'

describe('MultiTurnDialogueManager', () => {
  let manager: MultiTurnDialogueManager
  const dialogueId = 'test-dialogue-1'
  const userId = 'user-1'

  beforeEach(() => {
    manager = new MultiTurnDialogueManager()
  })

  describe('初始化', () => {
    it('应该正确初始化管理器', () => {
      expect(manager).toBeInstanceOf(MultiTurnDialogueManager)
    })

    it('应该使用默认配置', () => {
      const config = manager['config']
      expect(config.maxTurns).toBe(100)
      expect(config.maxContextLength).toBe(50)
      expect(config.coherenceTarget).toBe(4.0)
    })
  })

  describe('创建对话上下文', () => {
    it('应该创建新的对话上下文', () => {
      const context = manager.createDialogueContext(dialogueId, userId)

      expect(context).toBeDefined()
      expect(context.dialogueId).toBe(dialogueId)
      expect(context.currentTopic).toBe('general')
      expect(context.turns).toHaveLength(0)
      expect(context.state).toBe('greeting')
    })

    it('应该支持自定义初始话题', () => {
      const context = manager.createDialogueContext(dialogueId, userId, 'workflow')

      expect(context.currentTopic).toBe('workflow')
    })

    it('应该设置默认用户偏好', () => {
      const context = manager.createDialogueContext(dialogueId, userId)

      expect(context.userPreferences.preferredTone).toBe('friendly')
      expect(context.userPreferences.useEmojis).toBe(true)
      expect(context.userPreferences.language).toBe('zh-CN')
    })
  })

  describe('添加对话轮次', () => {
    beforeEach(() => {
      manager.createDialogueContext(dialogueId, userId)
    })

    it('应该添加对话轮次', () => {
      const turn = manager.addTurn(dialogueId, userId, '你好')

      expect(turn).toBeDefined()
      expect(turn.content).toBe('你好')
      expect(turn.turnNumber).toBe(1)
      expect(turn.userId).toBe(userId)
    })

    it('应该自动生成轮次ID', () => {
      const turn1 = manager.addTurn(dialogueId, userId, '第一条消息')
      const turn2 = manager.addTurn(dialogueId, userId, '第二条消息')

      expect(turn1.id).toBeDefined()
      expect(turn2.id).toBeDefined()
      expect(turn1.id).not.toBe(turn2.id)
    })

    it('应该递增轮次编号', () => {
      const turn1 = manager.addTurn(dialogueId, userId, '第一条')
      const turn2 = manager.addTurn(dialogueId, userId, '第二条')
      const turn3 = manager.addTurn(dialogueId, userId, '第三条')

      expect(turn1.turnNumber).toBe(1)
      expect(turn2.turnNumber).toBe(2)
      expect(turn3.turnNumber).toBe(3)
    })

    it('应该支持元数据', () => {
      const metadata = { source: 'web', timestamp: Date.now() }
      const turn = manager.addTurn(dialogueId, userId, '测试消息', metadata)

      expect(turn.metadata).toEqual(metadata)
    })

    it('应该限制上下文长度', () => {
      const config: Partial<DialogueEnhancementConfig> = {
        maxContextLength: 5,
      }
      const limitedManager = new MultiTurnDialogueManager(config)
      limitedManager.createDialogueContext(dialogueId, userId)

      // 添加超过限制的轮次
      for (let i = 0; i < 10; i++) {
        limitedManager.addTurn(dialogueId, userId, `消息 ${i}`)
      }

      const context = limitedManager.getDialogueContext(dialogueId)
      expect(context?.turns.length).toBe(5)
    })
  })

  describe('更新对话轮次', () => {
    beforeEach(() => {
      manager.createDialogueContext(dialogueId, userId)
    })

    it('应该更新对话轮次', () => {
      const turn = manager.addTurn(dialogueId, userId, '原始内容')
      const updated = manager.updateTurn(dialogueId, turn.id, {
        intent: 'question',
        intentConfidence: 0.9,
      })

      expect(updated).toBeDefined()
      expect(updated?.intent).toBe('question')
      expect(updated?.intentConfidence).toBe(0.9)
    })

    it('应该返回null如果轮次不存在', () => {
      const updated = manager.updateTurn(dialogueId, 'non-existent', {
        intent: 'question',
      })

      expect(updated).toBeNull()
    })
  })

  describe('获取对话轮次', () => {
    beforeEach(() => {
      manager.createDialogueContext(dialogueId, userId)
    })

    it('应该获取特定轮次', () => {
      const turn = manager.addTurn(dialogueId, userId, '测试消息')
      const retrieved = manager.getTurn(dialogueId, turn.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(turn.id)
      expect(retrieved?.content).toBe('测试消息')
    })

    it('应该返回null如果轮次不存在', () => {
      const retrieved = manager.getTurn(dialogueId, 'non-existent')

      expect(retrieved).toBeNull()
    })

    it('应该获取最近的N轮对话', () => {
      manager.addTurn(dialogueId, userId, '消息1')
      manager.addTurn(dialogueId, userId, '消息2')
      manager.addTurn(dialogueId, userId, '消息3')
      manager.addTurn(dialogueId, userId, '消息4')
      manager.addTurn(dialogueId, userId, '消息5')

      const recent = manager.getRecentTurns(dialogueId, 3)

      expect(recent).toHaveLength(3)
      expect(recent[0].content).toBe('消息3')
      expect(recent[1].content).toBe('消息4')
      expect(recent[2].content).toBe('消息5')
    })
  })

  describe('话题管理', () => {
    beforeEach(() => {
      manager.createDialogueContext(dialogueId, userId)
    })

    it('应该更新当前话题', () => {
      manager.updateCurrentTopic(dialogueId, 'workflow')

      const context = manager.getDialogueContext(dialogueId)
      expect(context?.currentTopic).toBe('workflow')
    })

    it('应该记录话题转换历史', () => {
      manager.updateCurrentTopic(dialogueId, 'workflow')
      manager.updateCurrentTopic(dialogueId, 'code')

      const context = manager.getDialogueContext(dialogueId)
      expect(context?.topicHistory).toHaveLength(2)
      expect(context?.topicHistory[0].fromTopic).toBe('general')
      expect(context?.topicHistory[0].toTopic).toBe('workflow')
      expect(context?.topicHistory[1].fromTopic).toBe('workflow')
      expect(context?.topicHistory[1].toTopic).toBe('code')
    })

    it('应该支持不同的转换类型', () => {
      manager.updateCurrentTopic(dialogueId, 'workflow', 'abrupt')
      manager.updateCurrentTopic(dialogueId, 'general', 'return')

      const context = manager.getDialogueContext(dialogueId)
      expect(context?.topicHistory[0].transitionType).toBe('abrupt')
      expect(context?.topicHistory[1].transitionType).toBe('return')
    })
  })

  describe('对话状态管理', () => {
    beforeEach(() => {
      manager.createDialogueContext(dialogueId, userId)
    })

    it('应该更新对话状态', () => {
      manager.updateDialogueState(dialogueId, 'active')

      const context = manager.getDialogueContext(dialogueId)
      expect(context?.state).toBe('active')
    })

    it('应该支持所有状态类型', () => {
      const states = ['greeting', 'active', 'clarifying', 'resolving', 'closing', 'error'] as const

      for (const state of states) {
        manager.updateDialogueState(dialogueId, state)
        const context = manager.getDialogueContext(dialogueId)
        expect(context?.state).toBe(state)
      }
    })
  })

  describe('用户偏好管理', () => {
    beforeEach(() => {
      manager.createDialogueContext(dialogueId, userId)
    })

    it('应该更新用户偏好', () => {
      manager.updateUserPreferences(dialogueId, {
        preferredTone: 'formal',
        useEmojis: false,
      })

      const context = manager.getDialogueContext(dialogueId)
      expect(context?.userPreferences.preferredTone).toBe('formal')
      expect(context?.userPreferences.useEmojis).toBe(false)
    })

    it('应该保留未更新的偏好', () => {
      manager.updateUserPreferences(dialogueId, {
        preferredTone: 'professional',
      })

      const context = manager.getDialogueContext(dialogueId)
      expect(context?.userPreferences.preferredTone).toBe('professional')
      expect(context?.userPreferences.useEmojis).toBe(true) // 默认值
    })
  })

  describe('连贯性评分', () => {
    beforeEach(() => {
      manager.createDialogueContext(dialogueId, userId)
    })

    it('应该计算连贯性评分', () => {
      manager.addTurn(dialogueId, userId, '你好')
      manager.addTurn(dialogueId, userId, '我想了解工作流')
      manager.addTurn(dialogueId, userId, '好的，让我解释一下')

      const score = manager.calculateCoherenceScore(dialogueId)

      expect(score).toBeDefined()
      expect(score.overall).toBeGreaterThanOrEqual(0)
      expect(score.overall).toBeLessThanOrEqual(5)
    })

    it('应该返回0分对于空对话', () => {
      const score = manager.calculateCoherenceScore(dialogueId)

      expect(score.overall).toBe(0)
    })

    it('应该检查连贯性是否达标', () => {
      manager.addTurn(dialogueId, userId, '你好')
      manager.addTurn(dialogueId, userId, '我想了解工作流')

      const isAboveTarget = manager.isCoherenceAboveTarget(dialogueId)

      expect(typeof isAboveTarget).toBe('boolean')
    })

    it('应该包含详细分析', () => {
      manager.addTurn(dialogueId, userId, '你好')
      manager.addTurn(dialogueId, userId, '我想了解工作流')

      const score = manager.calculateCoherenceScore(dialogueId)

      expect(score.analysis).toBeDefined()
      expect(score.analysis.topicTransitions).toBeGreaterThanOrEqual(0)
      expect(score.analysis.intentConsistency).toBeGreaterThanOrEqual(0)
      expect(score.analysis.sentimentStability).toBeGreaterThanOrEqual(0)
    })
  })

  describe('对话统计', () => {
    beforeEach(() => {
      manager.createDialogueContext(dialogueId, userId)
    })

    it('应该获取对话统计信息', () => {
      manager.addTurn(dialogueId, userId, '你好')
      manager.addTurn(dialogueId, userId, '我想了解工作流')

      const stats = manager.getDialogueStats(dialogueId)

      expect(stats).toBeDefined()
      expect(stats?.totalTurns).toBe(2)
      expect(stats?.topicChanges).toBe(0)
      expect(stats?.coherenceScore).toBeDefined()
    })

    it('应该返回null对于不存在的对话', () => {
      const stats = manager.getDialogueStats('non-existent')

      expect(stats).toBeNull()
    })

    it('应该计算平均轮次持续时间', async () => {
      manager.addTurn(dialogueId, userId, '消息1')
      // 等待一小段时间确保有差异
      await new Promise(resolve => setTimeout(resolve, 10))
      manager.addTurn(dialogueId, userId, '消息2')

      const stats = manager.getDialogueStats(dialogueId)

      expect(stats?.avgTurnDuration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('导入导出', () => {
    beforeEach(() => {
      manager.createDialogueContext(dialogueId, userId)
      manager.addTurn(dialogueId, userId, '你好')
      manager.addTurn(dialogueId, userId, '我想了解工作流')
    })

    it('应该导出对话上下文', () => {
      const exported = manager.exportContext(dialogueId)

      expect(exported).toBeDefined()
      expect(typeof exported).toBe('string')

      const parsed = JSON.parse(exported)
      expect(parsed.dialogueId).toBe(dialogueId)
      expect(parsed.turns).toHaveLength(2)
    })

    it('应该导入对话上下文', () => {
      const exported = manager.exportContext(dialogueId)
      manager.clearDialogueContext(dialogueId)

      const success = manager.importContext(dialogueId, exported)

      expect(success).toBe(true)

      const context = manager.getDialogueContext(dialogueId)
      expect(context?.turns).toHaveLength(2)
    })

    it('应该处理无效的导入数据', () => {
      const success = manager.importContext(dialogueId, 'invalid json')

      expect(success).toBe(false)
    })
  })

  describe('清除对话', () => {
    beforeEach(() => {
      manager.createDialogueContext(dialogueId, userId)
      manager.addTurn(dialogueId, userId, '你好')
    })

    it('应该清除对话上下文', () => {
      manager.clearDialogueContext(dialogueId)

      const context = manager.getDialogueContext(dialogueId)
      expect(context).toBeUndefined()
    })
  })

  describe('获取所有上下文', () => {
    it('应该获取所有对话上下文', () => {
      manager.createDialogueContext('dialogue-1', 'user-1')
      manager.createDialogueContext('dialogue-2', 'user-2')
      manager.createDialogueContext('dialogue-3', 'user-3')

      const allContexts = manager.getAllContexts()

      expect(allContexts).toHaveLength(3)
    })
  })
})