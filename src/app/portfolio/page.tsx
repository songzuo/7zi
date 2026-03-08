import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';
import { getProjects } from '@/lib/data/projects';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

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

export default async function PortfolioPage() {
  const t = await getTranslations('Portfolio');
  const projects = getProjects();
  
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