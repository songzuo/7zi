/**
 * 成本追踪器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CostTracker } from '../cost-tracker'

describe('CostTracker', () => {
  let tracker: CostTracker

  beforeEach(() => {
    tracker = new CostTracker({ maxRecords: 100 })
  })

  describe('记录成本', () => {
    it('should record cost', () => {
      const record = tracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 50,
        latency: 1500,
      })

      expect(record.id).toBeDefined()
      expect(record.timestamp).toBeDefined()
      expect(record.modelId).toBe('gpt-4o')
      expect(record.cost).toBe(50)
    })

    it('should record multiple costs', () => {
      tracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 50,
        latency: 1500,
      })

      tracker.record({
        modelId: 'claude-4-opus',
        modelName: 'Claude 4 Opus',
        provider: 'anthropic',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 80,
        latency: 2000,
      })

      const records = tracker.getRecords()
      expect(records.length).toBe(2)
    })
  })

  describe('统计信息', () => {
    it('should calculate total cost', () => {
      tracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 50,
        latency: 1500,
      })

      tracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 30,
        latency: 1000,
      })

      const stats = tracker.getStats()
      expect(stats.totalCost).toBe(80)
      expect(stats.totalRequests).toBe(2)
    })

    it('should calculate stats by model', () => {
      tracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 50,
        latency: 1500,
      })

      tracker.record({
        modelId: 'claude-4-opus',
        modelName: 'Claude 4 Opus',
        provider: 'anthropic',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 80,
        latency: 2000,
      })

      const stats = tracker.getStats()
      expect(stats.byModel['gpt-4o']).toBeDefined()
      expect(stats.byModel['gpt-4o'].cost).toBe(50)
      expect(stats.byModel['claude-4-opus'].cost).toBe(80)
    })

    it('should calculate stats by provider', () => {
      tracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 50,
        latency: 1500,
      })

      const stats = tracker.getStats()
      expect(stats.byProvider['openai']).toBeDefined()
      expect(stats.byProvider['openai'].cost).toBe(50)
    })

    it('should calculate average latency', () => {
      tracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 50,
        latency: 1000,
      })

      tracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 50,
        latency: 2000,
      })

      const stats = tracker.getStats()
      expect(stats.avgLatency).toBe(1500)
    })
  })

  describe('预算控制', () => {
    it('should check budget', () => {
      const budgetTracker = new CostTracker({ dailyBudgetLimit: 100 })
      
      expect(budgetTracker.checkBudget(50)).toBe(true)
      
      budgetTracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 80,
        latency: 1500,
      })
      
      expect(budgetTracker.checkBudget(30)).toBe(false)
    })

    it('should get remaining budget', () => {
      const budgetTracker = new CostTracker({ dailyBudgetLimit: 100 })
      
      budgetTracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 30,
        latency: 1500,
      })
      
      expect(budgetTracker.getRemainingBudget()).toBe(70)
    })
  })

  describe('记录查询', () => {
    it('should get records by model', () => {
      tracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 50,
        latency: 1500,
      })

      tracker.record({
        modelId: 'claude-4-opus',
        modelName: 'Claude 4 Opus',
        provider: 'anthropic',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 80,
        latency: 2000,
      })

      const records = tracker.getRecordsByModel('gpt-4o')
      expect(records.length).toBe(1)
      expect(records[0].modelId).toBe('gpt-4o')
    })

    it('should limit records', () => {
      for (let i = 0; i < 10; i++) {
        tracker.record({
          modelId: 'gpt-4o',
          modelName: 'GPT-4o',
          provider: 'openai',
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
          cost: 50,
          latency: 1500,
        })
      }

      const records = tracker.getRecords(5)
      expect(records.length).toBe(5)
    })
  })

  describe('清空和重置', () => {
    it('should clear records', () => {
      tracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 50,
        latency: 1500,
      })

      tracker.clear()
      const records = tracker.getRecords()
      expect(records.length).toBe(0)
    })
  })

  describe('导入导出', () => {
    it('should export and import records', () => {
      tracker.record({
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'openai',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        cost: 50,
        latency: 1500,
      })

      const exported = tracker.export()
      expect(exported.length).toBe(1)

      const newTracker = new CostTracker()
      newTracker.import(exported)
      expect(newTracker.getRecords().length).toBe(1)
    })
  })
})
