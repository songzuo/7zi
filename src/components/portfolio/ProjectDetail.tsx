'use client';

import { Project } from '@/types/common';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface ProjectDetailProps {
  project: Project;
}

export default function ProjectDetail({ project }: ProjectDetailProps) {
  const t = useTranslations('Portfolio');
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{project.title}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">{project.description}</p>
        
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">
            {project.category}
          </span>
          {project.techStack.map((tech) => (
            <span key={tech} className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full dark:bg-gray-700 dark:text-gray-200">
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Project Images */}
      <div className="mb-8">
        <div className="relative w-full h-64 md:h-96 mb-4 rounded-lg overflow-hidden">
          <Image
            src={project.thumbnail}
            alt={project.title}
            fill
            className="object-cover"
            priority
          />
        </div>
        
        {project.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.images.map((image, index) => (
              <div key={index} className="relative aspect-video rounded-lg overflow-hidden">
                <Image
                  src={image}
                  alt={`${project.title} - ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">{t('projectDetails')}</h2>
          <div className="space-y-2">
            <p><span className="font-medium">{t('client')}:</span> {project.client}</p>
            <p><span className="font-medium">{t('duration')}:</span> {project.duration}</p>
          </div>
        </div>
        
        {project.links && (
          <div>
            <h2 className="text-xl font-semibold mb-4">{t('links')}</h2>
            <div className="flex flex-wrap gap-2">
              {project.links.live && (
                <Link 
                  href={project.links.live} 
                  target="_blank"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  {t('demo')}
                </Link>
              )}
              {project.links.github && (
                <Link 
                  href={project.links.github} 
                  target="_blank"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  GitHub
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Highlights */}
      {project.highlights && project.highlights.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{t('highlights')}</h2>
          <ul className="list-disc list-inside space-y-2">
            {project.highlights.map((highlight, index) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">{highlight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Testimonial */}
      {project.testimonial && (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">{t('testimonial')}</h2>
          <blockquote className="text-gray-700 dark:text-gray-300 italic">
            &quot;{project.testimonial.content}&quot;
          </blockquote>
          <p className="mt-2 font-medium">— {project.testimonial.author}</p>
        </div>
      )}
    </div>
  );
}