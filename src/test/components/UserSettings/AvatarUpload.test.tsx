import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AvatarUpload from '@/components/UserSettings/AvatarUpload';

describe('AvatarUpload', () => {
  const mockOnAvatarChange = vi.fn();

  it('renders default avatar placeholder', () => {
    render(<AvatarUpload avatar="" onAvatarChange={mockOnAvatarChange} />);
    const placeholder = screen.getByText('?');
    expect(placeholder).toBeInTheDocument();
  });

  it('renders current avatar when provided', () => {
    const avatarUrl = '/test-avatar.png';
    render(<AvatarUpload avatar={avatarUrl} onAvatarChange={mockOnAvatarChange} />);
    const avatarImg = screen.getByAltText('用户头像');
    expect(avatarImg).toHaveAttribute('src', avatarUrl);
  });

  it('shows change avatar overlay on hover', () => {
    const { container } = render(<AvatarUpload avatar="" onAvatarChange={mockOnAvatarChange} />);
    const avatarContainer = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(avatarContainer);
    // The overlay should be visible (opacity-100)
    const overlay = avatarContainer.querySelector('.opacity-100');
    expect(overlay).toBeInTheDocument();
  });

  it('hides change avatar overlay on mouse leave', () => {
    const { container } = render(<AvatarUpload avatar="" onAvatarChange={mockOnAvatarChange} />);
    const avatarContainer = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(avatarContainer);
    fireEvent.mouseLeave(avatarContainer);
    // The overlay should be hidden (opacity-0)
    const overlay = avatarContainer.querySelector('.opacity-0');
    expect(overlay).toBeInTheDocument();
  });

  it('calls onAvatarChange when a file is selected', () => {
    const { container } = render(<AvatarUpload avatar="" onAvatarChange={mockOnAvatarChange} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile]
    });
    fireEvent.change(fileInput);
    expect(mockOnAvatarChange).toHaveBeenCalled();
  });

  it('creates local URL for preview when a file is selected', () => {
    const { container } = render(<AvatarUpload avatar="" onAvatarChange={mockOnAvatarChange} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile]
    });
    fireEvent.change(fileInput);
    expect(mockOnAvatarChange).toHaveBeenCalledWith(expect.stringMatching(/^blob:/));
  });
});
