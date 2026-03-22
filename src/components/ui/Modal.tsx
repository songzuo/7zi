/**
 * Modal/Dialog Component
 *
 * A responsive modal dialog component with backdrop, animation, and keyboard support.
 *
 * @module components/ui/Modal
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { useTranslations } from 'next-intl';

/**
 * Modal size presets
 */
export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Modal component props
 */
export interface ModalProps {
  /** Modal visibility */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal footer actions */
  footer?: React.ReactNode;
  /** Modal size (default: 'md') */
  size?: ModalSize;
  /** Close on backdrop click (default: true) */
  closeOnBackdropClick?: boolean;
  /** Close on escape key (default: true) */
  closeOnEscape?: boolean;
  /** Show close button (default: true) */
  showCloseButton?: boolean;
  /** Additional class name for modal content */
  className?: string;
  /** Additional class name for backdrop */
  backdropClassName?: string;
  /** Prevent body scroll when open (default: true) */
  preventBodyScroll?: boolean;
}

/**
 * Size configurations
 */
const SIZE_CONFIG: Record<ModalSize, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

/**
 * Close icon component with i18n
 */
const CloseIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const t = useTranslations('ui.modal');

  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      aria-label={t('close')}
    >
      <svg
        className="w-5 h-5 text-zinc-500 dark:text-zinc-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
};

/**
 * Main Modal component
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  backdropClassName,
  preventBodyScroll = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && closeOnEscape) {
      onClose();
    }
  }, [closeOnEscape, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  }, [closeOnBackdropClick, onClose]);

  // Store previous active element
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Manage body scroll and focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scroll
    if (preventBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    // Focus on modal
    if (modalRef.current) {
      modalRef.current.focus();
    }

    // Add escape key listener
    document.addEventListener('keydown', handleEscape);

    return () => {
      // Restore body scroll
      if (preventBodyScroll) {
        document.body.style.overflow = '';
      }

      // Remove escape key listener
      document.removeEventListener('keydown', handleEscape);

      // Restore focus to previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleEscape, preventBodyScroll]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'animate-in fade-in duration-200',
        backdropClassName
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        ref={modalRef}
        className={cn(
          'relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl',
          'w-full',
          SIZE_CONFIG[size],
          'animate-in zoom-in-95 duration-200',
          'max-h-[90vh] overflow-hidden flex flex-col',
          className
        )}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            {title && (
              <h2
                id="modal-title"
                className="text-xl font-semibold text-zinc-900 dark:text-white"
              >
                {title}
              </h2>
            )}
            {showCloseButton && <CloseIcon onClick={onClose} />}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-200 dark:border-zinc-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Confirm Dialog - A specialized modal for confirmations with i18n
 */
export interface ConfirmDialogProps extends Omit<ModalProps, 'children' | 'footer'> {
  /** Confirmation message */
  message: string;
  /** Confirm button text (default: translated 'confirm') */
  confirmText?: string;
  /** Cancel button text (default: translated 'cancel') */
  cancelText?: string;
  /** Confirm button variant (default: 'danger') */
  confirmVariant?: 'primary' | 'danger';
  /** On confirm callback */
  onConfirm: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmText,
  cancelText,
  confirmVariant = 'danger',
  onConfirm,
  onClose,
  ...modalProps
}) => {
  const t = useTranslations('ui');
  const tModal = useTranslations('ui.modal');

  return (
    <Modal
      {...modalProps}
      title={title || tModal('confirmTitle')}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelText || t('button.cancel')}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText || t('button.confirm')}
          </Button>
        </>
      }
    >
      <p className="text-zinc-700 dark:text-zinc-300">{message || tModal('confirmMessage')}</p>
    </Modal>
  );
};

export default Modal;
