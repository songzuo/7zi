import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacySection } from '@/components/UserSettings/sections/PrivacySection';
import type { PrivacySettings } from '@/components/UserSettings/types';

// Mock SectionCard
vi.mock('@/components/UserSettings/SectionCard', () => ({
  default: ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div data-testid="section-card">
      <h2>{icon} {title}</h2>
      {children}
    </div>
  ),
}));

// Mock PrivacyOption
vi.mock('@/components/UserSettings/subcomponents/PrivacyOption', () => ({
  default: ({ label, description, checked, onChange }: { 
    label: string; 
    description: string; 
    checked: boolean; 
    onChange: () => void 
  }) => (
    <div data-testid={`privacy-option-${label}`}>
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

describe('PrivacySection', () => {
  const mockPrivacy: PrivacySettings = {
    profileVisibility: 'public',
    showEmail: false,
    showActivity: true,
    allowMessages: true,
    dataCollection: true,
  };

  const mockSetPrivacy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders section title with icon', () => {
    render(
      <PrivacySection 
        privacy={mockPrivacy} 
        setPrivacy={mockSetPrivacy} 
      />
    );
    
    expect(screen.getByText('🛡️ 隐私设置')).toBeInTheDocument();
  });

  it('renders profile visibility section', () => {
    render(
      <PrivacySection 
        privacy={mockPrivacy} 
        setPrivacy={mockSetPrivacy} 
      />
    );
    
    expect(screen.getByText('个人资料可见性')).toBeInTheDocument();
    expect(screen.getByText('公开')).toBeInTheDocument();
    expect(screen.getByText('仅好友')).toBeInTheDocument();
    expect(screen.getByText('私密')).toBeInTheDocument();
  });

  it('shows correct visibility descriptions', () => {
    render(
      <PrivacySection 
        privacy={mockPrivacy} 
        setPrivacy={mockSetPrivacy} 
      />
    );
    
    expect(screen.getByText('所有人可见')).toBeInTheDocument();
    expect(screen.getByText('仅好友可见')).toBeInTheDocument();
    expect(screen.getByText('仅自己可见')).toBeInTheDocument();
  });

  it('highlights selected visibility option', () => {
    render(
      <PrivacySection 
        privacy={mockPrivacy} 
        setPrivacy={mockSetPrivacy} 
      />
    );
    
    // 'public' should be selected by default
    const publicButton = screen.getByRole('button', { name: /公开/ });
    expect(publicButton).toHaveClass('border-cyan-500');
  });

  it('changes visibility when option is clicked', () => {
    render(
      <PrivacySection 
        privacy={mockPrivacy} 
        setPrivacy={mockSetPrivacy} 
      />
    );
    
    const privateButton = screen.getByRole('button', { name: /私密/ });
    fireEvent.click(privateButton);
    
    expect(mockSetPrivacy).toHaveBeenCalledWith({
      ...mockPrivacy,
      profileVisibility: 'private',
    });
  });

  it('renders all privacy options', () => {
    render(
      <PrivacySection 
        privacy={mockPrivacy} 
        setPrivacy={mockSetPrivacy} 
      />
    );
    
    expect(screen.getByText('显示邮箱地址')).toBeInTheDocument();
    expect(screen.getByText('显示活动状态')).toBeInTheDocument();
    expect(screen.getByText('允许私信')).toBeInTheDocument();
    expect(screen.getByText('数据收集')).toBeInTheDocument();
  });

  it('displays correct descriptions for privacy options', () => {
    render(
      <PrivacySection 
        privacy={mockPrivacy} 
        setPrivacy={mockSetPrivacy} 
      />
    );
    
    expect(screen.getByText('在个人主页显示您的邮箱')).toBeInTheDocument();
    expect(screen.getByText('让其他人看到您的在线状态')).toBeInTheDocument();
    expect(screen.getByText('允许其他用户给您发送私信')).toBeInTheDocument();
    expect(screen.getByText('允许收集匿名使用数据以改进产品')).toBeInTheDocument();
  });

  it('displays correct checked state for privacy toggles', () => {
    render(
      <PrivacySection 
        privacy={mockPrivacy} 
        setPrivacy={mockSetPrivacy} 
      />
    );
    
    // showEmail is false in mock
    const showEmailToggle = screen.getByLabelText('Toggle 显示邮箱地址');
    expect(showEmailToggle).toHaveAttribute('data-checked', 'false');
    
    // showActivity is true in mock
    const showActivityToggle = screen.getByLabelText('Toggle 显示活动状态');
    expect(showActivityToggle).toHaveAttribute('data-checked', 'true');
  });

  it('calls setPrivacy when privacy toggle is clicked', () => {
    render(
      <PrivacySection 
        privacy={mockPrivacy} 
        setPrivacy={mockSetPrivacy} 
      />
    );
    
    const showEmailToggle = screen.getByLabelText('Toggle 显示邮箱地址');
    fireEvent.click(showEmailToggle);
    
    expect(mockSetPrivacy).toHaveBeenCalledWith({
      ...mockPrivacy,
      showEmail: true,
    });
  });

  it('renders correctly with private visibility', () => {
    const privatePrivacy: PrivacySettings = {
      ...mockPrivacy,
      profileVisibility: 'private',
    };

    render(
      <PrivacySection 
        privacy={privatePrivacy} 
        setPrivacy={mockSetPrivacy} 
      />
    );
    
    const privateButton = screen.getByRole('button', { name: /私密/ });
    expect(privateButton).toHaveClass('border-cyan-500');
  });

  it('renders correctly with friends-only visibility', () => {
    const friendsPrivacy: PrivacySettings = {
      ...mockPrivacy,
      profileVisibility: 'friends',
    };

    render(
      <PrivacySection 
        privacy={friendsPrivacy} 
        setPrivacy={mockSetPrivacy} 
      />
    );
    
    const friendsButton = screen.getByRole('button', { name: /仅好友/ });
    expect(friendsButton).toHaveClass('border-cyan-500');
  });
});