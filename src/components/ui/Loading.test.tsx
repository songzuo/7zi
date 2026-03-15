/**
 * @fileoverview Loading 组件测试
 * @module src/components/ui/Loading.test.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Loading from './Loading';

// Mock next/navigation for hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

describe('Loading Component', () => {
  describe('Spinner variant', () => {
    it('should render spinner with default props', () => {
      const { container } = render(<Loading />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('animate-spin');
    });

    it('should render spinner with small size', () => {
      const { container } = render(<Loading size="sm" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
    });

    it('should render spinner with medium size', () => {
      const { container } = render(<Loading size="md" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-6', 'w-6');
    });

    it('should render spinner with large size', () => {
      const { container } = render(<Loading size="lg" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-10', 'w-10');
    });

    it('should render spinner with label', () => {
      render(<Loading label="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Loading className="custom-class" />);
      expect(container.querySelector('svg')).toHaveClass('custom-class');
    });
  });

  describe('Skeleton variant', () => {
    it('should render skeleton with default props', () => {
      const { container } = render(<Loading variant="skeleton" />);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render skeleton with small size', () => {
      const { container } = render(<Loading variant="skeleton" size="sm" />);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toHaveClass('h-3');
    });

    it('should render skeleton with medium size', () => {
      const { container } = render(<Loading variant="skeleton" size="md" />);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toHaveClass('h-4');
    });

    it('should render skeleton with large size', () => {
      const { container } = render(<Loading variant="skeleton" size="lg" />);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toHaveClass('h-6');
    });

    it('should render skeleton with custom width and height', () => {
      const { container } = render(
        <Loading variant="skeleton" width="200px" height="20px" />
      );
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toHaveStyle({ width: '200px', height: '20px' });
    });
  });

  describe('Progress variant', () => {
    it('should render progress bar with default progress', () => {
      render(<Loading variant="progress" />);
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should render progress bar with custom progress value', () => {
      render(<Loading variant="progress" progress={50} />);
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should clamp progress to 0 when negative', () => {
      render(<Loading variant="progress" progress={-10} />);
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should clamp progress to 100 when exceeding 100', () => {
      render(<Loading variant="progress" progress={150} />);
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should render progress with label', () => {
      render(<Loading variant="progress" label="Uploading" progress={75} />);
      expect(screen.getByText('Uploading')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should show 100% when progress is exactly 100', () => {
      render(<Loading variant="progress" progress={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Props validation', () => {
    it('should use default variant when not specified', () => {
      const { container } = render(<Loading />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should use default size when not specified', () => {
      const { container } = render(<Loading />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-6', 'w-6');
    });
  });
});
