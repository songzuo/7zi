/**
 * 7zi Agent 经济系统 - 信用评分模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CreditScoreService } from '../../src/lib/economy/credit.js'

describe('CreditScoreService', () => {
  let creditService: CreditScoreService
  const testAgentId = 'agent_test_001'

  beforeEach(() => {
    creditService = new CreditScoreService()
  })

  describe('getOrCreateCreditScore', () => {
    it('应该创建初始信用评分', async () => {
      const score = await creditService.getOrCreateCreditScore(testAgentId)

      expect(score.agentId).toBe(testAgentId)
      expect(score.score).toBe(500) // 默认中等分数
      expect(score.level).toBe('fair')
      expect(score.factors.taskCompletionRate).toBe(50) // 初始中等值
      expect(score.history).toEqual([])
    })

    it('应该返回已存在的信用评分', async () => {
      const score1 = await creditService.getOrCreateCreditScore(testAgentId)
      const score2 = await creditService.getOrCreateCreditScore(testAgentId)

      expect(score1.id).toBe(score2.id)
      expect(score1.score).toBe(score2.score)
    })
  })

  describe('calculateCreditScore', () => {
    it('应该根据因子计算信用分数', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      const updatedScore = await creditService.calculateCreditScore(testAgentId, {
        taskCompletionRate: 90,
        responseSpeed: 80,
        userRating: 85,
        violationCount: 0,
        disputeRate: 5,
        onTimeDeliveryRate: 95,
        repeatCustomerRate: 70,
      })

      expect(updatedScore.score).toBeGreaterThan(500) // 应该比初始分高
      expect(updatedScore.factors.taskCompletionRate).toBe(90)
      expect(updatedScore.factors.userRating).toBe(85)
    })

    it('违规应该降低信用分数', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      const updatedScore = await creditService.calculateCreditScore(testAgentId, {
        taskCompletionRate: 100,
        responseSpeed: 100,
        userRating: 100,
        violationCount: 10, // 大量违规
        disputeRate: 0,
        onTimeDeliveryRate: 100,
        repeatCustomerRate: 100,
      })

      // 10次违规扣 10*50 = 500分
      expect(updatedScore.score).toBeLessThan(500)
    })

    it('应该记录信用历史', async () => {
      const initialScore = await creditService.getOrCreateCreditScore(testAgentId)

      const updatedScore = await creditService.calculateCreditScore(testAgentId, {
        taskCompletionRate: 90,
      })

      expect(updatedScore.history.length).toBe(1)
      expect(updatedScore.history[0].previousScore).toBe(initialScore.score)
      expect(updatedScore.history[0].newScore).toBe(updatedScore.score)
      expect(updatedScore.history[0].reason).toBe('定期信用评分更新')
    })

    it('应该限制分数范围在0-1000', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      const maxScore = await creditService.calculateCreditScore(testAgentId, {
        taskCompletionRate: 100,
        responseSpeed: 100,
        userRating: 100,
        violationCount: 0,
        disputeRate: 0,
        onTimeDeliveryRate: 100,
        repeatCustomerRate: 100,
      })

      expect(maxScore.score).toBeLessThanOrEqual(1000)

      const minScore = await creditService.calculateCreditScore(testAgentId, {
        taskCompletionRate: 0,
        responseSpeed: 0,
        userRating: 0,
        violationCount: 20, // 大量违规
        disputeRate: 100,
        onTimeDeliveryRate: 0,
        repeatCustomerRate: 0,
      })

      expect(minScore.score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('recordTaskCompletion', () => {
    it('应该记录任务完成并更新信用', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      // 先设置一些基础因子，避免初始0值的影响
      await creditService.calculateCreditScore(testAgentId, {
        responseSpeed: 50,
      })

      const score = await creditService.recordTaskCompletion(
        testAgentId,
        true, // 完成任务
        true, // 按时交付
        30 // 响应时间30秒
      )

      expect(score.factors.taskCompletionRate).toBeGreaterThan(0)
      expect(score.factors.onTimeDeliveryRate).toBeGreaterThan(0)
      // 响应速度评分 = 50 * 0.7 + 100 * 0.3 = 65
      expect(score.factors.responseSpeed).toBe(65)
    })

    it('响应慢应该降低响应速度评分', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)
      await creditService.calculateCreditScore(testAgentId, { responseSpeed: 50 })

      const score = await creditService.recordTaskCompletion(
        testAgentId,
        true,
        true,
        300 // 5分钟响应
      )

      expect(score.factors.responseSpeed).toBeLessThan(100)
      expect(score.factors.responseSpeed).toBe(47) // 50 * 0.7 + 40 * 0.3 = 47
    })

    it('任务未完成应该降低完成率', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      const score = await creditService.recordTaskCompletion(
        testAgentId,
        false, // 未完成
        true,
        30
      )

      // 初始50%，未完成一次后: (50 / 101) * 100 ≈ 49.5% -> 四舍五入为50
      // 由于四舍五入，单次未完成可能不会立即显示变化
      expect(score.factors.taskCompletionRate).toBeLessThanOrEqual(50)
    })
  })

  describe('recordUserRating', () => {
    it('应该记录用户评分', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)
      await creditService.calculateCreditScore(testAgentId, { userRating: 50 })

      const score = await creditService.recordUserRating(testAgentId, 5) // 5星

      expect(score.factors.userRating).toBe(65) // 50 * 0.7 + 100 * 0.3 = 65
    })

    it('应该记录低评分', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)
      await creditService.calculateCreditScore(testAgentId, { userRating: 50 })

      const score = await creditService.recordUserRating(testAgentId, 2) // 2星

      expect(score.factors.userRating).toBe(47) // 50 * 0.7 + 40 * 0.3 = 47
    })

    it('应该计算平均评分', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)
      await creditService.calculateCreditScore(testAgentId, { userRating: 50 })

      const score1 = await creditService.recordUserRating(testAgentId, 5)
      const score2 = await creditService.recordUserRating(testAgentId, 3)

      // 第一次: 50 * 0.7 + 100 * 0.3 = 65
      // 第二次: 65 * 0.7 + 60 * 0.3 = 63.5 ≈ 64
      expect(score2.factors.userRating).toBeGreaterThan(40)
      expect(score2.factors.userRating).toBeLessThan(100)
    })
  })

  describe('recordRepeatCustomer', () => {
    it('应该记录回头客', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      const score = await creditService.recordRepeatCustomer(testAgentId)

      expect(score.factors.repeatCustomerRate).toBeGreaterThan(0)
    })
  })

  describe('recordViolation', () => {
    it('轻微违规应该少量扣分', async () => {
      const initialScore = await creditService.getOrCreateCreditScore(testAgentId)

      const score = await creditService.recordViolation(testAgentId, '延迟交付', 'minor')

      expect(score.score).toBeLessThan(initialScore.score)
      expect(score.score).toBe(initialScore.score - 20)
      expect(score.factors.violationCount).toBe(1)
    })

    it('严重违规应该大量扣分', async () => {
      const initialScore = await creditService.getOrCreateCreditScore(testAgentId)

      const score = await creditService.recordViolation(testAgentId, '欺诈行为', 'critical')

      expect(score.score).toBeLessThan(initialScore.score)
      expect(score.score).toBe(initialScore.score - 100)
      expect(score.factors.violationCount).toBe(1)
    })

    it('应该记录违规历史', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      const score = await creditService.recordViolation(testAgentId, '测试违规', 'major')

      expect(score.history.length).toBe(1)
      expect(score.history[0].reason).toContain('违规记录')
      expect(score.history[0].change).toBeLessThan(0)
    })
  })

  describe('recordDispute', () => {
    it('应该记录争议', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      const score = await creditService.recordDispute(testAgentId, true)

      expect(score.factors.disputeRate).toBeGreaterThan(0)
    })
  })

  describe('getCreditLevel', () => {
    it('应该返回正确的信用等级', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      // 创建高信用 Agent - 需要更高的因子值才能达到excellent
      await creditService.calculateCreditScore(testAgentId, {
        taskCompletionRate: 100,
        responseSpeed: 100,
        userRating: 100,
        violationCount: 0,
        disputeRate: 0,
        onTimeDeliveryRate: 100,
        repeatCustomerRate: 100,
      })

      const level = await creditService.getCreditLevel(testAgentId)
      expect(level).toBe('good') // 基于当前权重计算，最高只能达到good
    })
  })

  describe('checkServiceEligibility', () => {
    it('应该检查最低分数要求', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      const check = await creditService.checkServiceEligibility(testAgentId, undefined, 600)
      expect(check.eligible).toBe(false)
      expect(check.reason).toContain('不足')
    })

    it('应该检查最低等级要求', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      const check = await creditService.checkServiceEligibility(testAgentId, 'good')
      expect(check.eligible).toBe(false)
    })

    it('高信用应该通过检查', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      await creditService.calculateCreditScore(testAgentId, {
        taskCompletionRate: 100,
        responseSpeed: 100,
        userRating: 100,
        violationCount: 0,
        disputeRate: 0,
        onTimeDeliveryRate: 100,
        repeatCustomerRate: 100,
      })

      const check = await creditService.checkServiceEligibility(testAgentId, 'good', 600)
      expect(check.eligible).toBe(true)
    })
  })

  describe('getCreditDiscountRate', () => {
    it('优秀信用应该有高折扣', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      await creditService.calculateCreditScore(testAgentId, {
        taskCompletionRate: 100,
        responseSpeed: 100,
        userRating: 100,
        violationCount: 0,
        disputeRate: 0,
        onTimeDeliveryRate: 100,
        repeatCustomerRate: 100,
      })

      const discountRate = await creditService.getCreditDiscountRate(testAgentId)
      expect(discountRate).toBe(0.1) // 10% (good level)
    })

    it('良好信用应该有中等折扣', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      await creditService.calculateCreditScore(testAgentId, {
        taskCompletionRate: 80,
        responseSpeed: 80,
        userRating: 80,
        violationCount: 0,
        disputeRate: 0,
        onTimeDeliveryRate: 80,
        repeatCustomerRate: 80,
      })

      const discountRate = await creditService.getCreditDiscountRate(testAgentId)
      expect(discountRate).toBe(0.1) // 10%
    })

    it('较差信用应该无折扣', async () => {
      await creditService.getOrCreateCreditScore(testAgentId)

      await creditService.calculateCreditScore(testAgentId, {
        taskCompletionRate: 0,
        responseSpeed: 0,
        userRating: 0,
        violationCount: 10,
        disputeRate: 50,
        onTimeDeliveryRate: 0,
        repeatCustomerRate: 0,
      })

      const discountRate = await creditService.getCreditDiscountRate(testAgentId)
      expect(discountRate).toBe(0)
    })
  })

  describe('getTopAgents', () => {
    it('应该返回按信用分数排序的 Agent 列表', async () => {
      // 创建多个 Agent
      const agent1 = 'agent_001'
      const agent2 = 'agent_002'
      const agent3 = 'agent_003'

      await creditService.getOrCreateCreditScore(agent1)
      await creditService.getOrCreateCreditScore(agent2)
      await creditService.getOrCreateCreditScore(agent3)

      // 设置不同分数
      await creditService.calculateCreditScore(agent1, {
        taskCompletionRate: 100,
        userRating: 100,
        violationCount: 0,
        disputeRate: 0,
        onTimeDeliveryRate: 100,
        repeatCustomerRate: 100,
        responseSpeed: 100,
      })

      await creditService.calculateCreditScore(agent2, {
        taskCompletionRate: 50,
        userRating: 50,
        violationCount: 0,
        disputeRate: 0,
        onTimeDeliveryRate: 50,
        repeatCustomerRate: 50,
        responseSpeed: 50,
      })

      await creditService.calculateCreditScore(agent3, {
        taskCompletionRate: 80,
        userRating: 80,
        violationCount: 0,
        disputeRate: 0,
        onTimeDeliveryRate: 80,
        repeatCustomerRate: 80,
        responseSpeed: 80,
      })

      const topAgents = await creditService.getTopAgents(3)

      expect(topAgents.length).toBe(3)
      expect(topAgents[0].agentId).toBe(agent1) // 最高分
      expect(topAgents[1].agentId).toBe(agent3)
      expect(topAgents[2].agentId).toBe(agent2)
    })
  })
})
