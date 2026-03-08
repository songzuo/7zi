import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from '@/app/[locale]/page'

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(({ namespace }: { namespace: string }) => {
    const translations: Record<string, Record<string, unknown>> = {
      nav: {
        home: 'Home',
        about: 'About',
        team: 'Team',
        blog: 'Blog',
        dashboard: 'Dashboard',
        contact: 'Contact',
      },
      home: {
        hero: {
          badge: '✨ AI-Powered Innovation',
          title: 'Building the Future',
          subtitle: 'Digital Studio',
          description: 'We create amazing digital experiences',
          stats: {
            'projects.value': '50+',
            'projects.label': 'Projects',
            'clients.value': '30+',
            'clients.label': 'Clients',
            'satisfaction.value': '98%',
            'satisfaction.label': 'Satisfaction',
          },
        },
        teamPreview: {
          badge: 'Our Team',
          title: '11 AI Agents',
          description: 'Professional team',
        },
        services: {
          title: 'Our Services',
          subtitle: 'What we offer',
        },
        whyUs: {
          title: 'Why Choose Us',
          subtitle: 'Our advantages',
        },
        cta: {
          title: 'Start Your Project',
          description: 'Contact us today',
          button: 'Get Started',
        },
      },
      footer: {
        copyright: '© 2024 7zi Studio',
      },
    }
    
    const namespaceTranslations = translations[namespace] || {}
    const t = (key: string) => {
      const keys = key.split('.')
      let result: unknown = namespaceTranslations
      for (const k of keys) {
        result = (result as Record<string, unknown>)?.[k]
      }
      return result || key
    }
    t.raw = (key: string) => {
      const keys = key.split('.')
      let result: unknown = namespaceTranslations
      for (const k of keys) {
        result = (result as Record<string, unknown>)?.[k]
      }
      return result || {}
    }
    return Promise.resolve(t)
  }),
}))

// Mock ClientProviders
vi.mock('@/components/ClientProviders', () => ({
  ClientProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="client-providers">{children}</div>
  ),
}))

// Mock LazyComponents
vi.mock('@/components/LazyComponents', () => ({
  LazyAIChat: () => <div data-testid="lazy-ai-chat">AI Chat</div>,
  LazyGitHubActivity: () => <div data-testid="lazy-github-activity">GitHub Activity</div>,
  LazyProjectDashboard: () => <div data-testid="lazy-project-dashboard">Project Dashboard</div>,
}))

// Mock home components
vi.mock('@/components/home', () => ({
  Navigation: ({ tNav }: { tNav: (key: string) => string }) => (
    <nav data-testid="navigation">{tNav('home')}</nav>
  ),
  HeroSection: ({ locale }: { locale: string }) => (
    <section data-testid="hero-section" data-locale={locale}>Hero</section>
  ),
  TeamPreview: () => <section data-testid="team-preview">Team Preview</section>,
  ServicesSection: () => <section data-testid="services-section">Services</section>,
  WhyUsSection: () => <section data-testid="why-us-section">Why Us</section>,
  CTASection: () => <section data-testid="cta-section">CTA</section>,
  FooterSection: () => <footer data-testid="footer-section">Footer</footer>,
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

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await HomePage({ params }))
    
    expect(container).toBeTruthy()
  })

  it('renders with Chinese locale', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await HomePage({ params }))
    
    expect(screen.getByTestId('client-providers')).toBeInTheDocument()
    expect(screen.getByTestId('hero-section')).toHaveAttribute('data-locale', 'zh')
  })

  it('renders with English locale', async () => {
    const params = Promise.resolve({ locale: 'en' })
    render(await HomePage({ params }))
    
    expect(screen.getByTestId('hero-section')).toHaveAttribute('data-locale', 'en')
  })

  it('renders all main sections', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await HomePage({ params }))
    
    expect(screen.getByTestId('navigation')).toBeInTheDocument()
    expect(screen.getByTestId('hero-section')).toBeInTheDocument()
    expect(screen.getByTestId('team-preview')).toBeInTheDocument()
    expect(screen.getByTestId('services-section')).toBeInTheDocument()
    expect(screen.getByTestId('why-us-section')).toBeInTheDocument()
    expect(screen.getByTestId('cta-section')).toBeInTheDocument()
    expect(screen.getByTestId('footer-section')).toBeInTheDocument()
  })

  it('renders lazy-loaded components', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await HomePage({ params }))
    
    expect(screen.getByTestId('lazy-ai-chat')).toBeInTheDocument()
    expect(screen.getByTestId('lazy-github-activity')).toBeInTheDocument()
    expect(screen.getByTestId('lazy-project-dashboard')).toBeInTheDocument()
  })

  it('includes structured data for SEO', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await HomePage({ params }))
    
    expect(screen.getByTestId('structured-data')).toBeInTheDocument()
  })

  it('renders navigation with translations', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await HomePage({ params }))
    
    expect(screen.getByTestId('navigation')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('applies correct dark mode classes', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await HomePage({ params }))
    
    expect(container.querySelector('.dark\\:bg-black')).toBeInTheDocument()
    expect(container.querySelector('.bg-zinc-50')).toBeInTheDocument()
  })

  it('has responsive min-height', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await HomePage({ params }))
    
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument()
  })

  it('calls setRequestLocale with correct locale', async () => {
    const { setRequestLocale } = await import('next-intl/server')
    const params = Promise.resolve({ locale: 'zh' })
    
    render(await HomePage({ params }))
    
    expect(setRequestLocale).toHaveBeenCalledWith('zh')
  })

  it('renders with transition classes for smooth dark mode switching', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await HomePage({ params }))
    
    expect(container.querySelector('.transition-colors')).toBeInTheDocument()
  })
})
