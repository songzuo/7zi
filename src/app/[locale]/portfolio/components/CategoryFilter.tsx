'use client';

import { categories } from '@/data/projects';

interface CategoryFilterProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  locale: string;
}

export function CategoryFilter({ activeCategory, onCategoryChange, locale }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {categories.map((category) => (
        <button
          key={category.key}
          onClick={() => onCategoryChange(category.key)}
          className={`
            px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-medium
            transition-all duration-300 touch-feedback
            ${activeCategory === category.key
              ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white'
            }
          `}
        >
          {locale === 'zh' ? category.label : category.labelEn}
        </button>
      ))}
    </div>
  );
}