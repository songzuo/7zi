'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { Project, ProjectCategory } from '../data';
import { memo } from 'react';

interface ProjectCardProps {
  project: Project;
  locale: string;
  labels?: {
    viewDetails: string;
  };
}

const categoryColors: Record<ProjectCategory, string> = {
  website: 'from-blue-500 to-cyan-500',
  app: 'from-purple-500 to-pink-500',
  ai: 'from-green-500 to-emerald-500',
  design: 'from-orange-500 to-red-500',
};

function ProjectCard({ project, locale, labels }: ProjectCardProps) {
  const title = locale === 'zh' ? project.titleZh : project.title;
  const description = locale === 'zh' ? project.descriptionZh : project.description;

  return (
    <Link
      href={`/portfolio/${project.slug}`}
      className="group block bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 touch-active"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] sm:aspect-video overflow-hidden">
        <Image
          src={project.thumbnail}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Category Badge */}
        <div className={`absolute top-3 sm:top-4 left-3 sm:left-4 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${categoryColors[project.category]}`}>
          {project.category.toUpperCase()}
        </div>

        {/* View Details Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-zinc-900 rounded-full text-sm font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            {labels?.viewDetails || 'View Details'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-cyan-500 transition-colors line-clamp-1 sm:line-clamp-2">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3 sm:mb-4">
          {description}
        </p>
        
        {/* Tech Stack */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {project.techStack.slice(0, 3).map((tech) => (
            <span
              key={tech}
              className="text-xs px-1.5 sm:px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            >
              {tech}
            </span>
          ))}
          {project.techStack.length > 3 && (
            <span className="text-xs px-1.5 sm:px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              +{project.techStack.length - 3}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default memo(ProjectCard);