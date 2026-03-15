'use client';

import React, { useState, useMemo, useCallback, ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: T[keyof T], row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  /** Data to display */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Unique key field */
  keyField: keyof T;
  /** Items per page */
  pageSize?: number;
  /** Enable pagination */
  pagination?: boolean;
  /** Enable sorting */
  sortable?: boolean;
  /** Enable filtering */
  filterable?: boolean;
  /** Filter placeholder */
  filterPlaceholder?: string;
  /** Additional container class */
  className?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Custom row class */
  rowClassName?: string | ((row: T) => string);
}

interface SortState {
  key: string | null;
  direction: SortDirection;
}

// ============================================
// COMPONENT
// ============================================

export default function DataTable<T extends object>({
  data,
  columns,
  keyField,
  pageSize = 10,
  pagination = true,
  sortable = true,
  filterable = true,
  filterPlaceholder = 'Search...',
  className = '',
  emptyMessage = 'No data available',
  loading = false,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<SortState>({ key: null, direction: null });
  const [filterValue, setFilterValue] = useState('');

  // Filter data
  const filteredData = useMemo(() => {
    if (!filterValue) return data;
    const lowerFilter = filterValue.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(lowerFilter)
      )
    );
  }, [data, filterValue]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortState.key || !sortState.direction) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortState.key as keyof T];
      const bValue = b[sortState.key as keyof T];
      
      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sortState.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortState]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handlers
  const handleSort = useCallback((key: string) => {
    if (!sortable) return;
    
    setSortState((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key: null, direction: null };
    });
  }, [sortable]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const getRowClasses = useCallback((row: T) => {
    const baseClasses = 'border-b border-border hover:bg-muted/50 transition-colors';
    const clickClass = onRowClick ? 'cursor-pointer' : '';
    const customClass = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName || '';
    return `${baseClasses} ${clickClass} ${customClass}`.trim();
  }, [onRowClick, rowClassName]);

  // Render sort icon
  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable && !sortable) return null;
    
    const isActive = sortState.key === column.key;
    const iconColor = isActive ? 'text-primary' : 'text-muted-foreground';
    
    return (
      <span className={`ml-2 ${iconColor}`}>
        {sortState.key === column.key ? (
          sortState.direction === 'asc' ? '↑' : '↓'
        ) : (
          '↕'
        )}
      </span>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Filter */}
      {filterable && (
        <div className="mb-4">
          <input
            type="text"
            value={filterValue}
            onChange={(e) => {
              setFilterValue(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={filterPlaceholder}
            className="w-full md:w-64 px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left font-medium text-foreground ${
                    (column.sortable !== false && sortable) ? 'cursor-pointer select-none' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => handleSort(String(column.key))}
                  align={column.align || 'left'}
                >
                  <div className="flex items-center">
                    {column.header}
                    {(column.sortable !== false && sortable) && renderSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={String(row[keyField])}
                  className={getRowClasses(row)}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => {
                    const value = row[column.key as keyof T];
                    return (
                      <td
                        key={String(column.key)}
                        className="px-4 py-3"
                        align={column.align || 'left'}
                      >
                        {column.render ? column.render(value, row, index) : String(value ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              First
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
