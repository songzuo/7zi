'use client';

import React, { useState, useCallback, memo } from 'react';
import { useWalletStore, useWallets } from '../stores/walletStore';
import type { AgentWallet, Transaction } from '../types/wallet';
import { TRANSACTION_TYPE_CONFIG, TRANSACTION_STATUS_CONFIG } from '../types/wallet';

// ============================================================================
// 钱包余额显示组件
// ============================================================================

interface WalletBalanceProps {
  wallet?: AgentWallet;
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

/**
 * WalletBalance - 钱包余额显示组件
 */
export const WalletBalance: React.FC<WalletBalanceProps> = memo(({
  wallet,
  compact = false,
  showDetails = true,
  className = '',
}) => {
  WalletBalance.displayName = 'WalletBalance';
  const config = useWalletStore((state) => state.config);

  if (!wallet) {
    return (
      <div className={`text-gray-400 dark:text-gray-500 ${className}`}>
        未选择钱包
      </div>
    );
  }

  const statusColors = {
    active: 'bg-green-500',
    frozen: 'bg-yellow-500',
    closed: 'bg-red-500',
  };

  const statusLabels = {
    active: '正常',
    frozen: '已冻结',
    closed: '已关闭',
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-lg">{config.currencySymbol}</span>
        <span className="font-bold text-lg text-gray-900 dark:text-white">
          {wallet.balance.toLocaleString()}
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.currencySymbol}</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {wallet.agentName}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${statusColors[wallet.status]}`} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {statusLabels[wallet.status]}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {wallet.balance.toLocaleString()}
          <span className="text-lg text-gray-500 dark:text-gray-400 ml-1">
            {config.currencyName}
          </span>
        </p>
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-3">
            <p className="text-gray-500 dark:text-gray-400">累计收入</p>
            <p className="text-green-600 dark:text-green-400 font-semibold">
              +{wallet.totalIncome.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-zinc-700/50 rounded-lg p-3">
            <p className="text-gray-500 dark:text-gray-400">累计支出</p>
            <p className="text-red-600 dark:text-red-400 font-semibold">
              -{wallet.totalExpense.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// 交易记录组件
// ============================================================================

interface TransactionItemProps {
  transaction: Transaction;
  currentWalletId?: string;
  className?: string;
}

/**
 * TransactionItem - 单条交易记录
 */
export const TransactionItem: React.FC<TransactionItemProps> = memo(({
  transaction,
  currentWalletId,
  className = '',
}) => {
  const isOutgoing = transaction.fromWalletId === currentWalletId;
  const typeConfig = TRANSACTION_TYPE_CONFIG[transaction.type];
  const statusConfig = TRANSACTION_STATUS_CONFIG[transaction.status];

  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  return (
    <div className={`flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-zinc-700/50 rounded-lg transition-colors ${className}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${typeConfig.color}`}>
        {typeConfig.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">
            {typeConfig.label}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.color}`}>
            {statusConfig.icon} {statusConfig.label}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {isOutgoing ? (
            <>
              发送给 <span className="font-medium">{transaction.toAgentName}</span>
            </>
          ) : (
            <>
              来自 <span className="font-medium">{transaction.fromAgentName}</span>
            </>
          )}
          {transaction.memo && ` · ${transaction.memo}`}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {formatTime(transaction.createdAt)}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${isOutgoing ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {isOutgoing ? '-' : '+'}{transaction.amount.toLocaleString()}
        </p>
        {transaction.fee > 0 && (
          <p className="text-xs text-gray-400">
            手续费 {transaction.fee}
          </p>
        )}
      </div>
    </div>
  );
});

interface TransactionListProps {
  walletId?: string;
  limit?: number;
  className?: string;
}

/**
 * TransactionList - 交易记录列表
 */
export const TransactionList: React.FC<TransactionListProps> = ({
  walletId,
  limit = 10,
  className = '',
}) => {
  const transactions = useWalletStore((state) => state.getTransactions(walletId, limit));

  if (transactions.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
        <p className="text-4xl mb-2">📭</p>
        <p>暂无交易记录</p>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {transactions.map((tx) => (
        <TransactionItem
          key={tx.id}
          transaction={tx}
          currentWalletId={walletId}
        />
      ))}
    </div>
  );
};

// ============================================================================
// 转账表单组件
// ============================================================================

interface TransferFormProps {
  fromAgentId: string;
  onComplete?: (result: { success: boolean; error?: string }) => void;
  className?: string;
}

/**
 * TransferForm - 转账表单组件
 */
