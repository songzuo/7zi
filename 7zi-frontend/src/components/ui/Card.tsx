'use memo'

/**
 * Card 组件 - 卡片组件
 * 用于展示内容、图片、信息等，包含增强的交互反馈
 *
 * @version 1.1.0
 * @date 2026-03-29
 */

import React from 'react'
import clsx from 'clsx'

// ============================================
// Card 组件
// ============================================

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /** 卡片内容 */
  children: React.ReactNode
  /** 是否有阴影 */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  /** 是否可点击 */
  clickable?: boolean
  /** 自定义类名 */
  className?: string
  /** 点击事件 */
  onClick?: () => void
  /** 是否启用悬浮效果 */
  hoverable?: boolean
  /** 是否启用边框高亮 */
  bordered?: boolean
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      shadow = 'md',
      clickable = false,
      hoverable = true,
      bordered = false,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const shadowStyles = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
    }

    const classes = clsx(
      'bg-white rounded-lg',
      // 边框样式
      bordered
        ? 'border-2 border-gray-200 hover:border-blue-400 dark:border-gray-700 dark:hover:border-blue-500'
        : 'border border-gray-200 dark:border-gray-700',
      // 阴影样式
      shadowStyles[shadow],
      // 悬停效果
      hoverable && 'transition-all duration-300 ease-out',
      // 可点击状态
      clickable &&
        clsx(
          'cursor-pointer',
          'hover:shadow-xl hover:-translate-y-0.5',
          'active:scale-[0.98]',
          'transform-gpu'
        ),
      // 焦点状态
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      className
    )

    return (
      <div ref={ref} className={classes} onClick={onClick} {...props}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// ============================================
// CardHeader 组件
// ============================================

export interface CardHeaderProps {
  children: React.ReactNode
  className?: string
  /** 是否有底部边框 */
  bordered?: boolean
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className, bordered = true }) => {
  return (
    <div
      className={clsx(
        'px-6 py-4',
        bordered && 'border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================
// CardBody 组件
// ============================================

export interface CardBodyProps {
  children: React.ReactNode
  className?: string
  /** 垂直内边距 */
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className, padding = 'md' }) => {
  const paddingStyles = {
    none: '',
    sm: 'px-6 py-2',
    md: 'px-6 py-4',
    lg: 'px-6 py-6',
  }

  return <div className={clsx(paddingStyles[padding], className)}>{children}</div>
}

// ============================================
// CardFooter 组件
// ============================================

export interface CardFooterProps {
  children: React.ReactNode
  className?: string
  /** 背景颜色 */
  bg?: 'gray' | 'white' | 'blue'
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className, bg = 'gray' }) => {
  const bgStyles = {
    gray: 'bg-gray-50 dark:bg-gray-900/50',
    white: 'bg-white dark:bg-gray-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20',
  }

  return (
    <div
      className={clsx(
        'border-t border-gray-200 px-6 py-4 dark:border-gray-700',
        bgStyles[bg],
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================
// CardImage 组件
// ============================================

export interface CardImageProps {
  src: string
  alt: string
  className?: string
  /** 图片高度 */
  height?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** 图片对象适应方式 */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /** 是否启用放大效果 */
  zoomOnHover?: boolean
}

export const CardImage: React.FC<CardImageProps> = ({
  src,
  alt,
  className,
  height = 'md',
  objectFit = 'cover',
  zoomOnHover = false,
}) => {
  const heightStyles = {
    xs: 'h-24',
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
    xl: 'h-80',
  }

  return (
    <div className={clsx('relative overflow-hidden', heightStyles[height], 'w-full')}>
      <img
        src={src}
        alt={alt}
        className={clsx(
          'w-full',
          heightStyles[height],
          'object-cover',
          zoomOnHover && 'transition-transform duration-500 hover:scale-110',
          className
        )}
        style={{ objectFit }}
      />
    </div>
  )
}

// ============================================
// CardTitle 组件
// ============================================

export interface CardTitleProps {
  children: React.ReactNode
  className?: string
  /** 标题大小 */
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className, size = 'lg' }) => {
  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }

  return (
    <h3
      className={clsx(
        'font-semibold text-gray-900 dark:text-gray-100',
        sizeStyles[size],
        className
      )}
    >
      {children}
    </h3>
  )
}

// ============================================
// CardText 组件
// ============================================

export interface CardTextProps {
  children: React.ReactNode
  className?: string
  /** 文本颜色 */
  color?: 'primary' | 'secondary' | 'muted'
}

export const CardText: React.FC<CardTextProps> = ({ children, className, color = 'secondary' }) => {
  const colorStyles = {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-600 dark:text-gray-400',
    muted: 'text-gray-500 dark:text-gray-500',
  }

  return <p className={clsx(colorStyles[color], 'mt-2', className)}>{children}</p>
}

// ============================================
// CardMeta 组件
// ============================================

export interface CardMetaProps {
  children: React.ReactNode
  className?: string
  /** 元数据方向 */
  direction?: 'horizontal' | 'vertical'
}

export const CardMeta: React.FC<CardMetaProps> = ({
  children,
  className,
  direction = 'horizontal',
}) => {
  return (
    <div
      className={clsx(
        'mt-3 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400',
        direction === 'vertical' && 'flex-col items-start',
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================
// CardActions 组件
// ============================================

export interface CardActionsProps {
  children: React.ReactNode
  className?: string
  /** 操作按钮对齐方式 */
  align?: 'left' | 'center' | 'right'
}

export const CardActions: React.FC<CardActionsProps> = ({
  children,
  className,
  align = 'right',
}) => {
  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }

  return (
    <div className={clsx('mt-4 flex items-center gap-2', alignStyles[align], className)}>
      {children}
    </div>
  )
}

// ============================================
// CardOverlay 组件
// ============================================

export interface CardOverlayProps {
  children: React.ReactNode
  className?: string
  /** 渐变方向 */
  gradient?: 'top' | 'bottom' | 'left' | 'right' | 'none'
}

export const CardOverlay: React.FC<CardOverlayProps> = ({
  children,
  className,
  gradient = 'bottom',
}) => {
  const gradientStyles = {
    top: 'bg-gradient-to-b from-black/70 to-transparent',
    bottom: 'bg-gradient-to-t from-black/70 to-transparent',
    left: 'bg-gradient-to-r from-black/70 to-transparent',
    right: 'bg-gradient-to-l from-black/70 to-transparent',
    none: '',
  }

  return (
    <div
      className={clsx('absolute inset-0 flex items-end p-4', gradientStyles[gradient], className)}
    >
      {children}
    </div>
  )
}

// ============================================
// CardBadge 组件
// ============================================

export interface CardBadgeProps {
  children: React.ReactNode
  className?: string
  /** 徽章颜色 */
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray' | 'orange'
  /** 徽章变体 */
  variant?: 'solid' | 'outline' | 'soft'
  /** 徽章大小 */
  size?: 'sm' | 'md' | 'lg'
}

export const CardBadge: React.FC<CardBadgeProps> = ({
  children,
  className,
  color = 'blue',
  variant = 'soft',
  size = 'md',
}) => {
  const colorStyles = {
    blue: {
      solid: 'bg-blue-600 text-white',
      outline: 'border-2 border-blue-600 text-blue-600',
      soft: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    green: {
      solid: 'bg-green-600 text-white',
      outline: 'border-2 border-green-600 text-green-600',
      soft: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    yellow: {
      solid: 'bg-yellow-600 text-white',
      outline: 'border-2 border-yellow-600 text-yellow-600',
      soft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    red: {
      solid: 'bg-red-600 text-white',
      outline: 'border-2 border-red-600 text-red-600',
      soft: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
    purple: {
      solid: 'bg-purple-600 text-white',
      outline: 'border-2 border-purple-600 text-purple-600',
      soft: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    },
    gray: {
      solid: 'bg-gray-600 text-white',
      outline: 'border-2 border-gray-600 text-gray-600',
      soft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    },
    orange: {
      solid: 'bg-orange-600 text-white',
      outline: 'border-2 border-orange-600 text-orange-600',
      soft: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    },
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        colorStyles[color][variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  )
}

export default Card
