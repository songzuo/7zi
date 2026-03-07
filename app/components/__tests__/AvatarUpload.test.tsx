/**
 * AvatarUpload 组件测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvatarUpload } from '../AvatarUpload';

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('AvatarUpload', () => {
  const mockOnUpload = vi.fn();
  const defaultProps = {
    userId: 'user-123',
    onUpload: mockOnUpload,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<AvatarUpload {...defaultProps} />);
    
    // Should show avatar image
    const avatar = document.querySelector('img');
    expect(avatar).toBeInTheDocument();
    expect(avatar?.src).toContain('api.dicebear.com');
  });

  it('renders with custom avatar URL', () => {
    render(
      <AvatarUpload 
        {...defaultProps} 
        avatarUrl="/uploads/avatars/test.jpg" 
      />
    );
    
    const avatar = document.querySelector('img');
    expect(avatar?.src).toContain('/uploads/avatars/test.jpg');
  });

  it('shows hover overlay on mouse enter', async () => {
    render(<AvatarUpload {...defaultProps} />);
    
    const container = document.querySelector('.group');
    if (container) {
      fireEvent.mouseEnter(container);
      
      await waitFor(() => {
        const overlay = container.querySelector('.group-hover\\:opacity-100');
        expect(overlay).toBeInTheDocument();
      });
    }
  });

  it('opens file dialog on click', () => {
    render(<AvatarUpload {...defaultProps} />);
    
    const avatar = document.querySelector('.group');
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
    
    if (avatar) {
      fireEvent.click(avatar);
    }
    
    expect(clickSpy).toHaveBeenCalled();
  });

  it('handles file selection', async () => {
    render(<AvatarUpload {...defaultProps} enableCrop={false} />);
    
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalled();
    });
  });

  it('validates file type', async () => {
    render(<AvatarUpload {...defaultProps} enableCrop={false} />);
    
    const file = new File(['test'], 'avatar.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    await waitFor(() => {
      expect(screen.getByText(/不支持的文件格式/)).toBeInTheDocument();
    });
  });

  it('validates file size', async () => {
    render(
      <AvatarUpload 
        {...defaultProps} 
        enableCrop={false} 
        maxFileSize={100} // 100 bytes
      />
    );
    
    const file = new File(['x'.repeat(200)], 'avatar.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    await waitFor(() => {
      expect(screen.getByText(/文件太大/)).toBeInTheDocument();
    });
  });

  it('shows uploading state', () => {
    render(<AvatarUpload {...defaultProps} uploading={true} />);
    
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('disables when disabled prop is true', () => {
    render(<AvatarUpload {...defaultProps} disabled={true} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it('renders with different sizes', () => {
    const { container: sm } = render(
      <AvatarUpload {...defaultProps} size="sm" />
    );
    expect(sm.querySelector('.w-16.h-16')).toBeInTheDocument();
    
    const { container: md } = render(
      <AvatarUpload {...defaultProps} size="md" />
    );
    expect(md.querySelector('.w-24.h-24')).toBeInTheDocument();
    
    const { container: lg } = render(
      <AvatarUpload {...defaultProps} size="lg" />
    );
    expect(lg.querySelector('.w-32.h-32')).toBeInTheDocument();
    
    const { container: xl } = render(
      <AvatarUpload {...defaultProps} size="xl" />
    );
    expect(xl.querySelector('.w-40.h-40')).toBeInTheDocument();
  });

  it('renders with hint text', () => {
    render(
      <AvatarUpload 
        {...defaultProps} 
        hint="支持 JPG, PNG 格式" 
      />
    );
    
    expect(screen.getByText('支持 JPG, PNG 格式')).toBeInTheDocument();
  });

  it('handles drag and drop', async () => {
    render(<AvatarUpload {...defaultProps} enableCrop={false} />);
    
    const dropZone = document.querySelector('.group');
    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
    
    if (dropZone) {
      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });
    }
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalled();
    });
  });

  it('prevents click when uploading', () => {
    render(<AvatarUpload {...defaultProps} uploading={true} />);
    
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
    const avatar = document.querySelector('.group');
    
    if (avatar) {
      fireEvent.click(avatar);
    }
    
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('prevents click when disabled', () => {
    render(<AvatarUpload {...defaultProps} disabled={true} />);
    
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
    const avatar = document.querySelector('.group');
    
    if (avatar) {
      fireEvent.click(avatar);
    }
    
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('renders with custom allowed types', () => {
    render(
      <AvatarUpload 
        {...defaultProps} 
        allowedTypes={['image/jpeg', 'image/png']}
      />
    );
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input?.accept).toBe('image/jpeg,image/png');
  });
});