import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeOption from '@/components/UserSettings/subcomponents/ThemeOption';
import type { ThemeValue } from '@/components/UserSettings/types';

describe('ThemeOption', () => {
  const mockOption = {
    value: 'light' as ThemeValue,
    label: '浅色模式',
    icon: '☀️',
    desc: '适合白天使用',
  };

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders icon, label, and description', () => {
    render(
      <ThemeOption
        option={mockOption}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );
    
    expect(screen.getByText('☀️')).toBeInTheDocument();
    expect(screen.getByText('浅色模式')).toBeInTheDocument();
    expect(screen.getByText('适合白天使用')).toBeInTheDocument();
  });

  it('shows selected state when selected', () => {
    render(
      <ThemeOption
        option={mockOption}
        isSelected={true}
        onSelect={mockOnSelect}
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-cyan-500');
    expect(button).toHaveClass('bg-cyan-50');
  });

  it('shows unselected state when not selected', () => {
    render(
      <ThemeOption
        option={mockOption}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('border-cyan-500');
    expect(button).not.toHaveClass('bg-cyan-50');
  });

  it('calls onSelect with theme value when clicked', () => {
    render(
      <ThemeOption
        option={mockOption}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnSelect).toHaveBeenCalledWith('light');
  });

  it('calls onSelect with dark theme when dark option is clicked', () => {
    const darkOption = {
      value: 'dark' as ThemeValue,
      label: '深色模式',
      icon: '🌙',
      desc: '适合夜间使用',
    };

    render(
      <ThemeOption
        option={darkOption}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnSelect).toHaveBeenCalledWith('dark');
  });

  it('calls onSelect with system theme when system option is clicked', () => {
    const systemOption = {
      value: 'system' as ThemeValue,
      label: '跟随系统',
      icon: '💻',
      desc: '自动适应系统设置',
    };

    render(
      <ThemeOption
        option={systemOption}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnSelect).toHaveBeenCalledWith('system');
  });

  it('renders all theme options correctly', () => {
    const options = [
      { value: 'light' as ThemeValue, label: '浅色模式', icon: '☀️', desc: '适合白天使用' },
      { value: 'dark' as ThemeValue, label: '深色模式', icon: '🌙', desc: '适合夜间使用' },
      { value: 'system' as ThemeValue, label: '跟随系统', icon: '💻', desc: '自动适应系统设置' },
    ];

    options.forEach(option => {
      const { unmount } = render(
        <ThemeOption
          option={option}
          isSelected={false}
          onSelect={mockOnSelect}
        />
      );
      
      expect(screen.getByText(option.icon)).toBeInTheDocument();
      expect(screen.getByText(option.label)).toBeInTheDocument();
      expect(screen.getByText(option.desc)).toBeInTheDocument();
      
      unmount();
    });
  });

  it('has correct hover state class when not selected', () => {
    render(
      <ThemeOption
        option={mockOption}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('hover:border-zinc-300');
  });

  it('has transition-all class for smooth animations', () => {
    render(
      <ThemeOption
        option={mockOption}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('transition-all');
  });
});