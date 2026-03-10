/**
 * CategoryFilter 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CategoryFilter from '@/components/portfolio/CategoryFilter'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'Portfolio': {
        'allProjects': 'All Projects',
      }[key] || key
    }
    return translations[key] || key
  }),
}))

describe('CategoryFilter', () => {
  const mockCategories = ['all', 'website', 'app', 'ai', 'design']
  const mockOnCategoryChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      expect(container).toBeTruthy()
    })

    it('renders all category buttons', () => {
      render(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      mockCategories.forEach(category => {
        expect(screen.getByText(category === 'all' ? 'Portfolio' : category)).toBeInTheDocument()
      })
    })

    it('renders correct number of buttons', () => {
      render(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(mockCategories.length)
    })
  })

  describe('选中状态测试', () => {
    it('highlights the selected category', () => {
      render(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="website"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      const selectedBtn = screen.getByText('website')
      expect(selectedBtn).toHaveClass('bg-primary')
      expect(selectedBtn).toHaveClass('text-white')
    })

    it('applies inactive styling to unselected categories', () => {
      render(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="website"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      const unselectedBtn = screen.getByText('app')
      expect(unselectedBtn).toHaveClass('bg-gray-100')
    })

    it('updates styling when selection changes', () => {
      const { rerender } = render(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="website"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      let websiteBtn = screen.getByText('website')
      expect(websiteBtn).toHaveClass('bg-primary')
      
      rerender(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="app"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      websiteBtn = screen.getByText('website')
      const appBtn = screen.getByText('app')
      
      expect(websiteBtn).not.toHaveClass('bg-primary')
      expect(appBtn).toHaveClass('bg-primary')
    })
  })

  describe('交互测试', () => {
    it('calls onCategoryChange when a category is clicked', () => {
      render(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      fireEvent.click(screen.getByText('website'))
      
      expect(mockOnCategoryChange).toHaveBeenCalledTimes(1)
      expect(mockOnCategoryChange).toHaveBeenCalledWith('website')
    })

    it('calls onCategoryChange with correct category value', () => {
      render(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      mockCategories.forEach(category => {
        fireEvent.click(screen.getByText(category === 'all' ? 'Portfolio' : category))
      })
      
      expect(mockOnCategoryChange).toHaveBeenCalledTimes(mockCategories.length)
    })
  })

  describe('样式测试', () => {
    it('applies transition classes to buttons', () => {
      render(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(btn => {
        expect(btn).toHaveClass('transition-all')
      })
    })

    it('applies rounded-full class to buttons', () => {
      render(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(btn => {
        expect(btn).toHaveClass('rounded-full')
      })
    })

    it('applies dark mode classes', () => {
      render(
        <CategoryFilter
          categories={mockCategories}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      const unselectedBtn = screen.getByText('website')
      expect(unselectedBtn).toHaveClass('dark:bg-gray-800')
    })
  })

  describe('边界情况测试', () => {
    it('handles empty categories array', () => {
      render(
        <CategoryFilter
          categories={[]}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })

    it('handles single category', () => {
      render(
        <CategoryFilter
          categories={['all']}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      expect(screen.getByText('Portfolio')).toBeInTheDocument()
    })

    it('handles categories with special characters', () => {
      const specialCategories = ['all', 'web-site', 'app_mobile', 'ai/ml']
      
      render(
        <CategoryFilter
          categories={specialCategories}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )
      
      expect(screen.getByText('web-site')).toBeInTheDocument()
      expect(screen.getByText('app_mobile')).toBeInTheDocument()
      expect(screen.getByText('ai/ml')).toBeInTheDocument()
    })
  })
})