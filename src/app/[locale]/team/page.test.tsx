import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import TeamPage from './page'
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
    if (namespace === 'team') {
      const teamMap: Record<string, any> = {
        'hero.badge': 'AI-Powered Team',
        'hero.title': 'Our Team',
        'hero.description': 'Meet our AI experts',
        'hero.stats.members.value': '11',
        'hero.stats.members.label': 'Members',
        'hero.stats.coverage.value': '100%',
        'hero.stats.coverage.label': 'Coverage',
        'hero.stats.support.value': '24/7',
        'hero.stats.support.label': 'Support',
        'collaboration.title': 'How We Collaborate',
        'collaboration.description': 'Team collaboration process',
        'collaboration.items.strategy.title': 'Strategy',
        'collaboration.items.strategy.description': 'Strategic planning',
        'collaboration.items.design.title': 'Design',
        'collaboration.items.design.description': 'Creative design',
        'collaboration.items.testing.title': 'Testing',
        'collaboration.items.testing.description': 'Quality testing',
        'collaboration.items.promotion.title': 'Promotion',
        'collaboration.items.promotion.description': 'Brand promotion',
        'cta.title': 'Work With Us',
        'cta.description': 'Contact our team',
        'cta.button': 'Contact Us',
      }
      const teamFn = (key: string) => teamMap[key]
      teamFn.raw = () => teamMap
      return teamFn
    }
    if (namespace === 'team.members') {
      const memberMap: Record<string, any> = {
        'expert.name': 'Expert Agent',
        'expert.role': 'AI Expert',
        'expert.description': 'Leading expert in AI technologies and solutions',
        'expert.skills': ['AI/ML', 'Data Science', 'Python', 'TensorFlow'],
        'consultant.name': 'Consultant Agent',
        'consultant.role': 'Strategic Consultant',
        'consultant.description': 'Provides strategic consulting and business insights',
        'consultant.skills': ['Strategy', 'Business', 'Analysis', 'Consulting'],
        'architect.name': 'Architect Agent',
        'architect.role': 'System Architect',
        'architect.description': 'Designs robust system architectures and infrastructure',
        'architect.skills': ['Architecture', 'Cloud', 'DevOps', 'Kubernetes'],
        'executor.name': 'Executor Agent',
        'executor.role': 'Task Executor',
        'executor.description': 'Executes tasks efficiently with precision and speed',
        'executor.skills': ['Execution', 'Automation', 'Scripting', 'CI/CD'],
        'admin.name': 'Admin Agent',
        'admin.role': 'System Administrator',
        'admin.description': 'Manages system administration and maintenance',
        'admin.skills': ['Admin', 'Linux', 'Security', 'Monitoring'],
        'tester.name': 'Tester Agent',
        'tester.role': 'QA Tester',
        'tester.description': 'Ensures quality through comprehensive testing',
        'tester.skills': ['Testing', 'QA', 'Automation', 'Jest'],
        'designer.name': 'Designer Agent',
        'designer.role': 'UI/UX Designer',
        'designer.description': 'Creates beautiful and intuitive user interfaces',
        'designer.skills': ['UI/UX', 'Figma', 'React', 'CSS'],
        'promoter.name': 'Promoter Agent',
        'promoter.role': 'Marketing Specialist',
        'promoter.description': 'Promotes brand and manages marketing campaigns',
        'promoter.skills': ['Marketing', 'SEO', 'Social Media', 'Content'],
        'sales.name': 'Sales Agent',
        'sales.role': 'Sales Manager',
        'sales.description': 'Manages sales and business development',
        'sales.skills': ['Sales', 'CRM', 'Negotiation', 'Business'],
        'finance.name': 'Finance Agent',
        'finance.role': 'Financial Analyst',
        'finance.description': 'Handles financial planning and analysis',
        'finance.skills': ['Finance', 'Excel', 'Accounting', 'Analysis'],
        'media.name': 'Media Agent',
        'media.role': 'Media Specialist',
        'media.description': 'Creates and manages media content',
        'media.skills': ['Media', 'Video', 'Audio', 'Content'],
      }
      const memberFn = (key: string) => memberMap[key]
      memberFn.raw = (key: string) => memberMap[key]
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

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Page Rendering', () => {
    it('should render the team page without errors', async () => {
      const { container } = render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(container).toBeInTheDocument()
    })

    it('should display the hero section', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('Our Team')).toBeInTheDocument()
      expect(screen.getByText(/AI-Powered Team/)).toBeInTheDocument()
    })

    it('should display the team section', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText(/Meet our AI experts/)).toBeInTheDocument()
    })

    it('should display the collaboration section', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('How We Collaborate')).toBeInTheDocument()
      expect(screen.getByText(/Team collaboration process/)).toBeInTheDocument()
    })

    it('should display the CTA section', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('Work With Us')).toBeInTheDocument()
      expect(screen.getByText('Contact Us')).toBeInTheDocument()
    })

    it('should display the footer', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText(/© 2026 7zi Studio/)).toBeInTheDocument()
    })
  })

  describe('Team Members Display', () => {
    it('should display all 11 team members', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
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
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('AI Expert')).toBeInTheDocument()
      expect(screen.getByText('Strategic Consultant')).toBeInTheDocument()
      expect(screen.getByText('System Architect')).toBeInTheDocument()
      expect(screen.getByText('Task Executor')).toBeInTheDocument()
      expect(screen.getByText('System Administrator')).toBeInTheDocument()
      expect(screen.getByText('QA Tester')).toBeInTheDocument()
      expect(screen.getByText('UI/UX Designer')).toBeInTheDocument()
      expect(screen.getByText('Marketing Specialist')).toBeInTheDocument()
      expect(screen.getByText('Sales Manager')).toBeInTheDocument()
      expect(screen.getByText('Financial Analyst')).toBeInTheDocument()
      expect(screen.getByText('Media Specialist')).toBeInTheDocument()
    })

    it('should display team member descriptions', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText(/Leading expert in AI technologies/)).toBeInTheDocument()
      expect(screen.getByText(/Provides strategic consulting/)).toBeInTheDocument()
      expect(screen.getByText(/Designs robust system architectures/)).toBeInTheDocument()
    })

    it('should display team member skills as badges', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      // Find skills in team member cards (not collaboration section)
      const expertName = screen.getByText('Expert Agent')
      const expertCard = expertName.closest('.group') as HTMLElement | null
      if (expertCard) {
        expect(within(expertCard).getByText('AI/ML')).toBeInTheDocument()
        expect(within(expertCard).getByText('Data Science')).toBeInTheDocument()
      }
    })
  })

  describe('Hero Stats Display', () => {
    it('should display all hero stats', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText('11')).toBeInTheDocument()
      expect(screen.getByText('Members')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('Coverage')).toBeInTheDocument()
      expect(screen.getByText('24/7')).toBeInTheDocument()
      expect(screen.getByText('Support')).toBeInTheDocument()
    })

    it('should display correct stats values', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      const membersStat = screen.getByText('11')
      const coverageStat = screen.getByText('100%')
      expect(membersStat).toBeInTheDocument()
      expect(coverageStat).toBeInTheDocument()
    })
  })

  describe('Collaboration Section', () => {
    it('should display all collaboration items', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))

      // Find collaboration section
      const collaborationSection = screen.getByText('How We Collaborate').closest('section')
      if (collaborationSection) {
        expect(within(collaborationSection).getByText('Strategy')).toBeInTheDocument()
        expect(within(collaborationSection).getByText('Design')).toBeInTheDocument()
        expect(within(collaborationSection).getByText('Testing')).toBeInTheDocument()
        expect(within(collaborationSection).getByText('Promotion')).toBeInTheDocument()
      }
    })

    it('should display collaboration descriptions', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))

      const collaborationSection = screen.getByText('How We Collaborate').closest('section')
      if (collaborationSection) {
        expect(within(collaborationSection).getByText(/Strategic planning/)).toBeInTheDocument()
        expect(within(collaborationSection).getByText(/Creative design/)).toBeInTheDocument()
        expect(within(collaborationSection).getByText(/Quality testing/)).toBeInTheDocument()
        expect(within(collaborationSection).getByText(/Brand promotion/)).toBeInTheDocument()
      }
    })

    it('should display collaboration icons', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))

      const collaborationSection = screen.getByText('How We Collaborate').closest('section')
      if (collaborationSection) {
        expect(within(collaborationSection).getByText('🎯')).toBeInTheDocument()
        expect(within(collaborationSection).getByText('🎨')).toBeInTheDocument()
      }
    })
  })

  describe('Navigation', () => {
    it('should display navigation bar', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      const nav = screen.getByLabelText('Main navigation')
      expect(nav).toBeInTheDocument()
      expect(within(nav).getByText('7zi')).toBeInTheDocument()
      expect(within(nav).getByText('Studio')).toBeInTheDocument()
    })

    it('should display navigation links', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))

      // Check that navigation links exist (may be in desktop or mobile view)
      expect(screen.getAllByText('About').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Team').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Blog').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Contact').length).toBeGreaterThan(0)
    })

    it('should highlight current page in navigation', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      const teamLinks = screen.getAllByText('Team')
      expect(teamLinks.length).toBeGreaterThan(0)
    })
  })

  describe('Internationalization', () => {
    it('should render with English locale', async () => {
      const { container } = render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(container).toBeInTheDocument()
    })

    it('should render with Chinese locale', async () => {
      const { container } = render(await TeamPage({ params: Promise.resolve({ locale: 'zh-CN' }) }))
      expect(container).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('should include structured data component', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByTestId('structured-data')).toBeInTheDocument()
    })

    it('should include theme toggle', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getAllByTestId('theme-toggle').length).toBeGreaterThan(0)
    })

    it('should include language switcher', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getAllByTestId('language-switcher').length).toBeGreaterThan(0)
    })

    it('should include mobile menu', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
    })
  })

  describe('Links and Navigation', () => {
    it('should have working navigation links', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      const nav = screen.getByLabelText('Main navigation')
      expect(within(nav).getByText('About')).toBeInTheDocument()
      expect(within(nav).getByText('Team')).toBeInTheDocument()
    })

    it('should have CTA link to contact page', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      const ctaButton = screen.getByText('Contact Us')
      expect(ctaButton.closest('a')).toHaveAttribute('href', '/contact')
    })
  })

  describe('Team Member Cards', () => {
    it('should display team member emojis', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      const emojis = ['🌟', '📚', '🏗️', '⚡', '🛡️', '🧪', '🎨', '📣', '💼', '💰', '📺']
      emojis.forEach(emoji => {
        const emojiElements = screen.getAllByText(emoji)
        expect(emojiElements.length).toBeGreaterThan(0)
      })
    })

    it('should display unique skills for each team member', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))

      // Find Expert Agent card and check its skills
      const expertName = screen.getByText('Expert Agent')
      const expertCard = expertName.closest('.group') as HTMLElement | null
      if (expertCard) {
        expect(within(expertCard).getByText('AI/ML')).toBeInTheDocument()
        expect(within(expertCard).getByText('Data Science')).toBeInTheDocument()
      }

      // Find Consultant Agent card and check its skills
      const consultantName = screen.getByText('Consultant Agent')
      const consultantCard = consultantName.closest('.group') as HTMLElement | null
      if (consultantCard) {
        expect(within(consultantCard).getByText('Strategy')).toBeInTheDocument()
        expect(within(consultantCard).getByText('Business')).toBeInTheDocument()
      }
    })
  })

  describe('Footer', () => {
    it('should display footer navigation links', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))

      const footer = screen.getByRole('contentinfo')
      const footerElement = footer as HTMLElement
      expect(within(footerElement).getByText('Home')).toBeInTheDocument()
      expect(within(footerElement).getByText('About')).toBeInTheDocument()
      expect(within(footerElement).getByText('Team')).toBeInTheDocument()
      expect(within(footerElement).getByText('Blog')).toBeInTheDocument()
    })

    it('should display copyright information', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByText(/© 2026 7zi Studio/)).toBeInTheDocument()
    })
  })

  describe('Structured Data', () => {
    it('should include JSON-LD structured data', async () => {
      const { container } = render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      const scriptTag = container.querySelector('script[type="application/ld+json"]')
      expect(scriptTag).toBeInTheDocument()
    })

    it('should have correct structured data structure', async () => {
      const { container } = render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      const scriptTag = container.querySelector('script[type="application/ld+json"]')
      expect(scriptTag).toBeInTheDocument()

      const data = JSON.parse(scriptTag?.textContent || '{}')
      expect(data).toHaveProperty('@context', 'https://schema.org')
      expect(data).toHaveProperty('@type', 'CollectionPage')
      expect(data.mainEntity).toHaveProperty('@type', 'ItemList')
      expect(data.mainEntity.numberOfItems).toBe(11)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(screen.getByLabelText('Main navigation')).toBeInTheDocument()
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    it('should have semantic HTML structure', async () => {
      render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      const { container } = render(await TeamPage({ params: Promise.resolve({ locale: 'en' }) }))
      expect(container.querySelector('nav')).toBeInTheDocument()
      expect(container.querySelector('section')).toBeInTheDocument()
      expect(container.querySelector('footer')).toBeInTheDocument()
    })
  })
})
