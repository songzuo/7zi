import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PasswordForm } from '@/components/UserSettings/subcomponents/PasswordForm';
import type { SaveStatus } from '@/components/UserSettings/types';

describe('PasswordForm', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);
  const mockSaveStatus: SaveStatus = 'idle';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all password fields', () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    // Use placeholder text since labels aren't associated with inputs via htmlFor
    expect(screen.getByPlaceholderText('请输入当前密码')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入新密码')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请再次输入新密码')).toBeInTheDocument();
  });

  it('renders password placeholders', () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    expect(screen.getByPlaceholderText('请输入当前密码')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入新密码')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请再次输入新密码')).toBeInTheDocument();
  });

  it('renders update password button', () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    expect(screen.getByText('更新密码')).toBeInTheDocument();
  });

  it('shows password requirements helper text', () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    expect(screen.getByText('密码需包含至少 8 个字符，包括大小写字母和数字')).toBeInTheDocument();
  });

  it('allows typing in password fields', () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const currentPasswordInput = screen.getByPlaceholderText('请输入当前密码');
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    const confirmPasswordInput = screen.getByPlaceholderText('请再次输入新密码');
    
    fireEvent.change(currentPasswordInput, { target: { value: 'current123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPass123' } });
    
    expect(currentPasswordInput).toHaveValue('current123');
    expect(newPasswordInput).toHaveValue('NewPass123');
    expect(confirmPasswordInput).toHaveValue('NewPass123');
  });

  it('shows error for short password', async () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    fireEvent.change(newPasswordInput, { target: { value: 'short' } });
    
    const updateButton = screen.getByText('更新密码');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('密码至少需要 8 个字符')).toBeInTheDocument();
    });
  });

  it('shows error for password without lowercase', async () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    fireEvent.change(newPasswordInput, { target: { value: 'PASSWORD123' } });
    
    const updateButton = screen.getByText('更新密码');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('密码需要包含至少一个小写字母')).toBeInTheDocument();
    });
  });

  it('shows error for password without uppercase', async () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    
    const updateButton = screen.getByText('更新密码');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('密码需要包含至少一个大写字母')).toBeInTheDocument();
    });
  });

  it('shows error for password without number', async () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    fireEvent.change(newPasswordInput, { target: { value: 'PasswordWord' } });
    
    const updateButton = screen.getByText('更新密码');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('密码需要包含至少一个数字')).toBeInTheDocument();
    });
  });

  it('shows error for mismatched confirm password', async () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    const confirmPasswordInput = screen.getByPlaceholderText('请再次输入新密码');
    
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Different123' } });
    
    const updateButton = screen.getByText('更新密码');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument();
    });
  });

  it('shows error for empty confirm password', async () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    
    const updateButton = screen.getByText('更新密码');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText('请确认密码')).toBeInTheDocument();
    });
  });

  it('calls onSave with valid passwords', async () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const currentPasswordInput = screen.getByPlaceholderText('请输入当前密码');
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    const confirmPasswordInput = screen.getByPlaceholderText('请再次输入新密码');
    
    fireEvent.change(currentPasswordInput, { target: { value: 'OldPass123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPass123' } });
    
    const updateButton = screen.getByText('更新密码');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        currentPassword: 'OldPass123',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      });
    });
  });

  it('clears form after successful save', async () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const currentPasswordInput = screen.getByPlaceholderText('请输入当前密码');
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    const confirmPasswordInput = screen.getByPlaceholderText('请再次输入新密码');
    
    fireEvent.change(currentPasswordInput, { target: { value: 'OldPass123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPass123' } });
    
    const updateButton = screen.getByText('更新密码');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(currentPasswordInput).toHaveValue('');
      expect(newPasswordInput).toHaveValue('');
      expect(confirmPasswordInput).toHaveValue('');
    });
  });

  it('disables button when save status is saving', () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus="saving" />);
    
    const updateButton = screen.getByText('更新密码');
    expect(updateButton).toBeDisabled();
  });

  it('shows error border for invalid password field', async () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    fireEvent.change(newPasswordInput, { target: { value: 'short' } });
    
    const updateButton = screen.getByText('更新密码');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(newPasswordInput).toHaveClass('border-red-500');
    });
  });

  it('shows error border for mismatched confirm password', async () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    const confirmPasswordInput = screen.getByPlaceholderText('请再次输入新密码');
    
    fireEvent.change(newPasswordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Different123' } });
    
    const updateButton = screen.getByText('更新密码');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(confirmPasswordInput).toHaveClass('border-red-500');
    });
  });

  it('validates password on change', async () => {
    render(<PasswordForm onSave={mockOnSave} saveStatus={mockSaveStatus} />);
    
    const newPasswordInput = screen.getByPlaceholderText('请输入新密码');
    fireEvent.change(newPasswordInput, { target: { value: 'short' } });
    
    await waitFor(() => {
      expect(screen.getByText('密码至少需要 8 个字符')).toBeInTheDocument();
    });
  });
});