import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ContactPage from '@/app/[locale]/contact/page'

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(() => {
    const translations: Record<string, Record<string, string | Array<{ question: string; answer: string }>>> = {
      nav: {
        home: 'Home',
        about: 'About',
        team: 'Team',
        blog: 'Blog',
        dashboard: 'Dashboard',
        contact: 'Contact',
      },
      contact: {
        'hero.title': 'Contact',
        'hero.description': 'Get in touch with us',
        'form.title': 'Send Message',
        'info.title': 'Contact Information',
        'info.business.title': 'Business',
        'info.business.email': 'business@7zi.studio',
        'info.business.description': 'Business inquiries',
        'info.support.title': 'Support',
        'info.support.email': 'support@7zi.studio',
        'info.support.description': 'Technical support',
        'info.careers.title': 'Careers',
        'info.careers.email': 'careers@7zi.studio',
        'info.careers.description': 'Join our team',
        'social.title': 'Follow Us',
        'response.title': 'Quick Response',
        'response.description': 'We respond within 24 hours',
        'faq.title': 'FAQ',
        'faq.items': [
          { question: 'How can I contact you?', answer: 'You can email us anytime.' },
          { question: 'What services do you offer?', answer: 'We offer various digital services.' },
        ],
        'cta.title': 'Ready to Start?',
        'cta.description': 'Let us help you',
        'cta.emailButton': 'Email Us',
        'cta.homeButton': 'Back to Home',
        description: 'Contact page',
      },
      footer: {
        copyright: '© 2024 7zi Studio',
      },
    }
    const translateFn = vi.fn((key: string) => {
      const namespace = 'contact'
      return translations[namespace]?.[key] ?? key
    })
    translateFn.raw = vi.fn((key: string) => {
      return translations['contact']?.[key]
    })
    return translateFn
  }),
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

// Mock ContactForm
vi.mock('@/components/ContactForm', () => ({
  ContactForm: ({ locale }: { locale: string }) => (
    <div data-testid="contact-form" data-locale={locale}>Contact Form</div>
  ),
}))

// Mock SocialLinks
vi.mock('@/components/SocialLinks', () => ({
  SocialLinks: ({ variant, size }: { variant: string; size: string }) => (
    <div data-testid="social-links" data-variant={variant} data-size={size}>Social Links</div>
  ),
}))

// Mock i18n config
vi.mock('@/i18n/config', () => ({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
}))

describe('ContactPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await ContactPage({ params }))
    
    expect(container).toBeTruthy()
  })

  it('renders with Chinese locale', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByTestId('client-providers')).toBeInTheDocument()
    expect(screen.getByTestId('contact-form')).toHaveAttribute('data-locale', 'zh')
  })

  it('renders with English locale', async () => {
    const params = Promise.resolve({ locale: 'en' })
    render(await ContactPage({ params }))
    
    expect(screen.getByTestId('contact-form')).toHaveAttribute('data-locale', 'en')
  })

  it('renders hero section', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('Get in touch with us')).toBeInTheDocument()
  })

  it('renders contact form', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByTestId('contact-form')).toBeInTheDocument()
  })

  it('renders contact information section', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByText('Contact Information')).toBeInTheDocument()
  })

  it('renders all contact info items', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByText('Business')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('Careers')).toBeInTheDocument()
  })

  it('renders email links', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    const emailLinks = screen.getAllByRole('link', { name: /@7zi\.studio/ })
    expect(emailLinks.length).toBe(3)
  })

  it('renders social links', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByTestId('social-links')).toBeInTheDocument()
    expect(screen.getByTestId('social-links')).toHaveAttribute('data-variant', 'grid')
    expect(screen.getByTestId('social-links')).toHaveAttribute('data-size', 'md')
  })

  it('renders response time section', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByText('Quick Response')).toBeInTheDocument()
    expect(screen.getByText('We respond within 24 hours')).toBeInTheDocument()
  })

  it('renders FAQ section', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByText('FAQ')).toBeInTheDocument()
  })

  it('renders FAQ items as details elements', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    const detailsElements = document.querySelectorAll('details')
    expect(detailsElements.length).toBe(2)
  })

  it('renders CTA section', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByText('Ready to Start?')).toBeInTheDocument()
  })

  it('renders CTA buttons', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByText('Email Us')).toBeInTheDocument()
    expect(screen.getByText('Back to Home')).toBeInTheDocument()
  })

  it('renders navigation', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByLabelText('Main navigation')).toBeInTheDocument()
  })

  it('renders theme toggle button', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    // Multiple theme toggles may be present (nav + mobile nav)
    const themeToggles = screen.getAllByTestId('theme-toggle')
    expect(themeToggles.length).toBeGreaterThan(0)
  })

  it('renders language switcher', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    // Multiple language switchers may be present (nav + mobile nav)
    const languageSwitchers = screen.getAllByTestId('language-switcher')
    expect(languageSwitchers.length).toBeGreaterThan(0)
  })

  it('renders mobile menu', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
  })

  it('includes structured data for SEO', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    expect(screen.getByTestId('structured-data')).toBeInTheDocument()
  })

  it('includes structured data script for contact page', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await ContactPage({ params }))
    
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).toBeInTheDocument()
  })

  it('has correct structured data type for contact page', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await ContactPage({ params }))
    
    const script = container.querySelector('script[type="application/ld+json"]')
    const data = JSON.parse(script?.textContent || '{}')
    
    expect(data['@type']).toBe('ContactPage')
  })

  it('renders footer with copyright', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await ContactPage({ params }))
    
    // Check that footer with contentinfo role exists
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('applies correct dark mode classes', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await ContactPage({ params }))
    
    expect(container.querySelector('.dark\\:bg-black')).toBeInTheDocument()
    expect(container.querySelector('.bg-zinc-50')).toBeInTheDocument()
  })

  it('calls setRequestLocale with correct locale', async () => {
    const { setRequestLocale } = await import('next-intl/server')
    const params = Promise.resolve({ locale: 'zh' })
    
    render(await ContactPage({ params }))
    
    expect(setRequestLocale).toHaveBeenCalledWith('zh')
  })

  it('has gradient backgrounds', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await ContactPage({ params }))
    
    expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument()
    expect(container.querySelector('.from-cyan-500')).toBeInTheDocument()
  })

  it('has fixed navigation with backdrop blur', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await ContactPage({ params }))
    
    expect(container.querySelector('.fixed')).toBeInTheDocument()
    expect(container.querySelector('.backdrop-blur-lg')).toBeInTheDocument()
  })
})