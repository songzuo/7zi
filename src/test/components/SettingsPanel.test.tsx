import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SettingsPanel, SettingsPanelCompact } from '@/components/SettingsPanel'

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: () => 'zh',
}))

// Mock next/navigation
const mockRouterReplace = vi.fn()
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  usePathname: () => '/test',
}))

// Mock ThemeProvider - now uses Zustand
vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
  }),
}))

// Mock preferencesStore
vi.mock('@/stores/preferencesStore', () => ({
  usePreferencesStore: vi.fn(() => ({
    settings: {
      theme: 'system',
      language: 'zh',
      notifications: { enabled: true, sound: true, email: false, push: true },
    },
    isLoaded: true,
    isDark: false,
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    setLanguage: vi.fn(),
    setNotifications: vi.fn(),
    resetSettings: vi.fn(),
    syncThemeToDOM: vi.fn(),
  })),
  useTheme: vi.fn(() => ({
    theme: 'system',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    isDark: false,
  })),
  useLanguage: vi.fn(() => ({
    language: 'zh',
    setLanguage: vi.fn(),
  })),
  useNotificationPreferences: vi.fn(() => ({
    notifications: { enabled: true, sound: true, email: false, push: true },
    setNotifications: vi.fn(),
  })),
}))

// Mock uiStore for modal state
vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn(selector => {
    const state = {
      activeModal: null,
      openModal: vi.fn(),
      closeModal: vi.fn(),
    }
    return selector(state)
  }),
}))

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders settings panel correctly', async () => {
    render(<SettingsPanel />)

    expect(screen.getByText('⚙️ 设置')).toBeInTheDocument()
    expect(screen.getByText('🎨 主题')).toBeInTheDocument()
    expect(screen.getByText('🌐 语言')).toBeInTheDocument()
    expect(screen.getByText('🔔 通知')).toBeInTheDocument()
  })

  it('renders theme options', async () => {
    render(<SettingsPanel />)

    expect(screen.getByText('浅色')).toBeInTheDocument()
    expect(screen.getByText('深色')).toBeInTheDocument()
    expect(screen.getByText('跟随系统')).toBeInTheDocument()
  })

  it('renders language options', async () => {
    render(<SettingsPanel />)

    expect(screen.getByText('中文')).toBeInTheDocument()
    expect(screen.getAllByText('English').length).toBeGreaterThan(0)
  })

  it('renders notification toggles', async () => {
    render(<SettingsPanel />)

    expect(screen.getByText('启用通知')).toBeInTheDocument()
    expect(screen.getByText('声音')).toBeInTheDocument()
    expect(screen.getByText('邮件')).toBeInTheDocument()
    expect(screen.getByText('推送')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()

    render(<SettingsPanel onClose={onClose} />)

    const closeButton = screen.getByLabelText('关闭设置')
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows reset confirmation when reset button is clicked', async () => {
    render(<SettingsPanel />)

    const resetButton = screen.getByText('重置为默认设置')
    fireEvent.click(resetButton)

    expect(screen.getByText('确定要重置所有设置吗？')).toBeInTheDocument()
    expect(screen.getByText('确认重置')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
  })

  it('hides reset confirmation when cancel is clicked', async () => {
    render(<SettingsPanel />)

    const resetButton = screen.getByText('重置为默认设置')
    fireEvent.click(resetButton)

    const cancelButton = screen.getByText('取消')
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText('确定要重置所有设置吗？')).not.toBeInTheDocument()
    })
  })

  it('applies custom className', async () => {
    const { container } = render(<SettingsPanel className="custom-class" />)

    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('renders compact panel correctly', async () => {
    render(<SettingsPanelCompact />)

    expect(screen.getByText('⚙️ 设置')).toBeInTheDocument()
  })
})

describe('ToggleSwitch', () => {
  it('renders notification toggle with correct initial state', async () => {
    render(<SettingsPanel />)

    expect(screen.getByText('启用通知')).toBeInTheDocument()

    await waitFor(() => {
      const switches = screen.getAllByRole('switch')
      expect(switches.length).toBeGreaterThan(0)
    })
  })

  it('notification sub-options are hidden when disabled', async () => {
    // Mock with notifications disabled
    const { useNotificationPreferences } = await import('@/stores/preferencesStore')
    vi.mocked(useNotificationPreferences).mockReturnValue({
      notifications: { enabled: false, sound: false, email: false, push: false },
      setNotifications: vi.fn(),
    })

    render(<SettingsPanel />)

    await waitFor(() => {
      expect(screen.queryByText('声音')).not.toBeInTheDocument()
      expect(screen.queryByText('邮件')).not.toBeInTheDocument()
      expect(screen.queryByText('推送')).not.toBeInTheDocument()
    })
  })
})
