'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import ProjectCard from './ProjectCard';
import CategoryFilter from './CategoryFilter';
import { projects } from '@/lib/data/projects';
import { Project } from '@/types';

interface PortfolioGridProps {
  initialProjects?: Project[];
}

export function PortfolioGrid({ initialProjects = projects }: PortfolioGridProps) {
  const t = useTranslations('portfolio');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get all unique categories
  const categories = useMemo(() => {
    const allCategories = new Set<string>();
    projects.forEach(project => {
      if (project.category) {
        allCategories.add(project.category);
      }
    });
    return ['all', ...Array.from(allCategories).sort()];
  }, []);

  // Filter projects based on search term and category
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="space-y-8">
      {/* Search and Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{t('noProjectsFound')}</p>
        </div>
      )}
    </div>
  );
}