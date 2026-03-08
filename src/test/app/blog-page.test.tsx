import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import BlogPage from '@/app/[locale]/blog/page'

// Mock next-intl/server
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
}))

// Mock i18n routing
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} data-testid="nav-link">{children}</a>
  ),
}))

// Mock i18n config
vi.mock('@/i18n/config', () => ({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
}))

describe('BlogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await BlogPage({ params }))
    
    expect(container).toBeTruthy()
  })

  it('renders with Chinese locale', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await BlogPage({ params }))
    
    // Check Chinese heading
    expect(screen.getByRole('heading', { level: 1, name: '博客' })).toBeInTheDocument()
    // Check Chinese description
    expect(screen.getByText('这里将展示我们的最新文章和更新...')).toBeInTheDocument()
    // Check Chinese back link
    expect(screen.getByText('← 返回首页')).toBeInTheDocument()
  })

  it('renders with English locale', async () => {
    const params = Promise.resolve({ locale: 'en' })
    render(await BlogPage({ params }))
    
    // Check English heading
    expect(screen.getByRole('heading', { level: 1, name: 'Blog' })).toBeInTheDocument()
    // Check English description
    expect(screen.getByText('Our latest articles and updates will appear here...')).toBeInTheDocument()
    // Check English back link
    expect(screen.getByText('← Back to Home')).toBeInTheDocument()
  })

  it('returns null for invalid locale', async () => {
    const params = Promise.resolve({ locale: 'invalid' })
    const { container } = render(await BlogPage({ params }))
    
    expect(container.firstChild).toBeNull()
  })

  it('renders back to home link', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    render(await BlogPage({ params }))
    
    const backLink = screen.getByTestId('nav-link')
    expect(backLink).toHaveAttribute('href', '/')
    expect(backLink).toHaveTextContent('← 返回首页')
  })

  it('applies correct dark mode classes', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await BlogPage({ params }))
    
    expect(container.querySelector('.dark\\:bg-black')).toBeInTheDocument()
    expect(container.querySelector('.bg-zinc-50')).toBeInTheDocument()
  })

  it('has proper page layout classes', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await BlogPage({ params }))
    
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument()
    expect(container.querySelector('.py-20')).toBeInTheDocument()
    expect(container.querySelector('.px-6')).toBeInTheDocument()
  })

  it('has max-width container', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await BlogPage({ params }))
    
    expect(container.querySelector('.max-w-4xl')).toBeInTheDocument()
    expect(container.querySelector('.mx-auto')).toBeInTheDocument()
  })

  it('renders heading with correct styling', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await BlogPage({ params }))
    
    const heading = container.querySelector('h1')
    expect(heading).toHaveClass('text-4xl')
    expect(heading).toHaveClass('font-bold')
  })

  it('renders description with correct styling', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await BlogPage({ params }))
    
    const description = container.querySelector('p')
    expect(description).toHaveClass('text-zinc-600')
  })

  it('renders link with cyan color scheme', async () => {
    const params = Promise.resolve({ locale: 'zh' })
    const { container } = render(await BlogPage({ params }))
    
    const link = container.querySelector('a')
    expect(link).toHaveClass('text-cyan-500')
    expect(link).toHaveClass('hover:text-cyan-600')
  })

  it('calls setRequestLocale with correct locale', async () => {
    const { setRequestLocale } = await import('next-intl/server')
    const params = Promise.resolve({ locale: 'zh' })
    
    render(await BlogPage({ params }))
    
    expect(setRequestLocale).toHaveBeenCalledWith('zh')
  })

  it('calls setRequestLocale with English locale', async () => {
    const { setRequestLocale } = await import('next-intl/server')
    const params = Promise.resolve({ locale: 'en' })
    
    render(await BlogPage({ params }))
    
    expect(setRequestLocale).toHaveBeenCalledWith('en')
  })
})
