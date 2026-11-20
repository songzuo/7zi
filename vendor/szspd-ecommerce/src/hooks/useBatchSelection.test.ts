/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBatchSelection } from './useBatchSelection'

// Helper function to create a React-compatible MouseEvent
function createReactMouseEvent(type: string, options: MouseEventInit = {}): React.MouseEvent {
  const domEvent = new MouseEvent(type, options)
  return domEvent as unknown as React.MouseEvent
}

interface TestItem {
  id: string
  name: string
}

describe('useBatchSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })
  const mockItems: TestItem[] = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
    { id: '4', name: 'Item 4' },
    { id: '5', name: 'Item 5' },
  ]

  const getItemId = (item: TestItem) => item.id

  describe('初始化', () => {
    it('应该返回空的选择状态', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      expect(result.current.selectedIds.size).toBe(0)
      expect(result.current.selectedItems).toEqual([])
      expect(result.current.isSelectionMode).toBe(false)
      expect(result.current.isAllSelected).toBe(false)
      expect(result.current.isIndeterminate).toBe(false)
      expect(result.current.selectionCount).toBe(0)
    })

    it('应该正确初始化回调函数', () => {
      const onSelectionChange = vi.fn()
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
          onSelectionChange,
        })
      )

      expect(result.current.toggleSelectionMode).toBeDefined()
      expect(result.current.enterSelectionMode).toBeDefined()
      expect(result.current.exitSelectionMode).toBeDefined()
    })
  })

  describe('单选操作', () => {
    it('应该能够选中单个项目', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.selectItem('1')
      })

      expect(result.current.selectedIds.has('1')).toBe(true)
      expect(result.current.selectionCount).toBe(1)
      expect(result.current.selectedItems).toEqual([{ id: '1', name: 'Item 1' }])
      expect(result.current.isSelected('1')).toBe(true)
    })

    it('应该能够取消选中单个项目', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.selectItem('1')
        result.current.deselectItem('1')
      })

      expect(result.current.selectedIds.size).toBe(0)
      expect(result.current.isSelected('1')).toBe(false)
    })

    it('应该能够切换项目选中状态', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.toggleItem('1')
      })

      expect(result.current.selectedIds.has('1')).toBe(true)

      act(() => {
        result.current.toggleItem('1')
      })

      expect(result.current.selectedIds.has('1')).toBe(false)
    })

    it('选择已选中的项目应该无效', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.selectItem('1')
      })

      const beforeCount = result.current.selectionCount

      act(() => {
        result.current.selectItem('1')
      })

      expect(result.current.selectionCount).toBe(beforeCount)
    })

    it('取消未选中的项目应该无效', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.deselectItem('1')
      })

      expect(result.current.selectedIds.size).toBe(0)
    })
  })

  describe('全选操作', () => {
    it('应该能够全选所有项目', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.selectAll()
      })

      expect(result.current.selectedIds.size).toBe(5)
      expect(result.current.isAllSelected).toBe(true)
      expect(result.current.isIndeterminate).toBe(false)
    })

    it('应该能够取消全选', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.selectAll()
      })

      act(() => {
        result.current.deselectAll()
      })

      expect(result.current.selectedIds.size).toBe(0)
      expect(result.current.isAllSelected).toBe(false)
    })

    it('应该能够切换全选状态', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      // 从空状态开始，应该全选
      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.isAllSelected).toBe(true)

      // 再次切换，应该取消全选
      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.isAllSelected).toBe(false)
    })
  })

  describe('范围选择 (Shift+Click)', () => {
    it('应该支持 Shift+Click 范围选择', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.selectItem('1') // 先选中第一个
      })

      act(() => {
        const event = createReactMouseEvent('click', { shiftKey: true })
        result.current.toggleItem('3', event) // Shift+Click 第三个
      })

      // 应该选中 1-3 之间的所有项
      expect(result.current.selectedIds.has('1')).toBe(true)
      expect(result.current.selectedIds.has('2')).toBe(true)
      expect(result.current.selectedIds.has('3')).toBe(true)
      expect(result.current.selectedIds.size).toBe(3)
    })

    it('Shift+Click 应该支持反向范围选择', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.selectItem('3') // 先选中第三个
      })

      act(() => {
        const event = createReactMouseEvent('click', { shiftKey: true })
        result.current.toggleItem('1', event) // Shift+Click 第一个
      })

      // 应该选中 1-3 之间的所有项
      expect(result.current.selectedIds.size).toBe(3)
      expect(result.current.selectedIds.has('1')).toBe(true)
      expect(result.current.selectedIds.has('2')).toBe(true)
      expect(result.current.selectedIds.has('3')).toBe(true)
    })

    it('Shift+Click 在已选中状态下应该取消选择', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.selectItem('1')
        result.current.selectItem('2')
        result.current.selectItem('3')
      })

      act(() => {
        const event = createReactMouseEvent('click', { shiftKey: true })
        result.current.toggleItem('3', event) // Shift+Click 第三个
      })

      // 应该取消选中 1-3
      expect(result.current.selectedIds.size).toBe(0)
    })

    it('没有上次选中项时，Shift+Click 应该作为普通选择', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        const event = createReactMouseEvent('click', { shiftKey: true })
        result.current.toggleItem('3', event)
      })

      expect(result.current.selectedIds.size).toBe(1)
      expect(result.current.selectedIds.has('3')).toBe(true)
    })
  })

  describe('最大选择数限制', () => {
    it('应该遵守最大选择数限制', () => {
      const maxSelections = 2
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
          maxSelections,
        })
      )

      act(() => {
        result.current.selectAll()
      })

      expect(result.current.selectedIds.size).toBe(2)
      expect(result.current.isAllSelected).toBe(false)
    })

    it('超过限制时应该拒绝选择', () => {
      const maxSelections = 2
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
          maxSelections,
        })
      )

      act(() => {
        result.current.selectItem('1')
        result.current.selectItem('2')
      })

      const beforeCount = result.current.selectionCount

      act(() => {
        result.current.selectItem('3')
      })

      expect(result.current.selectionCount).toBe(beforeCount)
    })
  })

  describe('选择模式管理', () => {
    it('应该能够进入选择模式', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.enterSelectionMode()
      })

      expect(result.current.isSelectionMode).toBe(true)
    })

    it('应该能够退出选择模式', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.enterSelectionMode()
        result.current.selectItem('1')
      })

      act(() => {
        result.current.exitSelectionMode()
      })

      expect(result.current.isSelectionMode).toBe(false)
      expect(result.current.selectedIds.size).toBe(0)
    })

    it('应该能够切换选择模式', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      expect(result.current.isSelectionMode).toBe(false)

      act(() => {
        result.current.toggleSelectionMode()
      })

      expect(result.current.isSelectionMode).toBe(true)

      act(() => {
        result.current.toggleSelectionMode()
      })

      expect(result.current.isSelectionMode).toBe(false)
    })

    it('退出选择模式时应该清空选择', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.enterSelectionMode()
        result.current.selectItem('1')
        result.current.selectItem('2')
      })

      act(() => {
        result.current.toggleSelectionMode()
      })

      expect(result.current.isSelectionMode).toBe(false)
      expect(result.current.selectedIds.size).toBe(0)
    })
  })

  describe('清空选择', () => {
    it('应该能够清空选择', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.selectAll()
      })

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.selectedIds.size).toBe(0)
      expect(result.current.isSelectionMode).toBe(false)
    })
  })

  describe('部分选中状态', () => {
    it('应该正确计算部分选中状态', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.selectItem('1')
        result.current.selectItem('2')
      })

      expect(result.current.isIndeterminate).toBe(true)
      expect(result.current.isAllSelected).toBe(false)
    })

    it('全选时不应处于部分选中状态', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      act(() => {
        result.current.selectAll()
      })

      expect(result.current.isIndeterminate).toBe(false)
      expect(result.current.isAllSelected).toBe(true)
    })

    it('空选择时不应处于部分选中状态', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      expect(result.current.isIndeterminate).toBe(false)
      expect(result.current.isAllSelected).toBe(false)
    })
  })

  describe('回调函数', () => {
    it('应该在选择变化时调用回调', () => {
      const onSelectionChange = vi.fn()
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
          onSelectionChange,
        })
      )

      act(() => {
        result.current.selectItem('1')
      })

      expect(onSelectionChange).toHaveBeenCalledTimes(1)
      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1']))
    })

    it('应该在取消选择时调用回调', () => {
      const onSelectionChange = vi.fn()
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
          onSelectionChange,
        })
      )

      act(() => {
        result.current.selectItem('1')
        result.current.deselectItem('1')
      })

      expect(onSelectionChange).toHaveBeenCalledTimes(2)
      expect(onSelectionChange).toHaveBeenLastCalledWith(new Set())
    })

    it('应该在清空选择时调用回调', () => {
      const onSelectionChange = vi.fn()
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
          onSelectionChange,
        })
      )

      act(() => {
        result.current.selectAll()
      })

      act(() => {
        result.current.clearSelection()
      })

      expect(onSelectionChange).toHaveBeenLastCalledWith(new Set())
    })
  })

  describe('批量操作', () => {
    it('应该能够执行批量操作', async () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      const mockAction = vi.fn().mockResolvedValue(undefined)

      act(() => {
        result.current.selectItem('1')
        result.current.selectItem('2')
      })

      await act(async () => {
        await result.current.performBatchAction(mockAction)
      })

      expect(mockAction).toHaveBeenCalledTimes(1)
      expect(mockAction).toHaveBeenCalledWith([
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ])

      // 操作后应该清空选择
      expect(result.current.selectedIds.size).toBe(0)
    })

    it('没有选中项时不应该执行批量操作', async () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      const mockAction = vi.fn()

      await act(async () => {
        await result.current.performBatchAction(mockAction)
      })

      expect(mockAction).not.toHaveBeenCalled()
    })

    it('批量操作失败时应该抛出错误', async () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: mockItems,
          getItemId,
        })
      )

      const mockError = new Error('Action failed')
      const mockAction = vi.fn().mockRejectedValue(mockError)

      act(() => {
        result.current.selectItem('1')
      })

      await expect(
        act(async () => {
          await result.current.performBatchAction(mockAction)
        })
      ).rejects.toThrow('Action failed')
    })
  })

  describe('边界情况', () => {
    it('应该处理空项目列表', () => {
      const { result } = renderHook(() =>
        useBatchSelection({
          items: [],
          getItemId,
        })
      )

      expect(result.current.selectedItems).toEqual([])
      expect(result.current.isAllSelected).toBe(false)

      act(() => {
        result.current.selectAll()
      })

      expect(result.current.selectedIds.size).toBe(0)
    })

    it('应该正确更新选中项目列表', () => {
      const { result, rerender } = renderHook(
        ({ items }) =>
          useBatchSelection({
            items,
            getItemId,
          }),
        {
          initialProps: { items: mockItems.slice(0, 3) },
        }
      )

      act(() => {
        result.current.selectItem('1')
        result.current.selectItem('2')
      })

      expect(result.current.selectedItems).toHaveLength(2)

      // 更新项目列表
      rerender({ items: mockItems })

      // 选中项应该保持不变
      expect(result.current.selectedItems).toHaveLength(2)
    })
  })
})
