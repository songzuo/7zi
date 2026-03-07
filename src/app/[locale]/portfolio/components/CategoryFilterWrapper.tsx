'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { CategoryFilter } from './CategoryFilter';

interface CategoryFilterWrapperProps {
  locale: string;
  activeCategory: string;
}

export function CategoryFilterWrapper({ locale, activeCategory }: CategoryFilterWrapperProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const handleCategoryChange = useCallback((category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === 'all') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl);
  }, [searchParams, pathname, router]);

  return <CategoryFilter activeCategory={activeCategory} onCategoryChange={handleCategoryChange} locale={locale} />;
}