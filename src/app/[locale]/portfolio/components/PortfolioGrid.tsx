'use client';

import type { Project } from '../data';
import ProjectCard from './ProjectCard';
import { memo, useTransition, useDeferredValue } from 'react';

interface PortfolioGridProps {
  projects: Project[];
  locale: string;
  labels?: {
    viewDetails: string;
  };
  emptyMessage?: {
    title: string;
    description: string;
  };
}

const EmptyState = memo(({ title, description }: { title: string; description: string }) => (
  <div className="text-center py-20">
    <div className="text-6xl mb-4" role="img" aria-label="No projects">
      📭
    </div>
    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-zinc-600 dark:text-zinc-400">
      {description}
    </p>
  </div>
));

EmptyState.displayName = 'EmptyState';

function PortfolioGrid({ projects, locale, labels, emptyMessage }: PortfolioGridProps) {
  // 使用 useDeferredValue 优化大数据集的渲染（React 19 优化）
  const deferredProjects = useDeferredValue(projects);

  // 使用 useTransition 优化更新交互（React 19 优化）
  const [isPending, startTransition] = useTransition();

  if (deferredProjects.length === 0 && emptyMessage) {
    return <EmptyState title={emptyMessage.title} description={emptyMessage.description} />;
  }

  return (
    <div 
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${isPending ? 'opacity-50' : ''}`}
    >
      {deferredProjects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          locale={locale}
          labels={labels}
        />
      ))}
    </div>
  );
}

export default memo(PortfolioGrid);