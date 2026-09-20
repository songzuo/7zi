/**
 * Virtualized List/Table Component for Large Datasets
 * Simple implementation without external dependencies
 */

'use client'

import React, { useRef, useMemo, useState, useEffect } from 'react'

interface VirtualizedListProps<T extends Record<string, unknown>> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number
  containerHeight: number
  overscan?: number
  className?: string
}

export function VirtualizedList<T extends Record<string, unknown>>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  className = '',
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate visible range
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    const offsetY = startIndex * itemHeight

    return { startIndex, endIndex, offsetY }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  // Total height of all items
  const totalHeight = items.length * itemHeight

  // Visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }))
  }, [items, startIndex, endIndex])

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Virtualized Table Component
interface VirtualizedTableProps<T extends Record<string, unknown>> {
  data: T[]
  columns: {
    key: string
    header: string
    render?: (value: unknown, row: T) => React.ReactNode
    width?: string
  }[]
  rowHeight: number
  containerHeight: number
  className?: string
}

export function VirtualizedTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowHeight,
  containerHeight,
  className = '',
}: VirtualizedTableProps<T>) {
  const headerHeight = 50

  return (
    <div
      className={`overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 ${className}`}
    >
      {/* Header */}
      <div
        className="grid items-center border-b border-zinc-200 bg-zinc-50 px-4 dark:border-zinc-700 dark:bg-zinc-800"
        style={{
          gridTemplateColumns: columns.map(col => col.width || '1fr').join(' '),
          height: headerHeight,
        }}
      >
        {columns.map(col => (
          <div key={col.key} className="text-sm font-semibold text-zinc-900 dark:text-white">
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtualized Body */}
      <VirtualizedList<Record<string, unknown>>
        items={data as Record<string, unknown>[]}
        renderItem={row => (
          <div
            className="grid items-center border-b border-zinc-100 px-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
            style={{
              gridTemplateColumns: columns.map(col => col.width || '1fr').join(' '),
              height: rowHeight,
            }}
          >
            {columns.map(col => (
              <div
                key={`${row.id}-${col.key}`}
                className="text-sm text-zinc-700 dark:text-zinc-300"
              >
                {col.render ? col.render(row[col.key], row as T) : String(row[col.key] ?? '')}
              </div>
            ))}
          </div>
        )}
        itemHeight={rowHeight}
        containerHeight={containerHeight}
        className=""
      />
    </div>
  )
}

// Hook for auto-adjusting container height
export function useVirtualContainerHeight(defaultHeight: number = 400) {
  const [height, setHeight] = useState(defaultHeight)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const availableHeight =
          window.innerHeight - containerRef.current.getBoundingClientRect().top - 100
        setHeight(Math.max(defaultHeight, Math.min(availableHeight, 800)))
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [defaultHeight])

  return { height, containerRef }
}
