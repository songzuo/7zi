'use client'

import { Link } from '@/i18n/routing'
import { ProjectCategory } from '../data'
import { memo } from 'react'

interface CategoryFilterProps {
  activeCategory: ProjectCategory | 'all'
  labels: {
    all: string
    website: string
    app: string
    ai: string
    design: string
  }
}

const CATEGORIES: readonly {
  key: ProjectCategory | 'all'
  labelKey: 'all' | 'website' | 'app' | 'ai' | 'design'
}[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'website', labelKey: 'website' },
  { key: 'app', labelKey: 'app' },
  { key: 'ai', labelKey: 'ai' },
  { key: 'design', labelKey: 'design' },
] as const

function CategoryFilter({ activeCategory, labels }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {CATEGORIES.map(({ key, labelKey }) => (
        <Link
          key={key}
          href={key === 'all' ? '/portfolio' : `/portfolio?category=${key}`}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
            activeCategory === key
              ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25'
              : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
          }`}
        >
          {labels[labelKey]}
        </Link>
      ))}
    </div>
  )
}

export default memo(CategoryFilter)
