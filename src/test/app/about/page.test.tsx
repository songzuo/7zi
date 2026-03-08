import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AboutPage from '@/app/[locale]/about/page'

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(() =>
    vi.fn().mockImplementation((opts) => {
      const translations: Record<string, Record<string, string>> = {
        nav: {
          home: 'Home',
          about: 'About',
          team: 'Team',
          blog: 'Blog',
          dashboard: 'Dashboard',
          contact: 'Contact',
        },
        footer: {
          copyright: '© 2024 7zi Studio',
        },
      }
      return translations[opts.namespace] || {}
    })
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

// Mock about components
vi.mock('@/components/about', () => ({
  HeroSection: () => <section data-testid="about-hero">About Hero</section>,
  CompanyIntro: () => <section data-testid="company-intro">Company Intro</section>,
  TeamMembers: () => <section data-testid="team-members">Team Members</section>,
  Timeline: () => <section data-testid="timeline">Timeline</section>,
  Values: () => <section data-testid="values">Values</section>,
  CTASection: () => <section data-testid="about-cta">CTA</section>,
  Footer: () => <footer data-testid="about-footer">Footer</footer>,
}))

// Mock i18n config
vi.mock('@/i18n/config', () => ({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
}))

describe('AboutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await AboutPage({ params }))
    
    expect(container).toBeTruthy()
  })

  it('renders with Chinese locale', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await AboutPage({ params }))
    
    expect(screen.getByTestId('client-providers')).toBeInTheDocument()
  })

  it('renders with English locale', async () => {
    const params = Promise.resolve({ locale: 'en' })
    render(await AboutPage({ params }))
    
    expect(screen.getByTestId('client-providers')).toBeInTheDocument()
  })

  it('renders all about page sections', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await AboutPage({ params }))
    
    expect(screen.getByTestId('about-hero')).toBeInTheDocument()
    expect(screen.getByTestId('company-intro')).toBeInTheDocument()
    expect(screen.getByTestId('team-members')).toBeInTheDocument()
    expect(screen.getByTestId('timeline')).toBeInTheDocument()
    expect(screen.getByTestId('values')).toBeInTheDocument()
    expect(screen.getByTestId('about-cta')).toBeInTheDocument()
    expect(screen.getByTestId('about-footer')).toBeInTheDocument()
  })

  it('renders navigation with correct links', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await AboutPage({ params }))
    
    const navLinks = screen.getAllByTestId('nav-link')
    expect(navLinks.length).toBeGreaterThan(0)
  })

  it('renders theme toggle button', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await AboutPage({ params }))
    
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('renders language switcher', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await AboutPage({ params }))
    
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument()
  })

  it('renders mobile menu', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await AboutPage({ params }))
    
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
  })

  it('includes structured data for SEO', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await AboutPage({ params }))
    
    expect(screen.getByTestId('structured-data')).toBeInTheDocument()
  })

  it('applies correct dark mode classes', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await AboutPage({ params }))
    
    expect(container.querySelector('.dark\\:bg-black')).toBeInTheDocument()
    expect(container.querySelector('.bg-zinc-50')).toBeInTheDocument()
  })

  it('has animated background elements', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await AboutPage({ params }))
    
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('has proper overflow handling', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await AboutPage({ params }))
    
    expect(container.querySelector('.overflow-x-hidden')).toBeInTheDocument()
  })

  it('renders navigation with aria-label', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await AboutPage({ params }))
    
    expect(screen.getByLabelText('Main navigation')).toBeInTheDocument()
  })

  it('calls setRequestLocale with correct locale', async () => {
    const { setRequestLocale } = await import('next-intl/server')
    const params = Promise.resolve({ locale: 'zh' })
    
    render(await AboutPage({ params }))
    
    expect(setRequestLocale).toHaveBeenCalledWith('zh')
  })

  it('has fixed navigation with backdrop blur', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await AboutPage({ params }))
    
    expect(container.querySelector('.fixed')).toBeInTheDocument()
    expect(container.querySelector('.backdrop-blur-lg')).toBeInTheDocument()
  })
})