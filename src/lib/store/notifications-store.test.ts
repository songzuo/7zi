/**
 * @fileoverview 通知存储测试
 * @module lib/store/notifications-store.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getNotificationsStore, resetNotificationsStore } from './notifications-store';
import { Notification } from '@/lib/types/notification-types';

describe('NotificationsStore', () => {
  let store: ReturnType<typeof getNotificationsStore>;

  beforeEach(() => {
    resetNotificationsStore();
    store = getNotificationsStore();
  });

  describe('getAll', () => {
    it('should return all notifications', () => {
      const notifications = store.getAll();
      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  describe('find', () => {
    it('should return notification by id', () => {
      const notification = store.find(n => n.id === 'notif-001');
      expect(notification).toBeDefined();
      expect(notification?.title).toBe('新任务分配');
    });

    it('should return undefined for non-existent id', () => {
      const notification = store.find(n => n.id === 'non-existent');
      expect(notification).toBeUndefined();
    });
  });

  describe('add', () => {
    it('should add new notification', () => {
      const initialCount = store.count();
      
      store.add({
        id: 'new-notif',
        type: 'task_completed',
        title: '任务完成',
        message: '任务已完成',
        read: false,
        createdAt: new Date().toISOString(),
        userId: 'user-001',
        priority: 'medium',
      });

      expect(store.count()).toBe(initialCount + 1);
      expect(store.find(n => n.id === 'new-notif')).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update notification', () => {
      const updated = store.update(n => n.id === 'notif-001', n => ({
        ...n,
        title: 'Updated Title',
        read: true,
      }));

      expect(updated).toBe(true);
      const notification = store.find(n => n.id === 'notif-001');
      expect(notification?.title).toBe('Updated Title');
      expect(notification?.read).toBe(true);
    });

    it('should return false for non-existent notification', () => {
      const updated = store.update(n => n.id === 'non-existent', n => ({ ...n, title: 'Test' }));
      expect(updated).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete notification', () => {
      const initialCount = store.count();
      const result = store.delete(n => n.id === 'notif-001');

      expect(result).toBe(true);
      expect(store.count()).toBe(initialCount - 1);
      expect(store.find(n => n.id === 'notif-001')).toBeUndefined();
    });

    it('should return false for non-existent notification', () => {
      const result = store.delete(n => n.id === 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('filter', () => {
    it('should filter by read status', () => {
      const unread = store.filter(n => !n.read);
      expect(unread.every(n => !n.read)).toBe(true);
    });

    it('should filter by userId', () => {
      const userNotifications = store.filter(n => n.userId === 'user-001');
      expect(userNotifications.every(n => n.userId === 'user-001')).toBe(true);
    });

    it('should filter by priority', () => {
      const highPriority = store.filter(n => n.priority === 'high');
      expect(highPriority.every(n => n.priority === 'high')).toBe(true);
    });
  });

  describe('count', () => {
    it('should return correct count', () => {
      expect(store.count()).toBe(store.getAll().length);
    });
  });

  describe('clear', () => {
    it('should clear all notifications', () => {
      store.clear();
      expect(store.getAll().length).toBe(0);
    });
  });
});
