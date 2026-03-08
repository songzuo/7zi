'use client';

import { Project } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const t = useTranslations('Portfolio');
  
  return (
    <Link href={`/portfolio/${project.slug}`} className="block">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="relative h-48 w-full">
          <Image
            src={project.thumbnail}
            alt={project.title}
            fill
            className="object-cover"
            priority={false}
          />
        </div>
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{project.title}</h3>
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full capitalize">
              {project.category}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
            {project.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {project.techStack.map((tech) => (
              <span key={tech} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}