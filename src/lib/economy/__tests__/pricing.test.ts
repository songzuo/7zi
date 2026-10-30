/**
 * 7zi Agent 经济系统 - 定价模块单元测试
 *
 * 覆盖语义维度：
 * - 金额精度（整数分、无浮点误差）
 * - 折扣叠加与封顶
 * - 优惠券生命周期（生效期 / 过期 / 限领 / 最低消费 / 适用范围）
 * - 幂等（重复记录优惠券使用）
 * - 边界（数量 0 / 负数 / NaN / 非整数）
 * - 状态流转（定价 inactive / 未生效 / 已过期）
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PricingService, InMemoryPricingRepository, InMemoryCouponRepository } from '../pricing.js'
import type { ServicePricing } from '../types.js'

describe('PricingService', () => {
  let service: PricingService
  let pricingRepo: InMemoryPricingRepository
  let couponRepo: InMemoryCouponRepository

  beforeEach(() => {
    pricingRepo = new InMemoryPricingRepository()
    couponRepo = new InMemoryCouponRepository()
    service = new PricingService(pricingRepo, couponRepo)
  })

  const day = 24 * 60 * 60 * 1000
  const now = () => new Date()
  const future = (days: number) => new Date(Date.now() + days * day)
  const past = (days: number) => new Date(Date.now() - days * day)

  async function makePricing(overrides: Partial<Parameters<PricingService['createServicePricing']>[]> = {}) {
    return service.createServicePricing(
      'agent-1',
      'service-1',
      '翻译服务',
      'per_call',
      1000,
      'CNY'
    )
  }

  describe('createServicePricing — 创建定价', () => {
    it('创建成功，初始为 active，金额以整数分原样保存', async () => {
      const pricing = await makePricing()

      expect(pricing.id).toMatch(/^pricing_/)
      expect(pricing.agentId).toBe('agent-1')
      expect(pricing.serviceId).toBe('service-1')
      expect(pricing.basePrice).toBe(1000)
      expect(pricing.currency).toBe('CNY')
      expect(pricing.isActive).toBe(true)
      expect(pricing.createdAt).toBeInstanceOf(Date)
    })

    it('同一 agent+service 重复创建抛错', async () => {
      await makePricing()
      await expect(makePricing()).rejects.toThrow(/already exists/)
    })

    it('basePrice 非整数分抛错（拒绝浮点金额）', async () => {
      await expect(
        service.createServicePricing('a', 's', 'n', 'per_call', 10.5, 'CNY')
      ).rejects.toThrow(/Base price/)
    })

    it('basePrice 为负数抛错', async () => {
      await expect(
        service.createServicePricing('a', 's', 'n', 'per_call', -1, 'CNY')
      ).rejects.toThrow(/Base price/)
    })

    it('basePrice 为 0 抛错（免费服务应用 freemium 模型）', async () => {
      await expect(
        service.createServicePricing('a', 's', 'n', 'per_call', 0, 'CNY')
      ).rejects.toThrow(/Base price/)
    })

    it('validUntil 不晚于 validFrom 抛错', async () => {
      await expect(
        service.createServicePricing(
          'a', 's', 'n', 'per_call', 100, 'CNY', future(10), future(1)
        )
      ).rejects.toThrow(/validUntil/)
    })
  })

  describe('getServicePricing — 查询定价', () => {
    it('不存在的定价抛错', async () => {
      await expect(service.getServicePricing('nobody', 'nothing')).rejects.toThrow(
        /Pricing not found/
      )
    })

    it('inactive 的定价不可用', async () => {
      await makePricing()
      const pricing = await service.getServicePricing('agent-1', 'service-1')
      await service.updateServicePricing('agent-1', 'service-1', { isActive: false })

      await expect(service.getServicePricing('agent-1', 'service-1')).rejects.toThrow(/inactive/)
      expect(pricing.isActive).toBe(true)
    })

    it('尚未生效的定价不可用', async () => {
      await service.createServicePricing(
        'agent-2', 'service-2', 'n', 'per_call', 100, 'CNY', future(1), future(10)
      )
      await expect(service.getServicePricing('agent-2', 'service-2')).rejects.toThrow(
        /not yet valid/
      )
    })

    it('已过期的定价不可用', async () => {
      await service.createServicePricing(
        'agent-3', 'service-3', 'n', 'per_call', 100, 'CNY', past(10), past(1)
      )
      await expect(service.getServicePricing('agent-3', 'service-3')).rejects.toThrow(
        /expired/
      )
    })

    it('有效期内的定价可正常获取', async () => {
      await service.createServicePricing(
        'agent-4', 'service-4', 'n', 'per_call', 100, 'CNY', past(1), future(1)
      )
      const pricing = await service.getServicePricing('agent-4', 'service-4')
      expect(pricing.basePrice).toBe(100)
    })
  })

  describe('updateServicePricing — 更新定价', () => {
    it('更新 basePrice 成功且 updatedAt 变化', async () => {
      const created = await makePricing()
      const updated = await service.updateServicePricing('agent-1', 'service-1', {
        basePrice: 2500,
      })

      expect(updated.basePrice).toBe(2500)
      expect(updated.id).toBe(created.id)
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime())
    })

    it('更新为非整数分抛错', async () => {
      await makePricing()
      await expect(
        service.updateServicePricing('agent-1', 'service-1', { basePrice: 100.5 })
      ).rejects.toThrow(/Base price/)
    })

    it('更新不存在的定价抛错', async () => {
      await expect(
        service.updateServicePricing('nobody', 'nothing', { basePrice: 100 })
      ).rejects.toThrow(/Pricing not found/)
    })
  })

  describe('calculatePrice — 价格计算（金额精度核心）', () => {
    it('按次计费：basePrice × quantity，结果为整数分', async () => {
      const pricing = await makePricing()
      const result = await service.calculatePrice({ pricing, quantity: 3 })

      expect(result.originalPrice).toBe(3000)
      expect(result.discount).toBe(0)
      expect(result.finalPrice).toBe(3000)
      expect(result.currency).toBe('CNY')
      expect(result.breakdown.baseAmount).toBe(3000)
    })

    it('数量为 0 时价格为 0', async () => {
      const pricing = await makePricing()
      const result = await service.calculatePrice({ pricing, quantity: 0 })

      expect(result.originalPrice).toBe(0)
      expect(result.finalPrice).toBe(0)
    })

    it('数量为负数抛错', async () => {
      const pricing = await makePricing()
      await expect(service.calculatePrice({ pricing, quantity: -1 })).rejects.toThrow(
        /non-negative integer/
      )
    })

    it('数量为小数抛错（次数必须是整数）', async () => {
      const pricing = await makePricing()
      await expect(service.calculatePrice({ pricing, quantity: 1.5 })).rejects.toThrow(
        /non-negative integer/
      )
    })

    it('数量为 NaN 抛错', async () => {
      const pricing = await makePricing()
      await expect(service.calculatePrice({ pricing, quantity: NaN })).rejects.toThrow(
        /non-negative integer/
      )
    })

    it('数量为 Infinity 抛错', async () => {
      const pricing = await makePricing()
      await expect(service.calculatePrice({ pricing, quantity: Infinity })).rejects.toThrow(
        /non-negative integer/
      )
    })

    it('按结果计费且失败时不收费', async () => {
      const pricing = await service.createServicePricing(
        'agent-r', 'service-r', 'n', 'per_result', 1000, 'CNY'
      )
      const ok = await service.calculatePrice({ pricing, quantity: 1, resultSuccess: true })
      const failed = await service.calculatePrice({
        pricing,
        quantity: 1,
        resultSuccess: false,
      })

      expect(ok.finalPrice).toBe(1000)
      expect(failed.originalPrice).toBe(0)
      expect(failed.finalPrice).toBe(0)
    })

    it('数量折扣：10 个 10%，50 个 15%，100 个 20%', async () => {
      const pricing = await makePricing()

      const r10 = await service.calculatePrice({ pricing, quantity: 10 })
      expect(r10.breakdown.quantityDiscount).toBe(1000) // 10000 * 10%

      const r50 = await service.calculatePrice({ pricing, quantity: 50 })
      expect(r50.breakdown.quantityDiscount).toBe(7500) // 50000 * 15%

      const r100 = await service.calculatePrice({ pricing, quantity: 100 })
      expect(r100.breakdown.quantityDiscount).toBe(20000) // 100000 * 20%
    })

    it('数量折扣向下取整，不产生小数分', async () => {
      // basePrice=101, quantity=10 → 1010 * 10% = 101 → 整数
      const pricing = await service.createServicePricing(
        'agent-q', 'service-q', 'n', 'per_call', 101, 'CNY'
      )
      const result = await service.calculatePrice({ pricing, quantity: 10 })

      expect(result.breakdown.quantityDiscount).toBe(101)
      expect(Number.isInteger(result.breakdown.quantityDiscount)).toBe(true)
      expect(Number.isInteger(result.finalPrice)).toBe(true)
    })

    it('折扣后价格不为负数', async () => {
      const pricing = await service.createServicePricing(
        'agent-f', 'service-f', 'n', 'per_call', 100, 'CNY'
      )
      await service.createCoupon('FREEALL', 'percentage', 100, past(1), future(1))
      const result = await service.calculatePrice({
        pricing,
        quantity: 1,
        discountCode: 'FREEALL',
      })

      expect(result.finalPrice).toBe(0)
      expect(result.finalPrice).toBeGreaterThanOrEqual(0)
    })

    it('originalPrice - discount === finalPrice（金额守恒）', async () => {
      const pricing = await makePricing()
      const result = await service.calculatePrice({ pricing, quantity: 10 })

      expect(result.originalPrice - result.discount).toBe(result.finalPrice)
    })
  })

  describe('createCoupon — 创建优惠券', () => {
    it('创建成功，代码自动转大写', async () => {
      const coupon = await service.createCoupon('save10', 'percentage', 10, past(1), future(1))

      expect(coupon.id).toMatch(/^coupon_/)
      expect(coupon.code).toBe('SAVE10')
      expect(coupon.type).toBe('percentage')
      expect(coupon.value).toBe(10)
      expect(coupon.isActive).toBe(true)
      expect(coupon.usedCount).toBe(0)
    })

    it('重复代码抛错', async () => {
      await service.createCoupon('DUP', 'fixed', 100, past(1), future(1))
      await expect(
        service.createCoupon('DUP', 'fixed', 100, past(1), future(1))
      ).rejects.toThrow(/already exists/)
    })

    it('空代码抛错', async () => {
      await expect(
        service.createCoupon('   ', 'fixed', 100, past(1), future(1))
      ).rejects.toThrow(/non-empty/)
    })

    it('百分比超过 100 抛错', async () => {
      await expect(
        service.createCoupon('BIG', 'percentage', 101, past(1), future(1))
      ).rejects.toThrow(/must not exceed 100/)
    })

    it('负数折扣值抛错', async () => {
      await expect(
        service.createCoupon('NEG', 'fixed', -100, past(1), future(1))
      ).rejects.toThrow(/Coupon value/)
    })

    it('不支持的类型抛错', async () => {
      await expect(
        service.createCoupon('BAD', ('gift' as unknown) as 'fixed', 100, past(1), future(1))
      ).rejects.toThrow(/Unsupported coupon type/)
    })

    it('validUntil 不晚于 validFrom 抛错', async () => {
      await expect(
        service.createCoupon('TIME', 'fixed', 100, future(10), future(1))
      ).rejects.toThrow(/validUntil/)
    })

    it('minPurchase 为负数抛错', async () => {
      await expect(
        service.createCoupon('MIN', 'fixed', 100, past(1), future(1), { minPurchase: -1 })
      ).rejects.toThrow(/minPurchase/)
    })

    it('maxDiscount 为负数抛错', async () => {
      await expect(
        service.createCoupon('MAX', 'fixed', 100, past(1), future(1), { maxDiscount: -1 })
      ).rejects.toThrow(/maxDiscount/)
    })
  })

  describe('validateCoupon — 校验优惠券', () => {
    it('不存在的优惠券无效', async () => {
      const result = await service.validateCoupon('NOPE', 'service-1', 1000)
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/不存在/)
    })

    it('尚未生效的优惠券无效', async () => {
      await service.createCoupon('FUTURE', 'fixed', 100, future(1), future(10))
      const result = await service.validateCoupon('FUTURE', 'service-1', 1000)
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/尚未生效/)
    })

    it('已过期的优惠券无效', async () => {
      await service.createCoupon('EXPIRED', 'fixed', 100, past(10), past(1))
      const result = await service.validateCoupon('EXPIRED', 'service-1', 1000)
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/已过期/)
    })

    it('低于最低消费金额的优惠券无效', async () => {
      await service.createCoupon('MIN100', 'fixed', 100, past(1), future(1), { minPurchase: 1000 })
      const result = await service.validateCoupon('MIN100', 'service-1', 999)
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/最低消费/)

      const ok = await service.validateCoupon('MIN100', 'service-1', 1000)
      expect(ok.valid).toBe(true)
    })

    it('用量用尽的优惠券无效', async () => {
      await service.createCoupon('LIMIT1', 'fixed', 100, past(1), future(1), { usageLimit: 1 })
      await service.recordCouponUsage('LIMIT1', 'c1', 'o1', 100)

      const result = await service.validateCoupon('LIMIT1', 'service-1', 1000)
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/已用完/)
    })

    it('不适用于该服务的优惠券无效', async () => {
      await service.createCoupon('ONLYA', 'fixed', 100, past(1), future(1), {
        applicableServices: ['service-a'],
      })
      const result = await service.validateCoupon('ONLYA', 'service-b', 1000)
      expect(result.valid).toBe(false)
      expect(result.reason).toMatch(/不适用于/)
    })

    it('合法优惠券返回 coupon 对象', async () => {
      await service.createCoupon('GOOD', 'percentage', 20, past(1), future(1))
      const result = await service.validateCoupon('GOOD', 'service-1', 1000)
      expect(result.valid).toBe(true)
      expect(result.coupon?.code).toBe('GOOD')
    })
  })

  describe('applyCoupon — 应用优惠券', () => {
    it('百分比优惠券：按比例向下取整', async () => {
      await service.createCoupon('P20', 'percentage', 20, past(1), future(1))
      const pricing = await makePricing()
      const result = await service.applyCoupon('P20', pricing, 'c1', 1011)

      // 1011 * 20% = 202.2 → 202
      expect(result.discountAmount).toBe(202)
    })

    it('固定额优惠券：不超过购买金额', async () => {
      await service.createCoupon('F500', 'fixed', 500, past(1), future(1))
      const pricing = await makePricing()
      const result = await service.applyCoupon('F500', pricing, 'c1', 300)

      expect(result.discountAmount).toBe(300)
    })

    it('免费试用优惠券：全额抵扣', async () => {
      await service.createCoupon('TRIAL', 'free_trial', 0, past(1), future(1))
      const pricing = await makePricing()
      const result = await service.applyCoupon('TRIAL', pricing, 'c1', 888)

      expect(result.discountAmount).toBe(888)
    })

    it('受 maxDiscount 封顶', async () => {
      await service.createCoupon('CAP', 'percentage', 100, past(1), future(1), {
        maxDiscount: 100,
      })
      const pricing = await makePricing()
      const result = await service.applyCoupon('CAP', pricing, 'c1', 10000)

      expect(result.discountAmount).toBe(100)
    })

    it('无效优惠券抛错', async () => {
      const pricing = await makePricing()
      await expect(service.applyCoupon('NOPE', pricing, 'c1', 1000)).rejects.toThrow(/不存在/)
    })

    it('purchaseAmount 为负数抛错', async () => {
      await service.createCoupon('X', 'fixed', 100, past(1), future(1))
      const pricing = await makePricing()
      await expect(service.applyCoupon('X', pricing, 'c1', -1)).rejects.toThrow(
        /non-negative integer/
      )
    })

    it('purchaseAmount 为小数抛错', async () => {
      await service.createCoupon('X2', 'fixed', 100, past(1), future(1))
      const pricing = await makePricing()
      await expect(service.applyCoupon('X2', pricing, 'c1', 10.5)).rejects.toThrow(
        /non-negative integer/
      )
    })
  })

  describe('calculatePrice + 优惠券联动', () => {
    it('优惠券折扣计入 breakdown 且金额守恒', async () => {
      await service.createCoupon('P50', 'percentage', 50, past(1), future(1))
      const pricing = await makePricing()
      const result = await service.calculatePrice({
        pricing,
        quantity: 1,
        discountCode: 'P50',
      })

      expect(result.breakdown.couponDiscount).toBe(500)
      expect(result.originalPrice - result.discount).toBe(result.finalPrice)
    })

    it('优惠券与数量折扣叠加', async () => {
      await service.createCoupon('P50', 'percentage', 50, past(1), future(1))
      const pricing = await makePricing()
      const result = await service.calculatePrice({
        pricing,
        quantity: 10,
        discountCode: 'P50',
      })

      // original 10000, 数量折扣 1000 → 9000, 券 50% → 4500
      expect(result.breakdown.quantityDiscount).toBe(1000)
      expect(result.breakdown.couponDiscount).toBe(4500)
      expect(result.finalPrice).toBe(4500)
    })
  })

  describe('recordCouponUsage — 记录使用', () => {
    it('记录后 usedCount 增加', async () => {
      await service.createCoupon('CNT', 'fixed', 100, past(1), future(1))
      await service.recordCouponUsage('CNT', 'c1', 'o1', 100)

      const coupon = await couponRepo.findByCode('CNT')
      expect(coupon?.usedCount).toBe(1)
      expect(await couponRepo.getUsageCount(coupon!.id)).toBe(1)
    })

    it('超过使用上限抛错', async () => {
      await service.createCoupon('ONCE', 'fixed', 100, past(1), future(1), { usageLimit: 1 })
      await service.recordCouponUsage('ONCE', 'c1', 'o1', 100)
      await expect(service.recordCouponUsage('ONCE', 'c2', 'o2', 100)).rejects.toThrow(
        /usage limit/
      )
    })

    it('不存在的优惠券抛错', async () => {
      await expect(service.recordCouponUsage('NOPE', 'c1', 'o1', 100)).rejects.toThrow(
        /Coupon not found/
      )
    })

    it('discountAmount 为负数抛错', async () => {
      await service.createCoupon('NEG', 'fixed', 100, past(1), future(1))
      await expect(service.recordCouponUsage('NEG', 'c1', 'o1', -1)).rejects.toThrow(
        /discountAmount/
      )
    })
  })

  describe('getActiveCoupons / createDefaultCoupons', () => {
    it('只返回有效期内的活跃优惠券', async () => {
      await service.createCoupon('ACTIVE', 'fixed', 100, past(1), future(1))
      await service.createCoupon('EXPIRED', 'fixed', 100, past(10), past(1))
      await service.createCoupon('FUTURE', 'fixed', 100, future(1), future(10))

      const active = await service.getActiveCoupons()
      expect(active.map((c) => c.code)).toEqual(['ACTIVE'])
    })

    it('createDefaultCoupons 创建 3 张券且都有效', async () => {
      const coupons = await service.createDefaultCoupons()
      expect(coupons).toHaveLength(3)
      expect(coupons.map((c) => c.code).sort()).toEqual(['FREE2025', 'NEWUSER', 'WELCOME2025'])
      for (const c of coupons) {
        const validation = await service.validateCoupon(c.code, 'service-1', 10000)
        expect(validation.valid).toBe(true)
      }
    })
  })

  describe('仓储层', () => {
    it('findByAgentId / findByServiceId 返回匹配项', async () => {
      await makePricing()
      await service.createServicePricing('agent-1', 'service-2', 'n', 'per_call', 200, 'CNY')

      expect(await pricingRepo.findByAgentId('agent-1')).toHaveLength(2)
      expect(await pricingRepo.findByServiceId('service-1')).toHaveLength(1)
      expect(await pricingRepo.findByAgentAndService('agent-1', 'nope')).toBeNull()
    })

    it('update 不存在的 id 抛错', async () => {
      await expect(pricingRepo.update('nope', {})).rejects.toThrow(/Pricing not found/)
    })

    it('findById 不存在返回 null', async () => {
      expect(await pricingRepo.findById('nope')).toBeNull()
    })

    it('findByCode 大小写不敏感', async () => {
      await service.createCoupon('CASE', 'fixed', 100, past(1), future(1))
      expect(await couponRepo.findByCode('case')).not.toBeNull()
    })
  })

  describe('ServicePricing 类型契约', () => {
    it('定价对象的必填字段齐全', async () => {
      const pricing: ServicePricing = await makePricing()
      expect(typeof pricing.id).toBe('string')
      expect(typeof pricing.agentId).toBe('string')
      expect(typeof pricing.serviceId).toBe('string')
      expect(typeof pricing.serviceName).toBe('string')
      expect(typeof pricing.basePrice).toBe('number')
      expect(Number.isInteger(pricing.basePrice)).toBe(true)
    })
  })
})
