'use client';

import React, { useEffect, useCallback, ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size */
  size?: ModalSize;
  /** Show close button */
  showCloseButton?: boolean;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Footer content */
  footer?: ReactNode;
  /** Additional container class */
  className?: string;
  /** Additional content class */
  contentClassName?: string;
  /** Prevent body scroll when open */
  preventScroll?: boolean;
  /** Animation type */
  animation?: 'fade' | 'scale' | 'slide-up' | 'slide-down';
  /** Centered position */
  centered?: boolean;
}

// ============================================
// SIZE STYLES
// ============================================

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

// ============================================
// ANIMATION STYLES
// ============================================

const animationStyles: Record<string, { backdrop: string; content: string }> = {
  fade: {
    backdrop: 'animate-fade-in',
    content: 'animate-fade-in',
  },
  scale: {
    backdrop: 'animate-fade-in',
    content: 'animate-scale-in',
  },
  'slide-up': {
    backdrop: 'animate-fade-in',
    content: 'animate-slide-up',
  },
  'slide-down': {
    backdrop: 'animate-fade-in',
    content: 'animate-slide-down',
  },
};

// ============================================
// COMPONENT
// ============================================

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  footer,
  className = '',
  contentClassName = '',
  preventScroll = true,
  animation = 'scale',
  centered = true,
}: ModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose();
    }
  }, [closeOnEscape, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  // Effect for keyboard listener and body scroll
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      if (preventScroll) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (preventScroll) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, handleKeyDown, preventScroll]);

  if (!isOpen) return null;

  const animStyles = animationStyles[animation] || animationStyles.scale;

  return (
    <div
      className={`fixed inset-0 z-50 flex ${centered ? 'items-center' : 'items-start pt-10'} justify-center p-4 ${animStyles.backdrop}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className={`relative w-full ${sizeStyles[size]} bg-card rounded-xl shadow-xl border border-border ${animStyles.content} ${className}`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-foreground">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={`px-6 py-4 overflow-y-auto ${contentClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MODAL BUTTON COMPONENT
// ============================================

export interface ModalButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}

const buttonVariants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

export function ModalButton({
  children,
  onClick,
  variant = 'secondary',
  disabled = false,
  className = '',
}: ModalButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}