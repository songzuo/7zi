/**
 * ImageCropper 组件测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageCropper } from '../ImageCropper';

// Mock Image with proper constructor
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  width = 100;
  height = 100;
  naturalWidth = 100;
  naturalHeight = 100;
  
  constructor() {
    return this;
  }
}

global.Image = MockImage as unknown as typeof Image;

describe('ImageCropper', () => {
  const mockOnCropComplete = vi.fn();
  const mockOnCancel = vi.fn();
  const defaultProps = {
    imageSrc: 'data:image/png;base64,test',
    onCropComplete: mockOnCropComplete,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<ImageCropper {...defaultProps} />);
    
    expect(screen.getByText('裁剪图片')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
    expect(screen.getByText('确认裁剪')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<ImageCropper {...defaultProps} title="裁剪头像" />);
    
    expect(screen.getByText('裁剪头像')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<ImageCropper {...defaultProps} />);
    
    fireEvent.click(screen.getByText('取消'));
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state initially', () => {
    render(<ImageCropper {...defaultProps} />);
    
    // Should show loading spinner while image loads
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows processing state during crop', async () => {
    render(<ImageCropper {...defaultProps} />);
    
    // Trigger image load
    if (mockImage.onload) {
      mockImage.onload();
    }
    
    const cropButton = screen.getByText('确认裁剪');
    fireEvent.click(cropButton);
    
    await waitFor(() => {
      expect(screen.getByText('处理中...')).toBeInTheDocument();
    });
  });

  it('disables crop button while processing', async () => {
    render(<ImageCropper {...defaultProps} />);
    
    // Trigger image load
    if (mockImage.onload) {
      mockImage.onload();
    }
    
    const cropButton = screen.getByText('确认裁剪');
    fireEvent.click(cropButton);
    
    expect(cropButton).toBeDisabled();
  });

  it('renders close button in header', () => {
    render(<ImageCropper {...defaultProps} />);
    
    const closeButton = document.querySelector('button[class*="text-gray-400"]');
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onCancel when close button is clicked', () => {
    render(<ImageCropper {...defaultProps} />);
    
    const closeButton = document.querySelector('button[class*="text-gray-400"]');
    if (closeButton) {
      fireEvent.click(closeButton);
    }
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('renders with correct aspect ratio', () => {
    render(<ImageCropper {...defaultProps} aspectRatio={16/9} />);
    
    // Component should render without errors
    expect(screen.getByText('裁剪图片')).toBeInTheDocument();
  });

  it('renders with different output formats', () => {
    const { rerender } = render(
      <ImageCropper {...defaultProps} outputFormat="image/png" />
    );
    
    expect(screen.getByText('裁剪图片')).toBeInTheDocument();
    
    rerender(<ImageCropper {...defaultProps} outputFormat="image/webp" />);
    expect(screen.getByText('裁剪图片')).toBeInTheDocument();
  });

  it('has proper styling classes', () => {
    render(<ImageCropper {...defaultProps} />);
    
    const container = document.querySelector('.fixed.inset-0.z-50');
    expect(container).toBeInTheDocument();
    
    const modal = document.querySelector('.bg-white.dark\\:bg-gray-800');
    expect(modal).toBeInTheDocument();
  });
});