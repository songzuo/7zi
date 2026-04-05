'use client';

/**
 * VirtualizedList Component
 * High-performance virtual scrolling for large lists
 * Only renders visible items for optimal performance
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
  useMemo,
} from 'react';
import { cn } from '@/lib/utils';

export interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  scrollElement?: HTMLElement | Window;
}

function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 3,
  className,
  onScroll,
  scrollElement,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate item heights
  const getItemHeight = useCallback(
    (index: number) => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );

  // Calculate total height and item positions
  const { totalHeight, itemPositions } = useMemo(() => {
    const positions: number[] = [];
    let total = 0;

    for (let i = 0; i < items.length; i++) {
      positions.push(total);
      total += getItemHeight(i);
    }

    return { totalHeight: total, itemPositions: positions };
  }, [items.length, getItemHeight]);

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    let start = 0;
    let end = items.length - 1;

    // Binary search for start index
    let low = 0;
    let high = items.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const itemTop = itemPositions[mid];
      const itemBottom = itemTop + getItemHeight(mid);

      if (itemBottom < scrollTop) {
        low = mid + 1;
      } else if (itemTop > scrollTop + containerHeight) {
        high = mid - 1;
      } else {
        start = mid;
        break;
      }
    }

    // Find end index
    let currentHeight = itemPositions[start] || 0;
    end = start;
    while (end < items.length - 1 && currentHeight < scrollTop + containerHeight) {
      end++;
      currentHeight += getItemHeight(end);
    }

    // Apply overscan
    return {
      startIndex: Math.max(0, start - overscan),
      endIndex: Math.min(items.length - 1, end + overscan),
    };
  }, [scrollTop, containerHeight, itemPositions, items.length, getItemHeight, overscan]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  // Sync with external scroll element
  useEffect(() => {
    if (!scrollElement) return;

    const handleExternalScroll = () => {
      const newScrollTop =
        scrollElement instanceof Window
          ? scrollElement.scrollY
          : scrollElement.scrollTop;
      setScrollTop(newScrollTop);
    };

    scrollElement.addEventListener('scroll', handleExternalScroll, { passive: true });
    return () => {
      scrollElement.removeEventListener('scroll', handleExternalScroll);
    };
  }, [scrollElement]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const result: React.ReactNode[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      const item = items[i];
      const top = itemPositions[i];
      const height = getItemHeight(i);

      result.push(
        <div
          key={i}
          className="absolute left-0 right-0"
          style={{ top, height }}
        >
          {renderItem(item, i)}
        </div>
      );
    }

    return result;
  }, [startIndex, endIndex, items, itemPositions, getItemHeight, renderItem]);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

export default memo(VirtualizedList) as typeof VirtualizedList;