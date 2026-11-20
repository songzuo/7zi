/**
 * @fileoverview 共享 UI 组件
 * @description 可复用的基础 UI 组件
 */

'use client'

import { MemberStatus, STATUS_CONFIG } from '@/types'
import Image from 'next/image'
import { formatTimeAgo } from '@/lib/date'
import type { FC, ReactNode } from 'react'

// ============================================================================
// Status Badge - 状态徽章
// ============================================================================

interface StatusBadgeProps {
  status: MemberStatus
  showDot?: boolean
  size?: 'sm' | 'md'
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, showDot = true, size = 'sm' }) => {
  const config = STATUS_CONFIG[status]
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${config.bgColor} ${sizeClass}`}
    >
      {showDot && <span className={`h-2 w-2 rounded-full ${config.color}`} />}
      {config.label}
    </span>
  )
}

// ============================================================================
// Progress Bar - 进度条
// ============================================================================

interface ProgressBarProps {
  progress: number
  color?: 'default' | 'success' | 'warning'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export const ProgressBar: FC<ProgressBarProps> = ({
  progress,
  color = 'default',
  showLabel = false,
  size = 'md',
  animated = true,
}) => {
  const colorClasses = {
    default: 'bg-gradient-to-r from-cyan-500 to-purple-500',
    success: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500',
  }

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">进度</span>
          <span className="font-medium text-zinc-900 dark:text-white">{progress}%</span>
        </div>
      )}
      <div
        className={`w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700 ${sizeClasses[size]}`}
      >
        <div
          className={`${sizeClasses[size]} rounded-full ${colorClasses[color]} ${animated ? 'transition-all duration-1000' : ''}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================================
// Avatar - 头像组件
// ============================================================================

interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: MemberStatus
  showStatus?: boolean
}

export const Avatar: FC<AvatarProps> = ({ src, name, size = 'md', status, showStatus = false }) => {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  }

  const pixelSize = sizeMap[size]
  const statusSize = size === 'sm' ? 8 : size === 'xl' ? 16 : 12

  return (
    <div className="relative flex-shrink-0">
      {src ? (
        <Image
          src={src}
          alt={name}
          width={pixelSize}
          height={pixelSize}
          sizes={pixelSize ? `${pixelSize}px` : '48px'}
          className="rounded-full"
          unoptimized
        />
      ) : (
        <div
          className={`flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 font-bold text-white`}
          style={{ width: pixelSize, height: pixelSize, fontSize: pixelSize / 2.5 }}
        >
          {name[0]?.toUpperCase() || '?'}
        </div>
      )}
      {showStatus && status && (
        <div
          className={`absolute right-0 bottom-0 rounded-full border-2 border-white dark:border-zinc-900 ${STATUS_CONFIG[status].color}`}
          style={{ width: statusSize, height: statusSize }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Card - 卡片容器
// ============================================================================

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card: FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <div
      className={`rounded-2xl bg-white shadow-lg dark:bg-zinc-800 ${hover ? 'transition-shadow hover:shadow-xl' : ''} ${paddingClasses[padding]} ${className} `}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Empty State - 空状态
// ============================================================================

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export const EmptyState: FC<EmptyStateProps> = ({ icon = '📭', title, description, action }) => {
  return (
    <div className="py-12 text-center">
      <p className="mb-3 text-4xl">{icon}</p>
      <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ============================================================================
// Stat Card - 统计卡片
// ============================================================================

interface StatCardProps {
  value: number | string
  label: string
  icon?: string
  color?: 'cyan' | 'purple' | 'green' | 'pink' | 'orange'
}

export const StatCard: FC<StatCardProps> = ({ value, label, icon, color = 'cyan' }) => {
  const colorClasses = {
    cyan: 'from-cyan-400 to-blue-500',
    purple: 'from-purple-400 to-pink-500',
    green: 'from-green-400 to-emerald-500',
    pink: 'from-pink-400 to-rose-500',
    orange: 'from-orange-400 to-yellow-500',
  }

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
    >
      <div className="text-3xl font-bold md:text-4xl">
        {icon ? `${icon} ` : ''}
        {value}
      </div>
      <div className="mt-1 text-sm opacity-90 md:text-base">{label}</div>
    </div>
  )
}

// ============================================================================
// Time Ago - 时间显示
// ============================================================================

interface TimeAgoProps {
  date: string | Date
  className?: string
}

export const TimeAgo: FC<TimeAgoProps> = ({ date, className = '' }) => {
  return (
    <span className={`text-xs text-zinc-500 dark:text-zinc-400 ${className}`}>
      {formatTimeAgo(date)}
    </span>
  )
}
