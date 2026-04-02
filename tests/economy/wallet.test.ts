/**
 * 7zi Agent 经济系统 - 钱包模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { WalletService } from '../../src/lib/economy/wallet.js'

describe('WalletService', () => {
  let walletService: WalletService
  const testAgentId = 'agent_test_001'

  beforeEach(() => {
    walletService = new WalletService()
  })

  describe('createWallet', () => {
    it('应该创建钱包', async () => {
      const wallet = await walletService.createWallet(testAgentId, 'CNY')

      expect(wallet.agentId).toBe(testAgentId)
      expect(wallet.currency).toBe('CNY')
      expect(wallet.balance).toBe(0)
      expect(wallet.address).toMatch(/^0x[a-f0-9]{40}$/)
      expect(wallet.frozen).toBe(false)
    })

    it('不应该为同一个 agent 创建重复钱包', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await expect(walletService.createWallet(testAgentId, 'CNY')).rejects.toThrow()
    })
  })

  describe('charge', () => {
    it('应该成功充值', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      const transaction = await walletService.charge(testAgentId, 10000) // 100元

      expect(transaction.type).toBe('charge')
      expect(transaction.amount).toBe(10000)
      expect(transaction.status).toBe('completed')

      const balance = await walletService.getBalance(testAgentId)
      expect(balance.total).toBe(10000)
    })

    it('应该拒绝负数充值', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await expect(walletService.charge(testAgentId, -100)).rejects.toThrow()
    })

    it('应该拒绝冻结钱包的充值', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await walletService.freezeWallet(testAgentId)
      await expect(walletService.charge(testAgentId, 100)).rejects.toThrow()
    })
  })

  describe('pay', () => {
    it('应该成功支付', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await walletService.charge(testAgentId, 10000)

      const transaction = await walletService.pay(testAgentId, 5000, '购买服务', {
        serviceId: 'service_001',
      })

      expect(transaction.type).toBe('payment')
      expect(transaction.amount).toBe(-5000)
      expect(transaction.description).toBe('购买服务')

      const balance = await walletService.getBalance(testAgentId)
      expect(balance.total).toBe(5000)
    })

    it('应该拒绝余额不足的支付', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await walletService.charge(testAgentId, 1000)

      await expect(walletService.pay(testAgentId, 5000, '购买服务')).rejects.toThrow()
    })

    it('应该考虑冻结余额', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await walletService.charge(testAgentId, 10000)
      await walletService.freeze(testAgentId, 3000)

      const balance = await walletService.getBalance(testAgentId)
      expect(balance.total).toBe(10000)
      expect(balance.available).toBe(7000)
      expect(balance.frozen).toBe(3000)

      // 可用余额应该是 7000
      await walletService.pay(testAgentId, 7000, '支付可用余额')

      await expect(walletService.pay(testAgentId, 1, '超支')).rejects.toThrow()
    })
  })

  describe('refund', () => {
    it('应该成功退款', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await walletService.charge(testAgentId, 10000)

      const paymentTx = await walletService.pay(testAgentId, 5000, '购买服务')
      const refundTx = await walletService.refund(testAgentId, paymentTx.id, 2000, '服务不合适')

      expect(refundTx.type).toBe('refund')
      expect(refundTx.amount).toBe(2000)
      expect(refundTx.description).toContain('退款')

      const balance = await walletService.getBalance(testAgentId)
      expect(balance.total).toBe(7000) // 10000 - 5000 + 2000
    })

    it('应该全额退款', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await walletService.charge(testAgentId, 10000)

      const paymentTx = await walletService.pay(testAgentId, 5000, '购买服务')
      const refundTx = await walletService.refund(testAgentId, paymentTx.id)

      expect(refundTx.amount).toBe(5000)

      const balance = await walletService.getBalance(testAgentId)
      expect(balance.total).toBe(10000)
    })
  })

  describe('freeze/unfreeze', () => {
    it('应该冻结资金', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await walletService.charge(testAgentId, 10000)

      const tx = await walletService.freeze(testAgentId, 3000)

      expect(tx.type).toBe('freeze')
      expect(tx.amount).toBe(0) // 冻结不改变总余额

      const balance = await walletService.getBalance(testAgentId)
      expect(balance.frozen).toBe(3000)
      expect(balance.available).toBe(7000)
    })

    it('应该解冻资金', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await walletService.charge(testAgentId, 10000)
      await walletService.freeze(testAgentId, 3000)

      const tx = await walletService.unfreeze(testAgentId, 2000)

      expect(tx.type).toBe('unfreeze')

      const balance = await walletService.getBalance(testAgentId)
      expect(balance.frozen).toBe(1000)
      expect(balance.available).toBe(9000)
    })
  })

  describe('getTransactions', () => {
    it('应该查询交易记录', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await walletService.charge(testAgentId, 10000)
      await walletService.pay(testAgentId, 5000, '支付1')
      await walletService.pay(testAgentId, 2000, '支付2')

      const transactions = await walletService.getTransactions(testAgentId)

      expect(transactions.length).toBe(3)
      expect(transactions[0].type).toBe('payment') // 按时间倒序
      expect(transactions[0].description).toBe('支付2')
    })

    it('应该按类型过滤', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await walletService.charge(testAgentId, 10000)
      const paymentTx = await walletService.pay(testAgentId, 5000, '支付')
      await walletService.refund(testAgentId, paymentTx.id, 1000)

      const payments = await walletService.getTransactions(testAgentId, { types: ['payment'] })
      expect(payments.every(t => t.type === 'payment')).toBe(true)
    })

    it('应该限制返回数量', async () => {
      await walletService.createWallet(testAgentId, 'CNY')
      await walletService.charge(testAgentId, 10000)
      await walletService.pay(testAgentId, 1000, '支付1')
      await walletService.pay(testAgentId, 2000, '支付2')
      await walletService.pay(testAgentId, 3000, '支付3')

      const transactions = await walletService.getTransactions(testAgentId, { limit: 2 })
      expect(transactions.length).toBe(2)
    })
  })
})
