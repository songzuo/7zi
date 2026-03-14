import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import TeamPage from '@/app/[locale]/team/page'

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(() => {
    const t = vi.fn((opts: any) => {
      const translations: Record<string, Record<string, string | Record<string, string>>> = {
        nav: { home: 'Home', about: 'About', team: 'Team', blog: 'Blog', dashboard: 'Dashboard', contact: 'Contact' },
        team: {
          'hero.badge': 'Our Team', 'hero_title': 'Meet Our Experts', 'hero.description': '11 Professional AI Agents',
          'hero.stats.members.value': '11', 'hero.stats.members.label': 'AI Agents',
          'hero.stats.coverage.value': '100%', 'hero.stats.coverage.label': 'Coverage',
          'hero.stats.support.value': '24/7', 'hero.stats.support.label': 'Support',
          'collaboration.title': 'How We Work', 'collaboration.description': 'Seamless teamwork',
          'collaboration.items.strategy.title': 'Strategy', 'collaboration.items.strategy.description': 'Strategic planning',
          'collaboration.items.design.title': 'Design', 'collaboration.items.design.description': 'Creative design',
          'collaboration.items.testing.title': 'Testing', 'collaboration.items.testing.description': 'Quality assurance',
          'collaboration.items.promotion.title': 'Promotion', 'collaboration.items.promotion.description': 'Marketing',
          'cta.title': 'Ready to Start?', 'cta.description': 'Contact us today', 'cta.button': 'Get in Touch',
        },
        'team.members': {
          'expert.name': 'Strategy Expert', 'expert.role': 'Strategist', 'expert.description': 'Strategic planning expert',
          'consultant.name': 'Consultant', 'consultant.role': 'Advisor', 'consultant.description': 'Business consultant',
        },
        footer: { copyright: '© 2024 7zi Studio' },
      };
      return translations[opts?.namespace] || {};
    });
    // Add raw method for skills
    (t as any).raw = vi.fn((key: string) => {
      const rawData: Record<string, string[]> = {
        'expert.skills': ['Planning', 'Analysis'], 'consultant.skills': ['Consulting', 'Advisory'],
      };
      return rawData[key] || [];
    });
    return t;
  }),
}))

// Mock ClientProviders
vi.mock('@/components/ClientProviders', () => ({
  ClientProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="client-providers">{children}</div>
  ),
}))

// Mock SEO component
vi.mock('@/components/SEO', () => ({
  StructuredData: ({ locale }: { locale: string }) => (
    <div data-testid="structured-data" data-locale={locale} />
  ),
}))

// Mock team components
vi.mock('@/components/team', () => ({
  TeamGrid: () => <section data-testid="team-grid">Team Grid</section>,
  CollaborationSection: () => <section data-testid="collaboration-section">Collaboration</section>,
  HeroSection: () => <section data-testid="team-hero">Team Hero</section>,
  CTASection: () => <section data-testid="team-cta">CTA</section>,
  TeamNavigation: () => <nav data-testid="team-navigation">Navigation</nav>,
  TeamFooter: () => <footer data-testid="team-footer">Footer</footer>,
  TeamMember: vi.fn(),
}))

// Mock i18n config
vi.mock('@/i18n/config', () => ({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
}))

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await TeamPage({ params }))
    
    expect(container).toBeTruthy()
  })

  it('renders with Chinese locale', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await TeamPage({ params }))
    
    expect(screen.getByTestId('client-providers')).toBeInTheDocument()
  })

  it('renders with English locale', async () => {
    const params = Promise.resolve({ locale: 'en' })
    render(await TeamPage({ params }))
    
    expect(screen.getByTestId('client-providers')).toBeInTheDocument()
  })

  it('renders all team page sections', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await TeamPage({ params }))
    
    expect(screen.getByTestId('team-navigation')).toBeInTheDocument()
    expect(screen.getByTestId('team-hero')).toBeInTheDocument()
    expect(screen.getByTestId('team-grid')).toBeInTheDocument()
    expect(screen.getByTestId('collaboration-section')).toBeInTheDocument()
    expect(screen.getByTestId('team-cta')).toBeInTheDocument()
    expect(screen.getByTestId('team-footer')).toBeInTheDocument()
  })

  it('includes structured data for SEO', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await TeamPage({ params }))
    
    expect(screen.getByTestId('structured-data')).toBeInTheDocument()
  })

  it('applies correct dark mode classes', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await TeamPage({ params }))
    
    expect(container.querySelector('.dark\\:bg-black')).toBeInTheDocument()
    expect(container.querySelector('.bg-zinc-50')).toBeInTheDocument()
  })

  it('has responsive min-height', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await TeamPage({ params }))
    
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument()
  })

  it('calls setRequestLocale with correct locale', async () => {
    const { setRequestLocale } = await import('next-intl/server')
    const params = Promise.resolve({ locale: 'zh' })
    
    render(await TeamPage({ params }))
    
    expect(setRequestLocale).toHaveBeenCalledWith('zh')
  })

  it('includes structured data script for team members', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await TeamPage({ params }))
    
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).toBeInTheDocument()
  })

  it('has correct structured data type', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await TeamPage({ params }))
    
    const script = container.querySelector('script[type="application/ld+json"]')
    const data = JSON.parse(script?.textContent || '{}')
    
    expect(data['@type']).toBe('CollectionPage')
    expect(data.mainEntity['@type']).toBe('ItemList')
  })
})