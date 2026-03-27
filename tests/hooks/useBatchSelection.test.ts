/**
 * useBatchSelection Hook Tests
 * Tests for src/hooks/useBatchSelection.ts
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBatchSelection } from '@/hooks/useBatchSelection';

describe('useBatchSelection Hook', () => {
  const mockItems = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
    { id: '4', name: 'Item 4' },
  ];

  const getItemId = (item: { id: string }) => item.id;

  describe('initial state', () => {
    it('should initialize with empty selection', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));
      expect(result.current.selectedIds).toEqual(new Set());
      expect(result.current.isSelected('1')).toBe(false);
    });

    it('should initialize with allSelected as false', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isIndeterminate).toBe(false);
    });

    it('should initialize with selectionCount as 0', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));
      expect(result.current.selectionCount).toBe(0);
    });
  });

  describe('toggleItem', () => {
    it('should toggle item selection on', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));

      act(() => {
        result.current.toggleItem('1');
      });

      expect(result.current.isSelected('1')).toBe(true);
      expect(result.current.selectionCount).toBe(1);
    });

    it('should toggle item selection off', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));

      act(() => {
        result.current.toggleItem('1');
        result.current.toggleItem('1');
      });

      expect(result.current.isSelected('1')).toBe(false);
      expect(result.current.selectionCount).toBe(0);
    });

    it('should handle multiple selections', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));

      act(() => {
        result.current.toggleItem('1');
        result.current.toggleItem('2');
        result.current.toggleItem('3');
      });

      expect(result.current.selectionCount).toBe(3);
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isIndeterminate).toBe(true);
    });
  });

  describe('selectAll', () => {
    it('should select all items', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.isAllSelected).toBe(true);
      expect(result.current.selectionCount).toBe(4);
      expect(result.current.isIndeterminate).toBe(false);
    });
  });

  describe('deselectAll', () => {
    it('should deselect all items', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));

      act(() => {
        result.current.selectAll();
        result.current.deselectAll();
      });

      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.selectionCount).toBe(0);
    });
  });

  describe('clearSelection', () => {
    it('should clear selection and exit selection mode', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));

      act(() => {
        result.current.enterSelectionMode();
        result.current.toggleItem('1');
        result.current.toggleItem('2');
        result.current.clearSelection();
      });

      expect(result.current.selectionCount).toBe(0);
      expect(result.current.isSelectionMode).toBe(false);
    });
  });

  describe('selectionMode', () => {
    it('should enter selection mode', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));

      act(() => {
        result.current.enterSelectionMode();
      });

      expect(result.current.isSelectionMode).toBe(true);
    });

    it('should exit selection mode', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));

      act(() => {
        result.current.enterSelectionMode();
        result.current.exitSelectionMode();
      });

      expect(result.current.isSelectionMode).toBe(false);
    });

    it('should toggle selection mode', () => {
      const { result } = renderHook(() => useBatchSelection({ items: mockItems, getItemId }));

      expect(result.current.isSelectionMode).toBe(false);

      act(() => {
        result.current.toggleSelectionMode();
      });
      expect(result.current.isSelectionMode).toBe(true);

      act(() => {
        result.current.toggleSelectionMode();
      });
      expect(result.current.isSelectionMode).toBe(false);
    });
  });
});
