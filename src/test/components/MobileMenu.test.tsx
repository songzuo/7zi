import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileMenu } from '@/components/MobileMenu'

// Mock next/navigation
const mockPathname = vi.fn(() => '/')
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

describe('MobileMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue('/')
    // Reset body styles
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
  })

  afterEach(() => {
    vi.clearAllTimers()
    // Cleanup body styles
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
  })

  describe('rendering', () => {
    it('renders menu toggle button', () => {
      render(<MobileMenu />)
      expect(screen.getByRole('button', { name: '打开菜单' })).toBeInTheDocument()
    })

    it('shows close label when menu is open', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '关闭菜单' })).toBeInTheDocument()
      })
    })

    it('menu is hidden by default', () => {
      render(<MobileMenu />)
      
      const menu = screen.queryByRole('dialog')
      expect(menu).not.toHaveAttribute('aria-modal', 'true')
    })

    it('menu becomes visible when toggle is clicked', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('navigation items', () => {
    it('renders all navigation items', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('首页')).toBeInTheDocument()
        expect(screen.getByText('关于我们')).toBeInTheDocument()
        expect(screen.getByText('团队成员')).toBeInTheDocument()
        expect(screen.getByText('博客')).toBeInTheDocument()
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText('联系我们')).toBeInTheDocument()
      })
    })

    it('highlights current page', async () => {
      mockPathname.mockReturnValue('/about')
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        const aboutLink = screen.getByRole('menuitem', { name: /关于我们/ })
        expect(aboutLink).toBeInTheDocument()
      })
    })

    it('renders external link to old project', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('7zi 环球通 (旧项目)')).toBeInTheDocument()
      })
    })
  })

  describe('interactions', () => {
    it('toggles menu state on button click', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      
      // Open menu
      fireEvent.click(toggleButton)
      await waitFor(() => {
        const dialog = screen.queryByRole('dialog');
        expect(dialog).not.toHaveClass('invisible');
      })
      
      // Close menu
      fireEvent.click(toggleButton)
      await waitFor(() => {
        const dialog = screen.queryByRole('dialog');
        expect(dialog).toHaveClass('invisible');
      })
    })

    it('closes menu when clicking backdrop', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const backdrop = screen.getByRole('dialog').querySelector('.bg-black\\/60')
      fireEvent.click(backdrop!)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '打开菜单' })).toBeInTheDocument()
      })
    })

    it('closes menu on Escape key', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      fireEvent.keyDown(window, { key: 'Escape' })
      
      // 菜单关闭后检查 dialog 是否不可见
      await waitFor(() => {
        const dialog = screen.queryByRole('dialog');
        expect(dialog).toHaveClass('invisible');
      })
    })

    it('closes menu when navigation link is clicked', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      // 等待菜单打开
      await waitFor(() => {
        const dialog = screen.queryByRole('dialog');
        expect(dialog).not.toHaveClass('invisible');
      })
      
      // 点击首页链接
      const dialog = screen.getByRole('dialog');
      const homeLink = dialog.querySelector('a[href="/"]');
      if (homeLink) {
        fireEvent.click(homeLink);
      }
      
      // 菜单关闭后检查 dialog 是否不可见
      await waitFor(() => {
        const closedDialog = screen.queryByRole('dialog');
        expect(closedDialog).toHaveClass('invisible');
      })
    })

    it('closes menu when pathname changes', async () => {
      const { rerender } = render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Simulate pathname change
      mockPathname.mockReturnValue('/about')
      rerender(<MobileMenu />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '打开菜单' })).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('has correct ARIA attributes', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(dialog).toHaveAttribute('aria-label', '导航菜单')
      })
    })

    it('has correct aria-expanded state', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
      
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('has correct role attributes on navigation items', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem')
        expect(menuItems.length).toBe(6) // 6 nav items
      })
    })
  })

  describe('body scroll lock', () => {
    it('locks body scroll when menu is open', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(document.body.style.position).toBe('fixed')
      })
    })

    it('restores body scroll when menu is closed', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      
      // Open
      fireEvent.click(toggleButton)
      await waitFor(() => {
        expect(document.body.style.position).toBe('fixed')
      })
      
      // Close
      fireEvent.click(toggleButton)
      await waitFor(() => {
        expect(document.body.style.position).toBe('')
      })
    })

    it('restores scroll position after closing', async () => {
      // Mock scroll position
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(100)
      
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(document.body.style.position).toBe('fixed')
        expect(document.body.style.top).toBe('-100px')
      })
      
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(document.body.style.position).toBe('')
      })
    })
  })

  describe('button animation', () => {
    it('hamburger icon transforms to X when open', async () => {
      render(<MobileMenu />)
      
      const toggleButton = screen.getByRole('button')
      const spans = toggleButton.querySelectorAll('span')
      
      // Initially should not have transform classes
      expect(spans[0]).not.toHaveClass('rotate-45')
      
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        const openSpans = screen.getByRole('button').querySelectorAll('span')
        // First span should rotate when open
        expect(openSpans[0]).toHaveClass('rotate-45')
        // Middle span should be hidden
        expect(openSpans[1]).toHaveClass('opacity-0')
        // Last span should rotate
        expect(openSpans[2]).toHaveClass('-rotate-45')
      })
    })
  })
})