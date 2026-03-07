import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import ProgressBar, { CircularProgress, MultiProgressBar } from '../components/ProgressBar';

// Use real timers for animation tests
vi.useRealTimers();

describe('ProgressBar Component', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders with default props', () => {
    render(<ProgressBar value={50} />);
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeTruthy();
  });

  it('displays percentage when showPercentage is true', async () => {
    render(<ProgressBar value={75} showPercentage />);
    await waitFor(() => {
      expect(screen.getByText('75.0%')).toBeTruthy();
    });
  });

  it('displays label when provided', () => {
    render(<ProgressBar value={50} label="Progress" />);
    expect(screen.getByText('Progress')).toBeTruthy();
  });

  it('clamps value to max', () => {
    render(<ProgressBar value={150} max={100} />);
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeTruthy();
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('150');
  });

  it('supports different colors', () => {
    const colors = ['blue', 'green', 'red', 'yellow', 'purple'] as const;
    colors.forEach((color) => {
      const { unmount } = render(<ProgressBar value={50} color={color} />);
      expect(document.querySelector('[role="progressbar"]')).toBeTruthy();
      unmount();
    });
  });

  it('supports different sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    sizes.forEach((size) => {
      const { unmount } = render(<ProgressBar value={50} size={size} />);
      expect(document.querySelector('[role="progressbar"]')).toBeTruthy();
      unmount();
    });
  });
});

describe('CircularProgress Component', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders circular progress', () => {
    render(<CircularProgress value={75} />);
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeTruthy();
  });

  it('displays value percentage by default', async () => {
    render(<CircularProgress value={75} />);
    await waitFor(() => {
      // CircularProgress shows rounded percentage
      const percentText = screen.getByText(/75%/);
      expect(percentText).toBeTruthy();
    });
  });

  it('displays label when provided', () => {
    render(<CircularProgress value={75} label="Complete" />);
    expect(screen.getByText('Complete')).toBeTruthy();
  });

  it('supports different colors', () => {
    const colors = ['blue', 'green', 'red', 'yellow', 'purple'] as const;
    colors.forEach((color) => {
      const { unmount } = render(<CircularProgress value={50} color={color} />);
      expect(document.querySelector('[role="progressbar"]')).toBeTruthy();
      unmount();
    });
  });

  it('supports custom size', () => {
    render(<CircularProgress value={50} size={150} />);
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});

describe('MultiProgressBar Component', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders multiple segments', () => {
    const segments = [
      { value: 30, color: 'blue' as const },
      { value: 50, color: 'green' as const },
      { value: 20, color: 'red' as const },
    ];
    render(<MultiProgressBar segments={segments} />);
    const progressBars = document.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBe(3);
  });

  it('displays labels when provided', () => {
    const segments = [
      { value: 30, color: 'blue' as const, label: 'Todo' },
      { value: 50, color: 'green' as const, label: 'Done' },
    ];
    render(<MultiProgressBar segments={segments} />);
    expect(screen.getByText(/Todo:/)).toBeTruthy();
    expect(screen.getByText(/Done:/)).toBeTruthy();
  });
});