import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SocialLinks } from '@/components/SocialLinks'

describe('SocialLinks', () => {
  it('renders all social links', () => {
    render(<SocialLinks />)
    
    expect(screen.getByText('微信公众号')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Twitter')).toBeInTheDocument()
    expect(screen.getByText('LinkedIn')).toBeInTheDocument()
    expect(screen.getByText('Discord')).toBeInTheDocument()
  })

  it('renders with horizontal variant', () => {
    const { container } = render(<SocialLinks variant="horizontal" />)
    expect(container.firstChild).toHaveClass('flex')
    expect(container.firstChild).toHaveClass('flex-wrap')
  })

  it('renders with vertical variant', () => {
    const { container } = render(<SocialLinks variant="vertical" />)
    expect(container.firstChild).toHaveClass('space-y-3')
  })

  it('renders with grid variant', () => {
    const { container } = render(<SocialLinks variant="grid" />)
    expect(container.firstChild).toHaveClass('grid')
  })

  it('renders with small size', () => {
    render(<SocialLinks size="sm" />)
    const links = screen.getAllByRole('link')
    // Should render without errors
    expect(links.length).toBeGreaterThan(0)
  })

  it('renders with medium size', () => {
    render(<SocialLinks size="md" />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('renders with large size', () => {
    render(<SocialLinks size="lg" />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('applies custom className', () => {
    const { container } = render(<SocialLinks className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders all links with correct hrefs', () => {
    render(<SocialLinks />)
    
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '#') // WeChat
    expect(links[1]).toHaveAttribute('href', 'https://github.com/7zi-studio')
    expect(links[2]).toHaveAttribute('href', 'https://twitter.com/7zistudio')
    expect(links[3]).toHaveAttribute('href', 'https://linkedin.com/company/7zistudio')
  })

  it('renders social icons', () => {
    render(<SocialLinks />)
    
    expect(screen.getByText('💬')).toBeInTheDocument() // WeChat
    expect(screen.getByText('🐙')).toBeInTheDocument() // GitHub
    expect(screen.getByText('🐦')).toBeInTheDocument() // Twitter
    expect(screen.getByText('💼')).toBeInTheDocument() // LinkedIn
    expect(screen.getByText('🎮')).toBeInTheDocument() // Discord
  })
})
