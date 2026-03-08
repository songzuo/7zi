import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from '@/app/[locale]/dashboard/page'
import { useLocale } from 'next-intl'

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'zh'),
}))

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(() => vi.fn()),
}))

// Mock LazyComponents
vi.mock('@/components/LazyComponents', () => ({
  LazyProjectDashboard: () => (
    <div data-testid="project-dashboard">Project Dashboard Mock</div>
  ),
}))

// Mock ClientProviders
vi.mock('@/components/ClientProviders', () => ({
  ClientProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="client-providers">{children}</div>
  ),
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}))

// Mock LanguageSwitcher
vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">Language</div>,
}))

// Mock MobileMenu
vi.mock('@/components/MobileMenu', () => ({
  default: () => <div data-testid="mobile-menu">Menu</div>,
}))

// Mock i18n routing
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} data-testid="nav-link">{children}</a>
  ),
}))

// Mock SEO component
vi.mock('@/components/SEO', () => ({
  StructuredData: ({ locale }: { locale: string }) => (
    <div data-testid="structured-data" data-locale={locale} />
  ),
}))

// Mock i18n config
vi.mock('@/i18n/config', () => ({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('页面渲染测试', () => {
    it('renders without crashing', () => {
      const { container } = render(<DashboardPage />)
      
      expect(container).toBeTruthy()
    })

    it('renders the dashboard page container with correct styling', () => {
      const { container } = render(<DashboardPage />)
      
      const mainContainer = container.querySelector('.min-h-screen')
      expect(mainContainer).toBeInTheDocument()
      expect(mainContainer).toHaveClass('bg-zinc-50')
    })

    it('renders correct dark mode background class', () => {
      const { container } = render(<DashboardPage />)
      
      const darkBg = container.querySelector('.dark\\:bg-black')
      expect(darkBg).toBeInTheDocument()
    })

    it('renders the page title in Chinese locale', () => {
      vi.mocked(useLocale).mockReturnValue('zh')
      render(<DashboardPage />)
      
      expect(screen.getByRole('heading', { level: 1, name: '实时看板' })).toBeInTheDocument()
    })

    it('renders the page title in English locale', () => {
      vi.mocked(useLocale).mockReturnValue('en')
      render(<DashboardPage />)
      
      expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    })

    it('renders the LazyProjectDashboard component', () => {
      render(<DashboardPage />)
      
      expect(screen.getByTestId('project-dashboard')).toBeInTheDocument()
    })

    it('has correct container max-width class', () => {
      const { container } = render(<DashboardPage />)
      
      expect(container.querySelector('.max-w-7xl')).toBeInTheDocument()
    })

    it('has correct padding classes', () => {
      const { container } = render(<DashboardPage />)
      
      const section = container.querySelector('.py-20')
      expect(section).toBeInTheDocument()
      expect(section).toHaveClass('px-6')
    })
  })

  describe('响应式布局测试', () => {
    it('has responsive container with mx-auto', () => {
      const { container } = render(<DashboardPage />)
      
      const responsiveContainer = container.querySelector('.mx-auto')
      expect(responsiveContainer).toBeInTheDocument()
    })

    it('applies correct title styling with responsive classes', () => {
      const { container } = render(<DashboardPage />)
      
      const title = container.querySelector('h1')
      expect(title).toHaveClass('text-4xl')
      expect(title).toHaveClass('font-bold')
    })

    it('has proper spacing with margin bottom on title', () => {
      const { container } = render(<DashboardPage />)
      
      const title = container.querySelector('h1')
      expect(title).toHaveClass('mb-8')
    })
  })

  describe('国际化测试', () => {
    it('displays Chinese title when locale is zh', () => {
      vi.mocked(useLocale).mockReturnValue('zh')
      render(<DashboardPage />)
      
      expect(screen.getByText('实时看板')).toBeInTheDocument()
    })

    it('displays English title when locale is en', () => {
      vi.mocked(useLocale).mockReturnValue('en')
      render(<DashboardPage />)
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })
})