export const TransferForm: React.FC<TransferFormProps> = ({
  fromAgentId,
  onComplete,
  className = '',
}) => {
  const wallets = useWallets();
  const { transfer, config } = useWalletStore();

  const [toAgentId, setToAgentId] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fromWallet = wallets.find((w) => w.agentId === fromAgentId);
  const availableWallets = wallets.filter((w) => w.agentId !== fromAgentId);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('请输入有效金额');
      setIsLoading(false);
      return;
    }

    if (!toAgentId) {
      setError('请选择接收方');
      setIsLoading(false);
      return;
    }

    const result = await transfer(fromAgentId, {
      toAgentId,
      amount: amountNum,
      memo: memo || undefined,
    });

    setIsLoading(false);

    if (result.success) {
      setAmount('');
      setMemo('');
      setToAgentId('');
      onComplete?.({ success: true });
    } else {
      setError(result.error ?? '转账失败');
      onComplete?.({ success: false, error: result.error });
    }
  }, [fromAgentId, toAgentId, amount, memo, transfer, onComplete]);

  if (!fromWallet) {
    return (
      <div className={`text-gray-500 dark:text-gray-400 ${className}`}>
        请先选择钱包
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          接收方
        </label>
        <select
          value={toAgentId}
          onChange={(e) => setToAgentId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">选择智能体</option>
          {availableWallets.map((w) => (
            <option key={w.agentId} value={w.agentId}>
              {w.agentName} (余额: {w.balance.toLocaleString()})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          转账金额
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {config.currencySymbol}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={config.minTransferAmount}
            max={config.maxTransferAmount}
            placeholder={`${config.minTransferAmount} - ${config.maxTransferAmount}`}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          当前余额: {fromWallet.balance.toLocaleString()} · 手续费: {(config.transferFeeRate * 100).toFixed(1)}%
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          备注 (可选)
        </label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="转账备注"
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || fromWallet.status === 'frozen'}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
      >
        {isLoading ? '转账中...' : '确认转账'}
      </button>
    </form>
  );
};

// ============================================================================
// 钱包选择器组件
// ============================================================================

interface WalletSelectorProps {
  selectedId?: string;
  onSelect: (walletId: string) => void;
  className?: string;
}

/**
 * WalletSelector - 钱包选择器
 */
export const WalletSelector: React.FC<WalletSelectorProps> = memo(({
  selectedId,
  onSelect,
  className = '',
}) => {
  const wallets = useWallets();

  const handleSelect = useCallback((walletId: string) => {
    onSelect(walletId);
  }, [onSelect]);

  return (
    <div className={`grid gap-2 ${className}`}>
      {wallets.map((w) => (
        <button
          key={w.agentId}
          onClick={() => handleSelect(w.agentId)}
          className={`p-3 rounded-lg border-2 text-left transition-all ${
            selectedId === w.agentId
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900 dark:text-white">
              {w.agentName}
            </span>
            <span className={`text-sm font-semibold ${
              w.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {w.balance.toLocaleString()}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
});

// ============================================================================
// 完整钱包面板组件
// ============================================================================

interface AgentWalletPanelProps {
  agentId?: string;
  showTransfer?: boolean;
  showHistory?: boolean;
  className?: string;
}

/**
 * AgentWalletPanel - 完整的钱包面板
 * 包含余额显示、转账功能、交易历史
 */
export const AgentWalletPanel: React.FC<AgentWalletPanelProps> = ({
  agentId,
  showTransfer = true,
  showHistory = true,
  className = '',
}) => {
  const wallets = useWallets();
  const [selectedId, setSelectedId] = useState(agentId ?? wallets[0]?.agentId);
  const [activeTab, setActiveTab] = useState<'balance' | 'transfer' | 'history'>('balance');

  const selectedWallet = wallets.find((w) => w.agentId === selectedId);

  const handleTabChange = useCallback((tab: 'balance' | 'transfer' | 'history') => {
    setActiveTab(tab);
  }, []);

  const handleWalletSelect = useCallback((walletId: string) => {
    setSelectedId(walletId);
  }, []);

  const handleTransferComplete = useCallback((result: { success: boolean; error?: string }) => {
    if (result.success) {
      setActiveTab('history');
    }
  }, []);

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* 标签栏 */}
      <div className="flex border-b border-gray-200 dark:border-zinc-700">
        <button
          onClick={() => handleTabChange('balance')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'balance'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          💰 余额
        </button>
        {showTransfer && (
          <button
            onClick={() => handleTabChange('transfer')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'transfer'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            🔄 转账
          </button>
        )}
        {showHistory && (
          <button
            onClick={() => handleTabChange('history')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            📜 历史
          </button>
        )}
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {/* 钱包选择 */}
        {wallets.length > 1 && (
          <div className="mb-4">
            <WalletSelector
              selectedId={selectedId}
              onSelect={handleWalletSelect}
            />
          </div>
        )}

        {/* 余额 */}
        {activeTab === 'balance' && (
          <WalletBalance wallet={selectedWallet} showDetails />
        )}

        {/* 转账 */}
        {activeTab === 'transfer' && selectedId && (
          <TransferForm
            fromAgentId={selectedId}
            onComplete={handleTransferComplete}
          />
        )}

        {/* 历史 */}
        {activeTab === 'history' && selectedWallet && (
          <div className="max-h-80 overflow-y-auto">
            <TransactionList walletId={selectedWallet.id} limit={20} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentWalletPanel;