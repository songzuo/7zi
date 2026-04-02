'use client'

import { memo, ReactNode } from 'react'

export interface SectionCardProps {
  title: string
  icon: string
  children: ReactNode
  className?: string
}

/**
 * 分区卡片容器组件
 */
const SectionCard = memo(function SectionCard({
  title,
  icon,
  children,
  className = '',
}: SectionCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
    >
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
          <span>{icon}</span>
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
})

export default SectionCard
