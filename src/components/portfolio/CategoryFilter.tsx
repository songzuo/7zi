'use client';

import { useTranslations } from 'next-intl';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilter({ 
  categories, 
  selectedCategory, 
  onCategoryChange 
}: CategoryFilterProps) {
  const t = useTranslations('Portfolio');
  
  return (
    <div className="flex flex-wrap gap-2 mb-8 justify-center">
      <button
        onClick={() => onCategoryChange('all')}
        className={`px-4 py-2 rounded-full transition-all duration-300 ${
          selectedCategory === 'all'
            ? 'bg-primary text-white shadow-lg'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
        }`}
      >
        {t('allProjects')}
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-4 py-2 rounded-full transition-all duration-300 capitalize ${
            selectedCategory === category
              ? 'bg-primary text-white shadow-lg'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}