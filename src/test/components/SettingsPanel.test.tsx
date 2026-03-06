import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SettingsPanel, SettingsPanelCompact } from '@/components/SettingsPanel';
import { SettingsProvider } from '@/contexts/SettingsContext';

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: () => 'zh',
}));

// Mock next/navigation
const mockRouterReplace = vi.fn();
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  usePathname: () => '/test',
}));

// Mock ThemeProvider
vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
  }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings panel correctly', async () => {
    render(
      <TestWrapper>
        <SettingsPanel />
      </TestWrapper>
    );
    
    expect(screen.getByText('⚙️ 设置')).toBeInTheDocument();
    expect(screen.getByText('🎨 主题')).toBeInTheDocument();
    expect(screen.getByText('🌐 语言')).toBeInTheDocument();
    expect(screen.getByText('🔔 通知')).toBeInTheDocument();
  });

  it('renders theme options', async () => {
    render(
      <TestWrapper>
        <SettingsPanel />
      </TestWrapper>
    );
    
    expect(screen.getByText('浅色')).toBeInTheDocument();
    expect(screen.getByText('深色')).toBeInTheDocument();
    expect(screen.getByText('跟随系统')).toBeInTheDocument();
  });

  it('renders language options', async () => {
    render(
      <TestWrapper>
        <SettingsPanel />
      </TestWrapper>
    );
    
    expect(screen.getByText('中文')).toBeInTheDocument();
    // English appears twice (native name and English name), use getAllByText
    expect(screen.getAllByText('English').length).toBeGreaterThan(0);
  });

  it('renders notification toggles', async () => {
    render(
      <TestWrapper>
        <SettingsPanel />
      </TestWrapper>
    );
    
    expect(screen.getByText('启用通知')).toBeInTheDocument();
    expect(screen.getByText('声音')).toBeInTheDocument();
    expect(screen.getByText('邮件')).toBeInTheDocument();
    expect(screen.getByText('推送')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    
    render(
      <TestWrapper>
        <SettingsPanel onClose={onClose} />
      </TestWrapper>
    );
    
    const closeButton = screen.getByLabelText('关闭设置');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows reset confirmation when reset button is clicked', async () => {
    render(
      <TestWrapper>
        <SettingsPanel />
      </TestWrapper>
    );
    
    const resetButton = screen.getByText('重置为默认设置');
    fireEvent.click(resetButton);
    
    expect(screen.getByText('确定要重置所有设置吗？')).toBeInTheDocument();
    expect(screen.getByText('确认重置')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  it('hides reset confirmation when cancel is clicked', async () => {
    render(
      <TestWrapper>
        <SettingsPanel />
      </TestWrapper>
    );
    
    const resetButton = screen.getByText('重置为默认设置');
    fireEvent.click(resetButton);
    
    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText('确定要重置所有设置吗？')).not.toBeInTheDocument();
    });
  });

  it('hides notification sub-options when notifications are disabled', async () => {
    render(
      <TestWrapper>
        <SettingsPanel />
      </TestWrapper>
    );
    
    // 默认通知是开启的，子选项应该显示
    expect(screen.getByText('声音')).toBeInTheDocument();
    
    // 点击通知总开关
    const notificationToggles = screen.getAllByRole('switch');
    const mainToggle = notificationToggles[0];
    
    fireEvent.click(mainToggle);
    
    await waitFor(() => {
      expect(screen.queryByText('声音')).not.toBeInTheDocument();
    });
  });

  it('applies custom className', async () => {
    const { container } = render(
      <TestWrapper>
        <SettingsPanel className="custom-class" />
      </TestWrapper>
    );
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('renders compact panel correctly', async () => {
    render(
      <TestWrapper>
        <SettingsPanelCompact />
      </TestWrapper>
    );
    
    expect(screen.getByText('⚙️ 设置')).toBeInTheDocument();
  });
});

describe('ToggleSwitch', () => {
  it('renders notification toggle with correct initial state', async () => {
    render(
      <TestWrapper>
        <SettingsPanel />
      </TestWrapper>
    );
    
    // 检查"启用通知"开关存在
    expect(screen.getByText('启用通知')).toBeInTheDocument();
    
    // 等待组件完全渲染
    await waitFor(() => {
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });
  });

  it('notification sub-options are hidden when disabled', async () => {
    // 直接使用预先配置的设置来测试 UI 行为
    render(
      <SettingsProvider defaultSettings={{ notifications: { enabled: false, sound: false, email: false, push: false } }}>
        <SettingsPanel />
      </SettingsProvider>
    );
    
    // 当通知关闭时，子选项不应该显示
    await waitFor(() => {
      expect(screen.queryByText('声音')).not.toBeInTheDocument();
    });
    
    expect(screen.queryByText('邮件')).not.toBeInTheDocument();
    expect(screen.queryByText('推送')).not.toBeInTheDocument();
  });
});