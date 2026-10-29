/**
 * 经济系统 - 支付模块单元测试
 * @module economy/__tests__/payment.test
 *
 * 重点覆盖：订单金额精度、支付幂等、订单状态流转、退款幂等 / 不可重复退款、
 * 部分退款与累计退款、过期订单、非法金额输入。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PaymentService, InMemoryPaymentRepository, MockPaymentGateway } from '../payment'
import type { IPaymentGateway } from '../payment'
import type { PaymentOrder } from '../types'

/** 可控的假网关：可配置验证结果与退款结果 */
class ControllableGateway implements IPaymentGateway {
  verifyResult: { success: boolean; transactionId?: string } = { success: true }
  refundResult: { success: boolean; refundTransactionId?: string } = { success: true }
  createCount = 0
  verifyCount = 0
  refundCalls: Array<{ transactionId: string; amount: number }> = []

  async createPayment(_order: PaymentOrder): Promise<{
    paymentId: string
    paymentUrl?: string
    clientSecret?: string
  }> {
    this.createCount++
    const paymentId = `pay_${this.createCount}`
    return {
      paymentId,
      paymentUrl: `https://pay.example/${paymentId}`,
      clientSecret: `secret_${paymentId}`,
    }
  }

  async verifyPayment(paymentId: string): Promise<{ success: boolean; transactionId?: string }> {
    this.verifyCount++
    if (!this.verifyResult.success) return { success: false }
    return { success: true, transactionId: `txn_for_${paymentId}` }
  }

  async processRefund(
    transactionId: string,
    amount: number
  ): Promise<{ success: boolean; refundTransactionId?: string }> {
    this.refundCalls.push({ transactionId, amount })
    if (!this.refundResult.success) return { success: false }
    return { success: true, refundTransactionId: `refund_${this.refundCalls.length}` }
  }

  async getPaymentStatus(): Promise<{ status: 'pending' | 'processing' | 'completed' | 'failed' }> {
    return { status: 'pending' }
  }
}

