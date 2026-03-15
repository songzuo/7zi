/**
 * @fileoverview Modal 组件测试
 * @module src/components/ui/Modal.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Modal, { ModalButton } from './Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div data-testid="modal-content">Modal Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up body overflow style
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
    });

    it('should render children correctly', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <h2>Title</h2>
          <p>Description</p>
        </Modal>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(<Modal {...defaultProps} title="Modal Title" />);
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
    });

    it('should have proper aria attributes', () => {
      render(<Modal {...defaultProps} title="Test Modal" />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should not have aria-labelledby when no title', () => {
      render(<Modal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).not.toHaveAttribute('aria-labelledby');
    });
  });

  describe('Sizes', () => {
    it('should apply sm size', () => {
      const { container } = render(<Modal {...defaultProps} size="sm" />);
      expect(container.querySelector('.max-w-sm')).toBeInTheDocument();
    });

    it('should apply md size (default)', () => {
      const { container } = render(<Modal {...defaultProps} size="md" />);
      expect(container.querySelector('.max-w-md')).toBeInTheDocument();
    });

    it('should apply lg size', () => {
      const { container } = render(<Modal {...defaultProps} size="lg" />);
      expect(container.querySelector('.max-w-lg')).toBeInTheDocument();
    });

    it('should apply xl size', () => {
      const { container } = render(<Modal {...defaultProps} size="xl" />);
      expect(container.querySelector('.max-w-xl')).toBeInTheDocument();
    });

    it('should apply full size', () => {
      const { container } = render(<Modal {...defaultProps} size="full" />);
      expect(container.querySelector('.max-w-\\[95vw\\]')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('should show close button by default', () => {
      render(<Modal {...defaultProps} title="Test" />);
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('should hide close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} title="Test" showCloseButton={false} />);
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} title="Test" />);
      
      fireEvent.click(screen.getByLabelText('Close modal'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Backdrop Click', () => {
    it('should close modal on backdrop click by default', () => {
      const onClose = vi.fn();
      const { container } = render(<Modal {...defaultProps} onClose={onClose} />);
      
      // Click on the backdrop (the outer container)
      const backdrop = container.querySelector('.fixed.inset-0');
      fireEvent.click(backdrop!);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close modal on backdrop click when closeOnBackdrop is false', () => {
      const onClose = vi.fn();
      const { container } = render(
        <Modal {...defaultProps} onClose={onClose} closeOnBackdrop={false} />
      );
      
      const backdrop = container.querySelector('.fixed.inset-0');
      fireEvent.click(backdrop!);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not close when clicking inside modal content', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      // Click on the modal content (not backdrop)
      fireEvent.click(screen.getByTestId('modal-content'));
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Escape Key', () => {
    it('should close modal on Escape key by default', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close modal on Escape key when closeOnEscape is false', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not respond to other keys', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space' });
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Lock', () => {
    it('should prevent body scroll when modal is open by default', async () => {
      const { unmount } = render(<Modal {...defaultProps} />);
      
      expect(document.body.style.overflow).toBe('hidden');
      
      unmount();
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('');
      });
    });

    it('should not prevent body scroll when preventScroll is false', () => {
      render(<Modal {...defaultProps} preventScroll={false} />);
      expect(document.body.style.overflow).not.toBe('hidden');
    });

    it('should restore body scroll when modal closes', async () => {
      const { rerender } = render(<Modal {...defaultProps} />);
      
      expect(document.body.style.overflow).toBe('hidden');
      
      // Close the modal
      rerender(<Modal {...defaultProps} isOpen={false} />);
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('');
      });
    });

    it('should restore body scroll on unmount', async () => {
      const { unmount } = render(<Modal {...defaultProps} />);
      
      expect(document.body.style.overflow).toBe('hidden');
      
      unmount();
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('');
      });
    });
  });

  describe('Footer', () => {
    it('should render footer when provided', () => {
      render(
        <Modal
          {...defaultProps}
          footer={
            <div data-testid="footer">
              <button>Cancel</button>
              <button>Confirm</button>
            </div>
          }
        />
      );

      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('should not render footer when not provided', () => {
      const { container } = render(<Modal {...defaultProps} />);
      expect(container.querySelector('.border-t.border-border.bg-muted\\/30')).not.toBeInTheDocument();
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom className', () => {
      const { container } = render(<Modal {...defaultProps} className="custom-modal" />);
      expect(container.querySelector('.custom-modal')).toBeInTheDocument();
    });

    it('should apply custom contentClassName', () => {
      const { container } = render(<Modal {...defaultProps} contentClassName="custom-content" />);
      expect(container.querySelector('.custom-content')).toBeInTheDocument();
    });
  });

  describe('Animations', () => {
    it('should apply scale animation by default', () => {
      const { container } = render(<Modal {...defaultProps} />);
      expect(container.querySelector('.animate-scale-in')).toBeInTheDocument();
    });

    it('should apply fade animation', () => {
      const { container } = render(<Modal {...defaultProps} animation="fade" />);
      expect(container.querySelector('.animate-fade-in')).toBeInTheDocument();
    });

    it('should apply slide-up animation', () => {
      const { container } = render(<Modal {...defaultProps} animation="slide-up" />);
      expect(container.querySelector('.animate-slide-up')).toBeInTheDocument();
    });

    it('should apply slide-down animation', () => {
      const { container } = render(<Modal {...defaultProps} animation="slide-down" />);
      expect(container.querySelector('.animate-slide-down')).toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    it('should be centered by default', () => {
      const { container } = render(<Modal {...defaultProps} />);
      expect(container.querySelector('.items-center')).toBeInTheDocument();
    });

    it('should position at top when centered is false', () => {
      const { container } = render(<Modal {...defaultProps} centered={false} />);
      expect(container.querySelector('.items-start')).toBeInTheDocument();
      expect(container.querySelector('.pt-10')).toBeInTheDocument();
    });
  });

  describe('Structure', () => {
    it('should have correct header structure when title is provided', () => {
      const { container } = render(<Modal {...defaultProps} title="Test Title" />);
      
      // Header should be present
      const header = container.querySelector('.flex.items-center.justify-between');
      expect(header).toBeInTheDocument();
    });

    it('should have header structure when only close button is shown', () => {
      const { container } = render(<Modal {...defaultProps} showCloseButton={true} />);
      
      // Header should still be present for close button
      const header = container.querySelector('.flex.items-center.justify-between');
      expect(header).toBeInTheDocument();
    });

    it('should not render header when no title and no close button', () => {
      const { container } = render(
        <Modal {...defaultProps} title={undefined} showCloseButton={false} />
      );
      
      const header = container.querySelector('.flex.items-center.justify-between');
      expect(header).not.toBeInTheDocument();
    });
  });
});

describe('ModalButton Component', () => {
  it('should render children', () => {
    render(<ModalButton>Click Me</ModalButton>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<ModalButton onClick={handleClick}>Click</ModalButton>);
    
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  describe('Variants', () => {
    it('should apply primary variant styles', () => {
      const { container } = render(<ModalButton variant="primary">Primary</ModalButton>);
      const button = container.querySelector('button');
      
      expect(button).toHaveClass('bg-primary');
      expect(button).toHaveClass('text-primary-foreground');
    });

    it('should apply secondary variant styles (default)', () => {
      const { container } = render(<ModalButton>Secondary</ModalButton>);
      const button = container.querySelector('button');
      
      expect(button).toHaveClass('bg-secondary');
      expect(button).toHaveClass('text-secondary-foreground');
    });

    it('should apply danger variant styles', () => {
      const { container } = render(<ModalButton variant="danger">Danger</ModalButton>);
      const button = container.querySelector('button');
      
      expect(button).toHaveClass('bg-destructive');
      expect(button).toHaveClass('text-destructive-foreground');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled is true', () => {
      render(<ModalButton disabled>Disabled</ModalButton>);
      expect(screen.getByText('Disabled')).toBeDisabled();
    });

    it('should apply disabled styles', () => {
      const { container } = render(<ModalButton disabled>Disabled</ModalButton>);
      const button = container.querySelector('button');
      
      expect(button).toHaveClass('disabled:opacity-50');
      expect(button).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  it('should apply custom className', () => {
    const { container } = render(<ModalButton className="custom-btn">Custom</ModalButton>);
    const button = container.querySelector('button');
    
    expect(button).toHaveClass('custom-btn');
  });
});

describe('Modal Integration', () => {
  it('should work with common modal patterns', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    
    render(
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Confirm Action"
        footer={
          <>
            <ModalButton onClick={onClose}>Cancel</ModalButton>
            <ModalButton variant="primary" onClick={onConfirm}>
              Confirm
            </ModalButton>
          </>
        }
      >
        <p>Are you sure you want to proceed?</p>
      </Modal>
    );

    // Verify modal structure
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();

    // Test interactions
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should handle form inside modal', () => {
    const handleSubmit = vi.fn((e) => e.preventDefault());
    
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Form Modal">
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Enter name" />
          <button type="submit">Submit</button>
        </form>
      </Modal>
    );

    fireEvent.click(screen.getByText('Submit'));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('should handle nested modals pattern (last opened closes first)', () => {
    const onCloseFirst = vi.fn();
    const onCloseSecond = vi.fn();
    
    const { rerender } = render(
      <Modal isOpen={true} onClose={onCloseFirst} title="First Modal">
        <p>First modal content</p>
      </Modal>
    );

    // Simulate opening second modal
    rerender(
      <>
        <Modal isOpen={true} onClose={onCloseFirst} title="First Modal">
          <p>First modal content</p>
        </Modal>
        <Modal isOpen={true} onClose={onCloseSecond} title="Second Modal">
          <p>Second modal content</p>
        </Modal>
      </>
    );

    // Both modals should be visible
    expect(screen.getByText('First Modal')).toBeInTheDocument();
    expect(screen.getByText('Second Modal')).toBeInTheDocument();

    // Escape should close the second modal (last in DOM)
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseSecond).toHaveBeenCalled();
  });
});