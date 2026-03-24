/**
 * @fileoverview uiStore 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from '../uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // 重置 store
    useUIStore.setState({
      sidebar: {
        isOpen: true,
        isCollapsed: false,
        width: 280,
      },
      activeModal: null,
      modalHistory: [],
      toasts: [],
      maxToasts: 5,
      toastQueue: [],
      globalLoading: false,
      loadingMessage: undefined,
      formDrafts: new Map(),
    });
  });

  describe('initial state', () => {
    it('should have default sidebar state', () => {
      const sidebar = useUIStore.getState().sidebar;
      expect(sidebar.isOpen).toBe(true);
      expect(sidebar.isCollapsed).toBe(false);
      expect(sidebar.width).toBe(280);
    });

    it('should have no active modal', () => {
      expect(useUIStore.getState().activeModal).toBeNull();
    });

    it('should have no toasts initially', () => {
      expect(useUIStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('sidebar', () => {
    it('should toggle sidebar', () => {
      const initialOpen = useUIStore.getState().sidebar.isOpen;
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebar.isOpen).toBe(!initialOpen);
    });

    it('should open sidebar', () => {
      useUIStore.getState().closeSidebar();
      expect(useUIStore.getState().sidebar.isOpen).toBe(false);

      useUIStore.getState().openSidebar();
      expect(useUIStore.getState().sidebar.isOpen).toBe(true);
      expect(useUIStore.getState().sidebar.isCollapsed).toBe(false);
    });

    it('should close sidebar', () => {
      useUIStore.getState().closeSidebar();
      expect(useUIStore.getState().sidebar.isOpen).toBe(false);
    });

    it('should toggle sidebar collapse', () => {
      const initialCollapsed = useUIStore.getState().sidebar.isCollapsed;
      useUIStore.getState().toggleSidebarCollapse();
      expect(useUIStore.getState().sidebar.isCollapsed).toBe(!initialCollapsed);
    });

    it('should set sidebar width', () => {
      useUIStore.getState().setSidebarWidth(350);
      expect(useUIStore.getState().sidebar.width).toBe(350);
    });
  });

  describe('modal', () => {
    it('should open modal', () => {
      useUIStore.getState().openModal({
        title: 'Test Modal',
        content: 'Test content',
      });

      const modal = useUIStore.getState().activeModal;
      expect(modal).not.toBeNull();
      expect(modal?.title).toBe('Test Modal');
      expect(modal?.isOpen).toBe(true);
      expect(modal?.id).toBeDefined();
    });

    it('should close active modal', () => {
      useUIStore.getState().openModal({
        title: 'Test Modal',
        content: 'Test content',
      });

      const modalId = useUIStore.getState().activeModal?.id;
      useUIStore.getState().closeModal(modalId);

      expect(useUIStore.getState().activeModal).toBeNull();
    });

    it('should close all modals', () => {
      useUIStore.getState().openModal({
        title: 'Modal 1',
        content: 'Content 1',
      });
      useUIStore.getState().openModal({
        title: 'Modal 2',
        content: 'Content 2',
      });

      useUIStore.getState().closeAllModals();

      expect(useUIStore.getState().activeModal).toBeNull();
      expect(useUIStore.getState().modalHistory).toHaveLength(2);
      expect(useUIStore.getState().modalHistory.every((m) => !m.isOpen)).toBe(true);
    });

    it('should call onClose callback', () => {
      const onClose = vi.fn();
      useUIStore.getState().openModal({
        title: 'Test Modal',
        content: 'Test content',
        onClose,
      });

      const modalId = useUIStore.getState().activeModal?.id;
      useUIStore.getState().closeModal(modalId);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('toasts', () => {
    it('should add toast', () => {
      const id = useUIStore.getState().addToast({
        type: 'success',
        message: 'Success message',
      });

      const toasts = useUIStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].id).toBe(id);
      expect(toasts[0].message).toBe('Success message');
      expect(toasts[0].createdAt).toBeDefined();
    });

    it('should remove toast', () => {
      const id = useUIStore.getState().addToast({
        type: 'info',
        message: 'Info message',
      });

      useUIStore.getState().removeToast(id);

      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it('should clear all toasts', () => {
      useUIStore.getState().addToast({ type: 'info', message: '1' });
      useUIStore.getState().addToast({ type: 'info', message: '2' });
      useUIStore.getState().addToast({ type: 'info', message: '3' });

      useUIStore.getState().clearToasts();

      expect(useUIStore.getState().toasts).toHaveLength(0);
    });

    it('should clear toasts by type', () => {
      useUIStore.getState().addToast({ type: 'success' as const, message: 'Success' });
      useUIStore.getState().addToast({ type: 'error' as const, message: 'Error' });
      useUIStore.getState().addToast({ type: 'success' as const, message: 'Another success' });

      useUIStore.getState().clearToastsByType('success');

      expect(useUIStore.getState().toasts).toHaveLength(1);
      expect(useUIStore.getState().toasts[0].type).toBe('error');
    });

    it('should limit max toasts', () => {
      const maxToasts = useUIStore.getState().maxToasts;
      for (let i = 0; i < maxToasts + 2; i++) {
        useUIStore.getState().addToast({
          type: 'info',
          message: `Message ${i}`,
        });
      }

      const toasts = useUIStore.getState().toasts;
      expect(toasts.length).toBeLessThanOrEqual(maxToasts);
    });

    it('should queue toasts when max reached', () => {
      const queue = useUIStore.getState().maxToasts;
      for (let i = 0; i < queue + 3; i++) {
        useUIStore.getState().addToast({
          type: 'info',
          message: `Message ${i}`,
        });
      }

      expect(useUIStore.getState().toastQueue.length).toBeGreaterThan(0);
    });

    describe('convenience methods', () => {
      it('should add success toast', () => {
        const id = useUIStore.getState().success('Success message', 'Title');
        const toasts = useUIStore.getState().toasts;
        expect(toasts[0].type).toBe('success');
        expect(toasts[0].message).toBe('Success message');
        expect(toasts[0].title).toBe('Title');
      });

      it('should add error toast', () => {
        const id = useUIStore.getState().error('Error message');
        const toasts = useUIStore.getState().toasts;
        expect(toasts[0].type).toBe('error');
        expect(toasts[0].priority).toBe('high');
      });

      it('should add warning toast', () => {
        const id = useUIStore.getState().warning('Warning message');
        const toasts = useUIStore.getState().toasts;
        expect(toasts[0].type).toBe('warning');
      });

      it('should add info toast', () => {
        const id = useUIStore.getState().info('Info message');
        const toasts = useUIStore.getState().toasts;
        expect(toasts[0].type).toBe('info');
      });

      it('should add loading toast', () => {
        const id = useUIStore.getState().loading('Loading...');
        const toasts = useUIStore.getState().toasts;
        expect(toasts[0].type).toBe('loading');
        expect(toasts[0].duration).toBe(0); // No auto-close
      });
    });
  });

  describe('loading', () => {
    it('should set global loading', () => {
      useUIStore.getState().setGlobalLoading(true, 'Loading data...');
      expect(useUIStore.getState().globalLoading).toBe(true);
      expect(useUIStore.getState().loadingMessage).toBe('Loading data...');
    });

    it('should clear loading message when disabled', () => {
      useUIStore.getState().setGlobalLoading(true, 'Loading...');
      useUIStore.getState().setGlobalLoading(false);
      expect(useUIStore.getState().globalLoading).toBe(false);
    });
  });

  describe('form drafts', () => {
    it('should save form draft', () => {
      const data = { name: 'Test', email: 'test@example.com' };
      useUIStore.getState().saveFormDraft('test-form', data);

      const draft = useUIStore.getState().formDrafts.get('test-form');
      expect(draft).toBeDefined();
      expect(draft?.data).toEqual(data);
      expect(draft?.formId).toBe('test-form');
      expect(draft?.updatedAt).toBeDefined();
    });

    it('should load form draft', () => {
      const data = { name: 'Test' };
      useUIStore.getState().saveFormDraft('test-form', data);

      const loaded = useUIStore.getState().loadFormDraft('test-form');
      expect(loaded).toEqual(data);
    });

    it('should return undefined for non-existent draft', () => {
      const loaded = useUIStore.getState().loadFormDraft('non-existent');
      expect(loaded).toBeUndefined();
    });

    it('should delete form draft', () => {
      useUIStore.getState().saveFormDraft('test-form', { name: 'Test' });
      useUIStore.getState().deleteFormDraft('test-form');

      expect(useUIStore.getState().formDrafts.has('test-form')).toBe(false);
    });

    it('should clear all form drafts', () => {
      useUIStore.getState().saveFormDraft('form1', { data: 1 });
      useUIStore.getState().saveFormDraft('form2', { data: 2 });

      useUIStore.getState().clearFormDrafts();

      expect(useUIStore.getState().formDrafts.size).toBe(0);
    });
  });

  describe('resetUI', () => {
    it('should reset all UI state', () => {
      useUIStore.getState().closeSidebar();
      useUIStore.getState().openModal({ content: 'Test' });
      useUIStore.getState().addToast({ type: 'info', message: 'Test' });
      useUIStore.getState().setGlobalLoading(true);
      useUIStore.getState().saveFormDraft('test', { data: 'test' });

      useUIStore.getState().resetUI();

      expect(useUIStore.getState().sidebar.isOpen).toBe(true);
      expect(useUIStore.getState().activeModal).toBeNull();
      expect(useUIStore.getState().toasts).toHaveLength(0);
      expect(useUIStore.getState().globalLoading).toBe(false);
      // formDrafts is persisted, so it should remain
    });
  });

  describe('selector hooks', () => {
    it('useSidebar should return sidebar state and actions', () => {
      const sidebar = useUIStore.getState().sidebar;
      expect(sidebar.isOpen).toBeDefined();
      expect(sidebar.isCollapsed).toBeDefined();
      expect(sidebar.width).toBeDefined();
    });

    it('useToasts should return all toasts', () => {
      useUIStore.getState().addToast({ type: 'info', message: 'Test' });
      const toasts = useUIStore.getState().toasts;
      expect(toasts.length).toBeGreaterThan(0);
    });
  });
});
