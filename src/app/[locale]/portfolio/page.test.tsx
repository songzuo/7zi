import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PortfolioPage from '@/app/[locale]/portfolio/page';

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => {
    const translations: Record<string, string> = {
      'meta.title': 'Portfolio - 7zi',
      'meta.description': 'Explore our projects',
      'title': 'Our Portfolio',
      'subtitle': 'Discover our work',
    };
    return translations[key] || key;
  }),
}));

// Mock PortfolioGrid component
vi.mock('@/components/portfolio/PortfolioGrid', () => ({
  PortfolioGrid: vi.fn(({ projects }) => (
    <div data-testid="portfolio-grid" data-project-count={projects?.length || 0}>
      Portfolio Grid Component
    </div>
  )),
}));

// Mock projects data
vi.mock('@/lib/data/projects', () => ({
  getProjects: vi.fn(() => [
    {
      id: '1',
      title: 'Project 1',
      description: 'Description 1',
      category: 'web',
      image: '/images/project1.jpg',
      technologies: ['React', 'TypeScript'],
      status: 'completed',
    },
    {
      id: '2',
      title: 'Project 2',
      description: 'Description 2',
      category: 'mobile',
      image: '/images/project2.jpg',
      technologies: ['React Native'],
      status: 'in-progress',
    },
  ]),
}));

describe('PortfolioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该渲染页面标题', async () => {
      const page = await PortfolioPage();
      render(page);
      
      expect(screen.getByText('Our Portfolio')).toBeInTheDocument();
    });

    it('应该渲染副标题', async () => {
      const page = await PortfolioPage();
      render(page);
      
      expect(screen.getByText('Discover our work')).toBeInTheDocument();
    });

    it('应该渲染PortfolioGrid组件', async () => {
      const page = await PortfolioPage();
      render(page);
      
      expect(screen.getByTestId('portfolio-grid')).toBeInTheDocument();
    });

    it('应该传递项目数据给PortfolioGrid', async () => {
      const page = await PortfolioPage();
      render(page);
      
      const grid = screen.getByTestId('portfolio-grid');
      expect(grid).toHaveAttribute('data-project-count', '2');
    });
  });

  describe('元数据生成', () => {
    it('应该生成正确的元数据', async () => {
      const metadata = await PortfolioPage.generateMetadata?.();
      
      expect(metadata).toBeDefined();
      expect(metadata?.title).toBe('Portfolio - 7zi');
      expect(metadata?.description).toBe('Explore our projects');
    });

    it('应该包含OpenGraph元数据', async () => {
      const metadata = await PortfolioPage.generateMetadata?.();
      
      expect(metadata?.openGraph).toBeDefined();
      expect(metadata?.openGraph?.title).toBe('Portfolio - 7zi');
      expect(metadata?.openGraph?.images).toContain('/og/portfolio.jpg');
    });
  });

  describe('样式和布局', () => {
    it('应该有正确的容器样式', async () => {
      const page = await PortfolioPage();
      const { container } = render(page);
      
      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toBeInTheDocument();
    });

    it('应该使用响应式布局类', async () => {
      const page = await PortfolioPage();
      const { container } = render(page);
      
      const responsiveContainer = container.querySelector('.container');
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理空项目列表', async () => {
      const { getProjects } = await import('@/lib/data/projects');
      vi.mocked(getProjects).mockReturnValueOnce([]);
      
      const page = await PortfolioPage();
      render(page);
      
      const grid = screen.getByTestId('portfolio-grid');
      expect(grid).toHaveAttribute('data-project-count', '0');
    });

    it('应该处理单个项目', async () => {
      const { getProjects } = await import('@/lib/data/projects');
      vi.mocked(getProjects).mockReturnValueOnce([
        {
          id: '1',
          title: 'Single Project',
          description: 'Single Description',
          category: 'web',
          image: '/images/single.jpg',
          technologies: ['Next.js'],
          status: 'completed',
        },
      ]);
      
      const page = await PortfolioPage();
      render(page);
      
      const grid = screen.getByTestId('portfolio-grid');
      expect(grid).toHaveAttribute('data-project-count', '1');
    });
  });

  describe('错误处理', () => {
    it('应该处理翻译缺失的情况', async () => {
      const { getTranslations } = await import('next-intl/server');
      vi.mocked(getTranslations).mockResolvedValueOnce((key: string) => key);
      
      const page = await PortfolioPage();
      render(page);
      
      // 即使翻译缺失，页面仍应渲染
      expect(screen.getByTestId('portfolio-grid')).toBeInTheDocument();
    });
  });
});