/**
 * Notification Store 测试
 *
 * 测试目标:
 * - 通知添加/删除
 * - 未读计数
 * - 自动消失机制
 * - 快捷方法
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotificationStore } from '../notification-store';

describe('useNotificationStore', () => {
  beforeEach(() => {
    // 重置 Store 状态
    useNotificationStore.getState().clearAll();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useNotificationStore());

      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.maxNotifications).toBe(100);
    });
  });

  describe('添加通知', () => {
    it('应该能添加成功通知', () => {
      const { result } = renderHook(() => useNotificationStore());

      let notificationId: string = '';

      act(() => {
        notificationId = result.current.success('成功标题', '成功消息');
      });

      expect(notificationId).toBeTruthy();
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('success');
      expect(result.current.notifications[0].title).toBe('成功标题');
      expect(result.current.notifications[0].message).toBe('成功消息');
      expect(result.current.notifications[0].read).toBe(false);
      expect(result.current.unreadCount).toBe(1);
    });

    it('应该能添加错误通知', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.error('错误标题', '错误消息');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');
      expect(result.current.unreadCount).toBe(1);
    });

    it('应该能添加警告通知', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.warning('警告标题', '警告消息');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('warning');
    });

    it('应该能添加信息通知', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.info('信息标题', '信息消息');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('info');
    });

    it('应该能添加自定义持续时间的通知', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.success('标题', '消息', 1000);
      });

      expect(result.current.notifications[0].duration).toBe(1000);
    });
  });

  describe('删除通知', () => {
    it('应该能删除指定通知', () => {
      const { result } = renderHook(() => useNotificationStore());

      let notificationId: string = '';

      act(() => {
        notificationId = result.current.success('标题', '消息');
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        result.current.removeNotification(notificationId);
      });

      expect(result.current.notifications).toHaveLength(0);
      expect(result.current.unreadCount).toBe(0);
    });

    it('应该能清除所有通知', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.success('标题1', '消息1');
        result.current.error('标题2', '消息2');
        result.current.warning('标题3', '消息3');
      });

      expect(result.current.notifications).toHaveLength(3);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.notifications).toHaveLength(0);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('标记已读', () => {
    it('应该能标记单个通知为已读', () => {
      const { result } = renderHook(() => useNotificationStore());

      let notificationId: string = '';

      act(() => {
        notificationId = result.current.success('标题', '消息');
      });

      expect(result.current.unreadCount).toBe(1);

      act(() => {
        result.current.markAsRead(notificationId);
      });

      expect(result.current.notifications[0].read).toBe(true);
      expect(result.current.unreadCount).toBe(0);
    });

    it('应该能标记所有通知为已读', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.success('标题1', '消息1');
        result.current.error('标题2', '消息2');
        result.current.warning('标题3', '消息3');
      });

      expect(result.current.unreadCount).toBe(3);

      act(() => {
        result.current.markAllAsRead();
      });

      expect(result.current.unreadCount).toBe(0);
      result.current.notifications.forEach((n) => {
        expect(n.read).toBe(true);
      });
    });
  });

  describe('过滤通知', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.success('成功', '成功消息');
        result.current.error('错误', '错误消息');
        result.current.warning('警告', '警告消息');
        result.current.info('信息', '信息消息');
      });
    });

    it('应该能按类型过滤', () => {
      const { result } = renderHook(() => useNotificationStore());

      const successNotifications = result.current.getFilteredNotifications({
        type: 'success',
      });

      expect(successNotifications).toHaveLength(1);
      expect(successNotifications[0].type).toBe('success');
    });

    it('应该能按已读状态过滤', () => {
      const { result } = renderHook(() => useNotificationStore());

      // 标记一个为已读
      act(() => {
        result.current.markAsRead(result.current.notifications[0].id);
      });

      const unreadNotifications = result.current.getFilteredNotifications({
        read: false,
      });

      expect(unreadNotifications).toHaveLength(3);
    });

    it('应该能按搜索关键词过滤', () => {
      const { result } = renderHook(() => useNotificationStore());

      const filtered = result.current.getFilteredNotifications({
        search: '成功',
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('成功');
    });
  });

  describe('自动消失', () => {
    it('应该在指定时间后自动消失', async () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.success('标题', '消息', 100); // 100ms 后消失
      });

      expect(result.current.notifications).toHaveLength(1);

      // 等待自动消失
      await waitFor(
        () => {
          expect(result.current.notifications).toHaveLength(0);
        },
        { timeout: 200 }
      );
    });
  });

  describe('最大通知数量限制', () => {
    it('应该限制最大通知数量', () => {
      const { result } = renderHook(() => useNotificationStore());

      // 添加超过最大数量的通知
      act(() => {
        for (let i = 0; i < 150; i++) {
          result.current.success(`标题 ${i}`, `消息 ${i}`);
        }
      });

      expect(result.current.notifications.length).toBeLessThanOrEqual(100);
    });
  });

  describe('选择器', () => {
    it('选择器应该返回正确的状态切片', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.success('标题', '消息');
        result.current.error('错误', '错误消息');
      });

      const notifications = result.current.notifications;
      const unreadCount = result.current.unreadCount;

      expect(notifications).toHaveLength(2);
      expect(unreadCount).toBe(2);
    });
  });
});
