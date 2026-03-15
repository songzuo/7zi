import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';
import { getProjects } from '@/lib/data/projects';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import type { Project } from '@/types';
import type { ProjectCategory } from '@/types/common';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Portfolio');
  
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      images: ['/og/portfolio.jpg'],
    },
  };
}

// Project data type from data source
interface ProjectData {
  id: string;
  slug?: string;
  title: string;
  description: string;
  metadata?: {
    category?: ProjectCategory;
    thumbnail?: string;
    client?: string;
  };
  images?: string[];
  techStack?: string[];
  client?: string;
  duration?: string;
  highlights?: string[];
  links?: Record<string, string>;
}

// Helper to convert ProjectData to Project type
function toProject(projectData: ProjectData): Project {
  return {
    id: projectData.id,
    slug: projectData.slug || projectData.id,
    title: projectData.title,
    description: projectData.description,
    category: projectData.metadata?.category || 'website',
    thumbnail: projectData.metadata?.thumbnail || '/images/placeholder.jpg',
    images: projectData.images || (projectData.metadata?.thumbnail ? [projectData.metadata.thumbnail] : []),
    techStack: projectData.techStack || [],
    client: projectData.client || projectData.metadata?.client,
    duration: projectData.duration || '',
    highlights: projectData.highlights || [],
    links: projectData.links || {},
  };
}

export default async function PortfolioPage() {
  const t = await getTranslations('Portfolio');
  const projectData = getProjects();
  const projects: Project[] = projectData.map(toProject);
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            {t('title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('description')}
          </p>
        </div>
        
        <PortfolioGrid initialProjects={projects} />
      </div>
    </div>
  );
}
