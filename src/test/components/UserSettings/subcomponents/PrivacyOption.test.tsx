import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrivacyOption from '@/components/UserSettings/subcomponents/PrivacyOption';

// Mock ToggleSwitch
vi.mock('@/components/UserSettings/ToggleSwitch', () => ({
  default: ({ checked, onChange, label }: { 
    checked: boolean; 
    onChange: () => void; 
    label?: string 
  }) => (
    <button
      onClick={onChange}
      data-checked={checked}
      aria-label={label || 'Toggle'}
    >
      {checked ? 'ON' : 'OFF'}
    </button>
  ),
}));

describe('PrivacyOption', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders label and description', () => {
    render(
      <PrivacyOption
        label="显示邮箱地址"
        description="在个人主页显示您的邮箱"
        checked={false}
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('显示邮箱地址')).toBeInTheDocument();
    expect(screen.getByText('在个人主页显示您的邮箱')).toBeInTheDocument();
  });

  it('displays toggle with correct checked state', () => {
    render(
      <PrivacyOption
        label="显示活动状态"
        description="让其他人看到您的在线状态"
        checked={true}
        onChange={mockOnChange}
      />
    );
    
    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('data-checked', 'true');
  });

  it('displays unchecked state correctly', () => {
    render(
      <PrivacyOption
        label="允许私信"
        description="允许其他用户给您发送私信"
        checked={false}
        onChange={mockOnChange}
      />
    );
    
    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('data-checked', 'false');
  });

  it('calls onChange when toggle is clicked', () => {
    render(
      <PrivacyOption
        label="数据收集"
        description="允许收集匿名使用数据以改进产品"
        checked={false}
        onChange={mockOnChange}
      />
    );
    
    const toggle = screen.getByRole('button');
    fireEvent.click(toggle);
    
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('passes label to ToggleSwitch for accessibility', () => {
    render(
      <PrivacyOption
        label="显示邮箱地址"
        description="描述"
        checked={true}
        onChange={mockOnChange}
      />
    );
    
    const toggle = screen.getByLabelText('显示邮箱地址');
    expect(toggle).toBeInTheDocument();
  });

  it('renders with different privacy options', () => {
    const { rerender } = render(
      <PrivacyOption
        label="显示邮箱地址"
        description="描述1"
        checked={true}
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('显示邮箱地址')).toBeInTheDocument();
    
    rerender(
      <PrivacyOption
        label="显示活动状态"
        description="让其他人看到您的在线状态"
        checked={false}
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('显示活动状态')).toBeInTheDocument();
    expect(screen.getByText('让其他人看到您的在线状态')).toBeInTheDocument();
  });
});