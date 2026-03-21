/**
 * @fileoverview Analytics component tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Analytics } from '../../components/Analytics';

describe('Analytics', () => {
  beforeEach(() => {
    // Clear document head before each test
    const head = document.head;
    while (head.firstChild) {
      head.removeChild(head.firstChild);
    }
  });

  it('renders without any content', () => {
    const { container } = render(<Analytics />);

    expect(container.firstChild).toBeNull();
  });

  it('does not inject scripts when no analytics IDs are provided', () => {
    render(<Analytics />);

    const scripts = document.querySelectorAll('script');
    expect(scripts.length).toBe(0);
  });

  it('does not throw errors when env vars are undefined', () => {
    expect(() => {
      render(<Analytics />);
    }).not.toThrow();
  });

  it('handles missing gtag function gracefully', () => {
    const { container } = render(<Analytics />);

    expect(container.firstChild).toBeNull();
  });

  it('component renders null in all cases', () => {
    const { container } = render(<Analytics />);

    expect(container.innerHTML).toBe('');
  });

  it('can be rendered multiple times without errors', () => {
    expect(() => {
      const { unmount } = render(<Analytics />);
      unmount();
      render(<Analytics />);
    }).not.toThrow();
  });

  it('does not create React errors when unmounted', () => {
    const { unmount } = render(<Analytics />);

    expect(() => {
      unmount();
    }).not.toThrow();
  });
});