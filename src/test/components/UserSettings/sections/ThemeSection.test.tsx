import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSection } from '@/components/UserSettings/sections/ThemeSection';

// Mock SectionCard
vi.mock('@/components/UserSettings/SectionCard', () => ({
  default: ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div data-testid="section-card">
      <h2>{icon} {title}</h2>
      {children}
    </div>
  ),
}));

// Mock ThemeOption
vi.mock('@/components/UserSettings/subcomponents/ThemeOption', () => ({
  default: ({ option, isSelected, onSelect }: { 
    option: { value: string; label: string; icon: string; desc: string };
    isSelected: boolean;
    onSelect: (value: string) => void;
  }) => (
    <button
      onClick={() => onSelect(option.value)}
      data-selected={isSelected}
      data-testid={`theme-option-${option.value}`}
      aria-label={`Select ${option.label}`}
    >
      <span>{option.icon}</span>
      <span>{option.label}</span>
      <span>{option.desc}</span>
    </button>
  ),
}));

describe('ThemeSection', () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders section title with icon', () => {
    render(<ThemeSection theme="light" setTheme={mockSetTheme} />);
    
    expect(screen.getByText('🎨 主题设置')).toBeInTheDocument();
  });

  it('renders theme selection section', () => {
    render(<ThemeSection theme="light" setTheme={mockSetTheme} />);
    
    expect(screen.getByText('选择主题')).toBeInTheDocument();
  });

  it('renders all theme options', () => {
    render(<ThemeSection theme="light" setTheme={mockSetTheme} />);
    
    expect(screen.getByTestId('theme-option-light')).toBeInTheDocument();
    expect(screen.getByTestId('theme-option-dark')).toBeInTheDocument();
    expect(screen.getByTestId('theme-option-system')).toBeInTheDocument();
  });

  it('displays theme option labels', () => {
    render(<ThemeSection theme="light" setTheme={mockSetTheme} />);
    
    expect(screen.getByText('浅色模式')).toBeInTheDocument();
    expect(screen.getByText('深色模式')).toBeInTheDocument();
    expect(screen.getByText('跟随系统')).toBeInTheDocument();
  });

  it('displays theme option icons', () => {
    render(<ThemeSection theme="light" setTheme={mockSetTheme} />);
    
    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(screen.getByText('🌙')).toBeInTheDocument();
    expect(screen.getByText('💻')).toBeInTheDocument();
  });

  it('displays theme option descriptions', () => {
    render(<ThemeSection theme="light" setTheme={mockSetTheme} />);
    
    expect(screen.getByText('适合白天使用')).toBeInTheDocument();
    expect(screen.getByText('适合夜间使用')).toBeInTheDocument();
    expect(screen.getByText('自动适应系统设置')).toBeInTheDocument();
  });

  it('highlights selected theme option', () => {
    render(<ThemeSection theme="dark" setTheme={mockSetTheme} />);
    
    const darkOption = screen.getByTestId('theme-option-dark');
    expect(darkOption).toHaveAttribute('data-selected', 'true');
    
    const lightOption = screen.getByTestId('theme-option-light');
    expect(lightOption).toHaveAttribute('data-selected', 'false');
  });

  it('calls setTheme when theme option is clicked', () => {
    render(<ThemeSection theme="light" setTheme={mockSetTheme} />);
    
    const darkOption = screen.getByLabelText('Select 深色模式');
    fireEvent.click(darkOption);
    
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('renders theme preview section', () => {
    render(<ThemeSection theme="light" setTheme={mockSetTheme} />);
    
    expect(screen.getByText('预览')).toBeInTheDocument();
  });

  it('displays current theme in preview', () => {
    render(<ThemeSection theme="light" setTheme={mockSetTheme} />);
    
    expect(screen.getByText('当前主题: 浅色模式')).toBeInTheDocument();
  });

  it('displays correct dark theme label in preview', () => {
    render(<ThemeSection theme="dark" setTheme={mockSetTheme} />);
    
    expect(screen.getByText('当前主题: 深色模式')).toBeInTheDocument();
  });

  it('displays correct system theme label in preview', () => {
    render(<ThemeSection theme="system" setTheme={mockSetTheme} />);
    
    expect(screen.getByText('当前主题: 跟随系统')).toBeInTheDocument();
  });

  it('renders preview avatar and sample content', () => {
    render(<ThemeSection theme="light" setTheme={mockSetTheme} />);
    
    expect(screen.getByText('示例用户')).toBeInTheDocument();
    expect(screen.getByText('这是主题预览')).toBeInTheDocument();
  });

  it('shows light option as selected when theme is light', () => {
    render(<ThemeSection theme="light" setTheme={mockSetTheme} />);
    
    const lightOption = screen.getByTestId('theme-option-light');
    expect(lightOption).toHaveAttribute('data-selected', 'true');
  });

  it('shows system option as selected when theme is system', () => {
    render(<ThemeSection theme="system" setTheme={mockSetTheme} />);
    
    const systemOption = screen.getByTestId('theme-option-system');
    expect(systemOption).toHaveAttribute('data-selected', 'true');
  });
});