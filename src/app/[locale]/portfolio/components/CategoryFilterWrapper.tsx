'use client'

import CategoryFilter from './CategoryFilter'
import { useMemo, useTransition } from 'react'

interface CategoryFilterWrapperProps {
  locale: string
  activeCategory: string
  onCategoryChange?: (category: string) => void
}

export function CategoryFilterWrapper({
  locale,
  activeCategory,
  onCategoryChange,
}: CategoryFilterWrapperProps) {
  // 使用 useMemo 优化标签计算
  const labels = useMemo(
    () => ({
      all: locale === 'zh' ? '全部' : 'All',
      website: locale === 'zh' ? '网站' : 'Website',
      app: locale === 'zh' ? '应用' : 'App',
      ai: locale === 'zh' ? 'AI' : 'AI',
      design: locale === 'zh' ? '设计' : 'Design',
    }),
    [locale]
  )

  // 使用 useTransition 优化切换交互（React 19 优化）
  const [isPending, startTransition] = useTransition()

  const _handleCategoryChange = (category: string) => {
    if (onCategoryChange) {
      startTransition(() => {
        onCategoryChange(category)
      })
    }
  }

  return (
    <div className={isPending ? 'opacity-50 transition-opacity' : ''}>
      <CategoryFilter
        activeCategory={activeCategory as 'all' | 'website' | 'app' | 'ai' | 'design'}
        labels={labels}
      />
    </div>
  )
}
