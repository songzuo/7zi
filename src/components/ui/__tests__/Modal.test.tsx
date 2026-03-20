/**
 * Modal Component Test
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Modal, ConfirmDialog } from '../Modal';

describe('Modal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
          Content
        </Modal>
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          Content
        </Modal>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('renders content correctly', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('renders footer actions', () => {
      render(
        <Modal
          isOpen={true}
          onClose={mockOnClose}
          footer={<button>Footer Button</button>}
        >
          Content
        </Modal>
      );
      expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('applies xs size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="xs">
          Content
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      const modalContent = dialog.querySelector('.relative.bg-white');
      expect(modalContent).toHaveClass('max-w-xs');
    });

    it('applies sm size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="sm">
          Content
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      const modalContent = dialog.querySelector('.relative.bg-white');
      expect(modalContent).toHaveClass('max-w-sm');
    });

    it('applies md size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="md">
          Content
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      const modalContent = dialog.querySelector('.relative.bg-white');
      expect(modalContent).toHaveClass('max-w-md');
    });

    it('applies lg size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="lg">
          Content
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      const modalContent = dialog.querySelector('.relative.bg-white');
      expect(modalContent).toHaveClass('max-w-lg');
    });

    it('applies xl size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="xl">
          Content
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      const modalContent = dialog.querySelector('.relative.bg-white');
      expect(modalContent).toHaveClass('max-w-xl');
    });

    it('applies full size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="full">
          Content
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      const modalContent = dialog.querySelector('.relative.bg-white');
      expect(modalContent).toHaveClass('max-w-full');
    });
  });

  describe('Close Behavior', () => {
    it('closes on backdrop click when closeOnBackdropClick is true', () => {
      render(
        <Modal
          isOpen={true}
          onClose={mockOnClose}
          closeOnBackdropClick={true}
        >
          Content
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      // Click directly on the dialog container (the backdrop wrapper)
      fireEvent.click(dialog);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on backdrop click when closeOnBackdropClick is false', () => {
      render(
        <Modal
          isOpen={true}
          onClose={mockOnClose}
          closeOnBackdropClick={false}
        >
          Content
        </Modal>
      );
      
      const backdrop = screen.getByRole('dialog').parentElement;
      fireEvent.click(backdrop!);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('closes on escape key when closeOnEscape is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnEscape={true}>
          Content
        </Modal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('closes when close button is clicked', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} showCloseButton={true}>
          Content
        </Modal>
      );
      
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not show close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} showCloseButton={false}>
          Content
        </Modal>
      );
      
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('sets aria-modal to true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          Content
        </Modal>
      );
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('sets aria-labelledby when title is provided', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          Content
        </Modal>
      );
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('focuses modal content when opened', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <button>Inside Modal</button>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      const modalContent = dialog.querySelector('.relative.bg-white');
      expect(modalContent).toHaveFocus();
    });
  });

  describe('Body Scroll', () => {
    it('prevents body scroll when modal is open', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} preventBodyScroll={true}>
          Content
        </Modal>
      );
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when modal is closed', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose} preventBodyScroll={true}>
          Content
        </Modal>
      );
      
      rerender(
        <Modal isOpen={false} onClose={mockOnClose} preventBodyScroll={true}>
          Content
        </Modal>
      );
      
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('ConfirmDialog', () => {
    it('renders confirmation message', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          message="Are you sure?"
          onConfirm={vi.fn()}
        />
      );
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button is clicked', () => {
      const mockOnConfirm = vi.fn();
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          message="Are you sure?"
          onConfirm={mockOnConfirm}
          confirmText="Yes"
          cancelText="No"
        />
      );
      
      const confirmButton = screen.getByText('Yes');
      fireEvent.click(confirmButton);
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button is clicked', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          message="Are you sure?"
          onConfirm={vi.fn()}
          confirmText="Yes"
          cancelText="No"
        />
      );
      
      const cancelButton = screen.getByText('No');
      fireEvent.click(cancelButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
