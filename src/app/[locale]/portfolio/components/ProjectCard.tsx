'use client';

import { Project } from '@/data/projects';
import { Link } from '@/i18n/routing';

interface ProjectCardProps {
  project: Project;
  locale: string;
}

const categoryColors: Record<string, string> = {
  website: 'from-blue-400 to-cyan-500',
  app: 'from-purple-400 to-pink-500',
  ai: 'from-green-400 to-emerald-500',
  design: 'from-orange-400 to-red-500',
};

const categoryLabels: Record<string, { zh: string; en: string }> = {
  website: { zh: '网站', en: 'Website' },
  app: { zh: '应用', en: 'App' },
  ai: { zh: 'AI', en: 'AI' },
  design: { zh: '设计', en: 'Design' },
};

export function ProjectCard({ project, locale }: ProjectCardProps) {
  return (
    <Link
      href={`/portfolio/${project.slug}`}
      className="group block bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={project.thumbnail}
          alt={project.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Category Badge */}
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${categoryColors[project.category]} shadow-lg`}>
          {locale === 'zh' ? categoryLabels[project.category].zh : categoryLabels[project.category].en}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-zinc-900 dark:text-white shadow-lg">
            {locale === 'zh' ? '查看详情' : 'View Details'}
            <span className="ml-1">→</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2 line-clamp-1 group-hover:text-cyan-500 transition-colors">
          {project.title}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4">
          {project.description}
        </p>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.techStack.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded"
            >
              {tech}
            </span>
          ))}
          {project.techStack.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-zinc-500 dark:text-zinc-500">
              +{project.techStack.length - 4}
            </span>
          )}
        </div>

        {/* Client & Duration */}
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-500">
          {project.client && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {project.client}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {project.duration}
          </span>
        </div>
      </div>
    </Link>
  );
}