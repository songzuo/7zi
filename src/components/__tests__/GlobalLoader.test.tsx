/**
 * GlobalLoader Component Tests (Simplified)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { GlobalLoader, MinimalLoader } from '../GlobalLoader'

// Mock uiStore
const mockSetGlobalLoading = vi.fn()

// Helper to create minimal UIState for testing
function createMockUIState(overrides: Partial<any> = {}) {
  return {
    globalLoading: false,
    loadingMessage: undefined,
    sidebar: { isOpen: false, isCollapsed: false, width: 280 },
    activeModal: null,
    modalHistory: [],
    toasts: [],
    maxToasts: 5,
    toastQueue: [],
    formDrafts: new Map(),
    toggleSidebar: mockSetGlobalLoading,
    openSidebar: mockSetGlobalLoading,
    closeSidebar: mockSetGlobalLoading,
    toggleSidebarCollapse: mockSetGlobalLoading,
    setSidebarWidth: mockSetGlobalLoading,
    openModal: mockSetGlobalLoading,
    closeModal: mockSetGlobalLoading,
    closeAllModals: mockSetGlobalLoading,
    updateModal: mockSetGlobalLoading,
    addToast: mockSetGlobalLoading,
    removeToast: mockSetGlobalLoading,
    clearToasts: mockSetGlobalLoading,
    clearToastsByType: mockSetGlobalLoading,
    success: mockSetGlobalLoading,
    error: mockSetGlobalLoading,
    warning: mockSetGlobalLoading,
    info: mockSetGlobalLoading,
    loading: mockSetGlobalLoading,
    setGlobalLoading: mockSetGlobalLoading,
    saveFormDraft: mockSetGlobalLoading,
    loadFormDraft: mockSetGlobalLoading,
    deleteFormDraft: mockSetGlobalLoading,
    clearFormDrafts: mockSetGlobalLoading,
    resetUI: mockSetGlobalLoading,
    ...overrides,
  }
}

vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn(selector => {
    const state = createMockUIState()
    return selector(state)
  }),
}))

describe('GlobalLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when loading is false', () => {
      render(<GlobalLoader minDisplayTime={0} />)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('should render overlay when loading is true', async () => {
      // Mock uiStore to return loading state
      const { useUIStore } = await import('@/stores/uiStore')
      vi.mocked(useUIStore).mockImplementation(selector => {
        const state = createMockUIState({ globalLoading: true, loadingMessage: 'Test loading...' })
        return selector(state)
      })

      render(<GlobalLoader minDisplayTime={0} />)

      await waitFor(() => {
        expect(screen.queryByRole('status')).toBeInTheDocument()
      })
    })

    it('should display loading message', async () => {
      const { useUIStore } = await import('@/stores/uiStore')
      vi.mocked(useUIStore).mockImplementation(selector => {
        const state = createMockUIState({ globalLoading: true, loadingMessage: 'Test message' })
        return selector(state)
      })

      render(<GlobalLoader minDisplayTime={0} />)

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have role="status"', async () => {
      const { useUIStore } = await import('@/stores/uiStore')
      vi.mocked(useUIStore).mockImplementation(selector => {
        const state = createMockUIState({ globalLoading: true, loadingMessage: 'Loading...' })
        return selector(state)
      })

      render(<GlobalLoader minDisplayTime={0} />)

      await waitFor(() => {
        expect(screen.queryByRole('status')).toBeInTheDocument()
      })
    })

    it('should have aria-label with loading message', async () => {
      const { useUIStore } = await import('@/stores/uiStore')
      vi.mocked(useUIStore).mockImplementation(selector => {
        const state = createMockUIState({ globalLoading: true, loadingMessage: 'Test message' })
        return selector(state)
      })

      render(<GlobalLoader minDisplayTime={0} />)

      await waitFor(() => {
        expect(screen.queryByRole('status')).toHaveAttribute('aria-label', 'Test message')
      })
    })

    it('should have aria-busy="true" when loading', async () => {
      const { useUIStore } = await import('@/stores/uiStore')
      vi.mocked(useUIStore).mockImplementation(selector => {
        const state = createMockUIState({ globalLoading: true, loadingMessage: 'Loading...' })
        return selector(state)
      })

      render(<GlobalLoader minDisplayTime={0} />)

      await waitFor(() => {
        expect(screen.queryByRole('status')).toHaveAttribute('aria-busy', 'true')
      })
    })
  })
})

describe('MinimalLoader', () => {
  it('should render with custom message when loading', async () => {
    const { useUIStore } = await import('@/stores/uiStore')
    vi.mocked(useUIStore).mockImplementation(selector => {
      const state = createMockUIState({ globalLoading: true, loadingMessage: 'Custom message' })
      return selector(state)
    })

    render(<MinimalLoader message="Custom message" />)

    await waitFor(() => {
      expect(screen.getByText('Custom message')).toBeInTheDocument()
    })
  })

  it('should not render when not loading', async () => {
    const { useUIStore } = await import('@/stores/uiStore')
    vi.mocked(useUIStore).mockImplementation(selector => {
      const state = createMockUIState({ globalLoading: false, loadingMessage: null })
      return selector(state)
    })

    render(<MinimalLoader message="Custom message" />)

    expect(screen.queryByText('Custom message')).not.toBeInTheDocument()
  })
})
