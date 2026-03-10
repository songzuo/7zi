/**
 * ProjectCard 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjectCard from '@/components/portfolio/ProjectCard'
import { Project } from '@/types/common'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'Portfolio': {
        'viewProject': 'View Project',
      }[key] || key
    }
    return key
  }),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, className }: { src: string; alt: string; fill?: boolean; className?: string }) => (
    <img 
      src={src} 
      alt={alt} 
      data-fill={fill} 
      className={className}
      data-testid="project-image"
    />
  ),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} data-testid="project-link">
      {children}
    </a>
  ),
}))

describe('ProjectCard', () => {
  const mockProject: Project = {
    id: 'test-1',
    slug: 'test-project',
    title: 'Test Project',
    description: 'A test project description that is quite long and should be truncated',
    category: 'website',
    thumbnail: '/images/test.jpg',
    images: ['/images/test1.jpg', '/images/test2.jpg'],
    techStack: ['React', 'TypeScript', 'Node.js'],
    client: 'Test Client',
    duration: '3 months',
    highlights: ['Fast performance', 'Modern design'],
    links: {
      live: 'https://example.com',
      github: 'https://github.com/example',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('renders without crashing', () => {
      const { container } = render(<ProjectCard project={mockProject} />)
      expect(container).toBeTruthy()
    })

    it('renders the project title', () => {
      render(<ProjectCard project={mockProject} />)
      
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    it('renders the project description', () => {
      render(<ProjectCard project={mockProject} />)
      
      expect(screen.getByText(/A test project description/)).toBeInTheDocument()
    })

    it('renders the project category', () => {
      render(<ProjectCard project={mockProject} />)
      
      expect(screen.getByText('website')).toBeInTheDocument()
    })

    it('renders the project image', () => {
      render(<ProjectCard project={mockProject} />)
      
      const image = screen.getByTestId('project-image')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', '/images/test.jpg')
      expect(image).toHaveAttribute('alt', 'Test Project')
    })
  })

  describe('技术栈显示测试', () => {
    it('renders tech stack tags', () => {
      render(<ProjectCard project={mockProject} />)
      
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
      expect(screen.getByText('Node.js')).toBeInTheDocument()
    })

    it('renders all tech stack items', () => {
      render(<ProjectCard project={mockProject} />)
      
      const techTags = screen.getAllByText(/React|TypeScript|Node.js/)
      expect(techTags).toHaveLength(3)
    })
  })

  describe('链接测试', () => {
    it('renders link to project detail page', () => {
      render(<ProjectCard project={mockProject} />)
      
      const link = screen.getByTestId('project-link')
      expect(link).toHaveAttribute('href', '/portfolio/test-project')
    })

    it('wraps the card in a link', () => {
      render(<ProjectCard project={mockProject} />)
      
      const link = screen.getByTestId('project-link')
      expect(link).toContainElement(screen.getByText('Test Project'))
    })
  })

  describe('样式测试', () => {
    it('has hover effect classes', () => {
      const { container } = render(<ProjectCard project={mockProject} />)
      
      const card = container.querySelector('.hover\\:shadow-xl')
      expect(card).toBeInTheDocument()
    })

    it('has transition classes', () => {
      const { container } = render(<ProjectCard project={mockProject} />)
      
      const card = container.querySelector('.transition-all')
      expect(card).toBeInTheDocument()
    })

    it('applies correct category badge styling', () => {
      render(<ProjectCard project={mockProject} />)
      
      const categoryBadge = screen.getByText('website')
      expect(categoryBadge).toHaveClass('bg-primary/10')
      expect(categoryBadge).toHaveClass('text-primary')
    })
  })

  describe('边界情况测试', () => {
    it('handles project with empty tech stack', () => {
      const projectWithEmptyTech = {
        ...mockProject,
        techStack: [],
      }
      
      render(<ProjectCard project={projectWithEmptyTech} />)
      
      // 组件应该正常渲染，没有技术标签
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    it('handles project with very long title', () => {
      const projectWithLongTitle = {
        ...mockProject,
        title: 'This is a very long project title that might need to be truncated or handled specially',
      }
      
      render(<ProjectCard project={projectWithLongTitle} />)
      
      expect(screen.getByText(/This is a very long project title/)).toBeInTheDocument()
    })

    it('handles project with special characters in description', () => {
      const projectWithSpecialChars = {
        ...mockProject,
        description: 'Description with <script>alert("xss")</script> special chars & symbols!',
      }
      
      render(<ProjectCard project={projectWithSpecialChars} />)
      
      // 应该安全渲染，不执行脚本
      expect(screen.getByText(/Description with/)).toBeInTheDocument()
    })

    it('handles different categories', () => {
      const categories: Array<'website' | 'app' | 'ai' | 'design'> = ['website', 'app', 'ai', 'design']
      
      categories.forEach(category => {
        const projectWithCategory = {
          ...mockProject,
          category,
        }
        
        const { unmount } = render(<ProjectCard project={projectWithCategory} />)
        expect(screen.getByText(category)).toBeInTheDocument()
        unmount()
      })
    })
  })
})