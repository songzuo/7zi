/**
 * CollaborationItemCard - Collaboration feature card component
 */

import type { CollaborationItem } from './types'

interface CollaborationItemCardProps {
  item: CollaborationItem
  translations: {
    title: string
    description: string
  }
}

export function CollaborationItemCard({ item, translations }: CollaborationItemCardProps) {
  return (
    <div className="group rounded-2xl bg-zinc-50 p-6 transition-all duration-300 hover:shadow-lg dark:bg-zinc-800">
      <div
        className={`h-12 w-12 rounded-xl bg-gradient-to-br ${item.color} mb-4 flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110`}
        aria-hidden="true"
      >
        {item.emoji}
      </div>
      <h3 className="mb-2 font-bold text-zinc-900 dark:text-white">{translations.title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{translations.description}</p>
    </div>
  )
}
