'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

interface HamburgerMenuProps {
  isOpen: boolean
  onToggle: () => void
  ariaLabel?: string
}

export function HamburgerMenu({ isOpen, onToggle, ariaLabel = '菜单' }: HamburgerMenuProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
    if (e.key === 'Escape' && isOpen) {
      onToggle()
    }
  }

  // 动画状态管理
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 300)
    return () => clearTimeout(timer)
  }, [isOpen])

  return (
    <button
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      aria-label={isOpen ? '关闭菜单' : ariaLabel}
      aria-expanded={isOpen}
      aria-controls="mobile-menu"
      className={`
        relative flex h-12 w-12 items-center justify-center
        rounded-xl transition-all duration-300
        bg-gray-100 hover:bg-gray-200
        dark:bg-gray-800 dark:hover:bg-gray-700
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
        ${isAnimating ? 'scale-95' : 'scale-100'}
      `}
      style={{ minHeight: '48px', minWidth: '48px' }}
    >
      <div className="relative h-6 w-6">
        {/* 汉堡图标 */}
        <Menu
          className={`
            absolute inset-0 transition-all duration-300
            ${isOpen ? 'rotate-180 opacity-0 scale-0' : 'rotate-0 opacity-100 scale-100'}
            text-gray-700 dark:text-gray-300
          `}
          aria-hidden="true"
        />

        {/* 关闭图标 */}
        <X
          className={`
            absolute inset-0 transition-all duration-300
            ${isOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-180 opacity-0 scale-0'}
            text-gray-700 dark:text-gray-300
          `}
          aria-hidden="true"
        />
      </div>

      {/* 触觉反馈动画 */}
      <span
        className={`
          absolute inset-0 rounded-xl
          transition-opacity duration-300
          ${isAnimating ? 'bg-blue-500/10' : 'opacity-0'}
        `}
        aria-hidden="true"
      />
    </button>
  )
}