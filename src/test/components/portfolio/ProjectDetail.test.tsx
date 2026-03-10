/**
 * ProjectDetail 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjectDetail from '@/components/portfolio/ProjectDetail'
import { Project } from '@/types_common'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'projectDetails': 'Project Details',
      'client': 'Client',
      'duration': 'Duration',
      'links': 'Links',
      'demo': 'Live Demo',
      'highlights': 'Highlights',
      'testimonial': 'Client Testimonial',
    }
    return translations[key] || key
  }),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, className, priority }: { 
    src: string; 
    alt: string; 
    fill?: boolean; 
    className?: string;
    priority?: boolean;
  }) => (
    <img 
      src={src} 
      alt={alt} 
      data-fill={fill?.toString()} 
      data-priority={priority?.toString()}
      className={className}
      data-testid="project-image"
    />
  ),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className, target }: { 
    href: string; 
    children: React.ReactNode; 
    className?: string;
    target?: string;
  }) => (
    <a href={href} className={className} target={target} data-testid="project-link">
      {children}
    </a>
  ),
}))

describe('ProjectDetail', () => {
  const mockProject: Project = {
    id: 'test-1',
    slug: 'test-project',
    title: 'Test Project',
    description: 'A detailed test project description',
    category: 'website',
    thumbnail: '/images/test-thumb.jpg',
    images: ['/images/test1.jpg', '/images/test2.jpg'],
    techStack: ['React', 'TypeScript', 'Node.js'],
    client: 'Test Client Inc.',
    duration: '3 months',
    highlights: ['Fast performance', 'Modern design', 'Responsive layout'],
    links: {
      live: 'https://example.com',
      github: 'https://github.com/example/project',
    },
    testimonial: {
      content: 'This is an amazing project!',
      author: 'John Doe',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('renders without crashing', () => {
      const { container } = render(<ProjectDetail project={mockProject} />)
      expect(container).toBeTruthy()
    })

    it('renders the project title', () => {
      render(<ProjectDetail project={mockProject} />)
      
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    it('renders the project description', () => {
      render(<ProjectDetail project={mockProject} />)
      
      expect(screen.getByText('A detailed test project description')).toBeInTheDocument()
    })

    it('renders the project category badge', () => {
      render(<ProjectDetail project={mockProject} />)
      
      expect(screen.getByText('website')).toBeInTheDocument()
    })
  })

  describe('技术栈显示测试', () => {
    it('renders all tech stack items', () => {
      render(<ProjectDetail project={mockProject} />)
      
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
      expect(screen.getByText('Node.js')).toBeInTheDocument()
    })

    it('renders tech stack as badges', () => {
      const { container } = render(<ProjectDetail project={mockProject} />)
      
      const techBadges = container.querySelectorAll('.bg-gray-100, .dark\\:bg-gray-700')
      expect(techBadges.length).toBeGreaterThan(0)
    })
  })

  describe('项目详情测试', () => {
    it('renders client information', () => {
      render(<ProjectDetail project={mockProject} />)
      
      expect(screen.getByText('Test Client Inc.')).toBeInTheDocument()
    })

    it('renders duration information', () => {
      render(<ProjectDetail project={mockProject} />)
      
      expect(screen.getByText('3 months')).toBeInTheDocument()
    })
  })

  describe('图片显示测试', () => {
    it('renders the main thumbnail image', () => {
      render(<ProjectDetail project={mockProject} />)
      
      const images = screen.getAllByTestId('project-image')
      const thumbnailImage = images.find(img => img.getAttribute('src') === '/images/test-thumb.jpg')
      
      expect(thumbnailImage).toBeDefined()
      expect(thumbnailImage).toHaveAttribute('alt', 'Test Project')
    })

    it('renders additional project images', () => {
      render(<ProjectDetail project={mockProject} />)
      
      const images = screen.getAllByTestId('project-image')
      
      // Should have thumbnail + 2 additional images
      expect(images.length).toBe(3)
    })

    it('sets priority on thumbnail image', () => {
      render(<ProjectDetail project={mockProject} />)
      
      const images = screen.getAllByTestId('project-image')
      const thumbnailImage = images.find(img => img.getAttribute('data-priority') === 'true')
      
      expect(thumbnailImage).toBeDefined()
    })
  })

  describe('链接测试', () => {
    it('renders live demo link when available', () => {
      render(<ProjectDetail project={mockProject} />)
      
      const links = screen.getAllByTestId('project-link')
      const liveLink = links.find(link => link.getAttribute('href') === 'https://example.com')
      
      expect(liveLink).toBeDefined()
      expect(liveLink).toHaveTextContent('Live Demo')
    })

    it('renders GitHub link when available', () => {
      render(<ProjectDetail project={mockProject} />)
      
      const links = screen.getAllByTestId('project-link')
      const githubLink = links.find(link => link.getAttribute('href') === 'https://github.com/example/project')
      
      expect(githubLink).toBeDefined()
      expect(githubLink).toHaveTextContent('GitHub')
    })

    it('links open in new tab', () => {
      render(<ProjectDetail project={mockProject} />)
      
      const links = screen.getAllByTestId('project-link')
      
      links.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank')
      })
    })
  })

  describe('亮点测试', () => {
    it('renders all highlights', () => {
      render(<ProjectDetail project={mockProject} />)
      
      expect(screen.getByText('Fast performance')).toBeInTheDocument()
      expect(screen.getByText('Modern design')).toBeInTheDocument()
      expect(screen.getByText('Responsive layout')).toBeInTheDocument()
    })

    it('renders highlights as list items', () => {
      const { container } = render(<ProjectDetail project={mockProject} />)
      
      const listItems = container.querySelectorAll('li')
      expect(listItems.length).toBe(3)
    })
  })

  describe('客户评价测试', () => {
    it('renders testimonial content', () => {
      render(<ProjectDetail project={mockProject} />)
      
      expect(screen.getByText(/This is an amazing project!/)).toBeInTheDocument()
    })

    it('renders testimonial author', () => {
      render(<ProjectDetail project={mockProject} />)
      
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
    })
  })

  describe('边界情况测试', () => {
    it('handles project without images', () => {
      const projectWithoutImages = {
        ...mockProject,
        images: [],
      }
      
      render(<ProjectDetail project={projectWithoutImages} />)
      
      const images = screen.getAllByTestId('project-image')
      // Only thumbnail should be present
      expect(images.length).toBe(1)
    })

    it('handles project without links', () => {
      const projectWithoutLinks = {
        ...mockProject,
        links: undefined,
      }
      
      render(<ProjectDetail project={projectWithoutLinks} />)
      
      const links = screen.queryAllByTestId('project-link')
      expect(links.length).toBe(0)
    })

    it('handles project with only live link', () => {
      const projectWithOnlyLive = {
        ...mockProject,
        links: {
          live: 'https://example.com',
          github: undefined,
        },
      }
      
      render(<ProjectDetail project={projectWithOnlyLive} />)
      
      const links = screen.getAllByTestId('project-link')
      expect(links.length).toBe(1)
      expect(links[0]).toHaveAttribute('href', 'https://example.com')
    })

    it('handles project without highlights', () => {
      const projectWithoutHighlights = {
        ...mockProject,
        highlights: [],
      }
      
      const { container } = render(<ProjectDetail project={projectWithoutHighlights} />)
      
      // Should not render highlights section when empty
      const highlightsHeading = screen.queryByText('Highlights')
      expect(highlightsHeading).not.toBeInTheDocument()
    })

    it('handles project without testimonial', () => {
      const projectWithoutTestimonial = {
        ...mockProject,
        testimonial: undefined,
      }
      
      render(<ProjectDetail project={projectWithoutTestimonial} />)
      
      const testimonialHeading = screen.queryByText('Client Testimonial')
      expect(testimonialHeading).not.toBeInTheDocument()
    })

    it('handles project with special characters in description', () => {
      const projectWithSpecialChars = {
        ...mockProject,
        description: 'Description with <script>alert("xss")</script> & "quotes"',
      }
      
      render(<ProjectDetail project={projectWithSpecialChars} />)
      
      // Should safely render without executing scripts
      expect(screen.getByText(/Description with/)).toBeInTheDocument()
    })

    it('handles project with empty tech stack', () => {
      const projectWithEmptyTech = {
        ...mockProject,
        techStack: [],
      }
      
      render(<ProjectDetail project={projectWithEmptyTech} />)
      
      // Should render category badge but no tech stack badges
      expect(screen.getByText('website')).toBeInTheDocument()
    })

    it('handles very long title', () => {
      const projectWithLongTitle = {
        ...mockProject,
        title: 'This is a very long project title that might need special handling in the UI',
      }
      
      render(<ProjectDetail project={projectWithLongTitle} />)
      
      expect(screen.getByText(/This is a very long project title/)).toBeInTheDocument()
    })

    it('handles very long description', () => {
      const projectWithLongDescription = {
        ...mockProject,
        description: 'A'.repeat(1000),
      }
      
      render(<ProjectDetail project={projectWithLongDescription} />)
      
      expect(screen.getByText(/^A+$/)).toBeInTheDocument()
    })
  })

  describe('样式测试', () => {
    it('applies container max width class', () => {
      const { container } = render(<ProjectDetail project={mockProject} />)
      
      const mainContainer = container.querySelector('.max-w-4xl')
      expect(mainContainer).toBeInTheDocument()
    })

    it('applies category badge styling', () => {
      render(<ProjectDetail project={mockProject} />)
      
      const categoryBadge = screen.getByText('website')
      expect(categoryBadge).toHaveClass('bg-blue-100')
      expect(categoryBadge).toHaveClass('text-blue-800')
    })

    it('applies link button styling', () => {
      render(<ProjectDetail project={mockProject} />)
      
      const links = screen.getAllByTestId('project-link')
      links.forEach(link => {
        expect(link).toHaveClass('rounded-md')
        expect(link).toHaveClass('transition-colors')
      })
    })

    it('applies dark mode classes', () => {
      const { container } = render(<ProjectDetail project={mockProject} />)
      
      const darkModeElements = container.querySelectorAll('[class*="dark:"]')
      expect(darkModeElements.length).toBeGreaterThan(0)
    })
  })
})