describe('PaymentService', () => {
  let service: PaymentService
  let repo: InMemoryPaymentRepository
  let gateway: ControllableGateway

  beforeEach(() => {
    repo = new InMemoryPaymentRepository()
    gateway = new ControllableGateway()
    service = new PaymentService(repo, new Map([['stripe', gateway]]))
  })

  async function createOrder(
    amount = 1000,
    expiresInMinutes = 30,
    metadata: Record<string, unknown> = {}
  ): Promise<PaymentOrder> {
    const { order } = await service.createOrder(
      'customer-1',
      'agent-1',
      'service-1',
      amount,
      'CNY',
      metadata,
      expiresInMinutes
    )
    return order
  }

  describe('createOrder', () => {
    it('创建订单初始状态为 pending，金额原样保存（整数分）', async () => {
      const order = await createOrder(1234)
      expect(order.status).toBe('pending')
      expect(order.amount).toBe(1234)
      expect(order.currency).toBe('CNY')
      expect(order.transactions).toHaveLength(0)
      expect(order.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('拒绝 0 元订单', async () => {
      await expect(createOrder(0)).rejects.toThrow(/must be positive/)
    })

    it('拒绝负数订单（否则订单金额为负）', async () => {
      await expect(createOrder(-500)).rejects.toThrow(/must be positive/)
    })

    it('拒绝浮点订单金额', async () => {
      await expect(createOrder(10.5)).rejects.toThrow(/integer number of cents/)
    })

    it('拒绝 NaN 订单金额', async () => {
      await expect(createOrder(Number.NaN)).rejects.toThrow(/must be a finite number/)
    })

    it('拒绝空 customerId', async () => {
      await expect(
        service.createOrder('', 'agent-1', 'service-1', 100, 'CNY')
      ).rejects.toThrow(/required/)
    })

    it('拒绝非法 expiresInMinutes', async () => {
      await expect(createOrder(100, 0)).rejects.toThrow(/expiresInMinutes/)
      await expect(createOrder(100, -5)).rejects.toThrow(/expiresInMinutes/)
    })

    it('订单可通过 getOrder 读回', async () => {
      const order = await createOrder(500)
      const fetched = await service.getOrder(order.id)
      expect(fetched.id).toBe(order.id)
      expect(fetched.amount).toBe(500)
    })

    it('不存在的订单抛错', async () => {
      await expect(service.getOrder('order_missing')).rejects.toThrow(/订单不存在/)
    })
  })

  describe('initiatePayment — 发起支付', () => {
    it('创建支付并记录 pending 支付交易', async () => {
      const order = await createOrder(1000)
      const payment = await service.initiatePayment(order.id, 'stripe')

      expect(payment.paymentId).toBe('pay_1')
      expect(payment.paymentUrl).toBe('https://pay.example/pay_1')

      const updated = await service.getOrder(order.id)
      expect(updated.transactions).toHaveLength(1)
      expect(updated.transactions[0].type).toBe('payment')
      expect(updated.transactions[0].status).toBe('pending')
      expect(updated.transactions[0].amount).toBe(1000)
      expect(updated.transactions[0].paymentMethod).toBe('stripe')
    })

    it('幂等：重复 initiatePayment 不会重复创建支付', async () => {
      const order = await createOrder(1000)
      const first = await service.initiatePayment(order.id, 'stripe')
      const second = await service.initiatePayment(order.id, 'stripe')

      expect(second.paymentId).toBe(first.paymentId)
      expect(gateway.createCount).toBe(1)

      const updated = await service.getOrder(order.id)
      expect(updated.transactions).toHaveLength(1)
    })

    it('不支持的支付方式抛错', async () => {
      const order = await createOrder(1000)
      await expect(service.initiatePayment(order.id, 'alipay')).rejects.toThrow(
        /不支持的支付方式/
      )
    })

    it('已过期的订单发起支付会被取消并抛错', async () => {
      const order = await createOrder(1000, -1)
      await expect(service.initiatePayment(order.id, 'stripe')).rejects.toThrow(
        /订单已过期/
      )
      const updated = await service.getOrder(order.id)
      expect(updated.status).toBe('cancelled')
    })

    it('余额支付直接完成订单', async () => {
      const order = await createOrder(1000)
      const result = await service.initiatePayment(order.id, 'balance')
      expect(result.paymentId).toMatch(/^txn_/)

      const updated = await service.getOrder(order.id)
      expect(updated.status).toBe('completed')
      expect(updated.paidAt).toBeDefined()
      expect(updated.transactions[0].paymentMethod).toBe('balance')
      expect(updated.transactions[0].status).toBe('completed')
    })
  })

  describe('verifyAndCompletePayment — 验证支付', () => {
    it('验证成功订单变为 completed 并写入完成时间', async () => {
      const order = await createOrder(1000)
      await service.initiatePayment(order.id, 'stripe')
      const completed = await service.verifyAndCompletePayment(order.id, 'stripe')

      expect(completed.status).toBe('completed')
      expect(completed.paidAt).toBeDefined()
      expect(completed.transactions[0].status).toBe('completed')
      expect(completed.transactions[0].completedAt).toBeDefined()
      expect(completed.transactions[0].externalTransactionId).toBe('txn_for_pay_1')
    })

    it('幂等：重复验证不重复调用网关、不重复完成', async () => {
      const order = await createOrder(1000)
      await service.initiatePayment(order.id, 'stripe')
      await service.verifyAndCompletePayment(order.id, 'stripe')
      const again = await service.verifyAndCompletePayment(order.id, 'stripe')

      expect(again.status).toBe('completed')
      expect(gateway.verifyCount).toBe(1)
      const updated = await service.getOrder(order.id)
      expect(updated.transactions).toHaveLength(1)
    })

    it('验证失败订单变为 failed 并抛错', async () => {
      gateway.verifyResult = { success: false }
      const order = await createOrder(1000)
      await service.initiatePayment(order.id, 'stripe')

      await expect(service.verifyAndCompletePayment(order.id, 'stripe')).rejects.toThrow(
        /支付验证失败/
      )
      const updated = await service.getOrder(order.id)
      expect(updated.status).toBe('failed')
      expect(updated.transactions[0].status).toBe('failed')
    })

    it('没有待处理支付交易时抛错', async () => {
      const order = await createOrder(1000)
      await expect(service.verifyAndCompletePayment(order.id, 'stripe')).rejects.toThrow(
        /未找到待处理的支付交易/
      )
    })

    it('余额支付的订单重复验证返回已完成订单', async () => {
      const order = await createOrder(1000)
      await service.initiatePayment(order.id, 'balance')
      const again = await service.verifyAndCompletePayment(order.id, 'balance')
      expect(again.status).toBe('completed')
    })
  })

  describe('requestRefund — 退款', () => {
    async function paidOrder(amount = 1000): Promise<PaymentOrder> {
      const order = await createOrder(amount)
      await service.initiatePayment(order.id, 'stripe')
      await service.verifyAndCompletePayment(order.id, 'stripe')
      return service.getOrder(order.id)
    }

    it('全额退款（amount=0）后订单变为 refunded，remainingAmount 为 0', async () => {
      const order = await paidOrder(1000)
      const result = await service.requestRefund({
        orderId: order.id,
        amount: 0,
        reason: '用户取消',
        requestedBy: 'admin-1',
      })

      expect(result.success).toBe(true)
      expect(result.refundAmount).toBe(1000)
      expect(result.remainingAmount).toBe(0)

      const updated = await service.getOrder(order.id)
      expect(updated.status).toBe('refunded')
      expect(updated.refundedAt).toBeDefined()
      const refundTx = updated.transactions.find(t => t.type === 'refund')
      expect(refundTx).toBeDefined()
      expect(refundTx!.amount).toBe(1000)
      expect(refundTx!.status).toBe('completed')
    })

    it('部分退款后订单变为 partial_refunded，剩余金额正确', async () => {
      const order = await paidOrder(1000)
      const result = await service.requestRefund({
        orderId: order.id,
        amount: 300,
        reason: '部分退',
        requestedBy: 'admin-1',
      })

      expect(result.success).toBe(true)
      expect(result.refundAmount).toBe(300)
      expect(result.remainingAmount).toBe(700)

      const updated = await service.getOrder(order.id)
      expect(updated.status).toBe('partial_refunded')
    })

    it('多次部分退款累计到全额后可再退剩余部分，最终 refunded', async () => {
      const order = await paidOrder(1000)
      const r1 = await service.requestRefund({
        orderId: order.id,
        amount: 400,
        reason: 'a',
        requestedBy: 'admin-1',
      })
      expect(r1.remainingAmount).toBe(600)

      const r2 = await service.requestRefund({
        orderId: order.id,
        amount: 600,
        reason: 'b',
        requestedBy: 'admin-1',
      })
      expect(r2.success).toBe(true)
      expect(r2.remainingAmount).toBe(0)

      const updated = await service.getOrder(order.id)
      expect(updated.status).toBe('refunded')
      expect(updated.transactions.filter(t => t.type === 'refund')).toHaveLength(2)
    })

    it('已全额退款的订单不可再退（幂等）', async () => {
      const order = await paidOrder(1000)
      await service.requestRefund({
        orderId: order.id,
        amount: 0,
        reason: 'x',
        requestedBy: 'admin-1',
      })

      const again = await service.requestRefund({
        orderId: order.id,
        amount: 0,
        reason: 'x',
        requestedBy: 'admin-1',
      })
      expect(again.success).toBe(false)
      expect(again.error).toBe('订单已全额退款')

      const updated = await service.getOrder(order.id)
      expect(updated.transactions.filter(t => t.type === 'refund')).toHaveLength(1)
    })

    it('累计退款超过订单金额时被拒绝', async () => {
      const order = await paidOrder(1000)
      await service.requestRefund({
        orderId: order.id,
        amount: 800,
        reason: 'x',
        requestedBy: 'admin-1',
      })

      const over = await service.requestRefund({
        orderId: order.id,
        amount: 300,
        reason: 'x',
        requestedBy: 'admin-1',
      })
      expect(over.success).toBe(false)
      expect(over.error).toBe('退款金额超过订单可退金额')
      expect(over.remainingAmount).toBe(200)

      const updated = await service.getOrder(order.id)
      expect(updated.transactions.filter(t => t.type === 'refund')).toHaveLength(1)
    })

    it('未支付订单不可退款', async () => {
      const order = await createOrder(1000)
      const result = await service.requestRefund({
        orderId: order.id,
        amount: 0,
        reason: 'x',
        requestedBy: 'admin-1',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('订单状态不允许退款')
    })

    it('不存在的订单退款失败', async () => {
      const result = await service.requestRefund({
        orderId: 'missing',
        amount: 0,
        reason: 'x',
        requestedBy: 'admin-1',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('订单不存在')
    })

    it('拒绝负数退款金额', async () => {
      const order = await paidOrder(1000)
      const result = await service.requestRefund({
        orderId: order.id,
        amount: -100,
        reason: 'x',
        requestedBy: 'admin-1',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('退款金额不能为负数')
    })

    it('拒绝浮点退款金额', async () => {
      const order = await paidOrder(1000)
      const result = await service.requestRefund({
        orderId: order.id,
        amount: 10.5,
        reason: 'x',
        requestedBy: 'admin-1',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('退款金额必须为整数分')
    })

    it('拒绝 NaN 退款金额', async () => {
      const order = await paidOrder(1000)
      const result = await service.requestRefund({
        orderId: order.id,
        amount: Number.NaN,
        reason: 'x',
        requestedBy: 'admin-1',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('退款金额非法')
    })

    it('网关退款失败时退款不成功且不写退款交易', async () => {
      gateway.refundResult = { success: false }
      const order = await paidOrder(1000)
      const result = await service.requestRefund({
        orderId: order.id,
        amount: 100,
        reason: 'x',
        requestedBy: 'admin-1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('退款处理失败')
      const updated = await service.getOrder(order.id)
      expect(updated.status).toBe('completed')
      expect(updated.transactions.filter(t => t.type === 'refund')).toHaveLength(0)
    })

    it('余额支付的订单退款走余额通道并记录退款交易', async () => {
      const order = await createOrder(1000)
      await service.initiatePayment(order.id, 'balance')
      const result = await service.requestRefund({
        orderId: order.id,
        amount: 0,
        reason: 'x',
        requestedBy: 'admin-1',
      })
      expect(result.success).toBe(true)
      const updated = await service.getOrder(order.id)
      const refundTx = updated.transactions.find(t => t.type === 'refund')
      expect(refundTx!.paymentMethod).toBe('balance')
    })
  })

  describe('cancelOrder', () => {
    it('待支付订单可以取消', async () => {
      const order = await createOrder(1000)
      const cancelled = await service.cancelOrder(order.id)
      expect(cancelled.status).toBe('cancelled')
      expect(cancelled.cancelledAt).toBeDefined()
    })

    it('已支付订单不能取消', async () => {
      const order = await createOrder(1000)
      await service.initiatePayment(order.id, 'stripe')
      await service.verifyAndCompletePayment(order.id, 'stripe')
      await expect(service.cancelOrder(order.id)).rejects.toThrow(/只能取消待支付订单/)
    })

    it('不存在的订单取消抛错', async () => {
      await expect(service.cancelOrder('missing')).rejects.toThrow(/订单不存在/)
    })
  })

  describe('订单查询', () => {
    it('getCustomerOrders 返回该客户的订单', async () => {
      await createOrder(1000)
      const { order } = await service.createOrder(
        'customer-2',
        'agent-1',
        'service-1',
        2000,
        'CNY'
      )
      expect(order.customerId).toBe('customer-2')

      const orders = await service.getCustomerOrders('customer-1')
      expect(orders).toHaveLength(1)
      expect(orders[0].amount).toBe(1000)
    })

    it('getCustomerOrders 支持 limit', async () => {
      await createOrder(1000)
      await createOrder(2000)
      const orders = await service.getCustomerOrders('customer-1', 1)
      expect(orders).toHaveLength(1)
    })

    it('getAgentOrders 返回该 agent 的订单', async () => {
      await createOrder(1000)
      await service.createOrder('customer-2', 'agent-2', 'service-1', 2000, 'CNY')
      const orders = await service.getAgentOrders('agent-1')
      expect(orders).toHaveLength(1)
      expect(orders[0].amount).toBe(1000)
    })

    it('不存在的客户返回空数组', async () => {
      expect(await service.getCustomerOrders('nobody')).toHaveLength(0)
    })
  })

  describe('registerGateway', () => {
    it('注册新网关后可使用', async () => {
      const alipay = new ControllableGateway()
      service.registerGateway('alipay', alipay)

      const order = await createOrder(1000)
      const payment = await service.initiatePayment(order.id, 'alipay')
      expect(payment.paymentId).toBe('pay_1')
      expect(alipay.createCount).toBe(1)
    })
  })

  describe('MockPaymentGateway', () => {
    it('创建后状态为 pending，验证后变 completed', async () => {
      const mock = new MockPaymentGateway()
      const order = await createOrder(1000)
      const created = await mock.createPayment(order)
      expect((await mock.getPaymentStatus(created.paymentId)).status).toBe('pending')

      const verified = await mock.verifyPayment(created.paymentId)
      expect(verified.success).toBe(true)
      expect(verified.transactionId).toBeDefined()
      expect((await mock.getPaymentStatus(created.paymentId)).status).toBe('completed')
    })

    it('验证不存在的支付返回失败', async () => {
      const mock = new MockPaymentGateway()
      const verified = await mock.verifyPayment('nope')
      expect(verified.success).toBe(false)
    })

    it('退款总是成功并返回退款交易号', async () => {
      const mock = new MockPaymentGateway()
      const result = await mock.processRefund('txn_1', 100, 'reason')
      expect(result.success).toBe(true)
      expect(result.refundTransactionId).toBeDefined()
    })
  })

  describe('仓储层', () => {
    it('getOrders 暴露全部订单', async () => {
      await createOrder(1000)
      expect(repo.getOrders().size).toBe(1)
    })

    it('update 不存在的订单抛错', async () => {
      await expect(repo.update('missing', { status: 'cancelled' })).rejects.toThrow(
        /Payment order not found/
      )
    })
  })

  describe('并发安全', () => {
    it('并发重复发起支付只创建一笔支付交易', async () => {
      const order = await createOrder(1000)
      await Promise.all([
        service.initiatePayment(order.id, 'stripe'),
        service.initiatePayment(order.id, 'stripe'),
        service.initiatePayment(order.id, 'stripe'),
      ])
      const updated = await service.getOrder(order.id)
      expect(updated.transactions).toHaveLength(1)
    })

    it('并发退款不会超额退款', async () => {
      const order = await createOrder(1000)
      await service.initiatePayment(order.id, 'stripe')
      await service.verifyAndCompletePayment(order.id, 'stripe')

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          service.requestRefund({
            orderId: order.id,
            amount: 300,
            reason: 'x',
            requestedBy: 'admin-1',
          })
        )
      )
      const succeeded = results.filter(r => r.success)
      expect(succeeded).toHaveLength(1)
      expect(gateway.refundCalls).toHaveLength(1)

      const updated = await service.getOrder(order.id)
      expect(updated.transactions.filter(t => t.type === 'refund')).toHaveLength(1)
    })
  })

  describe('网关交互', () => {
    it('验证时使用 initiatePayment 创建的外部交易号', async () => {
      const spy = vi.spyOn(gateway, 'verifyPayment')
      const order = await createOrder(1000)
      await service.initiatePayment(order.id, 'stripe')
      await service.verifyAndCompletePayment(order.id, 'stripe')
      expect(spy).toHaveBeenCalledWith('pay_1')
    })

    it('退款时把金额传给网关', async () => {
      const order = await createOrder(1000)
      await service.initiatePayment(order.id, 'stripe')
      await service.verifyAndCompletePayment(order.id, 'stripe')
      await service.requestRefund({
        orderId: order.id,
        amount: 250,
        reason: 'r',
        requestedBy: 'admin-1',
      })
      expect(gateway.refundCalls[0]).toEqual({ transactionId: 'txn_for_pay_1', amount: 250 })
    })
  })
})
