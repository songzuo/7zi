/**
 * Tests for LazyLoadImage component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LazyLoadImage from '../LazyLoadImage';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

describe('LazyLoadImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders with placeholder when image is loading', () => {
    render(
      <LazyLoadImage
        src="test-image.jpg"
        alt="Test Image"
        placeholder="data:image/svg+xml;base64,test"
      />
    );

    const placeholder = screen.getByRole('img', { hidden: true });
    expect(placeholder).toBeInTheDocument();
  });

  it('loads image when in viewport', async () => {
    const mockEntry = { isIntersecting: true };
    let observerCallback: IntersectionObserverCallback;

    mockIntersectionObserver.mockImplementation((callback: IntersectionObserverCallback) => {
      observerCallback = callback;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    });

    render(
      <LazyLoadImage
        src="test-image.jpg"
        alt="Test Image"
        priority={false}
      />
    );

    // Simulate intersection
    act(() => {
      observerCallback([mockEntry]);
    });

    await waitFor(() => {
      const img = screen.getByAltText('Test Image');
      expect(img).toBeInTheDocument();
    });
  });

  it('loads image immediately when priority is true', async () => {
    render(
      <LazyLoadImage
        src="test-image.jpg"
        alt="Test Image"
        priority={true}
      />
    );

    await waitFor(() => {
      const img = screen.getByAltText('Test Image');
      expect(img).toBeInTheDocument();
    });
  });

  it('handles image load error', async () => {
    render(
      <LazyLoadImage
        src="test-image.jpg"
        alt="Test Image"
        priority={true}
      />
    );

    const img = await screen.findByAltText('Test Image');

    // Simulate error
    act(() => {
      img.dispatchEvent(new Event('error'));
    });

    await waitFor(() => {
      const errorIcon = screen.getByRole('img', { name: /Failed to load/i });
      expect(errorIcon).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(
      <LazyLoadImage
        src="test-image.jpg"
        alt="Test Image"
        className="custom-class"
        priority={true}
      />
    );

    const container = screen.getByRole('img').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('respects width and height props', () => {
    render(
      <LazyLoadImage
        src="test-image.jpg"
        alt="Test Image"
        width={200}
        height={150}
        priority={true}
      />
    );

    const container = screen.getByRole('img').parentElement;
    expect(container).toHaveStyle({ width: '200px', height: '150px' });
  });
});
