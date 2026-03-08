import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';
import { Project } from '@/types/common';

// Mock projects data
const _mockProjects: Project[] = [
  {
    id: '1',
    slug: 'test-project-1',
    title: 'Test Project One',
    description: 'A test project for testing',
    category: 'website',
    thumbnail: '/test-thumb-1.jpg',
    images: ['/test-1.jpg'],
    techStack: ['React', 'TypeScript'],
    duration: '3 months',
    highlights: ['Test highlight'],
    links: {},
  },
  {
    id: '2',
    slug: 'test-project-2',
    title: 'Another Project',
    description: 'Another test project',
    category: 'app',
    thumbnail: '/test-thumb-2.jpg',
    images: ['/test-2.jpg'],
    techStack: ['Vue', 'JavaScript'],
    duration: '2 months',
    highlights: ['Another highlight'],
    links: {},
  },
  {
    id: '3',
    slug: 'ai-project',
    title: 'AI Project',
    description: 'An AI powered project',
    category: 'ai',
    thumbnail: '/test-thumb-3.jpg',
    images: ['/test-3.jpg'],
    techStack: ['Python', 'TensorFlow'],
    duration: '6 months',
    highlights: ['AI highlight'],
    links: {},
  },
];

// Mock projects data
vi.mock('@/lib/data/projects', () => ({
  projects: [
    {
      id: '1',
      slug: 'test-project-1',
      title: 'Test Project One',
      description: 'A test project for testing',
      category: 'website',
      thumbnail: '/test-thumb-1.jpg',
      images: ['/test-1.jpg'],
      techStack: ['React', 'TypeScript'],
      duration: '3 months',
      highlights: ['Test highlight'],
      links: {},
    },
    {
      id: '2',
      slug: 'test-project-2',
      title: 'Another Project',
      description: 'Another test project',
      category: 'app',
      thumbnail: '/test-thumb-2.jpg',
      images: ['/test-2.jpg'],
      techStack: ['Vue', 'JavaScript'],
      duration: '2 months',
      highlights: ['Another highlight'],
      links: {},
    },
    {
      id: '3',
      slug: 'ai-project',
      title: 'AI Project',
      description: 'An AI powered project',
      category: 'ai',
      thumbnail: '/test-thumb-3.jpg',
      images: ['/test-3.jpg'],
      techStack: ['Python', 'TensorFlow'],
      duration: '6 months',
      highlights: ['AI highlight'],
      links: {},
    },
  ],
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => {
    const translations: Record<string, string> = {
      'searchPlaceholder': 'Search projects...',
      'noProjectsFound': 'No projects found',
    };
    const t = (key: string) => translations[key] || key;
    t.raw = (key: string) => translations[key] || key;
    return t;
  },
}));

// Mock ProjectCard - default export
vi.mock('@/components/portfolio/ProjectCard', () => ({
  default: ({ project }: { project: Project }) => (
    <div data-testid={`project-card-${project.id}`}>{project.title}</div>
  ),
}));

// Mock CategoryFilter - default export
vi.mock('@/components/portfolio/CategoryFilter', () => ({
  default: ({ categories, selectedCategory, onSelectCategory }: {
    categories: string[];
    selectedCategory: string;
    onSelectCategory?: (cat: string) => void;
  }) => (
    <div data-testid="category-filter">
      {categories.map(cat => (
        <button
          key={cat}
          data-testid={`category-${cat}`}
          onClick={() => onSelectCategory?.(cat)}
          className={selectedCategory === cat ? 'selected' : ''}
        >
          {cat}
        </button>
      ))}
    </div>
  ),
}));

describe('PortfolioGrid', () => {
  beforeAll(() => {
    // Mock projects is now done via vi.mock
  });

  it('renders all projects initially', () => {
    render(<PortfolioGrid />);
    
    expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('project-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('project-card-3')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<PortfolioGrid />);
    
    const searchInput = screen.getByPlaceholderText('Search projects...');
    expect(searchInput).toBeInTheDocument();
  });

  it('filters projects by search term', () => {
    render(<PortfolioGrid />);
    
    const searchInput = screen.getByPlaceholderText('Search projects...');
    
    // Search for "AI"
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    
    expect(screen.getByTestId('project-card-3')).toBeInTheDocument();
    expect(screen.queryByTestId('project-card-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('project-card-2')).not.toBeInTheDocument();
  });

  it('filters projects by search term in description', () => {
    render(<PortfolioGrid />);
    
    const searchInput = screen.getByPlaceholderText('Search projects...');
    
    // Search for "powered" (in description of project 3)
    fireEvent.change(searchInput, { target: { value: 'powered' } });
    
    expect(screen.getByTestId('project-card-3')).toBeInTheDocument();
    expect(screen.queryByTestId('project-card-1')).not.toBeInTheDocument();
  });

  it('shows no projects found message when search has no results', () => {
    render(<PortfolioGrid />);
    
    const searchInput = screen.getByPlaceholderText('Search projects...');
    
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No projects found')).toBeInTheDocument();
    expect(screen.queryByTestId('project-card-1')).not.toBeInTheDocument();
  });

  it('filters projects by category', () => {
    render(<PortfolioGrid />);
    
    // Click on 'ai' category
    const aiButton = screen.getByTestId('category-ai');
    fireEvent.click(aiButton);
    
    expect(screen.getByTestId('project-card-3')).toBeInTheDocument();
    expect(screen.queryByTestId('project-card-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('project-card-2')).not.toBeInTheDocument();
  });

  it('filters by both search term and category', () => {
    render(<PortfolioGrid />);
    
    const searchInput = screen.getByPlaceholderText('Search projects...');
    
    // Filter by category first
    const websiteButton = screen.getByTestId('category-website');
    fireEvent.click(websiteButton);
    
    // Then search within that category
    fireEvent.change(searchInput, { target: { value: 'Test' } });
    
    expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
    expect(screen.queryByTestId('project-card-2')).not.toBeInTheDocument();
  });

  it('clears search when input is cleared', () => {
    render(<PortfolioGrid />);
    
    const searchInput = screen.getByPlaceholderText('Search projects...');
    
    // Search and filter
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    expect(screen.getByTestId('project-card-3')).toBeInTheDocument();
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // All projects should be visible again
    expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('project-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('project-card-3')).toBeInTheDocument();
  });

  it('renders category filter with all categories', () => {
    render(<PortfolioGrid />);
    
    expect(screen.getByTestId('category-filter')).toBeInTheDocument();
    expect(screen.getByTestId('category-all')).toBeInTheDocument();
    expect(screen.getByTestId('category-website')).toBeInTheDocument();
    expect(screen.getByTestId('category-app')).toBeInTheDocument();
    expect(screen.getByTestId('category-ai')).toBeInTheDocument();
  });
});