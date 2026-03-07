'use client';

import CategoryFilter from './CategoryFilter';

interface CategoryFilterWrapperProps {
  locale: string;
  activeCategory: string;
}

export function CategoryFilterWrapper({ locale, activeCategory }: CategoryFilterWrapperProps) {
  const labels = {
    all: locale === 'zh' ? '全部' : 'All',
    website: locale === 'zh' ? '网站' : 'Website',
    app: locale === 'zh' ? '应用' : 'App',
    ai: locale === 'zh' ? 'AI' : 'AI',
    design: locale === 'zh' ? '设计' : 'Design',
  };

  return (
    <CategoryFilter 
      activeCategory={activeCategory as 'all' | 'website' | 'app' | 'ai' | 'design'} 
      labels={labels} 
    />
  );
}