import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '../useNotifications';
import { useNotificationStore } from '@/lib/notifications';

describe('useNotifications', () => {
  beforeEach(() => {
    useNotificationStore.getState().clearAll();
  });

  it('should return push method', () => {
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.push).toBeDefined();
    expect(typeof result.current.push).toBe('function');
  });

  it('should return dismiss method', () => {
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.dismiss).toBeDefined();
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('should return clearAll method', () => {
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.clearAll).toBeDefined();
    expect(typeof result.current.clearAll).toBe('function');
  });

  it('should return shortcut methods', () => {
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.success).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.warning).toBeDefined();
    expect(result.current.info).toBeDefined();
  });

  it('should push notification', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.push({ title: 'Test', type: 'success' });
    });
    
    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].title).toBe('Test');
  });

  it('should dismiss notification', () => {
    vi.useFakeTimers();
    
    const { result } = renderHook(() => useNotifications());
    
    let notificationId: string;
    
    act(() => {
      const notification = result.current.push({ title: 'Test' });
      notificationId = notification.id;
    });
    
    act(() => {
      result.current.dismiss(notificationId!);
    });
    
    expect(result.current.notifications[0].dismissed).toBe(true);
    
    vi.useRealTimers();
  });

  it('should clear all notifications', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.push({ title: 'Test 1' });
      result.current.push({ title: 'Test 2' });
    });
    
    act(() => {
      result.current.clearAll();
    });
    
    expect(result.current.notifications.length).toBe(0);
  });

  it('should create success notification', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.success('Success!', 'Operation completed');
    });
    
    const notification = result.current.notifications[0];
    expect(notification.type).toBe('success');
    expect(notification.title).toBe('Success!');
    expect(notification.message).toBe('Operation completed');
  });

  it('should create error notification', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.error('Error!', 'Something went wrong');
    });
    
    const notification = result.current.notifications[0];
    expect(notification.type).toBe('error');
  });

  it('should create warning notification', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.warning('Warning!', 'Check this');
    });
    
    const notification = result.current.notifications[0];
    expect(notification.type).toBe('warning');
  });

  it('should create info notification', () => {
    const { result } = renderHook(() => useNotifications());
    
    act(() => {
      result.current.info('Info!', 'FYI');
    });
    
    const notification = result.current.notifications[0];
    expect(notification.type).toBe('info');
  });
});