'use client'

/**
 * NodeContextMenu.tsx
 * 节点右键菜单组件
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

/**
 * 菜单项类型
 */
export interface ContextMenuItem {
  id: string
  label: string
  icon?: string
  danger?: boolean
  disabled?: boolean
  divider?: boolean
}

/**
 * 节点上下文菜单属性
 */
export interface NodeContextMenuProps {
  /** 菜单位置 */
  x: number
  y: number
  /** 节点 ID */
  nodeId: string
  /** 是否为开始节点 */
  isStartNode?: boolean
  /** 是否为结束节点 */
  isEndNode?: boolean
  /** 菜单项 */
  items?: ContextMenuItem[]
  /** 菜单项点击回调 */
  onItemClick: (item: ContextMenuItem) => void
  /** 关闭菜单回调 */
  onClose: () => void
  /** 自定义类名 */
  className?: string
}

/**
 * 默认菜单项
 */
export const DEFAULT_MENU_ITEMS: ContextMenuItem[] = [
  {
    id: 'set-as-start',
    label: '设为开始节点',
    icon: '🏁',
  },
  {
    id: 'copy',
    label: '复制节点',
    icon: '📋',
  },
  {
    id: 'divider-1',
    divider: true,
  },
  {
    id: 'delete',
    label: '删除节点',
    icon: '🗑',
    danger: true,
  },
]

/**
 * 节点上下文菜单组件
 */
export function NodeContextMenu({
  x,
  y,
  nodeId,
  isStartNode = false,
  isEndNode = false,
  items = DEFAULT_MENU_ITEMS,
  onItemClick,
  onClose,
  className,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // 处理菜单项点击
  const handleItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.disabled || item.divider) return
      onItemClick(item)
      onClose()
    },
    [onItemClick, onClose]
  )

  // 过滤禁用的菜单项
  const filteredItems = items.filter(item => {
    // 开始节点不能删除和设为开始节点
    if (isStartNode && (item.id === 'delete' || item.id === 'set-as-start')) {
      return false
    }
    // 结束节点不能删除
    if (isEndNode && item.id === 'delete') {
      return false
    }
    return true
  })

  // 调整菜单位置，防止超出视口
  const adjustedPosition = React.useMemo(() => {
    const menuWidth = 200
    const menuHeight = filteredItems.length * 40 + 16
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    let adjustedX = x
    let adjustedY = y

    if (x + menuWidth > windowWidth) {
      adjustedX = windowWidth - menuWidth - 10
    }

    if (y + menuHeight > windowHeight) {
      adjustedY = windowHeight - menuHeight - 10
    }

    return { x: adjustedX, y: adjustedY }
  }, [x, y, filteredItems.length])

  return (
    <div
      ref={menuRef}
      className={cn(
        'absolute z-50 min-w-[180px] rounded-lg border border-gray-200 bg-white py-2 shadow-lg',
        'animate-in fade-in zoom-in-95 duration-100',
        className
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {filteredItems.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className="my-1 h-px bg-gray-200"
            />
          )
        }

        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors',
              item.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-700 hover:bg-gray-100',
              item.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {item.icon && (
              <span className="flex h-4 w-4 items-center justify-center">
                {item.icon}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * 上下文菜单 Hook
 */
export function useNodeContextMenu() {
  const [menuState, setMenuState] = React.useState<{
    isOpen: boolean
    x: number
    y: number
    nodeId: string
    isStartNode?: boolean
    isEndNode?: boolean
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    nodeId: '',
  })

  const openMenu = useCallback(
    (
      e: React.MouseEvent,
      nodeId: string,
      isStartNode?: boolean,
      isEndNode?: boolean
    ) => {
      e.preventDefault()
      e.stopPropagation()
      setMenuState({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        nodeId,
        isStartNode,
        isEndNode,
      })
    },
    []
  )

  const closeMenu = useCallback(() => {
    setMenuState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    menuState,
    openMenu,
    closeMenu,
  }
}

export default NodeContextMenu
