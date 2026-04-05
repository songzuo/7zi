/**
 * Webhook 配置面板组件
 * 7zi-frontend v1.12.2
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  WebhookSubscription,
  CreateWebhookInput,
  WebhookEventType,
  WEBHOOK_EVENT_TYPE_LABELS,
} from '@/lib/webhook';
import { useWebhooks, useWebhookEventTypes } from '@/hooks/useWebhooks';

// ==================== 类型定义 ====================

interface WebhookConfigPanelProps {
  subscription?: WebhookSubscription;
  onClose?: () => void;
  onSave?: (subscription: WebhookSubscription) => void;
  mode?: 'create' | 'edit';
}

interface EventCategory {
  name: string;
  events: WebhookEventType[];
}

// ==================== 组件 ====================

export function WebhookConfigPanel({
  subscription,
  onClose,
  onSave,
  mode = 'create',
}: WebhookConfigPanelProps) {
  const { eventTypes, getEventLabel, getEventsByCategory } = useWebhookEventTypes();
  const { createSubscription, updateSubscription, isLoading } = useWebhooks();

  // 表单状态
  const [name, setName] = useState(subscription?.name || '');
  const [description, setDescription] = useState(subscription?.description || '');
  const [url, setUrl] = useState(subscription?.url || '');
  const [secret, setSecret] = useState(subscription?.secret || '');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>(
    subscription?.events || []
  );
  const [isActive, setIsActive] = useState(subscription?.isActive ?? true);
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 生成新密钥
  const generateNewSecret = useCallback(() => {
    const bytes = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
      const secret = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      setSecret(secret);
    }
  }, []);

  // 事件分类
  const categories: EventCategory[] = [
    { name: '工作流事件', events: getEventsByCategory().workflow },
    { name: '节点执行事件', events: getEventsByCategory().workflow.filter((e) => e.includes('node')) },
    { name: '告警事件', events: getEventsByCategory().alert },
    { name: '监控事件', events: getEventsByCategory().monitoring },
    { name: '自定义事件', events: getEventsByCategory().custom },
  ];

  // 切换事件选择
  const toggleEvent = useCallback((eventType: WebhookEventType) => {
    setSelectedEvents((prev) =>
      prev.includes(eventType)
        ? prev.filter((e) => e !== eventType)
        : [...prev, eventType]
    );
  }, []);

  // 全选/取消全选
  const toggleAllEvents = useCallback((categoryEvents: WebhookEventType[]) => {
    const allSelected = categoryEvents.every((e) => selectedEvents.includes(e));
    setSelectedEvents((prev) => {
      if (allSelected) {
        return prev.filter((e) => !categoryEvents.includes(e));
      } else {
        const newEvents = [...prev];
        categoryEvents.forEach((e) => {
          if (!newEvents.includes(e)) {
            newEvents.push(e);
          }
        });
        return newEvents;
      }
    });
  }, [selectedEvents]);

  // 验证表单
  const validateForm = useCallback((): boolean => {
    setError(null);

    if (!name.trim()) {
      setError('请输入 Webhook 名称');
      return false;
    }

    if (!url.trim()) {
      setError('请输入 Webhook URL');
      return false;
    }

    try {
      new URL(url);
    } catch {
      setError('请输入有效的 URL');
      return false;
    }

    if (selectedEvents.length === 0) {
      setError('请至少选择一个事件类型');
      return false;
    }

    return true;
  }, [name, url, selectedEvents]);

  // 保存
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setError(null);

    try {
      let savedSubscription: WebhookSubscription;

      if (mode === 'create') {
        const input: CreateWebhookInput = {
          name: name.trim(),
          description: description.trim(),
          url: url.trim(),
          secret: secret || undefined,
          events: selectedEvents,
          isActive,
        };
        savedSubscription = await createSubscription(input);
      } else {
        if (!subscription) {
          setError('订阅不存在');
          return;
        }

        const input = {
          name: name.trim(),
          description: description.trim(),
          url: url.trim(),
          secret: secret || undefined,
          events: selectedEvents,
          isActive,
        };
        savedSubscription = await updateSubscription(subscription.id, input);
      }

      onSave?.(savedSubscription);
      onClose?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      setError(message);
    }
  }, [name, description, url, secret, selectedEvents, isActive, mode, subscription, validateForm, createSubscription, updateSubscription, onSave, onClose]);

  // 复制密钥到剪贴板
  const copySecretToClipboard = useCallback(async () => {
    if (!secret) return;

    try {
      await navigator.clipboard.writeText(secret);
      alert('密钥已复制到剪贴板');
    } catch {
      alert('复制失败，请手动复制');
    }
  }, [secret]);

  return (
    <div className="webhook-config-panel">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          {mode === 'create' ? '创建 Webhook' : '编辑 Webhook'}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 表单 */}
      <div className="space-y-4">
        {/* 名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            名称 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：工作流完成通知"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简要描述此 Webhook 的用途"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            回调 URL *
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            接收 Webhook 请求的 HTTPS 端点
          </p>
        </div>

        {/* 密钥 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            签名密钥
          </label>
          <div className="flex space-x-2">
            <input
              type={showSecret ? 'text' : 'password'}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="留空自动生成"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowSecret((prev) => !prev)}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
            >
              {showSecret ? '隐藏' : '显示'}
            </button>
            {mode === 'create' && (
              <button
                type="button"
                onClick={generateNewSecret}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md"
              >
                生成
              </button>
            )}
            {secret && (
              <button
                type="button"
                onClick={copySecretToClipboard}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
              >
                复制
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            用于 HMAC-SHA256 签名验证，保护请求安全
          </p>
        </div>

        {/* 事件类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            订阅事件 *
          </label>
          <div className="space-y-3">
            {categories.map((category) => {
              const allSelected = category.events.every((e) =>
                selectedEvents.includes(e)
              );

              return (
                <div key={category.name} className="border border-gray-200 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">
                      {category.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleAllEvents(category.events)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {allSelected ? '取消全选' : '全选'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {category.events.map((eventType) => {
                      const isSelected = selectedEvents.includes(eventType);
                      return (
                        <label
                          key={eventType}
                          className="flex items-center space-x-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEvent(eventType)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={isSelected ? 'text-gray-900' : 'text-gray-500'}>
                            {getEventLabel(eventType)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 启用开关 */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            启用此 Webhook
          </label>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end space-x-3 mt-6">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
          >
            取消
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
        >
          {isLoading ? '保存中...' : mode === 'create' ? '创建' : '保存'}
        </button>
      </div>
    </div>
  );
}
