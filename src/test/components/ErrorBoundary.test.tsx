/**
 * @fileoverview ErrorBoundary component tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders error title', () => {
    const mockError = new Error('Test error');
    const mockReset = vi.fn();

    render(<ErrorBoundary error={mockError} reset={mockReset} title="Custom Error" />);

    expect(screen.getByText('Custom Error')).toBeInTheDocument();
  });

  it('renders default title when not provided', () => {
    const mockError = new Error('Test error');
    const mockReset = vi.fn();

    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    expect(screen.getByText('出现了一些问题')).toBeInTheDocument();
  });

  it('renders error message', () => {
    const mockError = new Error('Something went wrong');
    const mockReset = vi.fn();

    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders default error message when error message is empty', () => {
    const mockError = new Error('');
    const mockReset = vi.fn();

    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    expect(screen.getByText('发生了意外错误，请稍后重试')).toBeInTheDocument();
  });

  it('calls reset function when reset button is clicked', () => {
    const mockError = new Error('Test error');
    const mockReset = vi.fn();

    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    const resetButton = screen.getByRole('button', { name: /重试/i });
    fireEvent.click(resetButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('does not render reset button when showReset is false', () => {
    const mockError = new Error('Test error');
    const mockReset = vi.fn();

    render(<ErrorBoundary error={mockError} reset={mockReset} showReset={false} />);

    const resetButton = screen.queryByRole('button', { name: /重试/i });
    expect(resetButton).not.toBeInTheDocument();
  });

  it('logs error in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const mockError = new Error('Test error');
    const mockReset = vi.fn();

    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    expect(console.group).toHaveBeenCalledWith('🚨 Error Boundary 捕获到错误');

    process.env.NODE_ENV = originalEnv;
  });

  it('handles error with digest', () => {
    const mockError = new Error('Test error') as Error & { digest?: string };
    mockError.digest = 'abc123';
    const mockReset = vi.fn();

    render(<ErrorBoundary error={mockError} reset={mockReset} />);

    // Should render without errors
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders without crashing for any error', () => {
    const mockError = new Error('Any error message');
    const mockReset = vi.fn();

    const { container } = render(<ErrorBoundary error={mockError} reset={mockReset} />);

    expect(container.firstChild).toBeInTheDocument();
  });
});