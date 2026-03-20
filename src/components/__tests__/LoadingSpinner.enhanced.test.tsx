/**
 * Enhanced LoadingSpinner Component Tests
 *
 * Tests for flickering prevention, progress support, and new features.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
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
    vi.runOnlyPendingTimers();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should not render when isLoading is false', () => {
      render(<LoadingSpinner isLoading={false} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should render with default props', async () => {
      render(<LoadingSpinner />);
      // RAF executes immediately, so state updates sync
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('should render with custom label', async () => {
      render(<LoadingSpinner label="Loading data..." labelPosition="bottom" />);
      await waitFor(() => {
        expect(screen.getByText('Loading data...')).toBeInTheDocument();
      });
    });

    it('should not render label when labelPosition is hidden', () => {
      render(<LoadingSpinner label="Loading..." labelPosition="hidden" />);
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Flickering Prevention', () => {
    it('should enforce minimum display time', async () => {
      const { rerender } = render(
        <LoadingSpinner isLoading={true} minDisplayTime={500} />
      );

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Stop loading
      rerender(<LoadingSpinner isLoading={false} minDisplayTime={500} />);

      // Should still be visible due to minDisplayTime
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Advance time past minDisplayTime
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('should not show flicker for quick loads', async () => {
      const { rerender } = render(
        <LoadingSpinner isLoading={true} minDisplayTime={300} />
      );

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Stop loading quickly (50ms)
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
      rerender(<LoadingSpinner isLoading={false} minDisplayTime={300} />);

      // Should remain visible for full 300ms
      expect(screen.getByRole('status')).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('should handle rapid loading state changes', async () => {
      const { rerender } = render(
        <LoadingSpinner isLoading={false} minDisplayTime={300} />
      );

      // Start loading
      rerender(<LoadingSpinner isLoading={true} minDisplayTime={300} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Stop quickly
      rerender(<LoadingSpinner isLoading={false} minDisplayTime={300} />);

      // Should still be visible due to minDisplayTime
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Progress Support', () => {
    it('should display progress when provided', async () => {
      render(<LoadingSpinner progress={50} showProgress={true} />);

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument();
      });
      expect(screen.getByRole('status')).toHaveAttribute('aria-valuenow', '50');
    });

    it('should clamp progress to 0-100 range', async () => {
      render(<LoadingSpinner progress={150} showProgress={true} />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('should not show progress text when showProgress is false', async () => {
      render(<LoadingSpinner progress={50} showProgress={false} />);

      await waitFor(() => {
        expect(screen.queryByText('50%')).not.toBeInTheDocument();
      });
    });

    it('should update progress dynamically', async () => {
      const { rerender } = render(
        <LoadingSpinner progress={25} showProgress={true} />
      );

      await waitFor(() => {
        expect(screen.getByText('25%')).toBeInTheDocument();
      });

      rerender(<LoadingSpinner progress={75} showProgress={true} />);

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });

    it('should have proper ARIA attributes for progress', async () => {
      render(<LoadingSpinner progress={60} showProgress={true} />);

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-valuemin', '0');
        expect(status).toHaveAttribute('aria-valuemax', '100');
        expect(status).toHaveAttribute('aria-valuenow', '60');
      });
    });

    it('should not have progress ARIA attributes when no progress', async () => {
      render(<LoadingSpinner />);

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).not.toHaveAttribute('aria-valuemin');
        expect(status).not.toHaveAttribute('aria-valuemax');
        expect(status).not.toHaveAttribute('aria-valuenow');
      });
    });
  });

  describe('Variants', () => {
    it('should render spin variant', async () => {
      const { container } = render(<LoadingSpinner variant="spin" />);
      await waitFor(() => {
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
      });
    });

    it('should render pulse variant', async () => {
      const { container } = render(<LoadingSpinner variant="pulse" />);
      await waitFor(() => {
        expect(container.querySelector('.animate-ping')).toBeInTheDocument();
      });
    });

    it('should render bounce variant', async () => {
      const { container } = render(<LoadingSpinner variant="bounce" />);
      await waitFor(() => {
        expect(container.querySelector('.animate-bounce')).toBeInTheDocument();
      });
    });

    it('should render dots variant', async () => {
      const { container } = render(<LoadingSpinner variant="dots" />);
      await waitFor(() => {
        expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
      });
    });

    it('should render bars variant', async () => {
      const { container } = render(<LoadingSpinner variant="bars" />);
      await waitFor(() => {
        expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4);
      });
    });

    it('should render wave variant', async () => {
      const { container } = render(<LoadingSpinner variant="wave" />);
      await waitFor(() => {
        expect(container.querySelectorAll('div[style*="height:"]').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sizes', () => {
    it('should render xs size', async () => {
      const { container } = render(<LoadingSpinner size="xs" />);
      await waitFor(() => {
        expect(container.querySelector('.w-4.h-4')).toBeInTheDocument();
      });
    });

    it('should render sm size', async () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      await waitFor(() => {
        expect(container.querySelector('.w-6.h-6')).toBeInTheDocument();
      });
    });

    it('should render md size', async () => {
      const { container } = render(<LoadingSpinner size="md" />);
      await waitFor(() => {
        expect(container.querySelector('.w-8.h-8')).toBeInTheDocument();
      });
    });

    it('should render lg size', async () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      await waitFor(() => {
        expect(container.querySelector('.w-12.h-12')).toBeInTheDocument();
      });
    });

    it('should render xl size', async () => {
      const { container } = render(<LoadingSpinner size="xl" />);
      await waitFor(() => {
        expect(container.querySelector('.w-16.h-16')).toBeInTheDocument();
      });
    });
  });

  describe('Colors', () => {
    it('should render primary color', async () => {
      const { container } = render(<LoadingSpinner color="primary" />);
      await waitFor(() => {
        expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
      });
    });

    it('should render success color', async () => {
      const { container } = render(<LoadingSpinner color="success" />);
      await waitFor(() => {
        expect(container.querySelector('.text-green-600')).toBeInTheDocument();
      });
    });

    it('should render error color', async () => {
      const { container } = render(<LoadingSpinner color="error" />);
      await waitFor(() => {
        expect(container.querySelector('.text-red-600')).toBeInTheDocument();
      });
    });

    it('should render warning color', async () => {
      const { container } = render(<LoadingSpinner color="warning" />);
      await waitFor(() => {
        expect(container.querySelector('.text-yellow-600')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', async () => {
      render(<LoadingSpinner />);
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('should have aria-label when label is provided', async () => {
      render(<LoadingSpinner label="Custom loading message" />);
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Custom loading message');
      });
    });

    it('should have default aria-label when no label', async () => {
      render(<LoadingSpinner />);
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading...');
      });
    });

    it('should have aria-busy="true" when loading', async () => {
      render(<LoadingSpinner />);
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
      });
    });

    it('should include progress in aria-label when progress is shown', async () => {
      render(<LoadingSpinner progress={75} showProgress={true} />);
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading: 75%');
      });
    });

    it('should not include progress in aria-label when progress is hidden', async () => {
      render(<LoadingSpinner progress={75} showProgress={false} />);
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading...');
      });
    });
  });

  describe('Animation Duration', () => {
    it('should apply custom animation duration', async () => {
      render(<LoadingSpinner animationDuration={500} />);
      await waitFor(() => {
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveStyle({ transitionDuration: '500ms' });
      });
    });
  });

  describe('Unmount Behavior', () => {
    it('should cleanup timers on unmount', async () => {
      const { unmount } = render(
        <LoadingSpinner isLoading={true} minDisplayTime={500} />
      );

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Start unmount before minDisplayTime completes
      unmount();

      // Should not throw any errors
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    });

    it('should handle rapid unmount', async () => {
      const { unmount } = render(<LoadingSpinner />);
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Immediately unmount
      unmount();

      // Should not throw any errors
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('ANIMATION_TIMING Constants', () => {
    it('should export animation timing constants', () => {
      expect(ANIMATION_TIMING).toEqual({
        duration: 300,
        minDisplay: 300,
        transition: 300,
      });
    });
  });
});
