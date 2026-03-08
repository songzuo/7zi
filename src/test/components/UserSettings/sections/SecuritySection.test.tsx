import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecuritySection } from '@/components/UserSettings/sections/SecuritySection';
import type { SecuritySettings, SaveStatus } from '@/components/UserSettings/types';

// Mock useUserSettings hook
const mockHandleToggle2FA = vi.fn();
let mockSecurity: SecuritySettings = {
  twoFactorEnabled: false,
  lastPasswordChange: null,
};
let mockSaveStatus: SaveStatus = 'idle';

vi.mock('@/components/UserSettings/hooks/useUserSettings', () => ({
  useUserSettings: () => ({
    security: mockSecurity,
    saveStatus: mockSaveStatus,
    handleToggle2FA: mockHandleToggle2FA,
  }),
}));

// Mock PasswordForm
vi.mock('@/components/UserSettings/subcomponents/PasswordForm', () => ({
  default: () => <div data-testid="password-form">Password Form</div>,
}));

// Mock SectionCard
vi.mock('@/components/UserSettings/SectionCard', () => ({
  default: ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div data-testid="section-card">
      <h2>{icon} {title}</h2>
      {children}
    </div>
  ),
}));

describe('SecuritySection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSecurity = {
      twoFactorEnabled: false,
      lastPasswordChange: null,
    };
    mockSaveStatus = 'idle';
  });

  it('renders section title with icon', () => {
    render(<SecuritySection />);
    
    expect(screen.getByText('🔒 账户安全')).toBeInTheDocument();
  });

  it('renders PasswordForm', () => {
    render(<SecuritySection />);
    
    expect(screen.getByTestId('password-form')).toBeInTheDocument();
  });

  it('renders 2FA toggle section', () => {
    render(<SecuritySection />);
    
    expect(screen.getByText('两步验证')).toBeInTheDocument();
    expect(screen.getByText('为您的账户添加额外的安全保护')).toBeInTheDocument();
  });

  it('shows 2FA disabled state by default', () => {
    render(<SecuritySection />);
    
    // Toggle button should exist and not have bg-cyan-500 class (disabled state)
    const toggleButton = screen.getByRole('switch');
    expect(toggleButton).not.toHaveClass('bg-cyan-500');
  });

  it('calls handleToggle2FA when toggle is clicked', () => {
    render(<SecuritySection />);
    
    const toggleButton = screen.getByRole('switch');
    fireEvent.click(toggleButton);
    
    expect(mockHandleToggle2FA).toHaveBeenCalledOnce();
  });

  it('shows enabled state when 2FA is enabled', () => {
    mockSecurity.twoFactorEnabled = true;
    
    render(<SecuritySection />);
    
    // Toggle should show enabled state with bg-cyan-500
    const toggleButton = screen.getByRole('switch');
    expect(toggleButton).toHaveClass('bg-cyan-500');
    
    // Should show success message
    expect(screen.getByText('两步验证已启用')).toBeInTheDocument();
  });

  it('displays success icon when 2FA is enabled', () => {
    mockSecurity.twoFactorEnabled = true;
    
    render(<SecuritySection />);
    
    // Check for the success message container
    const successMessage = screen.getByText('两步验证已启用');
    expect(successMessage.closest('div')).toHaveClass('bg-green-50');
  });
});