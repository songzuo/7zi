import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileSection } from '@/components/UserSettings/sections/ProfileSection';

// Mock ProfileForm
vi.mock('@/components/UserSettings/subcomponents/ProfileForm', () => ({
  ProfileForm: () => <div data-testid="profile-form">Profile Form</div>,
}));

describe('ProfileSection', () => {
  it('renders ProfileForm when active', () => {
    render(<ProfileSection isActive={true} />);
    
    expect(screen.getByTestId('profile-form')).toBeInTheDocument();
  });

  it('does not render when not active', () => {
    const { container } = render(<ProfileSection isActive={false} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('defaults to active when isActive is not provided', () => {
    render(<ProfileSection />);
    
    expect(screen.getByTestId('profile-form')).toBeInTheDocument();
  });
});
