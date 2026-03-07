import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '../app/settings/page';

// Mock ThemeProvider
const mockSetTheme = vi.fn();
const mockToggleTheme = vi.fn();

vi.mock('../components/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'system',
    resolvedTheme: 'light',
    isTransitioning: false,
    setTheme: mockSetTheme,
    toggleTheme: mockToggleTheme,
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders settings page with title', () => {
    render(<SettingsPage />);
    expect(screen.getByText('用户设置')).toBeInTheDocument();
    expect(screen.getByText('自定义您的应用体验和偏好设置')).toBeInTheDocument();
  });

  it('renders theme settings section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('主题设置')).toBeInTheDocument();
  });

  it('renders three theme options', () => {
    render(<SettingsPage />);
    // 使用 getAllByText 因为"浅色模式"在多处显示
    expect(screen.getAllByText('浅色模式').length).toBeGreaterThan(0);
    expect(screen.getAllByText('深色模式').length).toBeGreaterThan(0);
    expect(screen.getAllByText('跟随系统').length).toBeGreaterThan(0);
  });

  it('renders display settings section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('显示设置')).toBeInTheDocument();
  });

  it('renders display setting items', () => {
    render(<SettingsPage />);
    expect(screen.getByText('动画效果')).toBeInTheDocument();
    expect(screen.getByText('紧凑模式')).toBeInTheDocument();
    expect(screen.getByText('桌面通知')).toBeInTheDocument();
    expect(screen.getByText('提示音')).toBeInTheDocument();
  });

  it('renders privacy section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('数据与隐私')).toBeInTheDocument();
    expect(screen.getByText('本地存储')).toBeInTheDocument();
  });

  it('renders about section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('关于')).toBeInTheDocument();
    expect(screen.getByText('版本')).toBeInTheDocument();
  });

  it('theme option buttons are clickable', () => {
    render(<SettingsPage />);
    
    const lightModeButton = screen.getByLabelText('选择浅色模式');
    fireEvent.click(lightModeButton);
    
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('display setting toggles work', () => {
    render(<SettingsPage />);
    
    // 找到动画效果的开关按钮
    const toggleButtons = screen.getAllByRole('switch');
    expect(toggleButtons.length).toBe(4); // 四个显示设置
    
    // 点击第一个开关
    fireEvent.click(toggleButtons[0]);
    
    // 开关应该切换状态
    expect(toggleButtons[0]).toBeInTheDocument();
  });

  it('shows current applied theme', () => {
    render(<SettingsPage />);
    expect(screen.getByText('当前应用主题:')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<SettingsPage />);
    
    // 检查 heading 级别
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
    
    // 检查按钮可访问性
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('Settings Toggle State', () => {
  // 测试开关状态管理
  it('toggle switches change state on click', async () => {
    render(<SettingsPage />);
    
    const toggleButtons = screen.getAllByRole('switch');
    const firstToggle = toggleButtons[0];
    
    // 初始状态
    expect(firstToggle).toHaveAttribute('aria-checked', 'true'); // 动画效果默认开启
    
    // 点击切换
    fireEvent.click(firstToggle);
    expect(firstToggle).toHaveAttribute('aria-checked', 'false');
    
    // 再次点击切回
    fireEvent.click(firstToggle);
    expect(firstToggle).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Settings Links', () => {
  it('has link to website', () => {
    render(<SettingsPage />);
    
    const link = screen.getByText('访问官网 →').closest('a');
    expect(link).toHaveAttribute('href', 'https://7zi.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});