/**
 * LoadingSpinner Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render spinner with default props', () => {
      render(<LoadingSpinner />);
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
      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
    });

    it('should render bars variant', () => {
      const { container } = render(<LoadingSpinner variant="bars" />);
      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4);
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
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<LoadingSpinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-label when label is provided', () => {
      render(<LoadingSpinner label="Custom loading message" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Custom loading message');
    });
  });
});
