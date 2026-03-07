import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LoadingSpinner } from '../components/LoadingSpinner';

// 清理 React StrictMode 导致的重复渲染
afterEach(() => {
  cleanup();
});

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeDefined();
    expect(spinner.getAttribute('aria-label')).toBe('加载中');
  });

  it('renders with small size', () => {
    render(<LoadingSpinner size="sm" />);
    const spinners = screen.getAllByRole('status');
    const spinner = spinners[spinners.length - 1];
    expect(spinner).toBeDefined();
    expect(spinner.className).toContain('w-4');
    expect(spinner.className).toContain('h-4');
  });

  it('renders with medium size', () => {
    render(<LoadingSpinner size="md" />);
    const spinners = screen.getAllByRole('status');
    const spinner = spinners[spinners.length - 1];
    expect(spinner).toBeDefined();
    expect(spinner.className).toContain('w-8');
    expect(spinner.className).toContain('h-8');
  });

  it('renders with large size', () => {
    render(<LoadingSpinner size="lg" />);
    const spinners = screen.getAllByRole('status');
    const spinner = spinners[spinners.length - 1];
    expect(spinner).toBeDefined();
    expect(spinner.className).toContain('w-12');
    expect(spinner.className).toContain('h-12');
  });

  it('has animate-spin class', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner.className).toContain('animate-spin');
  });

  it('has correct role for accessibility', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner.getAttribute('role')).toBe('status');
  });
});
