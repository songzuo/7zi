import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryFilter from '@/components/portfolio/CategoryFilter';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'allProjects': 'All Projects',
    };
    return translations[key] || key;
  },
}));

describe('CategoryFilter', () => {
  const categories = ['all', 'website', 'app', 'ai'];
  const mockOnCategoryChange = vi.fn();

  beforeEach(() => {
    mockOnCategoryChange.mockClear();
  });

  it('renders all category buttons', () => {
    render(
      <CategoryFilter
        categories={categories}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    );
    
    expect(screen.getByText('All Projects')).toBeInTheDocument();
    expect(screen.getByText('website')).toBeInTheDocument();
    expect(screen.getByText('app')).toBeInTheDocument();
    expect(screen.getByText('ai')).toBeInTheDocument();
  });

  it('highlights selected category', () => {
    render(
      <CategoryFilter
        categories={categories}
        selectedCategory="website"
        onCategoryChange={mockOnCategoryChange}
      />
    );
    
    const websiteButton = screen.getByText('website');
    expect(websiteButton).toHaveClass('bg-primary');
    expect(websiteButton).toHaveClass('text-white');
  });

  it('applies non-selected styles to other categories', () => {
    render(
      <CategoryFilter
        categories={categories}
        selectedCategory="website"
        onCategoryChange={mockOnCategoryChange}
      />
    );
    
    const appButton = screen.getByText('app');
    expect(appButton).toHaveClass('bg-gray-100');
  });

  it('calls onCategoryChange when category is clicked', () => {
    render(
      <CategoryFilter
        categories={categories}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    );
    
    fireEvent.click(screen.getByText('ai'));
    
    expect(mockOnCategoryChange).toHaveBeenCalledWith('ai');
  });

  it('calls onCategoryChange with "all" when All Projects is clicked', () => {
    render(
      <CategoryFilter
        categories={categories}
        selectedCategory="website"
        onCategoryChange={mockOnCategoryChange}
      />
    );
    
    fireEvent.click(screen.getByText('All Projects'));
    
    expect(mockOnCategoryChange).toHaveBeenCalledWith('all');
  });

  it('renders empty categories array gracefully', () => {
    render(
      <CategoryFilter
        categories={[]}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    );
    
    // Should still render the "All" button
    expect(screen.getByText('All Projects')).toBeInTheDocument();
  });

  it('applies correct styling for dark mode', () => {
    const { container } = render(
      <CategoryFilter
        categories={categories}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    );
    
    // Check for dark mode classes on container
    expect(container.querySelector('.dark\\:bg-gray-800')).toBeInTheDocument();
  });

  it('applies capitalize class to category buttons', () => {
    render(
      <CategoryFilter
        categories={categories}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    );
    
    const websiteButton = screen.getByText('website');
    expect(websiteButton).toHaveClass('capitalize');
  });

  it('handles single category', () => {
    render(
      <CategoryFilter
        categories={['website']}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    );
    
    expect(screen.getByText('All Projects')).toBeInTheDocument();
    expect(screen.getByText('website')).toBeInTheDocument();
  });

  it('updates selection when selectedCategory prop changes', () => {
    const { rerender } = render(
      <CategoryFilter
        categories={categories}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    );
    
    let websiteButton = screen.getByText('website');
    expect(websiteButton).not.toHaveClass('bg-primary');
    
    // Rerender with new selection
    rerender(
      <CategoryFilter
        categories={categories}
        selectedCategory="website"
        onCategoryChange={mockOnCategoryChange}
      />
    );
    
    websiteButton = screen.getByText('website');
    expect(websiteButton).toHaveClass('bg-primary');
  });
});