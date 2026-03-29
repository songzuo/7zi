import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsButton } from '@/components/SettingsButton';

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: () => 'zh',
}));

// Mock next/navigation
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/test',
}));

// Mock ThemeProvider - now uses Zustand
vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
  }),
}));

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
    toggleSidebar: vi.fn(),
    openSidebar: vi.fn(),
    closeSidebar: vi.fn(),
    toggleSidebarCollapse: vi.fn(),
    setSidebarWidth: vi.fn(),
    openModal: vi.fn(),
    closeModal: vi.fn(),
    closeAllModals: vi.fn(),
    updateModal: vi.fn(),
    addToast: vi.fn(),
    removeToast: vi.fn(),
    clearToasts: vi.fn(),
    clearToastsByType: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    setGlobalLoading: vi.fn(),
    saveFormDraft: vi.fn(),
    loadFormDraft: vi.fn(),
    deleteFormDraft: vi.fn(),
    clearFormDrafts: vi.fn(),
    resetUI: vi.fn(),
    ...overrides,
  };
}

// Mock uiStore for modal state
vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn((selector) => {
    const state = createMockUIState();
    return selector(state);
  }),
}));

describe('SettingsButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings button correctly', async () => {
    render(<SettingsButton />);

    expect(screen.getByLabelText('设置')).toBeInTheDocument();
  });

  it('renders compact button correctly', async () => {
    render(<SettingsButton compact />);

    const button = screen.getByLabelText('设置');
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveTextContent('设置'); // compact mode doesn't show text
  });

  it('renders full button with text', async () => {
    render(<SettingsButton compact={false} />);

    const button = screen.getByLabelText('设置');
    expect(button).toHaveTextContent('设置');
  });

  it('opens settings panel when clicked', async () => {
    const { useUIStore } = await import('@/stores/uiStore');
    const mockOpenModal = vi.fn();
    vi.mocked(useUIStore).mockImplementation((selector) => {
      const state = createMockUIState({ activeModal: null, openModal: mockOpenModal, closeModal: vi.fn() });
      return selector(state);
    });

    render(<SettingsButton />);

    const button = screen.getByLabelText('设置');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalled();
    });
  });

  it('applies custom className', async () => {
    const { container } = render(<SettingsButton className="custom-class" />);

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});