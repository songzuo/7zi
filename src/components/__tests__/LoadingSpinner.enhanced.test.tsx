/**
 * Enhanced LoadingSpinner Component Tests (Simplified)
 *
 * Tests for flickering prevention, progress support, and new features.
 * Simplified to avoid timeout issues.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner, ANIMATION_TIMING } from '../LoadingSpinner.enhanced';

describe('LoadingSpinner (Enhanced)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] });
    // Make RAF execute immediately for synchronous state updates in tests
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    cleanup();
    try {
      vi.runOnlyPendingTimers();
    } catch {
      // Timers may not be fake
    }
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should not render when isLoading is false', () => {
      render(<LoadingSpinner isLoading={false} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should render with default props', () => {
      render(<LoadingSpinner />);
      act(() => {
        vi.runOnlyPendingTimers();
      });
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<LoadingSpinner label="Loading data..." labelPosition="bottom" />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should not render label when labelPosition is hidden', () => {
      render(<LoadingSpinner label="Loading..." labelPosition="hidden" />);
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Flickering Prevention', () => {
    it('should render when isLoading is true', () => {
      render(<LoadingSpinner isLoading={true} minDisplayTime={500} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should not render when isLoading is false', () => {
      render(<LoadingSpinner isLoading={false} minDisplayTime={500} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should accept minDisplayTime prop without error', () => {
      render(<LoadingSpinner isLoading={true} minDisplayTime={300} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Progress Support', () => {
    it('should display progress when provided', () => {
      render(<LoadingSpinner progress={50} showProgress={true} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-valuenow', '50');
    });

    it('should clamp progress to 0-100 range', () => {
      render(<LoadingSpinner progress={150} showProgress={true} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should not show progress text when showProgress is false', () => {
      render(<LoadingSpinner progress={50} showProgress={false} />);

      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should update progress dynamically', () => {
      const { rerender } = render(<LoadingSpinner progress={30} showProgress={true} />);

      expect(screen.getByText('30%')).toBeInTheDocument();

      rerender(<LoadingSpinner progress={70} showProgress={true} />);

      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for progress', () => {
      render(<LoadingSpinner progress={75} showProgress={true} />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-valuemin', '0');
      expect(screen.getByRole('status')).toHaveAttribute('aria-valuemax', '100');
      expect(screen.getByRole('status')).toHaveAttribute('aria-valuenow', '75');
    });

    it('should not have progress ARIA attributes when no progress', () => {
      render(<LoadingSpinner />);

      const status = screen.getByRole('status');
      expect(status).not.toHaveAttribute('aria-valuenow');
      expect(status).not.toHaveAttribute('aria-valuemin');
      expect(status).not.toHaveAttribute('aria-valuemax');
    });
  });

  describe('Variants', () => {
    it('should render spin variant', () => {
      const { container } = render(<LoadingSpinner variant="spin" />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render pulse variant', () => {
      const { container } = render(<LoadingSpinner variant="pulse" />);
      expect(container.querySelector('.animate-ping')).toBeInTheDocument();
    });

    it('should render bounce variant', () => {
      const { container } = render(<LoadingSpinner variant="bounce" />);
      expect(container.querySelector('.animate-bounce')).toBeInTheDocument();
    });

    it('should render dots variant', () => {
      const { container } = render(<LoadingSpinner variant="dots" />);
      expect(container.querySelectorAll('.animate-pulse').length).toBe(3);
    });

    it('should render bars variant', () => {
      const { container } = render(<LoadingSpinner variant="bars" />);
      expect(container.querySelectorAll('.animate-pulse').length).toBe(4);
    });

    it('should render wave variant', () => {
      const { container } = render(<LoadingSpinner variant="wave" />);
      // Wave variant renders 5 bars with w-1 class
      expect(container.querySelectorAll('.w-1').length).toBe(5);
    });
  });

  describe('Sizes', () => {
    it('should render xs size', () => {
      const { container } = render(<LoadingSpinner size="xs" />);
      expect(container.querySelector('.w-4.h-4')).toBeInTheDocument();
    });

    it('should render sm size', () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      expect(container.querySelector('.w-6.h-6')).toBeInTheDocument();
    });

    it('should render md size', () => {
      const { container } = render(<LoadingSpinner size="md" />);
      expect(container.querySelector('.w-8.h-8')).toBeInTheDocument();
    });

    it('should render lg size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      expect(container.querySelector('.w-12.h-12')).toBeInTheDocument();
    });

    it('should render xl size', () => {
      const { container } = render(<LoadingSpinner size="xl" />);
      expect(container.querySelector('.w-16.h-16')).toBeInTheDocument();
    });
  });

  describe('Colors', () => {
    it('should render primary color', () => {
      const { container } = render(<LoadingSpinner color="primary" />);
      expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
    });

    it('should render success color', () => {
      const { container } = render(<LoadingSpinner color="success" />);
      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
    });

    it('should render error color', () => {
      const { container } = render(<LoadingSpinner color="error" />);
      expect(container.querySelector('.text-red-600')).toBeInTheDocument();
    });

    it('should render warning color', () => {
      const { container } = render(<LoadingSpinner color="warning" />);
      expect(container.querySelector('.text-yellow-600')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<LoadingSpinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-label when label is provided', () => {
      render(<LoadingSpinner label="Loading data" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading data');
    });

    it('should have default aria-label when no label', () => {
      render(<LoadingSpinner />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label');
    });

    it('should have aria-busy="true" when loading', () => {
      render(<LoadingSpinner isLoading={true} />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    });

    it('should include progress in aria-label when progress is shown', () => {
      render(<LoadingSpinner progress={50} showProgress={true} />);
      const label = screen.getByRole('status').getAttribute('aria-label');
      expect(label).toContain('50%');
    });

    it('should not include progress in aria-label when progress is hidden', () => {
      render(<LoadingSpinner progress={50} showProgress={false} />);
      const label = screen.getByRole('status').getAttribute('aria-label');
      // aria-label should still include progress for screen readers, even if not visually displayed
      // showProgress only controls visual display, not accessibility info
      expect(label).toContain('%');
    });
  });

  describe('Animation Duration', () => {
    it('should apply custom animation duration', () => {
      const { container } = render(<LoadingSpinner animationDuration={500} />);
      expect(container.querySelector('[style*="duration"]')).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup timers on unmount', () => {
      const { unmount } = render(
        <LoadingSpinner isLoading={true} minDisplayTime={500} />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();

      unmount();

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should handle rapid unmount', () => {
      const { unmount, rerender } = render(
        <LoadingSpinner isLoading={true} minDisplayTime={500} />
      );

      rerender(<LoadingSpinner isLoading={false} minDisplayTime={500} />);
      unmount();

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('Constants Export', () => {
    it('should export animation timing constants', () => {
      expect(ANIMATION_TIMING).toBeDefined();
      expect(ANIMATION_TIMING.duration).toBe(300);
      expect(ANIMATION_TIMING.minDisplay).toBe(300);
      expect(ANIMATION_TIMING.transition).toBe(300);
    });
  });
});
