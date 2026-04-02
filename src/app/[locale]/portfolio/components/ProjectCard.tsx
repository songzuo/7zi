'use client'

import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Project, ProjectCategory } from '../data'
import { memo } from 'react'

interface ProjectCardProps {
  project: Project
  locale: string
  labels?: {
    viewDetails: string
  }
}

const categoryColors: Record<ProjectCategory, string> = {
  website: 'from-blue-500 to-cyan-500',
  app: 'from-purple-500 to-pink-500',
  ai: 'from-green-500 to-emerald-500',
  design: 'from-orange-500 to-red-500',
}

function ProjectCard({ project, locale, labels }: ProjectCardProps) {
  const title = locale === 'zh' ? project.titleZh : project.title
  const description = locale === 'zh' ? project.descriptionZh : project.description

  return (
    <Link
      href={`/portfolio/${project.slug}`}
      className="group touch-active block overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl dark:bg-zinc-900"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-video">
        <Image
          src={project.thumbnail}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Category Badge */}
        <div
          className={`absolute top-3 left-3 rounded-full bg-gradient-to-r px-2.5 py-1 text-xs font-medium text-white sm:top-4 sm:left-4 sm:px-3 ${categoryColors[project.category]}`}
        >
          {project.category.toUpperCase()}
        </div>

        {/* View Details Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="translate-y-4 transform rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-transform duration-300 group-hover:translate-y-0 sm:px-5 sm:py-2.5">
            {labels?.viewDetails || 'View Details'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <h3 className="mb-2 line-clamp-1 text-base font-bold text-zinc-900 transition-colors group-hover:text-cyan-500 sm:line-clamp-2 sm:text-lg dark:text-white">
          {title}
        </h3>
        <p className="mb-3 line-clamp-2 text-xs text-zinc-600 sm:mb-4 sm:text-sm dark:text-zinc-400">
          {description}
        </p>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {project.techStack.slice(0, 3).map(tech => (
            <span
              key={tech}
              className="rounded-lg bg-zinc-100 px-1.5 py-1 text-xs text-zinc-600 sm:px-2 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {tech}
            </span>
          ))}
          {project.techStack.length > 3 && (
            <span className="rounded-lg bg-zinc-100 px-1.5 py-1 text-xs text-zinc-600 sm:px-2 dark:bg-zinc-800 dark:text-zinc-400">
              +{project.techStack.length - 3}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default memo(ProjectCard)
