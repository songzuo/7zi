import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsSection } from '@/components/UserSettings/sections/NotificationsSection';
import type { NotificationPreferences } from '@/components/UserSettings/types';

// Mock SectionCard
vi.mock('@/components/UserSettings/SectionCard', () => ({
  default: ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div data-testid="section-card">
      <h2>{icon} {title}</h2>
      {children}
    </div>
  ),
}));

// Mock NotificationItem
vi.mock('@/components/UserSettings/subcomponents/NotificationItem', () => ({
  default: ({ label, description, checked, onChange }: { 
    label: string; 
    description: string; 
    checked: boolean; 
    onChange: () => void 
  }) => (
    <div data-testid={`notification-item-${label}`}>
      <span>{label}</span>
      <span>{description}</span>
      <button 
        onClick={onChange} 
        data-checked={checked}
        aria-label={`Toggle ${label}`}
      >
        {checked ? 'ON' : 'OFF'}
      </button>
    </div>
  ),
}));

describe('NotificationsSection', () => {
  const mockNotifications: NotificationPreferences = {
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    weeklyDigest: true,
    mentionNotifications: true,
  };

  const mockOnNotificationChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders section title with icon', () => {
    render(
      <NotificationsSection 
        notifications={mockNotifications} 
        onNotificationChange={mockOnNotificationChange} 
      />
    );
    
    expect(screen.getByText('🔔 通知偏好')).toBeInTheDocument();
  });

  it('renders all notification items', () => {
    render(
      <NotificationsSection 
        notifications={mockNotifications} 
        onNotificationChange={mockOnNotificationChange} 
      />
    );
    
    expect(screen.getByText('邮件通知')).toBeInTheDocument();
    expect(screen.getByText('推送通知')).toBeInTheDocument();
    expect(screen.getByText('营销邮件')).toBeInTheDocument();
    expect(screen.getByText('每周摘要')).toBeInTheDocument();
    expect(screen.getByText('@提及通知')).toBeInTheDocument();
  });

  it('displays correct checked state for notification items', () => {
    render(
      <NotificationsSection 
        notifications={mockNotifications} 
        onNotificationChange={mockOnNotificationChange} 
      />
    );
    
    // Email notifications should be ON (true in mock)
    const emailToggle = screen.getByLabelText('Toggle 邮件通知');
    expect(emailToggle).toHaveAttribute('data-checked', 'true');
    
    // Marketing emails should be OFF (false in mock)
    const marketingToggle = screen.getByLabelText('Toggle 营销邮件');
    expect(marketingToggle).toHaveAttribute('data-checked', 'false');
  });

  it('calls onNotificationChange when toggle is clicked', () => {
    render(
      <NotificationsSection 
        notifications={mockNotifications} 
        onNotificationChange={mockOnNotificationChange} 
      />
    );
    
    const emailToggle = screen.getByLabelText('Toggle 邮件通知');
    fireEvent.click(emailToggle);
    
    expect(mockOnNotificationChange).toHaveBeenCalledWith('emailNotifications');
  });

  it('displays correct descriptions for each notification type', () => {
    render(
      <NotificationsSection 
        notifications={mockNotifications} 
        onNotificationChange={mockOnNotificationChange} 
      />
    );
    
    expect(screen.getByText('接收重要更新和提醒邮件')).toBeInTheDocument();
    expect(screen.getByText('浏览器推送通知')).toBeInTheDocument();
    expect(screen.getByText('接收产品更新和优惠信息')).toBeInTheDocument();
    expect(screen.getByText('每周活动汇总邮件')).toBeInTheDocument();
    expect(screen.getByText('当有人@您时收到通知')).toBeInTheDocument();
  });

  it('renders correctly with all notifications enabled', () => {
    const allEnabled: NotificationPreferences = {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: true,
      weeklyDigest: true,
      mentionNotifications: true,
    };

    render(
      <NotificationsSection 
        notifications={allEnabled} 
        onNotificationChange={mockOnNotificationChange} 
      />
    );
    
    const toggles = screen.getAllByRole('button');
    toggles.forEach(toggle => {
      expect(toggle).toHaveAttribute('data-checked', 'true');
    });
  });

  it('renders correctly with all notifications disabled', () => {
    const allDisabled: NotificationPreferences = {
      emailNotifications: false,
      pushNotifications: false,
      marketingEmails: false,
      weeklyDigest: false,
      mentionNotifications: false,
    };

    render(
      <NotificationsSection 
        notifications={allDisabled} 
        onNotificationChange={mockOnNotificationChange} 
      />
    );
    
    const toggles = screen.getAllByRole('button');
    toggles.forEach(toggle => {
      expect(toggle).toHaveAttribute('data-checked', 'false');
    });
  });
});