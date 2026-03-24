/**
 * @fileoverview 智能体钱包测试
 * @description Agent Wallet Store Tests
 */

import {describe, it, expect, beforeEach} from 'vitest';
import { useWalletStore } from '../walletStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('WalletStore', () => {
  let store: ReturnType<typeof useWalletStore.getState>;

  beforeEach(() => {
    // 重置 store
    useWalletStore.getState().reset();
    localStorageMock.clear();
    // 获取最新的 store 引用
    store = useWalletStore.getState();
  });

  describe('initializeWallets', () => {
    it('应该正确初始化多个智能体钱包', () => {
      const { initializeWallets } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor', initialBalance: 100 },
        { id: 'agent-2', name: 'Consultant', initialBalance: 200 },
        { id: 'agent-3', name: 'Architect' }, // 使用默认余额
      ]);

      // 获取更新后的状态
      const { wallets } = useWalletStore.getState();
      const walletList = Array.from(wallets.values());
      expect(walletList).toHaveLength(3);
      expect(walletList[0].balance).toBe(100);
      expect(walletList[1].balance).toBe(200);
      expect(walletList[2].balance).toBe(100); // 默认余额
    });

    it('应该设置第一个智能体为当前钱包', () => {
      const { initializeWallets } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor' },
        { id: 'agent-2', name: 'Consultant' },
      ]);

      // 获取更新后的状态
      const { currentWalletId } = useWalletStore.getState();
      expect(currentWalletId).toBe('agent-1');
    });
  });

  describe('getWallet', () => {
    it('应该返回指定智能体的钱包', () => {
      const { initializeWallets, getWallet } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor', initialBalance: 500 },
      ]);

      const wallet = getWallet('agent-1');
      expect(wallet).toBeDefined();
      expect(wallet?.agentName).toBe('Executor');
      expect(wallet?.balance).toBe(500);
    });

    it('应该对不存在的钱包返回 undefined', () => {
      const { getWallet } = useWalletStore.getState();
      const wallet = getWallet('non-existent');
      expect(wallet).toBeUndefined();
    });
  });

  describe('transfer', () => {
    beforeEach(() => {
      useWalletStore.getState().initializeWallets([
        { id: 'agent-1', name: 'Executor', initialBalance: 1000 },
        { id: 'agent-2', name: 'Consultant', initialBalance: 500 },
      ]);
    });

    it('应该成功完成转账', async () => {
      const { transfer, getWallet } = useWalletStore.getState();

      const result = await transfer('agent-1', {
        toAgentId: 'agent-2',
        amount: 100,
        memo: '测试转账',
      });

      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.transaction?.amount).toBe(100);
      expect(result.transaction?.memo).toBe('测试转账');

      // 获取更新后的状态
      const updatedState = useWalletStore.getState();
      const fromWallet = updatedState.getWallet('agent-1');
      const toWallet = updatedState.getWallet('agent-2');
      const transactions = updatedState.transactions;

      // 扣除 100 + 手续费(0.1% = 1)
      expect(fromWallet?.balance).toBe(899);
      expect(toWallet?.balance).toBe(600);

      // 检查交易记录
      expect(transactions).toHaveLength(1);
    });

    it('应该拒绝发送方余额不足的转账', async () => {
      const { transfer, getWallet } = useWalletStore.getState();

      const result = await transfer('agent-1', {
        toAgentId: 'agent-2',
        amount: 2000, // 超过余额
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('余额不足');

      // 余额应该不变
      const fromWallet = getWallet('agent-1');
      expect(fromWallet?.balance).toBe(1000);
    });

    it('应该拒绝发送方不存在的转账', async () => {
      const { transfer } = useWalletStore.getState();

      const result = await transfer('non-existent', {
        toAgentId: 'agent-2',
        amount: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('发送方钱包不存在');
    });

    it('应该拒绝接收方不存在的转账', async () => {
      const { transfer } = useWalletStore.getState();

      const result = await transfer('agent-1', {
        toAgentId: 'non-existent',
        amount: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('接收方钱包不存在');
    });

    it('应该拒绝金额过小的转账', async () => {
      const { transfer, updateConfig } = useWalletStore.getState();

      updateConfig({ minTransferAmount: 10 });

      const result = await transfer('agent-1', {
        toAgentId: 'agent-2',
        amount: 5, // 小于最小金额
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('转账金额不能小于');
    });

    it('应该拒绝冻结钱包的转账', async () => {
      const { transfer, freezeWallet } = useWalletStore.getState();

      freezeWallet('agent-1');

      const result = await transfer('agent-1', {
        toAgentId: 'agent-2',
        amount: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('发送方钱包已被冻结');
    });
  });

  describe('deposit', () => {
    it('应该成功存入金额', async () => {
      const { initializeWallets, deposit, getWallet } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor', initialBalance: 100 },
      ]);

      const result = await deposit('agent-1', 50, '任务奖励');

      expect(result.success).toBe(true);

      const wallet = getWallet('agent-1');
      expect(wallet?.balance).toBe(150);
      expect(wallet?.totalIncome).toBe(150);
    });
  });

  describe('withdraw', () => {
    it('应该成功提取金额', async () => {
      const { initializeWallets, withdraw, getWallet } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor', initialBalance: 100 },
      ]);

      const result = await withdraw('agent-1', 30, '提现');

      expect(result.success).toBe(true);

      const wallet = getWallet('agent-1');
      expect(wallet?.balance).toBe(70);
      expect(wallet?.totalExpense).toBe(30);
    });

    it('应该拒绝余额不足的提取', async () => {
      const { initializeWallets, withdraw, getWallet } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor', initialBalance: 50 },
      ]);

      const result = await withdraw('agent-1', 100);

      expect(result.success).toBe(false);
      expect(result.error).toContain('余额不足');

      const wallet = getWallet('agent-1');
      expect(wallet?.balance).toBe(50);
    });
  });

  describe('reward', () => {
    it('应该成功发放奖励', async () => {
      const { initializeWallets, reward, getWallet } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor', initialBalance: 100 },
      ]);

      const result = await reward('agent-1', 25);

      expect(result.success).toBe(true);

      const wallet = getWallet('agent-1');
      expect(wallet?.balance).toBe(125);
    });
  });

  describe('penalty', () => {
    it('应该成功执行惩罚', async () => {
      const { initializeWallets, penalty, getWallet } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor', initialBalance: 100 },
      ]);

      const result = await penalty('agent-1', 30, '任务失败');

      expect(result.success).toBe(true);

      const wallet = getWallet('agent-1');
      expect(wallet?.balance).toBe(70);
      expect(wallet?.totalExpense).toBe(30);
    });

    it('惩罚金额不应超过当前余额', async () => {
      const { initializeWallets, penalty, getWallet } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor', initialBalance: 50 },
      ]);

      const result = await penalty('agent-1', 100);

      expect(result.success).toBe(true);

      const wallet = getWallet('agent-1');
      expect(wallet?.balance).toBe(0); // 余额不应为负
    });
  });

  describe('freezeWallet / unfreezeWallet', () => {
    it('应该成功冻结和解冻钱包', () => {
      const { initializeWallets, freezeWallet, unfreezeWallet, getWallet } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor' },
      ]);

      freezeWallet('agent-1');
      expect(getWallet('agent-1')?.status).toBe('frozen');

      unfreezeWallet('agent-1');
      expect(getWallet('agent-1')?.status).toBe('active');
    });
  });

  describe('getTransactions', () => {
    it('应该返回所有交易记录', async () => {
      const { initializeWallets, transfer, getTransactions } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor', initialBalance: 1000 },
        { id: 'agent-2', name: 'Consultant', initialBalance: 500 },
      ]);

      await transfer('agent-1', { toAgentId: 'agent-2', amount: 100 });
      await transfer('agent-2', { toAgentId: 'agent-1', amount: 50 });

      const transactions = getTransactions();
      expect(transactions).toHaveLength(2);
    });

    it('应该筛选特定钱包的交易记录', async () => {
      const { initializeWallets, transfer, getTransactions, wallets } = useWalletStore.getState();

      initializeWallets([
        { id: 'agent-1', name: 'Executor', initialBalance: 1000 },
        { id: 'agent-2', name: 'Consultant', initialBalance: 500 },
      ]);

      await transfer('agent-1', { toAgentId: 'agent-2', amount: 100 });

      const wallet = wallets.get('agent-1');
      const transactions = getTransactions(wallet?.id);
      expect(transactions).toHaveLength(1);
    });
  });

  describe('updateConfig', () => {
    it('应该更新钱包配置', () => {
      const { updateConfig, config } = useWalletStore.getState();

      updateConfig({
        minTransferAmount: 10,
        transferFeeRate: 0.01,
      });

      expect(useWalletStore.getState().config.minTransferAmount).toBe(10);
      expect(useWalletStore.getState().config.transferFeeRate).toBe(0.01);
    });
  });
});