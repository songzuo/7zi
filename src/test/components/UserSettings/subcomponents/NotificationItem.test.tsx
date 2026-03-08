import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationItem from '@/components/UserSettings/subcomponents/NotificationItem';

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

describe('NotificationItem', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders label and description', () => {
    render(
      <NotificationItem
        label="邮件通知"
        description="接收重要更新和提醒邮件"
        checked={true}
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('邮件通知')).toBeInTheDocument();
    expect(screen.getByText('接收重要更新和提醒邮件')).toBeInTheDocument();
  });

  it('displays toggle with correct checked state', () => {
    render(
      <NotificationItem
        label="邮件通知"
        description="描述"
        checked={true}
        onChange={mockOnChange}
      />
    );
    
    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('data-checked', 'true');
  });

  it('displays unchecked state correctly', () => {
    render(
      <NotificationItem
        label="营销邮件"
        description="描述"
        checked={false}
        onChange={mockOnChange}
      />
    );
    
    const toggle = screen.getByRole('button');
    expect(toggle).toHaveAttribute('data-checked', 'false');
  });

  it('calls onChange when toggle is clicked', () => {
    render(
      <NotificationItem
        label="推送通知"
        description="浏览器推送通知"
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
      <NotificationItem
        label="每周摘要"
        description="每周活动汇总邮件"
        checked={true}
        onChange={mockOnChange}
      />
    );
    
    const toggle = screen.getByLabelText('每周摘要');
    expect(toggle).toBeInTheDocument();
  });

  it('renders with different notification types', () => {
    const { rerender } = render(
      <NotificationItem
        label="邮件通知"
        description="描述1"
        checked={true}
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('邮件通知')).toBeInTheDocument();
    
    rerender(
      <NotificationItem
        label="@提及通知"
        description="当有人@您时收到通知"
        checked={false}
        onChange={mockOnChange}
      />
    );
    
    expect(screen.getByText('@提及通知')).toBeInTheDocument();
    expect(screen.getByText('当有人@您时收到通知')).toBeInTheDocument();
  });
});