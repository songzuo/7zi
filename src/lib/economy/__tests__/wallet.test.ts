/**
 * 经济系统 - 钱包模块单元测试
 * @module economy/__tests__/wallet.test
 *
 * 重点覆盖：金额精度、余额守恒、幂等、并发超扣、边界（0 / 负数 / NaN / 差 1 分）、
 * 冻结额度不计可用余额、退款回补与重复退款。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { WalletService, InMemoryWalletRepository, InMemoryTransactionRepository } from '../wallet'

describe('WalletService', () => {
  let service: WalletService
  let walletRepo: InMemoryWalletRepository
  let txnRepo: InMemoryTransactionRepository

  beforeEach(() => {
    walletRepo = new InMemoryWalletRepository()
    txnRepo = new InMemoryTransactionRepository()
    service = new WalletService(walletRepo, txnRepo)
  })

  describe('createWallet / getWallet', () => {
    it('创建钱包后余额为 0 且币种正确', async () => {
      const wallet = await service.createWallet('agent-1', 'USD')
      expect(wallet.balance).toBe(0)
      expect(wallet.frozenAmount).toBe(0)
      expect(wallet.frozen).toBe(false)
      expect(wallet.currency).toBe('USD')
      expect(wallet.address).toMatch(/^0x[0-9a-f]{40}$/)
    })

    it('默认币种为 CNY', async () => {
      const wallet = await service.createWallet('agent-cny')
      expect(wallet.currency).toBe('CNY')
    })

    it('同一 agent 重复创建钱包会抛错', async () => {
      await service.createWallet('agent-dup')
      await expect(service.createWallet('agent-dup')).rejects.toThrow(
        /Wallet already exists/
      )
    })

    it('不存在的 agent 抛错', async () => {
      await expect(service.getWallet('ghost')).rejects.toThrow(/Wallet not found/)
    })

    it('钱包地址唯一', async () => {
      const a = await service.createWallet('agent-a')
      const b = await service.createWallet('agent-b')
      expect(a.address).not.toBe(b.address)
    })
  })

  describe('charge — 充值', () => {
    beforeEach(async () => {
      await service.createWallet('agent-1')
    })

    it('充值后余额恰好增加充值金额（整数分，无浮点误差）', async () => {
      await service.charge('agent-1', 1234)
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(1234)
      expect(balance.available).toBe(1234)
      expect(balance.frozen).toBe(0)
    })

    it('多次充值余额严格累加，0.1+0.2 类偏差不出现', async () => {
      // 10 分 + 20 分 = 30 分，整数分无误差
      await service.charge('agent-1', 10)
      await service.charge('agent-1', 20)
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(30)
    })

    it('充值交易记录 amount 为正数且 status 为 completed', async () => {
      const tx = await service.charge('agent-1', 500, { orderId: 'o-1' })
      expect(tx.type).toBe('charge')
      expect(tx.amount).toBe(500)
      expect(tx.status).toBe('completed')
      expect(tx.metadata.orderId).toBe('o-1')
    })

    it('拒绝 0 元充值', async () => {
      await expect(service.charge('agent-1', 0)).rejects.toThrow(/must be positive/)
    })

    it('拒绝负数充值（否则可以凭空刷余额）', async () => {
      await expect(service.charge('agent-1', -100)).rejects.toThrow(/must be positive/)
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(0)
    })

    it('拒绝 NaN 充值', async () => {
      await expect(service.charge('agent-1', Number.NaN)).rejects.toThrow(
        /must be a finite number/
      )
    })

    it('拒绝 Infinity 充值', async () => {
      await expect(service.charge('agent-1', Number.POSITIVE_INFINITY)).rejects.toThrow(
        /must be a finite number/
      )
    })

    it('拒绝浮点金额充值（分必须是整数）', async () => {
      await expect(service.charge('agent-1', 10.5)).rejects.toThrow(
        /integer number of cents/
      )
    })

    it('冻结的钱包不能充值', async () => {
      await service.freezeWallet('agent-1', '风控')
      await expect(service.charge('agent-1', 100)).rejects.toThrow(/Wallet is frozen/)
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(0)
    })
  })

  describe('pay — 消费', () => {
    beforeEach(async () => {
      await service.createWallet('agent-1')
      await service.charge('agent-1', 1000)
    })

    it('扣费后余额恰好减少费用', async () => {
      const tx = await service.pay('agent-1', 300, '购买服务')
      expect(tx.amount).toBe(-300)
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(700)
    })

    it('余额恰好等于费用时可以扣费成功（余额归零）', async () => {
      await service.pay('agent-1', 1000, '刚好用完')
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(0)
      expect(balance.available).toBe(0)
    })

    it('余额差 1 分时扣费失败', async () => {
      await expect(service.pay('agent-1', 1001, '超支')).rejects.toThrow(
        /Insufficient balance/
      )
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(1000)
    })

    it('余额不足时不产生交易记录', async () => {
      await expect(service.pay('agent-1', 2000, '超支')).rejects.toThrow()
      const txs = await service.getTransactions('agent-1')
      expect(txs.filter(t => t.type === 'payment')).toHaveLength(0)
    })

    it('拒绝 0 元扣费', async () => {
      await expect(service.pay('agent-1', 0, 'x')).rejects.toThrow(/must be positive/)
    })

    it('拒绝负数扣费（负数会变成充值）', async () => {
      await expect(service.pay('agent-1', -100, 'x')).rejects.toThrow(/must be positive/)
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(1000)
    })

    it('拒绝 NaN 扣费', async () => {
      await expect(service.pay('agent-1', Number.NaN, 'x')).rejects.toThrow(
        /must be a finite number/
      )
    })

    it('拒绝浮点金额扣费', async () => {
      await expect(service.pay('agent-1', 33.33, 'x')).rejects.toThrow(
        /integer number of cents/
      )
    })

    it('冻结的钱包不能扣费', async () => {
      await service.freezeWallet('agent-1', '风控')
      await expect(service.pay('agent-1', 100, 'x')).rejects.toThrow(/Wallet is frozen/)
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(1000)
    })
  })

  describe('并发安全 — 不得超扣', () => {
    beforeEach(async () => {
      await service.createWallet('agent-1')
      await service.charge('agent-1', 1000)
    })

    it('并发 20 笔 100 分扣款，只应成功 10 笔，余额不为负', async () => {
      const results = await Promise.allSettled(
        Array.from({ length: 20 }, () => service.pay('agent-1', 100, '并发扣费'))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')

      expect(succeeded).toHaveLength(10)
      expect(failed).toHaveLength(10)

      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(0)
      expect(balance.total).toBeGreaterThanOrEqual(0)
      expect(balance.available).toBe(0)
    })

    it('并发 50 笔 30 分扣款（余额 1000），成功 33 笔', async () => {
      const results = await Promise.allSettled(
        Array.from({ length: 50 }, () => service.pay('agent-1', 30, '并发扣费'))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled')
      expect(succeeded).toHaveLength(33)

      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(1000 - 33 * 30)
      expect(balance.total).toBeGreaterThanOrEqual(0)
    })

    it('并发充值不丢失更新（余额 = 充值总额）', async () => {
      await service.createWallet('agent-2')
      await Promise.all(
        Array.from({ length: 30 }, () => service.charge('agent-2', 100))
      )
      const balance = await service.getBalance('agent-2')
      expect(balance.total).toBe(3000)
    })

    it('并发充值与扣款混合后余额仍为非负', async () => {
      await service.createWallet('agent-2')
      const ops: Promise<unknown>[] = []
      for (let i = 0; i < 20; i++) {
        ops.push(service.charge('agent-2', 100))
        ops.push(service.pay('agent-2', 50, '混合'))
      }
      await Promise.allSettled(ops)
      const balance = await service.getBalance('agent-2')
      expect(balance.total).toBeGreaterThanOrEqual(0)
    })
  })

  describe('freeze / unfreeze — 冻结额度', () => {
    beforeEach(async () => {
      await service.createWallet('agent-1')
      await service.charge('agent-1', 1000)
    })

    it('冻结不改变总余额，但降低可用余额', async () => {
      await service.freeze('agent-1', 400)
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(1000)
      expect(balance.frozen).toBe(400)
      expect(balance.available).toBe(600)
    })

    it('冻结金额超过可用余额时抛错', async () => {
      await expect(service.freeze('agent-1', 1001)).rejects.toThrow(
        /Insufficient balance to freeze/
      )
      const balance = await service.getBalance('agent-1')
      expect(balance.frozen).toBe(0)
    })

    it('冻结额度不计可用余额：余额 1000 冻结 800 后只能再消费 200', async () => {
      await service.freeze('agent-1', 800)
      await expect(service.pay('agent-1', 201, '超额')).rejects.toThrow(
        /Insufficient balance/
      )
      await service.pay('agent-1', 200, '刚好可用')
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(800)
      expect(balance.available).toBe(0)
    })

    it('解冻恢复可用余额', async () => {
      await service.freeze('agent-1', 400)
      await service.unfreeze('agent-1', 400)
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(1000)
      expect(balance.frozen).toBe(0)
      expect(balance.available).toBe(1000)
    })

    it('解冻超过已冻结金额时抛错', async () => {
      await expect(service.unfreeze('agent-1', 1)).rejects.toThrow(
        /Insufficient frozen amount to unfreeze/
      )
    })

    it('拒绝负数冻结 / 解冻', async () => {
      await expect(service.freeze('agent-1', -100)).rejects.toThrow(/must be positive/)
      await expect(service.unfreeze('agent-1', -100)).rejects.toThrow(/must be positive/)
    })

    it('冻结/解冻交易金额为 0（不影响总余额）', async () => {
      const f = await service.freeze('agent-1', 400)
      const u = await service.unfreeze('agent-1', 400)
      expect(f.amount).toBe(0)
      expect(u.amount).toBe(0)
      expect(f.type).toBe('freeze')
      expect(u.type).toBe('unfreeze')
    })
  })

  describe('refund — 退款', () => {
    beforeEach(async () => {
      await service.createWallet('agent-1')
      await service.charge('agent-1', 1000)
    })

    it('全额退款后余额回到扣费前', async () => {
      const payTx = await service.pay('agent-1', 300, '购买服务')
      expect((await service.getBalance('agent-1')).total).toBe(700)

      await service.refund('agent-1', payTx.id)
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(1000)
    })

    it('部分退款只回补部分金额', async () => {
      const payTx = await service.pay('agent-1', 300, '购买服务')
      await service.refund('agent-1', payTx.id, 100, '部分退款')
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(800)
    })

    it('退款交易金额为正数并记录原交易号', async () => {
      const payTx = await service.pay('agent-1', 300, '购买服务')
      const refundTx = await service.refund('agent-1', payTx.id, 100, '理由')
      expect(refundTx.type).toBe('refund')
      expect(refundTx.amount).toBe(100)
      expect(refundTx.status).toBe('completed')
      expect(refundTx.metadata.originalTransactionId).toBe(payTx.id)
      expect(refundTx.metadata.refundReason).toBe('理由')
    })

    it('已全额退款的订单不可再退（重复退款不能刷余额）', async () => {
      const payTx = await service.pay('agent-1', 300, '购买服务')
      await service.refund('agent-1', payTx.id)

      await expect(service.refund('agent-1', payTx.id)).rejects.toThrow(
        /already fully refunded/
      )
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(1000)
    })

    it('部分退款后剩余可退金额正确，且不可超额退款', async () => {
      const payTx = await service.pay('agent-1', 300, '购买服务')
      await service.refund('agent-1', payTx.id, 200)

      await expect(service.refund('agent-1', payTx.id, 200)).rejects.toThrow(
        /exceeds refundable amount/
      )
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(900)

      // 剩余 100 分可退
      await service.refund('agent-1', payTx.id, 100)
      const finalBalance = await service.getBalance('agent-1')
      expect(finalBalance.total).toBe(1000)
    })

    it('不指定金额时默认退完剩余可退金额', async () => {
      const payTx = await service.pay('agent-1', 300, '购买服务')
      await service.refund('agent-1', payTx.id, 100)
      const refundTx = await service.refund('agent-1', payTx.id)
      expect(refundTx.amount).toBe(200)
    })

    it('并发重复退款不得把余额刷高', async () => {
      const payTx = await service.pay('agent-1', 300, '购买服务')
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () => service.refund('agent-1', payTx.id))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled')
      expect(succeeded).toHaveLength(1)
      const balance = await service.getBalance('agent-1')
      expect(balance.total).toBe(1000)
    })

    it('不能退款不存在的交易', async () => {
      await expect(service.refund('agent-1', 'txn_missing')).rejects.toThrow(
        /Original transaction not found/
      )
    })

    it('不能退款充值交易', async () => {
      const chargeTx = await service.charge('agent-1', 100)
      await expect(service.refund('agent-1', chargeTx.id)).rejects.toThrow(
        /Can only refund payment transactions/
      )
    })

    it('不能退款其它钱包的交易', async () => {
      await service.createWallet('agent-2')
      await service.charge('agent-2', 500)
      const otherTx = await service.pay('agent-2', 100, '别人的消费')

      await expect(service.refund('agent-1', otherTx.id)).rejects.toThrow(
        /does not belong to this wallet/
      )
    })

    it('拒绝负数 / 浮点 / NaN 退款金额', async () => {
      const payTx = await service.pay('agent-1', 300, '购买服务')
      await expect(service.refund('agent-1', payTx.id, -50)).rejects.toThrow(
        /must be positive/
      )
      await expect(service.refund('agent-1', payTx.id, 10.5)).rejects.toThrow(
        /integer number of cents/
      )
      await expect(service.refund('agent-1', payTx.id, Number.NaN)).rejects.toThrow(
        /must be a finite number/
      )
    })
  })

  describe('getTransactions', () => {
    beforeEach(async () => {
      await service.createWallet('agent-1')
      await service.charge('agent-1', 1000)
      await service.pay('agent-1', 100, '消费A')
      await service.pay('agent-1', 200, '消费B')
    })

    it('返回全部交易', async () => {
      const txs = await service.getTransactions('agent-1')
      expect(txs).toHaveLength(3)
    })

    it('按类型过滤', async () => {
      const txs = await service.getTransactions('agent-1', { types: ['payment'] })
      expect(txs).toHaveLength(2)
      expect(txs.every(t => t.type === 'payment')).toBe(true)
    })

    it('按状态过滤', async () => {
      const txs = await service.getTransactions('agent-1', { statuses: ['completed'] })
      expect(txs).toHaveLength(3)
    })

    it('limit 生效', async () => {
      const txs = await service.getTransactions('agent-1', { limit: 2 })
      expect(txs).toHaveLength(2)
    })

    it('按 orderId 可以查到交易', async () => {
      await service.pay('agent-1', 50, '订单消费', { orderId: 'ORDER-9' })
      const found = await txnRepo.findByOrderId('ORDER-9')
      expect(found).toHaveLength(1)
      expect(found[0].amount).toBe(-50)
    })
  })

  describe('freezeWallet / unfreezeWallet', () => {
    it('冻结钱包后 frozen 为 true，解冻后为 false', async () => {
      await service.createWallet('agent-1')
      const frozen = await service.freezeWallet('agent-1', '违规')
      expect(frozen.frozen).toBe(true)

      const unfrozen = await service.unfreezeWallet('agent-1')
      expect(unfrozen.frozen).toBe(false)
    })
  })

  describe('仓储层', () => {
    it('findById / findByAddress / findAll / delete 正常', async () => {
      const wallet = await service.createWallet('agent-1')
      expect(await walletRepo.findById(wallet.id)).not.toBeNull()
      expect(await walletRepo.findByAddress(wallet.address)).not.toBeNull()
      expect(await walletRepo.findAll()).toHaveLength(1)

      expect(await walletRepo.delete(wallet.id)).toBe(true)
      expect(await walletRepo.findById(wallet.id)).toBeNull()
      expect(await walletRepo.delete(wallet.id)).toBe(false)
    })

    it('update 不存在的钱包抛错', async () => {
      await expect(walletRepo.update('nope', { balance: 1 })).rejects.toThrow(
        /Wallet not found/
      )
    })

    it('update 不存在的交易抛错', async () => {
      await expect(txnRepo.update('nope', { status: 'failed' })).rejects.toThrow(
        /Transaction not found/
      )
    })
  })
})
