'use client';

import { Project } from '@/data/projects';
import { ProjectCard } from './ProjectCard';

interface PortfolioGridProps {
  projects: Project[];
  locale: string;
}

export function PortfolioGrid({ projects, locale }: PortfolioGridProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-medium text-zinc-600 dark:text-zinc-400">
          {locale === 'zh' ? '暂无相关项目' : 'No projects found'}
        </h3>
        <p className="text-zinc-500 dark:text-zinc-500 mt-2">
          {locale === 'zh' ? '请尝试其他分类' : 'Try another category'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {projects.map((project, index) => (
        <div
          key={project.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <ProjectCard project={project} locale={locale} />
        </div>
      ))}
    </div>
  );
}