/**
 * Tests for VirtualizedList component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VirtualizedList from '../VirtualizedList';

describe('VirtualizedList', () => {
  const mockItems = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
  }));

  const renderItem = (item: { id: number; name: string }, index: number) => (
    <div data-testid={`item-${index}`}>{item.name}</div>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders visible items only', () => {
    render(
      <VirtualizedList
        items={mockItems}
        renderItem={renderItem}
        itemHeight={50}
        containerHeight={500}
      />
    );

    // Should render items within viewport + overscan
    // viewport: 500px, itemHeight: 50px, overscan: 3
    // Expected: 0-13 items (10 visible + 3 overscan + 3 overscan)
    expect(screen.getAllByTestId(/^item-/).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId(/^item-/).length).toBeLessThan(mockItems.length);
  });

  it('calls onScroll callback', () => {
    const onScroll = vi.fn();

    const { container } = render(
      <VirtualizedList
        items={mockItems}
        renderItem={renderItem}
        itemHeight={50}
        containerHeight={500}
        onScroll={onScroll}
      />
    );

    const scrollContainer = container.querySelector('.relative.overflow-auto');
    if (scrollContainer) {
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 100 } });
      expect(onScroll).toHaveBeenCalledWith(100);
    }
  });

  it('handles variable item heights', () => {
    const variableHeight = (index: number) => {
      return 40 + (index % 3) * 20; // 40, 60, 80, 40, 60, 80...
    };

    render(
      <VirtualizedList
        items={mockItems}
        renderItem={renderItem}
        itemHeight={variableHeight}
        containerHeight={500}
      />
    );

    expect(screen.getAllByTestId(/^item-/).length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <VirtualizedList
        items={mockItems}
        renderItem={renderItem}
        itemHeight={50}
        containerHeight={500}
        className="custom-class"
      />
    );

    const scrollContainer = container.querySelector('.relative.overflow-auto');
    expect(scrollContainer).toHaveClass('custom-class');
  });

  it('handles empty items list', () => {
    const { container } = render(
      <VirtualizedList
        items={[]}
        renderItem={renderItem}
        itemHeight={50}
        containerHeight={500}
      />
    );

    expect(container.querySelector('[role="img"]')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId(/^item-/).length).toBe(0);
  });

  it('handles single item', () => {
    render(
      <VirtualizedList
        items={[mockItems[0]]}
        renderItem={renderItem}
        itemHeight={50}
        containerHeight={500}
      />
    );

    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^item-/).length).toBe(1);
  });

  it('correctly positions items with absolute positioning', () => {
    const { container } = render(
      <VirtualizedList
        items={mockItems.slice(0, 10)}
        renderItem={renderItem}
        itemHeight={50}
        containerHeight={500}
      />
    );

    const items = screen.getAllByTestId(/^item-/);

    // Check that items have absolute positioning
    items.forEach((item, index) => {
      expect(item).toHaveClass('absolute');
      const top = parseInt(item.style.top);
      expect(top).toBe(index * 50);
    });
  });
});
