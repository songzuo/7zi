/**
 * 7zi Agent 经济系统 - 定价模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PricingService } from '../../src/lib/economy/pricing.js';

describe('PricingService', () => {
  let pricingService: PricingService;
  const testAgentId = 'agent_test_001';
  const testServiceId = 'service_test_001';

  beforeEach(() => {
    pricingService = new PricingService();
  });

  describe('createServicePricing', () => {
    it('应该创建服务定价', async () => {
      const pricing = await pricingService.createServicePricing(
        testAgentId,
        testServiceId,
        '文本生成服务',
        'per_call',
        1000, // 10元
        'CNY'
      );

      expect(pricing.agentId).toBe(testAgentId);
      expect(pricing.serviceId).toBe(testServiceId);
      expect(pricing.pricingModel).toBe('per_call');
      expect(pricing.basePrice).toBe(1000);
      expect(pricing.isActive).toBe(true);
    });

    it('不应该创建重复的定价', async () => {
      await pricingService.createServicePricing(testAgentId, testServiceId, '服务', 'per_call', 1000);
      await expect(
        pricingService.createServicePricing(testAgentId, testServiceId, '服务', 'per_call', 1000)
      ).rejects.toThrow();
    });
  });

  describe('calculatePrice', () => {
    it('应该按调用次数计算价格', async () => {
      const pricing = await pricingService.createServicePricing(
        testAgentId,
        testServiceId,
        '文本生成',
        'per_call',
        1000,
        'CNY'
      );

      const result = await pricingService.calculatePrice({
        pricing,
        quantity: 5,
      });

      expect(result.originalPrice).toBe(5000);
      expect(result.finalPrice).toBe(5000);
      expect(result.discount).toBe(0);
    });

    it('应该按时间计费', async () => {
      const pricing = await pricingService.createServicePricing(
        testAgentId,
        testServiceId,
        '会话服务',
        'per_minute',
        500, // 5元/分钟
        'CNY'
      );

      const result = await pricingService.calculatePrice({
        pricing,
        quantity: 5, // 5分钟（小于10，不会触发数量折扣）
      });

      expect(result.originalPrice).toBe(2500);
      expect(result.finalPrice).toBe(2500);
    });

    it('应该应用数量折扣', async () => {
      const pricing = await pricingService.createServicePricing(
        testAgentId,
        testServiceId,
        '批量服务',
        'per_call',
        1000,
        'CNY'
      );

      // 购买 50 次
      const result = await pricingService.calculatePrice({
        pricing,
        quantity: 50,
      });

      expect(result.originalPrice).toBe(50000);
      expect(result.breakdown.quantityDiscount).toBe(7500); // 15% 折扣
      expect(result.finalPrice).toBe(42500);
    });

    it('按结果计费时失败不收费', async () => {
      const pricing = await pricingService.createServicePricing(
        testAgentId,
        testServiceId,
        '结果服务',
        'per_result',
        1000,
        'CNY'
      );

      const resultSuccess = await pricingService.calculatePrice({
        pricing,
        quantity: 10,
        resultSuccess: true,
      });

      expect(resultSuccess.finalPrice).toBe(9000); // 10% 数量折扣

      const resultFailed = await pricingService.calculatePrice({
        pricing,
        quantity: 10,
        resultSuccess: false,
      });

      expect(resultFailed.finalPrice).toBe(0);
    });
  });

  describe('createCoupon', () => {
    it('应该创建百分比折扣优惠券', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const coupon = await pricingService.createCoupon(
        'TEST2025',
        'percentage',
        20, // 20% 折扣
        now,
        later,
        { minPurchase: 5000, usageLimit: 100 }
      );

      expect(coupon.code).toBe('TEST2025');
      expect(coupon.type).toBe('percentage');
      expect(coupon.value).toBe(20);
      expect(coupon.minPurchase).toBe(5000);
      expect(coupon.usageLimit).toBe(100);
    });

    it('应该创建固定金额优惠券', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const coupon = await pricingService.createCoupon(
        'FIXED100',
        'fixed',
        1000, // 10元
        now,
        later
      );

      expect(coupon.type).toBe('fixed');
      expect(coupon.value).toBe(1000);
    });

    it('优惠券代码应该大写', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const coupon = await pricingService.createCoupon(
        'test2025',
        'percentage',
        20,
        now,
        later
      );

      expect(coupon.code).toBe('TEST2025');
    });
  });

  describe('validateCoupon', () => {
    it('应该验证有效的优惠券', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await pricingService.createCoupon('VALID2025', 'percentage', 20, now, later, {
        minPurchase: 1000,
      });

      const validation = await pricingService.validateCoupon('VALID2025', 'service_001', 5000);
      expect(validation.valid).toBe(true);
      expect(validation.coupon).toBeDefined();
    });

    it('应该拒绝不存在的优惠券', async () => {
      const validation = await pricingService.validateCoupon('INVALID', 'service_001', 5000);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('优惠券不存在');
    });

    it('应该拒绝未达到最低消费的优惠券', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await pricingService.createCoupon('MIN100', 'percentage', 20, now, later, {
        minPurchase: 10000,
      });

      const validation = await pricingService.validateCoupon('MIN100', 'service_001', 5000);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('最低消费');
    });

    it('应该拒绝过期的优惠券', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      await pricingService.createCoupon('EXPIRED', 'percentage', 20, lastWeek, yesterday);

      const validation = await pricingService.validateCoupon('EXPIRED', 'service_001', 5000);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('优惠券已过期');
    });
  });

  describe('applyCoupon', () => {
    it('应该应用百分比折扣', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await pricingService.createCoupon('PERCENT20', 'percentage', 20, now, later);

      const pricing = await pricingService.createServicePricing(
        testAgentId,
        testServiceId,
        '服务',
        'per_call',
        10000,
        'CNY'
      );

      const result = await pricingService.calculatePrice({
        pricing,
        quantity: 1,
        discountCode: 'PERCENT20',
      });

      expect(result.finalPrice).toBe(8000); // 10000 * (1 - 0.2)
      expect(result.breakdown.couponDiscount).toBe(2000);
    });

    it('应该应用固定金额折扣', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await pricingService.createCoupon('FIXED50', 'fixed', 5000, now, later);

      const pricing = await pricingService.createServicePricing(
        testAgentId,
        testServiceId,
        '服务',
        'per_call',
        10000,
        'CNY'
      );

      const result = await pricingService.calculatePrice({
        pricing,
        quantity: 1,
        discountCode: 'FIXED50',
      });

      expect(result.finalPrice).toBe(5000); // 10000 - 5000
      expect(result.breakdown.couponDiscount).toBe(5000);
    });

    it('应该叠加数量折扣和优惠券', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await pricingService.createCoupon('EXTRA10', 'percentage', 10, now, later);

      const pricing = await pricingService.createServicePricing(
        testAgentId,
        testServiceId,
        '服务',
        'per_call',
        1000,
        'CNY'
      );

      const result = await pricingService.calculatePrice({
        pricing,
        quantity: 50, // 数量折扣 15%
        discountCode: 'EXTRA10', // 额外 10% 折扣
      });

      // 原价: 50000
      // 数量折扣: 7500
      // 剩余: 42500
      // 优惠券: 4250
      // 最终: 38250
      expect(result.originalPrice).toBe(50000);
      expect(result.breakdown.quantityDiscount).toBe(7500);
      expect(result.breakdown.couponDiscount).toBe(4250);
      expect(result.finalPrice).toBe(38250);
    });
  });

  describe('createDefaultCoupons', () => {
    it('应该创建默认优惠券', async () => {
      const coupons = await pricingService.createDefaultCoupons();

      expect(coupons.length).toBe(3);
      expect(coupons.some(c => c.code === 'WELCOME2025')).toBe(true);
      expect(coupons.some(c => c.code === 'FREE2025')).toBe(true);
      expect(coupons.some(c => c.code === 'NEWUSER')).toBe(true);
    });
  });
});
