/**
 * Webhook React Hooks
 * 7zi-frontend v1.12.2
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  webhookManager,
  WebhookSubscription,
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookEventType,
  WebhookLog,
  WebhookLogLevel,
  TestEventResult,
  WEBHOOK_EVENT_TYPE_LABELS,
} from '@/lib/webhook';
import type { WebhookDelivery } from '@/lib/webhook';

// ==================== 主 Hook ====================

/**
 * Webhook 管理主 Hook
 */
export function useWebhooks() {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载订阅列表
  const loadSubscriptions = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const subs = webhookManager.getAllSubscriptions();
      setSubscriptions(subs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 加载日志
  const loadLogs = useCallback((
    subscriptionId?: string,
    deliveryId?: string,
    level?: WebhookLogLevel,
    limit: number = 100
  ) => {
    try {
      const logData = webhookManager.getLogs(subscriptionId, deliveryId, level, limit);
      setLogs(logData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    }
  }, []);

  // 创建订阅
  const createSubscription = useCallback(async (input: CreateWebhookInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const subscription = await webhookManager.createSubscription(input);
      setSubscriptions((prev) => [...prev, subscription]);
      return subscription;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create subscription';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 更新订阅
  const updateSubscription = useCallback(async (
    subscriptionId: string,
    input: UpdateWebhookInput
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const subscription = await webhookManager.updateSubscription(subscriptionId, input);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subscriptionId ? subscription : s))
      );
      return subscription;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update subscription';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 删除订阅
  const deleteSubscription = useCallback(async (subscriptionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const success = await webhookManager.deleteSubscription(subscriptionId);
      if (success) {
        setSubscriptions((prev) => prev.filter((s) => s.id !== subscriptionId));
      }
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete subscription';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 批量删除订阅
  const batchDeleteSubscriptions = useCallback(async (subscriptionIds: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await webhookManager.batchDeleteSubscriptions(subscriptionIds);
      setSubscriptions((prev) =>
        prev.filter((s) => !result.deleted.includes(s.id))
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to batch delete subscriptions';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 批量更新状态
  const batchUpdateStatus = useCallback(async (
    subscriptionIds: string[],
    isActive: boolean
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await webhookManager.batchUpdateStatus(subscriptionIds, isActive);
      setSubscriptions((prev) =>
        prev.map((s) => {
          const updatedSub = updated.find((u) => u.id === s.id);
          return updatedSub || s;
        })
      );
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to batch update status';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 测试订阅
  const testSubscription = useCallback(async (subscriptionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await webhookManager.testSubscription(subscriptionId);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to test subscription';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  return {
    subscriptions,
    logs,
    isLoading,
    error,
    loadSubscriptions,
    loadLogs,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    batchDeleteSubscriptions,
    batchUpdateStatus,
    testSubscription,
  };
}

// ==================== 单个订阅 Hook ====================

/**
 * 单个 Webhook 订阅 Hook
 */
export function useWebhookSubscription(subscriptionId: string | undefined) {
  const [subscription, setSubscription] = useState<WebhookSubscription | undefined>();
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载订阅
  const loadSubscription = useCallback(() => {
    if (!subscriptionId) return;

    setIsLoading(true);
    setError(null);
    try {
      const sub = webhookManager.getSubscription(subscriptionId);
      setSubscription(sub);

      // 加载交付记录
      if (sub) {
        const dels = webhookManager.deliveryService.getDeliveriesBySubscription(subscriptionId);
        setDeliveries(dels);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionId]);

  // 更新订阅
  const updateSubscription = useCallback(async (input: UpdateWebhookInput) => {
    if (!subscriptionId) throw new Error('Subscription ID is required');

    setIsLoading(true);
    setError(null);
    try {
      const updated = await webhookManager.updateSubscription(subscriptionId, input);
      setSubscription(updated);
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update subscription';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionId]);

  // 删除订阅
  const deleteSubscription = useCallback(async () => {
    if (!subscriptionId) throw new Error('Subscription ID is required');

    setIsLoading(true);
    setError(null);
    try {
      const success = await webhookManager.deleteSubscription(subscriptionId);
      if (success) {
        setSubscription(undefined);
        setDeliveries([]);
      }
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete subscription';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionId]);

  // 测试订阅
  const testSubscription = useCallback(async () => {
    if (!subscriptionId) throw new Error('Subscription ID is required');

    setIsLoading(true);
    setError(null);
    try {
      const result = await webhookManager.testSubscription(subscriptionId);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to test subscription';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionId]);

  // 初始加载
  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  return {
    subscription,
    deliveries,
    isLoading,
    error,
    loadSubscription,
    updateSubscription,
    deleteSubscription,
    testSubscription,
  };
}

// ==================== 日志 Hook ====================

/**
 * Webhook 日志 Hook
 */
export function useWebhookLogs(
  subscriptionId?: string,
  deliveryId?: string,
  level?: WebhookLogLevel,
  limit: number = 100
) {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = useCallback(() => {
    setIsLoading(true);
    try {
      const logData = webhookManager.getLogs(subscriptionId, deliveryId, level, limit);
      setLogs(logData);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionId, deliveryId, level, limit]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return {
    logs,
    isLoading,
    loadLogs,
  };
}

// ==================== 事件类型 Hook ====================

/**
 * Webhook 事件类型 Hook
 */
export function useWebhookEventTypes() {
  const [eventTypes] = useState<WebhookEventType[]>([
    // 工作流事件
    'workflow.started',
    'workflow.completed',
    'workflow.failed',
    'workflow.paused',
    'workflow.resumed',
    'workflow.cancelled',
    // 节点执行事件
    'workflow.node.executed',
    'workflow.node.started',
    'workflow.node.completed',
    'workflow.node.failed',
    // 告警事件
    'alert.triggered',
    'alert.resolved',
    'alert.escalated',
    // 监控事件
    'monitoring.threshold.exceeded',
    'monitoring.service.down',
    // 自定义事件
    'custom.event',
  ]);

  const getEventLabel = useCallback((type: WebhookEventType): string => {
    return WEBHOOK_EVENT_TYPE_LABELS[type] || type;
  }, []);

  const getEventsByCategory = useCallback(() => {
    return {
      workflow: eventTypes.filter((t) => t.startsWith('workflow.')),
      alert: eventTypes.filter((t) => t.startsWith('alert.')),
      monitoring: eventTypes.filter((t) => t.startsWith('monitoring.')),
      custom: eventTypes.filter((t) => t.startsWith('custom.')),
    };
  }, [eventTypes]);

  return {
    eventTypes,
    getEventLabel,
    getEventsByCategory,
  };
}

// ==================== 测试 Hook ====================

/**
 * Webhook 测试 Hook
 */
export function useWebhookTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestEventResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testSubscription = useCallback(async (subscriptionId: string) => {
    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const result = await webhookManager.testSubscription(subscriptionId);
      setTestResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed';
      setError(message);
      throw err;
    } finally {
      setIsTesting(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setTestResult(null);
    setError(null);
  }, []);

  return {
    isTesting,
    testResult,
    error,
    testSubscription,
    clearResult,
  };
}