import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  NotificationManager, 
  notificationManager,
  Notification,
  NotificationOptions 
} from '../NotificationManager';

describe('NotificationManager', () => {
  let manager: NotificationManager;

  beforeEach(() => {
    manager = new NotificationManager();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('push', () => {
    it('should add a notification', () => {
      const notification = manager.push({ title: 'Test', message: 'Test message' });
      
      expect(notification.id).toBeDefined();
      expect(notification.title).toBe('Test');
      expect(notification.message).toBe('Test message');
      expect(notification.type).toBe('info'); // default type
      expect(notification.dismissed).toBe(false);
    });

    it('should add notification with custom type', () => {
      const notification = manager.push({ title: 'Success', type: 'success' });
      
      expect(notification.type).toBe('success');
    });

    it('should add notification to the beginning of list', () => {
      manager.push({ title: 'First' });
      manager.push({ title: 'Second' });
      
      const notifications = manager.getAll();
      expect(notifications[0].title).toBe('Second');
      expect(notifications[1].title).toBe('First');
    });

    it('should limit max notifications to 5', () => {
      for (let i = 0; i < 10; i++) {
        manager.push({ title: `Notification ${i}` });
      }
      
      const notifications = manager.getAll();
      expect(notifications.length).toBe(5);
    });

    it('should use custom duration', () => {
      const notification = manager.push({ title: 'Test', duration: 10000 });
      
      expect(notification.duration).toBe(10000);
    });

    it('should use default duration if not specified', () => {
      const notification = manager.push({ title: 'Test' });
      
      expect(notification.duration).toBe(5000);
    });
  });

  describe('dismiss', () => {
    it('should mark notification as dismissed', () => {
      vi.useFakeTimers();
      
      const notification = manager.push({ title: 'Test', duration: 0 });
      manager.dismiss(notification.id);
      
      expect(notification.dismissed).toBe(true);
      
      vi.useRealTimers();
    });

    it('should remove notification after delay', () => {
      vi.useFakeTimers();
      
      const notification = manager.push({ title: 'Test', duration: 0 });
      manager.dismiss(notification.id);
      
      // 快进 300ms
      vi.advanceTimersByTime(300);
      
      const notifications = manager.getAll();
      expect(notifications.find(n => n.id === notification.id)).toBeUndefined();
      
      vi.useRealTimers();
    });

    it('should not dismiss already dismissed notification', () => {
      vi.useFakeTimers();
      
      const notification = manager.push({ title: 'Test', duration: 0 });
      manager.dismiss(notification.id);
      
      // 再次调用 dismiss
      manager.dismiss(notification.id);
      
      const notifications = manager.getAll();
      expect(notifications.length).toBe(0);
      
      vi.useRealTimers();
    });
  });

  describe('clearAll', () => {
    it('should remove all notifications', () => {
      manager.push({ title: 'Test 1' });
      manager.push({ title: 'Test 2' });
      manager.push({ title: 'Test 3' });
      
      manager.clearAll();
      
      expect(manager.getAll().length).toBe(0);
    });
  });

  describe('subscribe', () => {
    it('should call listener when notification is added', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      
      manager.push({ title: 'Test' });
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should call listener when notification is dismissed', () => {
      vi.useFakeTimers();
      
      const listener = vi.fn();
      manager.subscribe(listener);
      
      const notification = manager.push({ title: 'Test', duration: 0 });
      manager.dismiss(notification.id);
      
      expect(listener).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);
      
      unsubscribe();
      manager.push({ title: 'Test' });
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('shortcut methods', () => {
    it('success() should create success notification', () => {
      const notification = manager.success('Success!', 'Operation completed');
      
      expect(notification.type).toBe('success');
      expect(notification.title).toBe('Success!');
      expect(notification.message).toBe('Operation completed');
    });

    it('error() should create error notification with longer duration', () => {
      const notification = manager.error('Error!', 'Something went wrong');
      
      expect(notification.type).toBe('error');
      expect(notification.duration).toBe(8000);
    });

    it('warning() should create warning notification', () => {
      const notification = manager.warning('Warning!', 'Check this');
      
      expect(notification.type).toBe('warning');
    });

    it('info() should create info notification', () => {
      const notification = manager.info('Info!', 'FYI');
      
      expect(notification.type).toBe('info');
    });
  });

  describe('auto-dismiss', () => {
    it('should auto-dismiss notification after duration', () => {
      vi.useFakeTimers();
      
      manager.push({ title: 'Test', duration: 1000 });
      
      expect(manager.getAll().length).toBe(1);
      
      vi.advanceTimersByTime(1000);
      
      // dismissed 标记已设置
      expect(manager.getAll()[0].dismissed).toBe(true);
      
      vi.useRealTimers();
    });

    it('should not auto-dismiss if duration is 0', () => {
      vi.useFakeTimers();
      
      manager.push({ title: 'Test', duration: 0 });
      
      vi.advanceTimersByTime(10000);
      
      expect(manager.getAll()[0].dismissed).toBe(false);
      
      vi.useRealTimers();
    });
  });
});

describe('notificationManager (singleton)', () => {
  it('should be a NotificationManager instance', () => {
    expect(notificationManager).toBeInstanceOf(NotificationManager);
  });
});