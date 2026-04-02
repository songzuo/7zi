'use client'

/**
 * Modal 组件 - 模态框组件
 * 支持多种尺寸、动画效果
 */

import React, { useEffect, useRef } from 'react'
import clsx from 'clsx'

export interface ModalProps {
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 标题 */
  title?: string
  /** 内容 */
  children: React.ReactNode
  /** 模态框大小 */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean
  /** 点击遮罩层是否关闭 */
  closeOnOverlayClick?: boolean
  /** 是否显示遮罩层 */
  showOverlay?: boolean
  /** 自定义类名 */
  className?: string
  /** 页脚内容 */
  footer?: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  showOverlay = true,
  className,
  footer,
}) => {
  'use memo'

  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // 处理 ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // 管理焦点
  useEffect(() => {
    if (isOpen) {
      // 保存当前焦点元素
      previousActiveElement.current = document.activeElement as HTMLElement

      // 将焦点移到模态框
      if (modalRef.current) {
        modalRef.current.focus()
      }

      // 禁止背景滚动
      document.body.style.overflow = 'hidden'
    } else {
      // 恢复焦点
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }

      // 恢复背景滚动
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      {showOverlay && (
        <div
          className={clsx(
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            'bg-opacity-50 bg-black',
            'transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={closeOnOverlayClick ? onClose : undefined}
        >
          <div
            ref={modalRef}
            className={clsx(
              'relative w-full rounded-lg bg-white shadow-2xl',
              'transform transition-all duration-300',
              isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
              sizeStyles[size],
              className
            )}
            onClick={e => e.stopPropagation()}
            tabIndex={-1}
          >
            {/* 头部 */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                {title && <h2 className="text-xl font-semibold text-gray-900">{title}</h2>}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    aria-label="关闭"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* 内容 */}
            <div className="px-6 py-4">{children}</div>

            {/* 页脚 */}
            {footer && (
              <div className="flex items-center justify-end gap-3 rounded-b-lg border-t border-gray-200 bg-gray-50 px-6 py-4">
                {footer}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
