'use client';

import { Link } from '@/i18n/routing';
import { ProjectCategory } from '../data';

interface CategoryFilterProps {
  activeCategory: ProjectCategory | 'all';
  labels: {
    all: string;
    website: string;
    app: string;
    ai: string;
    design: string;
  };
}

export default function CategoryFilter({ activeCategory, labels }: CategoryFilterProps) {
  const categories: { key: ProjectCategory | 'all'; label: string }[] = [
    { key: 'all', label: labels.all },
    { key: 'website', label: labels.website },
    { key: 'app', label: labels.app },
    { key: 'ai', label: labels.ai },
    { key: 'design', label: labels.design },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {categories.map(({ key, label }) => (
        <Link
          key={key}
          href={key === 'all' ? '/portfolio' : `/portfolio?category=${key}`}
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
            activeCategory === key
              ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}