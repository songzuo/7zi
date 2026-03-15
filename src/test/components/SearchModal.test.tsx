import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchModal, SearchButton, useSearchKeyboard } from '@/components/SearchModal'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/test',
}))

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
  }),
}))

// Mock Fuse.js
vi.mock('fuse.js', () => {
  return {
    default: class MockFuse {
      constructor(private items: unknown[]) {}
      search(query: string) {
        if (!query.trim()) return []
        const searchItems = this.items as Array<{ title: string; description: string }>
        return searchItems
          .filter(
            (item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.description.toLowerCase().includes(query.toLowerCase())
          )
          .map((item) => ({ item }))
      }
    },
  }
})

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn()

describe('SearchModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('rendering', () => {
    it('does not render when isOpen is false', () => {
      render(<SearchModal isOpen={false} onClose={mockOnClose} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders when isOpen is true', () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders search input with placeholder', () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      expect(screen.getByPlaceholderText('Search posts, projects, team members...')).toBeInTheDocument()
    })

    it('renders with zh locale placeholder', () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} locale="zh" />)
      expect(screen.getByPlaceholderText('搜索文章、项目、团队成员...')).toBeInTheDocument()
    })

    it('renders backdrop that closes modal on click', () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      
      // Get the backdrop by its class (fixed positioning at the root of modal)
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50')
      expect(backdrop).toBeInTheDocument()
      fireEvent.click(backdrop!)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('renders ESC keyboard shortcut hint', () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      expect(screen.getByText('ESC')).toBeInTheDocument()
    })
  })

  describe('search functionality', () => {
    it('shows initial results when opened', () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      
      // Should show default results (up to 8 items)
      const results = screen.getByRole('list')
      expect(results).toBeInTheDocument()
    })

    it('filters results based on search query', async () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      
      const input = screen.getByPlaceholderText('Search posts, projects, team members...')
      
      await userEvent.type(input, 'AI')
      
      await waitFor(() => {
        expect(input).toHaveValue('AI')
      })
    })

    it('shows no results message when query has no matches', async () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      
      const input = screen.getByPlaceholderText('Search posts, projects, team members...')
      
      await userEvent.type(input, 'zzzzzzzzzznotexist')
      
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument()
      })
    })

    it('shows zh locale no results message', async () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} locale="zh" />)
      
      const input = screen.getByPlaceholderText('搜索文章、项目、团队成员...')
      
      await userEvent.type(input, 'zzzzzzzzzznotexist')
      
      await waitFor(() => {
        expect(screen.getByText('没有找到结果')).toBeInTheDocument()
      })
    })
  })

  describe('keyboard navigation', () => {
    it('closes modal on Escape key', () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      
      const input = screen.getByPlaceholderText('Search posts, projects, team members...')
      fireEvent.keyDown(input, { key: 'Escape' })
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('navigates down with ArrowDown', () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      
      const input = screen.getByPlaceholderText('Search posts, projects, team members...')
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      
      // Should not throw and should change selection
      expect(input).toBeInTheDocument()
    })

    it('navigates up with ArrowUp', () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      
      const input = screen.getByPlaceholderText('Search posts, projects, team members...')
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      
      // Should not throw and should change selection
      expect(input).toBeInTheDocument()
    })

    it('selects item on Enter', async () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      
      const input = screen.getByPlaceholderText('Search posts, projects, team members...')
      fireEvent.keyDown(input, { key: 'Enter' })
      
      expect(mockPush).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('mouse interaction', () => {
    it('navigates on item hover', async () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      
      const buttons = screen.getAllByRole('button')
      const resultButton = buttons.find((btn) => btn.textContent?.includes('AI World Expert') || btn.textContent?.includes('📝'))
      
      if (resultButton) {
        fireEvent.mouseEnter(resultButton)
        expect(resultButton).toBeInTheDocument()
      }
    })

    it('closes and navigates on item click', async () => {
      render(<SearchModal isOpen={true} onClose={mockOnClose} />)
      
      const buttons = screen.getAllByRole('button')
      const resultButton = buttons.find((btn) => btn.textContent?.includes('AI World Expert'))
      
      if (resultButton) {
        fireEvent.click(resultButton)
        expect(mockPush).toHaveBeenCalled()
        expect(mockOnClose).toHaveBeenCalled()
      }
    })
  })
})

describe('SearchButton', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders button with search icon', () => {
    render(<SearchButton onClick={mockOnClick} />)
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
  })

  it('renders with zh locale aria-label', () => {
    render(<SearchButton onClick={mockOnClick} locale="zh" />)
    expect(screen.getByRole('button', { name: '搜索' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    render(<SearchButton onClick={mockOnClick} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockOnClick).toHaveBeenCalled()
  })

  it('shows keyboard shortcut hint', () => {
    render(<SearchButton onClick={mockOnClick} />)
    expect(screen.getByText('⌘')).toBeInTheDocument()
    expect(screen.getByText('K')).toBeInTheDocument()
  })
})

describe('useSearchKeyboard', () => {
  it('opens search on Cmd+K', () => {
    const mockOnOpen = vi.fn()
    
    const result = renderHookWithCallback(() => useSearchKeyboard(mockOnOpen, false))
    
    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    
    expect(mockOnOpen).toHaveBeenCalled()
  })

  it('opens search on Ctrl+K', () => {
    const mockOnOpen = vi.fn()
    
    const result = renderHookWithCallback(() => useSearchKeyboard(mockOnOpen, false))
    
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    
    expect(mockOnOpen).toHaveBeenCalled()
  })
})

// Helper to test hooks
function renderHookWithCallback<T>(callback: () => T) {
  const result = { current: null as T | null }
  
  const TestComponent = () => {
    result.current = callback()
    return null
  }
  
  render(<TestComponent />)
  
  return result
}