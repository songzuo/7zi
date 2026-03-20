/**
 * CollaborationItemCard - Collaboration feature card component
 */

import type { CollaborationItem } from './types';

interface CollaborationItemCardProps {
  item: CollaborationItem;
  translations: {
    title: string;
    description: string;
  };
}

export function CollaborationItemCard({ item, translations }: CollaborationItemCardProps) {
  return (
    <div className="group bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}
        aria-hidden="true"
      >
        {item.emoji}
      </div>
      <h3 className="font-bold text-zinc-900 dark:text-white mb-2">
        {translations.title}
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {translations.description}
      </p>
    </div>
  );
}
