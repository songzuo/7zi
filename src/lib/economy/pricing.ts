/**
 * 7zi Agent 经济系统 - 定价模块
 * @module economy/pricing
 */

import {
  ServicePricing,
  PricingModel,
  PricingCalculation,
  PricingResult,
  PriceBreakdown,
  Coupon,
  CouponType,
  CouponUsage,
} from './types.js'

// ==================== 存储实现 ====================

/**
 * 内存定价存储
 */
class InMemoryPricingRepository {
  private pricings: Map<string, ServicePricing> = new Map()
  private agentServiceIndex: Map<string, string> = new Map() // agentId:serviceId -> pricingId

  async findByAgentAndService(agentId: string, serviceId: string): Promise<ServicePricing | null> {
    const key = `${agentId}:${serviceId}`
    const pricingId = this.agentServiceIndex.get(key)
    if (!pricingId) return null
    return this.pricings.get(pricingId) || null
  }

  async findByAgentId(agentId: string): Promise<ServicePricing[]> {
    return Array.from(this.pricings.values()).filter(p => p.agentId === agentId)
  }

  async findByServiceId(serviceId: string): Promise<ServicePricing[]> {
    return Array.from(this.pricings.values()).filter(p => p.serviceId === serviceId)
  }

  async create(
    pricing: Omit<ServicePricing, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ServicePricing> {
    const id = this.generateId()
    const now = new Date()
    const newPricing: ServicePricing = {
      id,
      ...pricing,
      createdAt: now,
      updatedAt: now,
    }

    this.pricings.set(id, newPricing)
    this.agentServiceIndex.set(`${pricing.agentId}:${pricing.serviceId}`, id)

    return newPricing
  }

  async update(id: string, updates: Partial<ServicePricing>): Promise<ServicePricing> {
    const pricing = this.pricings.get(id)
    if (!pricing) throw new Error(`Pricing not found: ${id}`)

    const updated = {
      ...pricing,
      ...updates,
      id,
      updatedAt: new Date(),
    }

    this.pricings.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const pricing = this.pricings.get(id)
    if (!pricing) return false

    this.pricings.delete(id)
    this.agentServiceIndex.delete(`${pricing.agentId}:${pricing.serviceId}`)
    return true
  }

  private generateId(): string {
    return `pricing_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
}

/**
 * 内存优惠券存储
 */
class InMemoryCouponRepository {
  private coupons: Map<string, Coupon> = new Map()
  private codeIndex: Map<string, string> = new Map() // code -> couponId
  private usageRecords: Map<string, CouponUsage[]> = new Map() // couponId -> usages

  async findByCode(code: string): Promise<Coupon | null> {
    const couponId = this.codeIndex.get(code)
    if (!couponId) return null
    return this.coupons.get(couponId) || null
  }

  async findById(id: string): Promise<Coupon | null> {
    return this.coupons.get(id) || null
  }

  async findAllActive(): Promise<Coupon[]> {
    const now = new Date()
    return Array.from(this.coupons.values()).filter(
      c => c.isActive && c.validFrom <= now && c.validUntil >= now
    )
  }

  async create(coupon: Omit<Coupon, 'id' | 'createdAt'>): Promise<Coupon> {
    const id = this.generateId()
    const now = new Date()
    const newCoupon: Coupon = {
      id,
      ...coupon,
      createdAt: now,
    }

    this.coupons.set(id, newCoupon)
    this.codeIndex.set(coupon.code, id)
    this.usageRecords.set(id, [])

    return newCoupon
  }

  async update(id: string, updates: Partial<Coupon>): Promise<Coupon> {
    const coupon = this.coupons.get(id)
    if (!coupon) throw new Error(`Coupon not found: ${id}`)

    const updated = { ...coupon, ...updates, id }
    this.coupons.set(id, updated)
    return updated
  }

  async recordUsage(usage: CouponUsage): Promise<void> {
    const records = this.usageRecords.get(usage.couponId) || []
    records.push(usage)
    this.usageRecords.set(usage.couponId, records)

    // Update used count
    const coupon = await this.findById(usage.couponId)
    if (coupon) {
      await this.update(usage.couponId, { usedCount: coupon.usedCount + 1 })
    }
  }

  async getUsageCount(couponId: string): Promise<number> {
    const records = this.usageRecords.get(couponId) || []
    return records.length
  }

  private generateId(): string {
    return `coupon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
}

// ==================== 定价服务 ====================

/**
 * 定价服务
 */
export class PricingService {
  private pricingRepo: InMemoryPricingRepository
  private couponRepo: InMemoryCouponRepository

  constructor(pricingRepo?: InMemoryPricingRepository, couponRepo?: InMemoryCouponRepository) {
    this.pricingRepo = pricingRepo || new InMemoryPricingRepository()
    this.couponRepo = couponRepo || new InMemoryCouponRepository()
  }

  /**
   * 创建服务定价
   */
  async createServicePricing(
    agentId: string,
    serviceId: string,
    serviceName: string,
    pricingModel: PricingModel,
    basePrice: number,
    currency: 'CNY' | 'USD' = 'CNY',
    validFrom?: Date,
    validUntil?: Date
  ): Promise<ServicePricing> {
    // 检查是否已存在
    const existing = await this.pricingRepo.findByAgentAndService(agentId, serviceId)
    if (existing) {
      throw new Error(`Pricing already exists for agent ${agentId} and service ${serviceId}`)
    }

    return await this.pricingRepo.create({
      agentId,
      serviceId,
      serviceName,
      pricingModel,
      basePrice,
      currency,
      isActive: true,
      validFrom,
      validUntil,
    })
  }

  /**
   * 更新服务定价
   */
  async updateServicePricing(
    agentId: string,
    serviceId: string,
    updates: Partial<Pick<ServicePricing, 'basePrice' | 'pricingModel' | 'isActive'>>
  ): Promise<ServicePricing> {
    const pricing = await this.pricingRepo.findByAgentAndService(agentId, serviceId)
    if (!pricing) {
      throw new Error(`Pricing not found for agent ${agentId} and service ${serviceId}`)
    }

    return await this.pricingRepo.update(pricing.id, updates)
  }

  /**
   * 获取服务定价
   */
  async getServicePricing(agentId: string, serviceId: string): Promise<ServicePricing> {
    const pricing = await this.pricingRepo.findByAgentAndService(agentId, serviceId)
    if (!pricing) {
      throw new Error(`Pricing not found for agent ${agentId} and service ${serviceId}`)
    }

    // 检查是否有效
    const now = new Date()
    if (!pricing.isActive) {
      throw new Error(`Pricing is inactive`)
    }
    if (pricing.validFrom && pricing.validFrom > now) {
      throw new Error(`Pricing is not yet valid`)
    }
    if (pricing.validUntil && pricing.validUntil < now) {
      throw new Error(`Pricing has expired`)
    }

    return pricing
  }

  /**
   * 计算价格
   */
  async calculatePrice(calculation: PricingCalculation): Promise<PricingResult> {
    const { pricing, quantity, resultSuccess = true, discountCode, customerId } = calculation

    let originalPrice = pricing.basePrice * quantity

    // 按结果计费时，失败不收费
    if (pricing.pricingModel === 'per_result' && !resultSuccess) {
      originalPrice = 0
    }

    const breakdown: PriceBreakdown = {
      baseAmount: originalPrice,
      quantityDiscount: 0,
      couponDiscount: 0,
      membershipDiscount: 0,
    }

    // 应用数量折扣
    if (quantity >= 10) {
      const discountRate = quantity >= 100 ? 0.2 : quantity >= 50 ? 0.15 : 0.1
      breakdown.quantityDiscount = Math.floor(originalPrice * discountRate)
    }

    // 应用优惠券
    let couponDiscount = 0
    if (discountCode) {
      const couponResult = await this.applyCoupon(
        discountCode,
        pricing,
        customerId || '',
        originalPrice - breakdown.quantityDiscount
      )
      couponDiscount = couponResult.discountAmount
      breakdown.couponDiscount = couponDiscount
    }

    // 会员折扣逻辑（基于用户等级）
    // TODO: 集成真实会员系统后，从用户档案获取会员等级
    const mockMemberLevel = customerId ? await this.getMemberLevel(customerId) : null
    if (mockMemberLevel) {
      const membershipDiscountRate = this.getMembershipDiscountRate(mockMemberLevel)
      breakdown.membershipDiscount =
        Math.round((originalPrice - breakdown.quantityDiscount) * membershipDiscountRate * 100) /
        100
    }

    const totalDiscount =
      breakdown.quantityDiscount + breakdown.couponDiscount + breakdown.membershipDiscount
    const finalPrice = Math.max(0, originalPrice - totalDiscount)

    return {
      originalPrice,
      discount: totalDiscount,
      finalPrice,
      currency: pricing.currency,
      breakdown,
    }
  }

  /**
   * 创建优惠券
   */
  async createCoupon(
    code: string,
    type: CouponType,
    value: number,
    validFrom: Date,
    validUntil: Date,
    options: {
      minPurchase?: number
      maxDiscount?: number
      usageLimit?: number
      applicableServices?: string[]
    } = {}
  ): Promise<Coupon> {
    // 检查代码是否已存在
    const existing = await this.couponRepo.findByCode(code)
    if (existing) {
      throw new Error(`Coupon code already exists: ${code}`)
    }

    return await this.couponRepo.create({
      code: code.toUpperCase(),
      type,
      value,
      minPurchase: options.minPurchase || 0,
      maxDiscount: options.maxDiscount || 999999999,
      usageLimit: options.usageLimit || 0,
      usedCount: 0,
      validFrom,
      validUntil,
      isActive: true,
      applicableServices: options.applicableServices,
    })
  }

  /**
   * 验证优惠券
   */
  async validateCoupon(
    code: string,
    serviceId: string,
    purchaseAmount: number
  ): Promise<{ valid: boolean; coupon?: Coupon; reason?: string }> {
    const coupon = await this.couponRepo.findByCode(code)
    if (!coupon) {
      return { valid: false, reason: '优惠券不存在' }
    }

    if (!coupon.isActive) {
      return { valid: false, reason: '优惠券已失效' }
    }

    const now = new Date()
    if (now < coupon.validFrom) {
      return { valid: false, reason: '优惠券尚未生效' }
    }

    if (now > coupon.validUntil) {
      return { valid: false, reason: '优惠券已过期' }
    }

    if (purchaseAmount < coupon.minPurchase) {
      return { valid: false, reason: `最低消费金额为 ${coupon.minPurchase}` }
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, reason: '优惠券已用完' }
    }

    if (coupon.applicableServices && coupon.applicableServices.length > 0) {
      if (!coupon.applicableServices.includes(serviceId)) {
        return { valid: false, reason: '此优惠券不适用于该服务' }
      }
    }

    return { valid: true, coupon }
  }

  /**
   * 应用优惠券
   */
  async applyCoupon(
    code: string,
    pricing: ServicePricing,
    customerId: string,
    purchaseAmount: number
  ): Promise<{ discountAmount: number; coupon?: Coupon }> {
    const validation = await this.validateCoupon(code, pricing.serviceId, purchaseAmount)
    if (!validation.valid) {
      throw new Error(validation.reason || '优惠券无效')
    }

    const coupon = validation.coupon!
    let discountAmount = 0

    switch (coupon.type) {
      case 'percentage':
        discountAmount = Math.floor((purchaseAmount * coupon.value) / 100)
        break
      case 'fixed':
        discountAmount = Math.min(coupon.value, purchaseAmount)
        break
      case 'free_trial':
        discountAmount = purchaseAmount
        break
    }

    // 应用最大折扣限制
    discountAmount = Math.min(discountAmount, coupon.maxDiscount)

    return { discountAmount, coupon }
  }

  /**
   * 记录优惠券使用
   */
  async recordCouponUsage(
    couponCode: string,
    customerId: string,
    orderId: string,
    discountAmount: number
  ): Promise<void> {
    const coupon = await this.couponRepo.findByCode(couponCode)
    if (!coupon) {
      throw new Error(`Coupon not found: ${couponCode}`)
    }

    await this.couponRepo.recordUsage({
      id: this.generateUsageId(),
      couponId: coupon.id,
      couponCode,
      customerId,
      orderId,
      discountAmount,
      usedAt: new Date(),
    })
  }

  /**
   * 获取所有活跃优惠券
   */
  async getActiveCoupons(): Promise<Coupon[]> {
    return await this.couponRepo.findAllActive()
  }

  /**
   * 批量创建预设优惠券
   */
  async createDefaultCoupons(): Promise<Coupon[]> {
    const now = new Date()
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

    const coupons = []

    // 欢迎优惠券
    coupons.push(
      await this.createCoupon('WELCOME2025', 'percentage', 20, now, oneYearLater, {
        minPurchase: 100,
        usageLimit: 1000,
      })
    )

    // 免费试用
    coupons.push(
      await this.createCoupon(
        'FREE2025',
        'fixed',
        1000, // 10元
        now,
        oneYearLater,
        { minPurchase: 0, usageLimit: 500 }
      )
    )

    // 新客专享
    coupons.push(
      await this.createCoupon('NEWUSER', 'percentage', 30, now, oneYearLater, {
        minPurchase: 500,
        usageLimit: 300,
      })
    )

    return coupons
  }

  private generateUsageId(): string {
    return `usage_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * 获取用户会员等级（临时模拟实现）
   * TODO: 集成真实会员系统后替换为实际API调用
   */
  private async getMemberLevel(customerId: string): Promise<string | null> {
    // 模拟：根据客户ID生成会员等级
    // 实际应从会员系统API获取
    const hash = customerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const levels = [null, 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']
    return levels[hash % levels.length]
  }

  /**
   * 获取会员等级对应的折扣率
   */
  private getMembershipDiscountRate(level: string): number {
    const rates: Record<string, number> = {
      BRONZE: 0.05, // 5% 折扣
      SILVER: 0.1, // 10% 折扣
      GOLD: 0.15, // 15% 折扣
      PLATINUM: 0.2, // 20% 折扣
    }
    return rates[level] || 0
  }
}

// ==================== 导出 ====================

export { InMemoryPricingRepository, InMemoryCouponRepository }
