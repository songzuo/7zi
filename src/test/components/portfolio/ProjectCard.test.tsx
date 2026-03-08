import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectCard from '@/components/portfolio/ProjectCard';
import { Project } from '@/types/common';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

const mockProject: Project = {
  id: '1',
  slug: 'test-project',
  title: 'Test Project',
  description: 'A test project description that is long enough to test line clamping if needed',
  category: 'website',
  thumbnail: '/test-thumbnail.jpg',
  images: ['/test-1.jpg', '/test-2.jpg'],
  techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  client: 'Test Client',
  duration: '3 months',
  highlights: ['Feature 1', 'Feature 2'],
  links: {
    live: 'https://example.com',
    github: 'https://github.com/example',
  },
};

describe('ProjectCard', () => {
  it('renders project title', () => {
    render(<ProjectCard project={mockProject} />);
    
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('renders project description', () => {
    render(<ProjectCard project={mockProject} />);
    
    expect(screen.getByText(/A test project description/)).toBeInTheDocument();
  });

  it('renders project category', () => {
    render(<ProjectCard project={mockProject} />);
    
    expect(screen.getByText('website')).toBeInTheDocument();
  });

  it('renders tech stack tags', () => {
    render(<ProjectCard project={mockProject} />);
    
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  });

  it('renders project thumbnail with correct alt text', () => {
    render(<ProjectCard project={mockProject} />);
    
    const image = screen.getByAltText('Test Project');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/test-thumbnail.jpg');
  });

  it('links to correct project page', () => {
    render(<ProjectCard project={mockProject} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/portfolio/test-project');
  });

  it('renders with all required elements', () => {
    const { container } = render(<ProjectCard project={mockProject} />);
    
    // Check that card structure is correct
    expect(container.querySelector('.bg-white')).toBeInTheDocument();
    expect(container.querySelector('.rounded-xl')).toBeInTheDocument();
  });

  it('applies correct styling to category badge', () => {
    render(<ProjectCard project={mockProject} />);
    
    const categoryBadge = screen.getByText('website');
    expect(categoryBadge).toHaveClass('px-2', 'py-1');
  });

  it('renders without links if not provided', () => {
    const projectWithoutLinks: Project = {
      ...mockProject,
      links: {},
    };
    
    render(<ProjectCard project={projectWithoutLinks} />);
    
    // Card should still render
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('handles projects with empty tech stack', () => {
    const projectWithoutTech: Project = {
      ...mockProject,
      techStack: [],
    };
    
    render(<ProjectCard project={projectWithoutTech} />);
    
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('renders long tech stack correctly', () => {
    const projectWithManyTech: Project = {
      ...mockProject,
      techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
    };
    
    render(<ProjectCard project={projectWithManyTech} />);
    
    // All tech items should be rendered
    projectWithManyTech.techStack.forEach(tech => {
      expect(screen.getByText(tech)).toBeInTheDocument();
    });
  });

  it('applies dark mode classes', () => {
    const { container } = render(<ProjectCard project={mockProject} />);
    
    // Check for dark mode classes
    expect(container.querySelector('.dark\\:bg-gray-800')).toBeInTheDocument();
  });
});