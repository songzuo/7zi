import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationToast } from '../../components/NotificationToast';
import { useNotificationStore } from '../index';

describe('Notification Store', () => {
  beforeEach(() => {
    // 清空 store
    useNotificationStore.getState().clearAll();
  });

  describe('push', () => {
    it('should add notification to store', () => {
      const { push, notifications } = useNotificationStore.getState();
      
      push({ title: 'Test', type: 'success' });
      
      expect(useNotificationStore.getState().notifications.length).toBe(1);
    });
  });

  describe('dismiss', () => {
    it('should dismiss notification', () => {
      const { push, dismiss, notifications } = useNotificationStore.getState();
      
      const notification = push({ title: 'Test' });
      dismiss(notification.id);
      
      const currentNotifications = useNotificationStore.getState().notifications;
      expect(currentNotifications[0].dismissed).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should remove all notifications', () => {
      const { push, clearAll } = useNotificationStore.getState();
      
      push({ title: 'Test 1' });
      push({ title: 'Test 2' });
      clearAll();
      
      expect(useNotificationStore.getState().notifications.length).toBe(0);
    });
  });

  describe('shortcut methods', () => {
    it('success() should create success notification', () => {
      const { success } = useNotificationStore.getState();
      
      const notification = success('Success!');
      
      expect(notification.type).toBe('success');
    });

    it('error() should create error notification', () => {
      const { error } = useNotificationStore.getState();
      
      const notification = error('Error!');
      
      expect(notification.type).toBe('error');
    });

    it('warning() should create warning notification', () => {
      const { warning } = useNotificationStore.getState();
      
      const notification = warning('Warning!');
      
      expect(notification.type).toBe('warning');
    });

    it('info() should create info notification', () => {
      const { info } = useNotificationStore.getState();
      
      const notification = info('Info!');
      
      expect(notification.type).toBe('info');
    });
  });
});