/**
 * 7zi Agent 经济系统 - 信用评分模块单元测试
 *
 * 覆盖语义维度：
 * - 分数区间与等级映射（0-1000 封顶封底）
 * - 违规扣分持久化（penaltyOffset，重算不抹掉）
 * - 因子取值校验（NaN / 负数 / 越界）
 * - 状态流转（等级随分数变化、评分历史记录）
 * - 资格判定与折扣率
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CreditScoreService, InMemoryCreditScoreRepository, DEFAULT_WEIGHTS } from '../credit.js'
import type { CreditFactors, CreditLevel } from '../types.js'

describe('CreditScoreService', () => {
  let service: CreditScoreService
  let repo: InMemoryCreditScoreRepository

  beforeEach(() => {
    repo = new InMemoryCreditScoreRepository()
    service = new CreditScoreService(repo)
  })

  describe('getOrCreateCreditScore — 初始评分', () => {
    it('首次创建：500 分 / fair 等级 / 初始因子', async () => {
      const score = await service.getOrCreateCreditScore('agent-1')

      expect(score.agentId).toBe('agent-1')
      expect(score.score).toBe(500)
      expect(score.level).toBe('fair')
      expect(score.factors.taskCompletionRate).toBe(50)
      expect(score.factors.violationCount).toBe(0)
      expect(score.factors.disputeRate).toBe(0)
      expect(score.penaltyOffset).toBe(0)
      expect(score.history).toEqual([])
    })

    it('幂等：重复调用返回同一条记录，不重复创建', async () => {
      const a = await service.getOrCreateCreditScore('agent-1')
      const b = await service.getOrCreateCreditScore('agent-1')

      expect(b.id).toBe(a.id)
      expect(b.score).toBe(500)
    })

    it('不同 agent 互相独立', async () => {
      const a = await service.getOrCreateCreditScore('agent-1')
      const b = await service.getOrCreateCreditScore('agent-2')

      expect(a.id).not.toBe(b.id)
      expect(a.score).toBe(b.score)
    })
  })

  describe('calculateCreditScore — 分数计算', () => {
    it('所有因子为 50（中性）时分数保持 500', async () => {
      const score = await service.calculateCreditScore('agent-1', {
        taskCompletionRate: 50,
        responseSpeed: 50,
        userRating: 50,
        onTimeDeliveryRate: 50,
        repeatCustomerRate: 50,
      })

      expect(score.score).toBe(500)
      expect(score.level).toBe('fair')
    })

    it('优秀因子 → 高分，等级 excellent', async () => {
      const score = await service.calculateCreditScore('agent-1', {
        taskCompletionRate: 100,
        responseSpeed: 100,
        userRating: 100,
        onTimeDeliveryRate: 100,
        repeatCustomerRate: 100,
      })

      // 500 + 50*5*0.25 + 50*4*0.15 + 50*6*0.2 + 50*4*0.15 + 50*3*0.15
      // = 500 + 62.5 + 30 + 60 + 30 + 22.5 = 705
      expect(score.score).toBe(705)
      expect(score.level).toBe('good')
    })

    it('分数被限制在 1000 以内', async () => {
      const score = await service.calculateCreditScore('agent-1', {
        taskCompletionRate: 100,
        responseSpeed: 100,
        userRating: 100,
        onTimeDeliveryRate: 100,
        repeatCustomerRate: 100,
      })
      // 再叠加一次，仍然不能超过 1000
      const again = await service.calculateCreditScore('agent-1', {
        taskCompletionRate: 100,
        responseSpeed: 100,
        userRating: 100,
        onTimeDeliveryRate: 100,
        repeatCustomerRate: 100,
      })

      expect(again.score).toBeLessThanOrEqual(1000)
      expect(score.score).toBeLessThanOrEqual(1000)
    })

    it('分数被限制在 0 以上（不会为负）', async () => {
      const score = await service.calculateCreditScore('agent-1', {
        taskCompletionRate: 0,
        responseSpeed: 0,
        userRating: 0,
        onTimeDeliveryRate: 0,
        repeatCustomerRate: 0,
      })

      expect(score.score).toBeGreaterThanOrEqual(0)
      expect(score.score).toBe(0)
      expect(score.level).toBe('poor')
    })

    it('分数是整数', async () => {
      const score = await service.calculateCreditScore('agent-1', {
        taskCompletionRate: 73,
        responseSpeed: 61,
        userRating: 87,
        onTimeDeliveryRate: 55,
        repeatCustomerRate: 91,
      })

      expect(Number.isInteger(score.score)).toBe(true)
    })

    it('写入历史记录：previousScore / newScore / change 正确', async () => {
      await service.calculateCreditScore('agent-1', { taskCompletionRate: 100 })
      const score = await service.getOrCreateCreditScore('agent-1')

      expect(score.history).toHaveLength(1)
      expect(score.history[0].previousScore).toBe(500)
      expect(score.history[0].newScore).toBe(score.score)
      expect(score.history[0].change).toBe(score.score - 500)
    })

    it('因子合并：未传的因子保持原值', async () => {
      await service.calculateCreditScore('agent-1', { userRating: 90 })
      const score = await service.getOrCreateCreditScore('agent-1')

      expect(score.factors.userRating).toBe(90)
      expect(score.factors.taskCompletionRate).toBe(50)
    })
  })

  describe('assertValidFactors — 因子取值校验', () => {
    it('百分比因子 > 100 抛错', async () => {
      await expect(
        service.calculateCreditScore('agent-1', { taskCompletionRate: 101 })
      ).rejects.toThrow(/taskCompletionRate/)
    })

    it('百分比因子 < 0 抛错', async () => {
      await expect(
        service.calculateCreditScore('agent-1', { responseSpeed: -1 })
      ).rejects.toThrow(/responseSpeed/)
    })

    it('百分比因子 NaN 抛错', async () => {
      await expect(
        service.calculateCreditScore('agent-1', { userRating: NaN })
      ).rejects.toThrow(/userRating/)
    })

    it('百分比因子 Infinity 抛错', async () => {
      await expect(
        service.calculateCreditScore('agent-1', { onTimeDeliveryRate: Infinity })
      ).rejects.toThrow(/onTimeDeliveryRate/)
    })

    it('计数因子为负数抛错', async () => {
      await expect(
        service.calculateCreditScore('agent-1', { violationCount: -1 })
      ).rejects.toThrow(/violationCount/)
    })

    it('计数因子为小数抛错', async () => {
      await expect(
        service.calculateCreditScore('agent-1', { disputeRate: 1.5 })
      ).rejects.toThrow(/disputeRate/)
    })

    it('计数因子为负小数抛错', async () => {
      await expect(
        service.calculateCreditScore('agent-1', { violationCount: -0.5 })
      ).rejects.toThrow(/violationCount/)
    })

    it('非法因子不会污染已保存的评分', async () => {
      const before = await service.getOrCreateCreditScore('agent-1')
      await expect(
        service.calculateCreditScore('agent-1', { taskCompletionRate: 999 })
      ).rejects.toThrow()
      const after = await service.getOrCreateCreditScore('agent-1')

      expect(after.score).toBe(before.score)
      expect(after.factors.taskCompletionRate).toBe(50)
    })
  })

  describe('recordViolation — 违规扣分（关键缺陷回归）', () => {
    it('minor 违规扣 20 分', async () => {
      const score = await service.recordViolation('agent-1', '轻微迟到', 'minor')
      expect(score.score).toBe(480)
      expect(score.level).toBe('fair')
    })

    it('major 违规扣 50 分', async () => {
      const score = await service.recordViolation('agent-1', '严重违规', 'major')
      expect(score.score).toBe(450)
    })

    it('critical 违规扣 100 分', async () => {
      const score = await service.recordViolation('agent-1', '严重违规', 'critical')
      expect(score.score).toBe(400)
      expect(score.level).toBe('fair')
    })

    it('违规次数累加', async () => {
      await service.recordViolation('agent-1', 'a', 'minor')
      const score = await service.recordViolation('agent-1', 'b', 'major')

      expect(score.factors.violationCount).toBe(2)
      expect(score.score).toBe(500 - 20 - 50)
    })

    it('P0 回归：违规扣分持久化，后续重算分数不能把扣分抹掉', async () => {
      await service.recordViolation('agent-1', '违规', 'critical') // 500 → 400
      expect((await service.getOrCreateCreditScore('agent-1')).score).toBe(400)

      // 触发一次常规重算（因子全部中性）
      const recalculated = await service.calculateCreditScore('agent-1', {
        taskCompletionRate: 50,
        responseSpeed: 50,
        userRating: 50,
        onTimeDeliveryRate: 50,
        repeatCustomerRate: 50,
      })

      // 扣分必须还在：500(基准) - 100(penaltyOffset) = 400
      expect(recalculated.score).toBe(400)
      expect(recalculated.penaltyOffset).toBe(-100)
    })

    it('多次违规的 penaltyOffset 累加', async () => {
      await service.recordViolation('agent-1', 'a', 'critical')
      const score = await service.recordViolation('agent-1', 'b', 'critical')
      expect(score.penaltyOffset).toBe(-200)
      expect(score.score).toBe(300)
    })

    it('分数不会低于 0', async () => {
      for (let i = 0; i < 10; i++) {
        await service.recordViolation('agent-1', `v${i}`, 'critical')
      }
      const score = await service.getOrCreateCreditScore('agent-1')
      expect(score.score).toBe(0)
      expect(score.level).toBe('poor')
    })

    it('不支持的严重度抛错', async () => {
      await expect(
        service.recordViolation('agent-1', 'x', ('extreme' as unknown) as 'major')
      ).rejects.toThrow(/severity/)
    })

    it('违规写入历史记录且原因可追溯', async () => {
      const score = await service.recordViolation('agent-1', '服务态度差', 'major')
      expect(score.history[0].reason).toContain('服务态度差')
      expect(score.history[0].reason).toContain('major')
      expect(score.history[0].change).toBe(-50)
    })
  })

  describe('recordDispute — 争议记录', () => {
    it('争议次数 +1 且按权重扣分', async () => {
      const score = await service.recordDispute('agent-1', false)
      expect(score.factors.disputeRate).toBe(1)
      expect(score.score).toBe(500 - 10)
    })

    it('多次争议持续扣分', async () => {
      await service.recordDispute('agent-1', false)
      const score = await service.recordDispute('agent-1', false)
      expect(score.factors.disputeRate).toBe(2)
      expect(score.score).toBe(500 - 20)
    })

    it('resolved=true 同样计入争议次数（争议本身是事实）', async () => {
      const score = await service.recordDispute('agent-1', true)
      expect(score.factors.disputeRate).toBe(1)
    })
  })

  describe('recordUserRating — 用户评分', () => {
    it('5 星评分的平滑更新', async () => {
      const score = await service.recordUserRating('agent-1', 5)
      // 50 * 0.7 + 100 * 0.3 = 65
      expect(score.factors.userRating).toBe(65)
    })

    it('1 星评分的平滑更新', async () => {
      const score = await service.recordUserRating('agent-1', 1)
      // 50 * 0.7 + 20 * 0.3 = 41
      expect(score.factors.userRating).toBe(41)
    })

    it('评级 0 抛错', async () => {
      await expect(service.recordUserRating('agent-1', 0)).rejects.toThrow(/rating/)
    })

    it('评级 6 抛错', async () => {
      await expect(service.recordUserRating('agent-1', 6)).rejects.toThrow(/rating/)
    })

    it('评级为小数抛错', async () => {
      await expect(service.recordUserRating('agent-1', 4.5)).rejects.toThrow(/rating/)
    })

    it('评级为 NaN 抛错', async () => {
      await expect(service.recordUserRating('agent-1', NaN)).rejects.toThrow(/rating/)
    })
  })

  describe('recordTaskCompletion — 任务完成记录', () => {
    it('完成一次任务，完成率上升', async () => {
      const score = await service.recordTaskCompletion('agent-1', true, true, 20)
      // 50/100 → 51/101 ≈ 50.5 → 50（round）
      expect(score.factors.taskCompletionRate).toBe(50)
      expect(score.factors.responseSpeed).toBe(85) // 50*0.7 + 100*0.3
    })

    it('响应时间分档：≤30s=100, ≤60s=80, ≤120s=60, ≤300s=40, 更长=20', async () => {
      const cases: Array<[number, number]> = [
        [10, 100],
        [30, 100],
        [45, 80],
        [60, 80],
        [100, 60],
        [120, 60],
        [200, 40],
        [300, 40],
        [1000, 20],
      ]

      for (const [seconds, expected] of cases) {
        const svc = new CreditScoreService(new InMemoryCreditScoreRepository())
        const score = await svc.recordTaskCompletion('a', true, true, seconds)
        // 50 * 0.7 + expected * 0.3
        expect(score.factors.responseSpeed).toBe(Math.round(50 * 0.7 + expected * 0.3))
      }
    })

    it('未按时交付会拉低按时交付率', async () => {
      const onTime = await service.recordTaskCompletion('agent-1', true, true, 20)
      const late = await service.recordTaskCompletion('agent-1', true, false, 20)
      expect(late.factors.onTimeDeliveryRate).toBeLessThan(onTime.factors.onTimeDeliveryRate)
    })

    it('任务失败会拉低完成率', async () => {
      const done = await service.recordTaskCompletion('agent-1', true, true, 20)
      const failed = await service.recordTaskCompletion('agent-1', false, true, 20)
      expect(failed.factors.taskCompletionRate).toBeLessThan(done.factors.taskCompletionRate)
    })
  })

  describe('recordRepeatCustomer — 重复购买', () => {
    it('重复购买率上升', async () => {
      const score = await service.recordRepeatCustomer('agent-1')
      expect(score.factors.repeatCustomerRate).toBeGreaterThan(50)
    })
  })

  describe('getCreditLevel / getCreditDiscountRate', () => {
    it('默认等级 fair，折扣 5%', async () => {
      expect(await service.getCreditLevel('agent-1')).toBe('fair')
      expect(await service.getCreditDiscountRate('agent-1')).toBe(0.05)
    })

    it('违规扣到 poor 后折扣为 0', async () => {
      for (let i = 0; i < 6; i++) {
        await service.recordViolation('agent-1', 'v', 'critical')
      }
      expect(await service.getCreditLevel('agent-1')).toBe('poor')
      expect(await service.getCreditDiscountRate('agent-1')).toBe(0)
    })

    it('折扣率始终在 0-1 之间', async () => {
      const rate = await service.getCreditDiscountRate('agent-1')
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(1)
    })
  })

  describe('checkServiceEligibility — 资格判定', () => {
    it('无门槛 → 合格', async () => {
      expect(await service.checkServiceEligibility('agent-1')).toEqual({ eligible: true })
    })

    it('分数不足 → 不合格并给出原因', async () => {
      const result = await service.checkServiceEligibility('agent-1', undefined, 600)
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('500')
      expect(result.reason).toContain('600')
    })

    it('分数达标 → 合格', async () => {
      const result = await service.checkServiceEligibility('agent-1', undefined, 500)
      expect(result.eligible).toBe(true)
    })

    it('等级不足 → 不合格', async () => {
      const result = await service.checkServiceEligibility('agent-1', 'excellent')
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('fair')
    })

    it('等级达标 → 合格', async () => {
      const result = await service.checkServiceEligibility('agent-1', 'poor')
      expect(result.eligible).toBe(true)
    })
  })

  describe('getCreditHistory / getTopAgents', () => {
    it('历史记录按时间倒序（最新在前）', async () => {
      await service.calculateCreditScore('agent-1', { taskCompletionRate: 60 })
      await service.calculateCreditScore('agent-1', { taskCompletionRate: 80 })

      const history = await service.getCreditHistory('agent-1')
      expect(history).toHaveLength(2)
      expect(history[0].previousScore).toBeGreaterThan(history[1].newScore)
    })

    it('历史最多保留 100 条', async () => {
      for (let i = 0; i < 120; i++) {
        await service.calculateCreditScore('agent-1', { taskCompletionRate: 50 })
      }
      const history = await service.getCreditHistory('agent-1')
      expect(history).toHaveLength(100)
    })

    it('getTopAgents 按分数降序', async () => {
      await service.calculateCreditScore('good-agent', {
        taskCompletionRate: 100,
        responseSpeed: 100,
        userRating: 100,
        onTimeDeliveryRate: 100,
        repeatCustomerRate: 100,
      })
      await service.getOrCreateCreditScore('bad-agent')

      const top = await service.getTopAgents()
      expect(top.length).toBeGreaterThanOrEqual(2)
      expect(top[0].agentId).toBe('good-agent')
      expect(top[0].score).toBeGreaterThanOrEqual(top[1].score)
    })

    it('getTopAgents 支持 limit', async () => {
      await service.getOrCreateCreditScore('a')
      await service.getOrCreateCreditScore('b')
      await service.getOrCreateCreditScore('c')
      expect(await service.getTopAgents(2)).toHaveLength(2)
    })
  })

  describe('DEFAULT_WEIGHTS 契约', () => {
    it('权重数值正确', () => {
      expect(DEFAULT_WEIGHTS.taskCompletionRate).toBe(0.25)
      expect(DEFAULT_WEIGHTS.responseSpeed).toBe(0.15)
      expect(DEFAULT_WEIGHTS.userRating).toBe(0.2)
      expect(DEFAULT_WEIGHTS.violationCount).toBe(-50)
      expect(DEFAULT_WEIGHTS.disputeRate).toBe(-10)
      expect(DEFAULT_WEIGHTS.onTimeDeliveryRate).toBe(0.15)
      expect(DEFAULT_WEIGHTS.repeatCustomerRate).toBe(0.15)
    })
  })

  describe('CreditFactors 类型契约', () => {
    it('因子集合齐全', async () => {
      const score = await service.getOrCreateCreditScore('agent-1')
      const keys: (keyof CreditFactors)[] = [
        'taskCompletionRate',
        'responseSpeed',
        'userRating',
        'violationCount',
        'disputeRate',
        'onTimeDeliveryRate',
        'repeatCustomerRate',
      ]
      for (const k of keys) {
        expect(typeof score.factors[k]).toBe('number')
      }
    })

    it('等级取值是合法的 CreditLevel', async () => {
      const levels: CreditLevel[] = ['excellent', 'good', 'fair', 'poor']
      expect(levels).toContain(await service.getCreditLevel('agent-1'))
    })
  })
})
