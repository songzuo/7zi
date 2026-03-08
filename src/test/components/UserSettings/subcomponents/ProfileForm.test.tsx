import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileForm } from '@/components/UserSettings/subcomponents/ProfileForm';
import type { UserProfile } from '@/components/UserSettings/types';

// Mock AvatarUpload
vi.mock('@/components/UserSettings/AvatarUpload', () => ({
  default: ({ avatar, onAvatarChange }: { avatar: string; onAvatarChange: (url: string) => void }) => (
    <div data-testid="avatar-upload">
      <span>Avatar: {avatar || 'none'}</span>
      <button onClick={() => onAvatarChange('/new-avatar.png')}>Change Avatar</button>
    </div>
  ),
}));

describe('ProfileForm', () => {
  const mockProfile: UserProfile = {
    nickname: 'Test User',
    avatar: '/avatar.png',
    bio: 'Test bio',
    email: 'test@example.com',
  };

  const mockOnProfileChange = vi.fn();
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    // Use placeholder text since labels aren't associated with inputs via htmlFor
    expect(screen.getByPlaceholderText('请输入您的昵称')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('介绍一下自己...')).toBeInTheDocument();
  });

  it('displays current profile values', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test bio')).toBeInTheDocument();
  });

  it('displays email as read-only', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    // Find email input by display value
    const emailInput = screen.getByDisplayValue('test@example.com');
    expect(emailInput).toBeDisabled();
  });

  it('shows avatar upload component', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
  });

  it('calls onProfileChange when nickname is changed', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    const nicknameInput = screen.getByPlaceholderText('请输入您的昵称');
    fireEvent.change(nicknameInput, { target: { value: 'New Name' } });
    
    expect(mockOnProfileChange).toHaveBeenCalledWith({
      ...mockProfile,
      nickname: 'New Name',
    });
  });

  it('calls onProfileChange when bio is changed', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    const bioTextarea = screen.getByPlaceholderText('介绍一下自己...');
    fireEvent.change(bioTextarea, { target: { value: 'New bio text' } });
    
    expect(mockOnProfileChange).toHaveBeenCalledWith({
      ...mockProfile,
      bio: 'New bio text',
    });
  });

  it('shows validation error for short nickname', async () => {
    const invalidProfile = { ...mockProfile, nickname: 'A' };
    
    render(
      <ProfileForm
        profile={invalidProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    const saveButton = screen.getByText('保存更改');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('昵称至少需要 2 个字符')).toBeInTheDocument();
    });
  });

  it('shows validation error for empty nickname', async () => {
    const invalidProfile = { ...mockProfile, nickname: '' };
    
    render(
      <ProfileForm
        profile={invalidProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    const saveButton = screen.getByText('保存更改');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('请输入昵称')).toBeInTheDocument();
    });
  });

  it('shows bio character count', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    expect(screen.getByText('8/200')).toBeInTheDocument();
  });

  it('disables save button when saving', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="saving"
      />
    );
    
    const saveButton = screen.getByText('保存中...');
    expect(saveButton).toBeDisabled();
  });

  it('shows saving text when saving', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="saving"
      />
    );
    
    expect(screen.getByText('保存中...')).toBeInTheDocument();
  });

  it('shows saved indicator when save is successful', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="saved"
      />
    );
    
    expect(screen.getByText('已保存')).toBeInTheDocument();
  });

  it('shows error message when save fails', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="error"
      />
    );
    
    expect(screen.getByText('保存失败，请重试')).toBeInTheDocument();
  });

  it('calls onSave when form is valid and save is clicked', async () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    const saveButton = screen.getByText('保存更改');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('does not call onSave when form is invalid', async () => {
    const invalidProfile = { ...mockProfile, nickname: '' };
    
    render(
      <ProfileForm
        profile={invalidProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    const saveButton = screen.getByText('保存更改');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  it('updates avatar when AvatarUpload calls onAvatarChange', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    const changeAvatarButton = screen.getByText('Change Avatar');
    fireEvent.click(changeAvatarButton);
    
    expect(mockOnProfileChange).toHaveBeenCalledWith({
      ...mockProfile,
      avatar: '/new-avatar.png',
    });
  });

  it('shows email helper text', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    expect(screen.getByText('邮箱地址不可更改，如需帮助请联系客服')).toBeInTheDocument();
  });

  it('shows required indicator for nickname', () => {
    render(
      <ProfileForm
        profile={mockProfile}
        onProfileChange={mockOnProfileChange}
        onSave={mockOnSave}
        saveStatus="idle"
      />
    );
    
    const requiredIndicator = screen.getByText('*');
    expect(requiredIndicator).toHaveClass('text-red-500');
  });
});