'use client';

import { Project } from '../data';
import ProjectCard from './ProjectCard';

interface PortfolioGridProps {
  projects: Project[];
  locale: string;
  labels: {
    viewDetails: string;
  };
  emptyMessage?: {
    title: string;
    description: string;
  };
}

export default function PortfolioGrid({ projects, locale, labels, emptyMessage }: PortfolioGridProps) {
  if (projects.length === 0 && emptyMessage) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4" role="img" aria-label="No projects">
          📭
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          {emptyMessage.title}
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400">
          {emptyMessage.description}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {projects.map((project) => (
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