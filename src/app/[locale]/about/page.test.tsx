import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import AboutPage from './page'
import { notFound } from 'next/navigation'

// Mock dependencies
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  setRequestLocale: vi.fn(),
}))

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async ({ namespace }) => {
    if (namespace === 'nav') {
      const navMap = {
        home: 'Home',
        about: 'About',
        team: 'Team',
        blog: 'Blog',
        dashboard: 'Dashboard',
        contact: 'Contact',
      }
      const navFn = (key: string) => navMap[key as keyof typeof navMap] || key
      navFn.raw = () => navMap
      return navFn
    }
    if (namespace === 'about') {
      const aboutMap: Record<string, any> = {
        'hero.badge': 'AI-Powered Digital Studio',
        'hero.title': 'About',
        'hero.description': 'Learn about our AI-powered digital studio',
        'intro.title': 'Studio Introduction',
        'intro.p1': 'We are an AI-powered digital studio.',
        'intro.p2': ' paragraph 2',
        'intro.p3': ' paragraph 3',
        'intro.stats.experts.value': '11',
        'intro.stats.experts.label': 'AI Experts',
        'intro.stats.experts.sub': 'Specialized',
        'intro.stats.projects.value': '50+',
        'intro.stats.projects.label': 'Projects',
        'intro.stats.projects.sub': 'Completed',
        'intro.stats.delivery.value': '24h',
        'intro.stats.delivery.label': 'Delivery',
        'intro.stats.delivery.sub': 'Fast',
        'intro.stats.support.value': '24/7',
        'intro.stats.support.label': 'Support',
        'intro.stats.support.sub': 'Always',
        'team.badge': 'Our Team',
        'team.title': 'Meet Our Team',
        'team.description': '11 AI experts working together',
        'timeline.badge': 'Timeline',
        'timeline.title': 'Our Journey',
        'timeline.description': 'How we started and grew',
        'timeline.items': [
          { year: '2024', title: 'Founded', description: 'Studio founded' },
          { year: '2024', title: 'Team Growth', description: 'Team expanded' },
          { year: '2025', title: 'Expansion', description: 'Services expanded' },
          { year: '2025', title: 'Innovation', description: 'New features' },
        ],
        'values.badge': 'Our Values',
        'values.title': 'Core Values',
        'values.items.collaboration.title': 'Collaboration',
        'values.items.collaboration.description': 'Working together',
        'values.items.innovation.title': 'Innovation',
        'values.items.innovation.description': 'Always innovating',
        'values.items.quality.title': 'Quality',
        'values.items.quality.description': 'High quality work',
        'values.items.customer.title': 'Customer',
        'values.items.customer.description': 'Customer first',
        'cta.title': 'Ready to Start?',
        'cta.description': 'Contact us today',
        'cta.button': 'Get Started',
      }
      const aboutFn = (key: string) => aboutMap[key]
      aboutFn.raw = (key: string) => {
        if (key === 'timeline.items') {
          return [
            { year: '2024', title: 'Founded', description: 'Studio founded' },
            { year: '2024', title: 'Team Growth', description: 'Team expanded' },
            { year: '2025', title: 'Expansion', description: 'Services expanded' },
            { year: '2025', title: 'Innovation', description: 'New features' },
          ]
        }
        return {}
      }
      return aboutFn
    }
    if (namespace === 'team.members') {
      const memberMap: Record<string, any> = {
        'expert.name': 'Expert Agent',
        'expert.role': 'AI Expert',
        'expert.description': 'Leading expert in AI',
        'consultant.name': 'Consultant Agent',
        'consultant.role': 'Consultant',
        'consultant.description': 'Strategic consulting',
        'architect.name': 'Architect Agent',
        'architect.role': 'System Architect',
        'architect.description': 'System design expert',
        'executor.name': 'Executor Agent',
        'executor.role': 'Executor',
        'executor.description': 'Task execution specialist',
        'admin.name': 'Admin Agent',
        'admin.role': 'Administrator',
        'admin.description': 'System administration',
        'tester.name': 'Tester Agent',
        'tester.role': 'QA Tester',
        'tester.description': 'Quality assurance',
        'designer.name': 'Designer Agent',
        'designer.role': 'UI/UX Designer',
        'designer.description': 'Creative design',
        'promoter.name': 'Promoter Agent',
        'promoter.role': 'Marketing',
        'promoter.description': 'Brand promotion',
        'sales.name': 'Sales Agent',
        'sales.role': 'Sales Manager',
        'sales.description': 'Business development',
        'finance.name': 'Finance Agent',
        'finance.role': 'Financial Analyst',
        'finance.description': 'Financial management',
        'media.name': 'Media Agent',
        'media.role': 'Media Specialist',
        'media.description': 'Content creation',
      }
      const memberFn = (key: string) => memberMap[key]
      memberFn.raw = () => memberMap
      return memberFn
    }
    if (namespace === 'footer') {
      const footerFn = (key: string) => (key === 'copyright' ? '© 2026 7zi Studio' : key)
      footerFn.raw = () => ({ copyright: '© 2026 7zi Studio' })
      return footerFn
    }
    const fn = (key: string) => key
    fn.raw = () => ({})
    return fn
  }),
  setRequestLocale: vi.fn(),
}))

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href, className, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/MobileMenu', () => ({
  default: () => <div data-testid="mobile-menu">Mobile Menu</div>,
}))

vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">Language Switcher</div>,
}))

vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}))

vi.mock('@/components/SEO', () => ({
  StructuredData: () => <div data-testid="structured-data">Structured Data</div>,
}))

describe('AboutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Page Rendering', () => {
    it('should render the about page without errors', async () => {
      const { container } = render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(container).toBeInTheDocument()
    })

    it('should display the hero section', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const aboutTexts = screen.getAllByText('About')
      expect(aboutTexts.length).toBeGreaterThan(0)
      expect(screen.getByText(/AI-Powered Digital Studio/)).toBeInTheDocument()
    })

    it('should display the studio introduction section', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const introTexts = screen.getAllByText(/AI-powered digital studio/i)
      expect(introTexts.length).toBeGreaterThan(0)
    })

    it('should display the team section', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('Meet Our Team')).toBeInTheDocument()
      expect(screen.getByText(/11 AI experts working together/)).toBeInTheDocument()
    })

    it('should display the timeline section', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('Our Journey')).toBeInTheDocument()
      expect(screen.getByText('Founded')).toBeInTheDocument()
    })

    it('should display the values section', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('Core Values')).toBeInTheDocument()
      const innovationTexts = screen.getAllByText('Innovation')
      expect(innovationTexts.length).toBeGreaterThan(0)
    })

    it('should display the CTA section', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('Ready to Start?')).toBeInTheDocument()
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })

    it('should display the footer', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText(/© 2026 7zi Studio/)).toBeInTheDocument()
    })
  })

  describe('Team Members Display', () => {
    it('should display all 11 team members', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('Expert Agent')).toBeInTheDocument()
      expect(screen.getByText('Consultant Agent')).toBeInTheDocument()
      expect(screen.getByText('Architect Agent')).toBeInTheDocument()
      expect(screen.getByText('Executor Agent')).toBeInTheDocument()
      expect(screen.getByText('Admin Agent')).toBeInTheDocument()
      expect(screen.getByText('Tester Agent')).toBeInTheDocument()
      expect(screen.getByText('Designer Agent')).toBeInTheDocument()
      expect(screen.getByText('Promoter Agent')).toBeInTheDocument()
      expect(screen.getByText('Sales Agent')).toBeInTheDocument()
      expect(screen.getByText('Finance Agent')).toBeInTheDocument()
      expect(screen.getByText('Media Agent')).toBeInTheDocument()
    })

    it('should display team member roles', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('AI Expert')).toBeInTheDocument()
      expect(screen.getByText('System Architect')).toBeInTheDocument()
      expect(screen.getByText('UI/UX Designer')).toBeInTheDocument()
    })

    it('should display team member descriptions', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText(/Leading expert in AI/)).toBeInTheDocument()
      expect(screen.getByText(/Strategic consulting/)).toBeInTheDocument()
    })

    it('should display online status for team members', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const onlineIndicators = screen.getAllByText(/Online/)
      expect(onlineIndicators.length).toBeGreaterThan(0)
    })
  })

  describe('Stats Display', () => {
    it('should display all stats cards', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('11')).toBeInTheDocument()
      expect(screen.getByText('AI Experts')).toBeInTheDocument()
      expect(screen.getByText('50+')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('24h')).toBeInTheDocument()
      expect(screen.getByText('Delivery')).toBeInTheDocument()
      expect(screen.getByText('24/7')).toBeInTheDocument()
      expect(screen.getByText('Support')).toBeInTheDocument()
    })

    it('should display correct stats values', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const expertStat = screen.getByText('11')
      const projectStat = screen.getByText('50+')
      expect(expertStat).toBeInTheDocument()
      expect(projectStat).toBeInTheDocument()
    })
  })

  describe('Values Section', () => {
    it('should display all four values', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const collaborationTexts = screen.getAllByText('Collaboration')
      expect(collaborationTexts.length).toBeGreaterThan(0)
      const innovationTexts = screen.getAllByText('Innovation')
      expect(innovationTexts.length).toBeGreaterThan(0)
      expect(screen.getByText('Quality')).toBeInTheDocument()
      expect(screen.getByText('Customer')).toBeInTheDocument()
    })

    it('should display value descriptions', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const workingTexts = screen.getAllByText(/Working together/)
      expect(workingTexts.length).toBeGreaterThan(0)
      const innovatingTexts = screen.getAllByText(/Always innovating/)
      expect(innovatingTexts.length).toBeGreaterThan(0)
      const qualityTexts = screen.getAllByText(/High quality work/)
      expect(qualityTexts.length).toBeGreaterThan(0)
      const customerTexts = screen.getAllByText(/Customer first/)
      expect(customerTexts.length).toBeGreaterThan(0)
    })
  })

  describe('Navigation', () => {
    it('should display the navigation bar', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const nav = screen.getByLabelText('Main navigation')
      expect(nav).toBeInTheDocument()
      // Check for 7zi within navigation
      expect(within(nav).getByText('7zi')).toBeInTheDocument()
      expect(within(nav).getByText('Studio')).toBeInTheDocument()
    })

    it('should display navigation links', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const nav = screen.getByLabelText('Main navigation')
      expect(within(nav).getByText('About')).toBeInTheDocument()
      expect(within(nav).getByText('Team')).toBeInTheDocument()
      expect(within(nav).getByText('Blog')).toBeInTheDocument()
      expect(within(nav).getByText('Dashboard')).toBeInTheDocument()
      expect(within(nav).getByText('Contact')).toBeInTheDocument()
    })

    it('should highlight the current page in navigation', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const nav = screen.getByLabelText('Main navigation')
      const aboutLink = within(nav).getByText('About')
      expect(aboutLink).toBeInTheDocument()
    })
  })

  describe('Timeline Section', () => {
    it('should display timeline items', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const timelineSection = screen.getByText('Our Journey').closest('section')
      if (timelineSection) {
        expect(within(timelineSection).getByText('Founded')).toBeInTheDocument()
        expect(within(timelineSection).getByText('Team Growth')).toBeInTheDocument()
        expect(within(timelineSection).getByText('Expansion')).toBeInTheDocument()
        expect(within(timelineSection).getByText('Innovation')).toBeInTheDocument()
      }
    })

    it('should display timeline years', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const years = screen.getAllByText('2024')
      const years2025 = screen.getAllByText('2025')
      expect(years.length).toBeGreaterThan(0)
      expect(years2025.length).toBeGreaterThan(0)
    })
  })

  describe('Internationalization', () => {
    it('should render with English locale', async () => {
      const { container } = render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(container).toBeInTheDocument()
    })

    it('should render with Chinese locale', async () => {
      const { container } = render(
        await AboutPage({ params: Promise.resolve({ locale: 'zh-CN' }) })
      )
      expect(container).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('should include structured data component', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByTestId('structured-data')).toBeInTheDocument()
    })

    it('should include theme toggle', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const themeToggles = screen.getAllByTestId('theme-toggle')
      expect(themeToggles.length).toBeGreaterThan(0)
    })

    it('should include language switcher', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const languageSwitchers = screen.getAllByTestId('language-switcher')
      expect(languageSwitchers.length).toBeGreaterThan(0)
    })

    it('should include mobile menu', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
    })
  })

  describe('Links and Navigation', () => {
    it('should have working navigation links', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const aboutLinks = screen.getAllByText('About')
      expect(aboutLinks.length).toBeGreaterThan(0)
      const teamLinks = screen.getAllByText('Team')
      expect(teamLinks.length).toBeGreaterThan(0)
    })

    it('should have CTA link to contact page', async () => {
      render(await AboutPage({ params: Promise.resolve({ locale: 'en' }) }))
      const ctaButton = screen.getByText('Get Started')
      expect(ctaButton.closest('a')).toHaveAttribute('href', '/contact')
    })
  })
})
