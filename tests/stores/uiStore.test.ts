/**
 * UI Store Tests
 * Tests for src/stores/uiStore.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  useUIStore,
  toast,
  openModal,
  closeModal as closeModalExternal,
  setGlobalLoading as setGlobalLoadingExternal,
  type Toast,
  type Modal,
} from '@/stores/uiStore'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store state
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
    })

    // Clear localStorage
    localStorageMock.clear()

    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with default sidebar state', () => {
      const state = useUIStore.getState()

      expect(state.sidebar.isOpen).toBe(true)
      expect(state.sidebar.isCollapsed).toBe(false)
      expect(state.sidebar.width).toBe(280)
    })

    it('should initialize with no active modal', () => {
      const state = useUIStore.getState()

      expect(state.activeModal).toBe(null)
      expect(state.modalHistory).toEqual([])
    })

    it('should initialize with empty toasts', () => {
      const state = useUIStore.getState()

      expect(state.toasts).toEqual([])
      expect(state.toastQueue).toEqual([])
      expect(state.maxToasts).toBe(5)
    })

    it('should initialize with no loading state', () => {
      const state = useUIStore.getState()

      expect(state.globalLoading).toBe(false)
      expect(state.loadingMessage).toBeUndefined()
    })

    it('should initialize with empty form drafts', () => {
      const state = useUIStore.getState()

      expect(state.formDrafts).toBeInstanceOf(Map)
      expect(state.formDrafts.size).toBe(0)
    })

    it('should have sidebar actions', () => {
      const state = useUIStore.getState()

      expect(typeof state.toggleSidebar).toBe('function')
      expect(typeof state.openSidebar).toBe('function')
      expect(typeof state.closeSidebar).toBe('function')
      expect(typeof state.toggleSidebarCollapse).toBe('function')
      expect(typeof state.setSidebarWidth).toBe('function')
    })

    it('should have modal actions', () => {
      const state = useUIStore.getState()

      expect(typeof state.openModal).toBe('function')
      expect(typeof state.closeModal).toBe('function')
      expect(typeof state.closeAllModals).toBe('function')
      expect(typeof state.updateModal).toBe('function')
    })

    it('should have toast actions', () => {
      const state = useUIStore.getState()

      expect(typeof state.addToast).toBe('function')
      expect(typeof state.removeToast).toBe('function')
      expect(typeof state.clearToasts).toBe('function')
      expect(typeof state.clearToastsByType).toBe('function')
    })

    it('should have toast convenience methods', () => {
      const state = useUIStore.getState()

      expect(typeof state.success).toBe('function')
      expect(typeof state.error).toBe('function')
      expect(typeof state.warning).toBe('function')
      expect(typeof state.info).toBe('function')
      expect(typeof state.loading).toBe('function')
    })
  })

  describe('sidebar - toggleSidebar', () => {
    it('should toggle sidebar open/close', () => {
      const { toggleSidebar } = useUIStore.getState()

      toggleSidebar()

      let state = useUIStore.getState()
      expect(state.sidebar.isOpen).toBe(false)

      toggleSidebar()

      state = useUIStore.getState()
      expect(state.sidebar.isOpen).toBe(true)
    })

    it('should preserve other sidebar properties', () => {
      const { toggleSidebar, setSidebarWidth } = useUIStore.getState()

      setSidebarWidth(300)
      toggleSidebar()

      const state = useUIStore.getState()
      expect(state.sidebar.width).toBe(300)
      expect(state.sidebar.isCollapsed).toBe(false)
    })
  })

  describe('sidebar - openSidebar', () => {
    it('should open sidebar', () => {
      const { closeSidebar, openSidebar } = useUIStore.getState()

      closeSidebar()
      expect(useUIStore.getState().sidebar.isOpen).toBe(false)

      openSidebar()

      const state = useUIStore.getState()
      expect(state.sidebar.isOpen).toBe(true)
      expect(state.sidebar.isCollapsed).toBe(false)
    })
  })

  describe('sidebar - closeSidebar', () => {
    it('should close sidebar', () => {
      const { closeSidebar } = useUIStore.getState()

      closeSidebar()

      const state = useUIStore.getState()
      expect(state.sidebar.isOpen).toBe(false)
    })
  })

  describe('sidebar - toggleSidebarCollapse', () => {
    it('should toggle collapse state', () => {
      const { toggleSidebarCollapse } = useUIStore.getState()

      toggleSidebarCollapse()

      let state = useUIStore.getState()
      expect(state.sidebar.isCollapsed).toBe(true)
      expect(state.sidebar.width).toBe(64)

      toggleSidebarCollapse()

      state = useUIStore.getState()
      expect(state.sidebar.isCollapsed).toBe(false)
      expect(state.sidebar.width).toBe(280)
    })
  })

  describe('sidebar - setSidebarWidth', () => {
    it('should set sidebar width', () => {
      const { setSidebarWidth } = useUIStore.getState()

      setSidebarWidth(320)

      const state = useUIStore.getState()
      expect(state.sidebar.width).toBe(320)
    })
  })

  describe('modal - openModal', () => {
    it('should open modal with default settings', () => {
      const { openModal } = useUIStore.getState()

      openModal({ content: 'Test content' })

      const state = useUIStore.getState()
      expect(state.activeModal).not.toBeNull()
      expect(state.activeModal?.content).toBe('Test content')
      expect(state.activeModal?.size).toBe('md')
      expect(state.activeModal?.isOpen).toBe(true)
    })

    it('should generate unique modal ID', () => {
      const { openModal } = useUIStore.getState()

      openModal({ content: 'Modal 1' })
      const state1 = useUIStore.getState()
      const id1 = state1.activeModal?.id

      openModal({ content: 'Modal 2' })
      const state2 = useUIStore.getState()
      const id2 = state2.activeModal?.id

      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
    })

    it('should add to modal history', () => {
      const { openModal } = useUIStore.getState()

      openModal({ content: 'Modal 1' })
      openModal({ content: 'Modal 2' })

      const state = useUIStore.getState()
      expect(state.modalHistory.length).toBe(2)
    })

    it('should accept custom settings', () => {
      const { openModal } = useUIStore.getState()

      const mockOnClose = vi.fn()
      openModal({
        content: 'Test content',
        title: 'Test Title',
        size: 'lg',
        closeOnBackdropClick: false,
        closeOnEscape: false,
        onClose: mockOnClose,
      })

      const state = useUIStore.getState()
      expect(state.activeModal?.title).toBe('Test Title')
      expect(state.activeModal?.size).toBe('lg')
      expect(state.activeModal?.closeOnBackdropClick).toBe(false)
      expect(state.activeModal?.closeOnEscape).toBe(false)
    })
  })

  describe('modal - closeModal', () => {
    it('should close active modal', () => {
      const { openModal, closeModal } = useUIStore.getState()

      openModal({ content: 'Test content' })
      expect(useUIStore.getState().activeModal).not.toBeNull()

      closeModal()

      const state = useUIStore.getState()
      expect(state.activeModal).toBeNull()
    })

    it('should call onClose callback', () => {
      const { openModal, closeModal } = useUIStore.getState()

      const mockOnClose = vi.fn()
      openModal({ content: 'Test content', onClose: mockOnClose })
      closeModal()

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should close specific modal by ID', () => {
      const { openModal, closeModal } = useUIStore.getState()

      const id1 = openModal({ content: 'Modal 1' })
      const id2 = openModal({ content: 'Modal 2' })

      closeModal(id1)

      const state = useUIStore.getState()
      expect(state.activeModal?.id).toBe(id2)
    })
  })

  describe('modal - closeAllModals', () => {
    it('should close all modals', () => {
      const { openModal, closeAllModals } = useUIStore.getState()

      const mockOnClose1 = vi.fn()
      const mockOnClose2 = vi.fn()

      openModal({ content: 'Modal 1', onClose: mockOnClose1 })
      openModal({ content: 'Modal 2', onClose: mockOnClose2 })

      closeAllModals()

      const state = useUIStore.getState()
      expect(state.activeModal).toBeNull()
      expect(mockOnClose1).toHaveBeenCalledTimes(1)
      expect(mockOnClose2).toHaveBeenCalledTimes(1)
    })
  })

  describe('toast - addToast', () => {
    vi.useFakeTimers()

    it('should add toast', () => {
      const { addToast } = useUIStore.getState()

      const toastId = addToast({
        type: 'success',
        message: 'Test message',
      })

      const state = useUIStore.getState()
      expect(state.toasts.length).toBe(1)
      expect(state.toasts[0].type).toBe('success')
      expect(state.toasts[0].message).toBe('Test message')
      expect(typeof toastId).toBe('string')
    })

    it('should add toast with custom options', () => {
      const { addToast } = useUIStore.getState()

      const mockAction = vi.fn()
      addToast({
        type: 'error',
        title: 'Error Title',
        message: 'Error message',
        priority: 'high',
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: mockAction,
        },
      })

      const state = useUIStore.getState()
      expect(state.toasts[0].title).toBe('Error Title')
      expect(state.toasts[0].priority).toBe('high')
      expect(state.toasts[0].duration).toBe(5000)
      expect(state.toasts[0].action?.label).toBe('Retry')
    })

    vi.useRealTimers()
  })

  describe('toast - removeToast', () => {
    it('should remove toast by ID', () => {
      const { addToast, removeToast } = useUIStore.getState()

      const toastId1 = addToast({ type: 'success', message: 'Message 1' })
      const toastId2 = addToast({ type: 'error', message: 'Message 2' })

      expect(useUIStore.getState().toasts.length).toBe(2)

      removeToast(toastId1)

      const state = useUIStore.getState()
      expect(state.toasts.length).toBe(1)
      expect(state.toasts[0].message).toBe('Message 2')
    })
  })

  describe('toast - clearToasts', () => {
    it('should clear all toasts', () => {
      const { addToast, clearToasts } = useUIStore.getState()

      addToast({ type: 'success', message: 'Message 1' })
      addToast({ type: 'error', message: 'Message 2' })
      addToast({ type: 'warning', message: 'Message 3' })

      expect(useUIStore.getState().toasts.length).toBe(3)

      clearToasts()

      expect(useUIStore.getState().toasts.length).toBe(0)
    })
  })

  describe('toast - clearToastsByType', () => {
    it('should clear toasts by type', () => {
      const { addToast, clearToastsByType } = useUIStore.getState()

      addToast({ type: 'success', message: 'Success' })
      addToast({ type: 'error', message: 'Error 1' })
      addToast({ type: 'error', message: 'Error 2' })
      addToast({ type: 'warning', message: 'Warning' })

      expect(useUIStore.getState().toasts.length).toBe(4)

      clearToastsByType('error')

      const state = useUIStore.getState()
      expect(state.toasts.length).toBe(2)
      expect(state.toasts.every(t => t.type !== 'error')).toBe(true)
    })
  })

  describe('loading - setGlobalLoading', () => {
    it('should set loading state', () => {
      const { setGlobalLoading } = useUIStore.getState()

      setGlobalLoading(true, 'Loading data...')

      const state = useUIStore.getState()
      expect(state.globalLoading).toBe(true)
      expect(state.loadingMessage).toBe('Loading data...')
    })

    it('should clear loading state', () => {
      const { setGlobalLoading } = useUIStore.getState()

      setGlobalLoading(true, 'Loading...')
      setGlobalLoading(false)

      const state = useUIStore.getState()
      expect(state.globalLoading).toBe(false)
      expect(state.loadingMessage).toBeUndefined()
    })
  })

  describe('form drafts - saveFormDraft', () => {
    it('should save form draft', () => {
      const { saveFormDraft } = useUIStore.getState()

      saveFormDraft('form-1', { name: 'Test', email: 'test@example.com' })

      const state = useUIStore.getState()
      expect(state.formDrafts.has('form-1')).toBe(true)
    })

    it('should overwrite existing draft', () => {
      const { saveFormDraft } = useUIStore.getState()

      saveFormDraft('form-1', { name: 'Test' })
      saveFormDraft('form-1', { name: 'Updated' })

      const draft = useUIStore.getState().formDrafts.get('form-1')
      expect(draft?.data.name).toBe('Updated')
    })
  })

  describe('form drafts - loadFormDraft', () => {
    it('should load form draft', () => {
      const { saveFormDraft, loadFormDraft } = useUIStore.getState()

      const data = { name: 'Test', email: 'test@example.com' }
      saveFormDraft('form-1', data)

      const loaded = loadFormDraft('form-1')
      expect(loaded).toEqual(data)
    })

    it('should return undefined for non-existent draft', () => {
      const { loadFormDraft } = useUIStore.getState()

      const loaded = loadFormDraft('non-existent')
      expect(loaded).toBeUndefined()
    })
  })

  describe('form drafts - deleteFormDraft', () => {
    it('should delete form draft', () => {
      const { saveFormDraft, deleteFormDraft } = useUIStore.getState()

      saveFormDraft('form-1', { name: 'Test' })
      expect(useUIStore.getState().formDrafts.has('form-1')).toBe(true)

      deleteFormDraft('form-1')
      expect(useUIStore.getState().formDrafts.has('form-1')).toBe(false)
    })
  })

  describe('form drafts - clearFormDrafts', () => {
    it('should clear all form drafts', () => {
      const { saveFormDraft, clearFormDrafts } = useUIStore.getState()

      saveFormDraft('form-1', { name: 'Test 1' })
      saveFormDraft('form-2', { name: 'Test 2' })
      saveFormDraft('form-3', { name: 'Test 3' })

      expect(useUIStore.getState().formDrafts.size).toBe(3)

      clearFormDrafts()

      expect(useUIStore.getState().formDrafts.size).toBe(0)
    })
  })

  describe('external API - toast', () => {
    it('should provide toast methods', () => {
      expect(typeof toast.success).toBe('function')
      expect(typeof toast.error).toBe('function')
      expect(typeof toast.warning).toBe('function')
      expect(typeof toast.info).toBe('function')
      expect(typeof toast.loading).toBe('function')
    })

    it('should create success toast externally', () => {
      toast.success('External success')

      const state = useUIStore.getState()
      expect(state.toasts[0].type).toBe('success')
      expect(state.toasts[0].message).toBe('External success')
    })

    it('should create error toast externally', () => {
      toast.error('External error')

      const state = useUIStore.getState()
      expect(state.toasts[0].type).toBe('error')
    })
  })

  describe('external API - openModal', () => {
    it('should open modal externally', () => {
      openModal({ content: 'External modal' })

      const state = useUIStore.getState()
      expect(state.activeModal?.content).toBe('External modal')
    })
  })

  describe('external API - closeModal', () => {
    it('should close modal externally', () => {
      openModal({ content: 'Test' })
      expect(useUIStore.getState().activeModal).not.toBeNull()

      closeModalExternal()

      expect(useUIStore.getState().activeModal).toBeNull()
    })
  })

  describe('external API - setGlobalLoading', () => {
    it('should set loading externally', () => {
      setGlobalLoadingExternal(true, 'External loading')

      const state = useUIStore.getState()
      expect(state.globalLoading).toBe(true)
      expect(state.loadingMessage).toBe('External loading')
    })
  })

  describe('integration scenarios', () => {
    it('should handle modal with toast', () => {
      const { openModal, success } = useUIStore.getState()

      openModal({ content: 'Modal content' })
      success('Toast message')

      const state = useUIStore.getState()
      expect(state.activeModal).not.toBeNull()
      expect(state.toasts.length).toBe(1)
    })

    it('should handle form draft with loading', () => {
      const { saveFormDraft, setGlobalLoading } = useUIStore.getState()

      setGlobalLoading(true, 'Saving...')
      saveFormDraft('form-1', { name: 'Test' })
      setGlobalLoading(false)

      const state = useUIStore.getState()
      expect(state.globalLoading).toBe(false)
      expect(state.formDrafts.has('form-1')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty content modal', () => {
      const { openModal } = useUIStore.getState()

      openModal({ content: null as any })

      const state = useUIStore.getState()
      expect(state.activeModal?.content).toBe(null)
    })

    it('should handle toast with no title', () => {
      const { addToast } = useUIStore.getState()

      addToast({
        type: 'success',
        message: 'Message without title',
      })

      const state = useUIStore.getState()
      expect(state.toasts[0].title).toBeUndefined()
    })

    it('should handle closing modal without ID', () => {
      const { openModal, closeModal } = useUIStore.getState()

      openModal({ content: 'Modal' })
      closeModal() // No ID provided

      expect(useUIStore.getState().activeModal).toBeNull()
    })
  })

  describe('resetUI', () => {
    it('should reset UI to default state', () => {
      const { setSidebarWidth, openModal, addToast, setGlobalLoading, saveFormDraft, resetUI } =
        useUIStore.getState()

      // Modify state
      setSidebarWidth(300)
      openModal({ content: 'Modal' })
      addToast({ type: 'success', message: 'Toast' })
      setGlobalLoading(true, 'Loading')
      saveFormDraft('form-1', { name: 'Test' })

      // Reset
      resetUI()

      const state = useUIStore.getState()
      expect(state.sidebar).toEqual({
        isOpen: true,
        isCollapsed: false,
        width: 280,
      })
      expect(state.activeModal).toBeNull()
      expect(state.toasts).toEqual([])
      expect(state.globalLoading).toBe(false)
      expect(state.loadingMessage).toBeUndefined()
      // Form drafts are not reset
      expect(state.formDrafts.size).toBe(1)
    })
  })
})
