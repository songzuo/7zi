/**
 * Webhook 列表组件
 * 7zi-frontend v1.12.2
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  WebhookSubscription,
  WebhookEventType,
  WEBHOOK_EVENT_TYPE_LABELS,
} from '@/lib/webhook';
import { useWebhooks } from '@/hooks/useWebhooks';
import { WebhookConfigPanel } from './WebhookConfigPanel';

// ==================== 类型定义 ====================

interface WebhookListProps {
  onEdit?: (subscription: WebhookSubscription) => void;
}

// ==================== 组件 ====================

export function WebhookList({ onEdit }: WebhookListProps) {
  const {
    subscriptions,
    isLoading,
    error,
    deleteSubscription,
    batchDeleteSubscriptions,
    batchUpdateStatus,
    testSubscription,
    loadSubscriptions,
  } = useWebhooks();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingSubscription, setEditingSubscription] = useState<WebhookSubscription | undefined>();
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 切换选择
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === subscriptions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(subscriptions.map((s) => s.id));
    }
  }, [selectedIds.length, subscriptions]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;

    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个 Webhook 吗？`)) {
      return;
    }

    try {
      await batchDeleteSubscriptions(selectedIds);
      setSelectedIds([]);
      setTestResult({ success: true, message: '删除成功' });
    } catch (err) {
      setTestResult({ success: false, message: '删除失败' });
    }
  }, [selectedIds, batchDeleteSubscriptions]);

  // 批量启用/禁用
  const handleBatchUpdateStatus = useCallback(async (isActive: boolean) => {
    if (selectedIds.length === 0) return;

    try {
      await batchUpdateStatus(selectedIds, isActive);
      setSelectedIds([]);
      setTestResult({ success: true, message: isActive ? '已启用' : '已禁用' });
    } catch (err) {
      setTestResult({ success: false, message: '操作失败' });
    }
  }, [selectedIds, batchUpdateStatus]);

  // 删除单个
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('确定要删除此 Webhook 吗？')) {
      return;
    }

    try {
      await deleteSubscription(id);
      setTestResult({ success: true, message: '删除成功' });
    } catch (err) {
      setTestResult({ success: false, message: '删除失败' });
    }
  }, [deleteSubscription]);

  // 测试
  const handleTest = useCallback(async (id: string) => {
    setTestingId(id);
    setTestResult(null);

    try {
      const result = await testSubscription(id);
      setTestResult({
        success: result.success,
        message: result.success
          ? `测试成功 (${result.statusCode}) - ${result.duration}ms`
          : `测试失败: ${result.error}`,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : '测试失败',
      });
    } finally {
      setTestingId(null);
    }
  }, [testSubscription]);

  // 编辑
  const handleEdit = useCallback((subscription: WebhookSubscription) => {
    setEditingSubscription(subscription);
    onEdit?.(subscription);
  }, [onEdit]);

  // 保存后刷新
  const handleSave = useCallback(() => {
    setEditingSubscription(undefined);
    setShowCreatePanel(false);
    loadSubscriptions();
  }, [loadSubscriptions]);

  // 获取事件标签
  const getEventLabels = useCallback((events: WebhookEventType[]): string => {
    return events.map((e) => WEBHOOK_EVENT_TYPE_LABELS[e] || e).join(', ');
  }, []);

  // 状态徽章
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || colors.inactive}`}>
        {status === 'active' ? '活跃' : status === 'inactive' ? '未启用' : '错误'}
      </span>
    );
  };

  return (
    <div className="webhook-list">
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Webhook 管理</h2>
        <button
          onClick={() => setShowCreatePanel(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          + 创建 Webhook
        </button>
      </div>

      {/* 批量操作栏 */}
      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
          <span className="text-sm text-blue-700">
            已选择 {selectedIds.length} 个 Webhook
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => handleBatchUpdateStatus(true)}
              className="px-3 py-1 text-sm text-green-700 bg-green-100 hover:bg-green-200 rounded-md"
            >
              启用
            </button>
            <button
              onClick={() => handleBatchUpdateStatus(false)}
              className="px-3 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              禁用
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1 text-sm text-red-700 bg-red-100 hover:bg-red-200 rounded-md"
            >
              删除
            </button>
          </div>
        </div>
      )}

      {/* 测试结果提示 */}
      {testResult && (
        <div
          className={`mb-4 p-3 rounded-md ${
            testResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p
            className={`text-sm ${
              testResult.success ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {testResult.message}
          </p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && subscriptions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无 Webhook，点击上方按钮创建
        </div>
      ) : (
        /* Webhook 列表 */
        <div className="space-y-4">
          {/* 全选 */}
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.length === subscriptions.length}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium">全选</span>
          </label>

          {/* 列表项 */}
          {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="border border-gray-200 rounded-md p-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* 选择框 */}
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(subscription.id)}
                    onChange={() => toggleSelection(subscription.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />

                  {/* 内容 */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {subscription.name}
                      </h3>
                      <StatusBadge status={subscription.status} />
                    </div>

                    {subscription.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {subscription.description}
                      </p>
                    )}

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">URL:</span>
                        <code className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {subscription.url}
                        </code>
                      </div>

                      <div className="flex items-start space-x-2">
                        <span className="text-gray-500">事件:</span>
                        <span className="text-gray-700">
                          {getEventLabels(subscription.events)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">创建时间:</span>
                        <span className="text-gray-700">
                          {new Date(subscription.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>

                      {subscription.lastSuccessAt && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">上次成功:</span>
                          <span className="text-green-600">
                            {new Date(subscription.lastSuccessAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      )}

                      {subscription.lastErrorAt && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">上次失败:</span>
                          <span className="text-red-600">
                            {new Date(subscription.lastErrorAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => handleEdit(subscription)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleTest(subscription.id)}
                    disabled={testingId === subscription.id}
                    className="px-3 py-1 text-sm text-green-600 hover:text-green-800 border border-green-300 rounded-md disabled:opacity-50"
                  >
                    {testingId === subscription.id ? '测试中...' : '测试'}
                  </button>
                  <button
                    onClick={() => handleDelete(subscription.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建面板 */}
      {showCreatePanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <WebhookConfigPanel
              mode="create"
              onClose={() => setShowCreatePanel(false)}
              onSave={handleSave}
            />
          </div>
        </div>
      )}

      {/* 编辑面板 */}
      {editingSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <WebhookConfigPanel
              subscription={editingSubscription}
              mode="edit"
              onClose={() => setEditingSubscription(undefined)}
              onSave={handleSave}
            />
          </div>
        </div>
      )}
    </div>
  );
}