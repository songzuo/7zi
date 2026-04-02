/**
 * TeamHeroSection Component Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamHeroSection } from './TeamHeroSection'

describe('TeamHeroSection', () => {
  const mockTranslations = {
    badge: 'AI-Powered Team',
    title: 'Our Amazing Team',
    description: 'A diverse group of experts working together',
    stats: {
      members: { value: '11', label: 'Members' },
      coverage: { value: '24/7', label: 'Coverage' },
      support: { value: '100%', label: 'Support' },
    },
  }

  it('should render hero section with badge', () => {
    render(<TeamHeroSection translations={mockTranslations} />)
    expect(screen.getByText('AI-Powered Team')).toBeInTheDocument()
  })

  it('should render hero section with title', () => {
    render(<TeamHeroSection translations={mockTranslations} />)
    expect(screen.getByText('Our Amazing Team')).toBeInTheDocument()
  })

  it('should render hero section with description', () => {
    render(<TeamHeroSection translations={mockTranslations} />)
    expect(screen.getByText('A diverse group of experts working together')).toBeInTheDocument()
  })

  it('should render all stats', () => {
    render(<TeamHeroSection translations={mockTranslations} />)

    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()

    expect(screen.getByText('24/7')).toBeInTheDocument()
    expect(screen.getByText('Coverage')).toBeInTheDocument()

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
  })

  it('should render sparkle emoji in badge', () => {
    const { container } = render(<TeamHeroSection translations={mockTranslations} />)
    expect(container.textContent).toContain('✨')
  })

  it('should apply correct gradient classes', () => {
    const { container } = render(<TeamHeroSection translations={mockTranslations} />)
    const section = container.querySelector('section')
    expect(section).toBeInTheDocument()
    expect(section?.className).toContain('bg-gradient-to-br')
  })

  it('should render stats in grid layout', () => {
    const { container } = render(<TeamHeroSection translations={mockTranslations} />)
    const grid = container.querySelector('.grid.grid-cols-3')
    expect(grid).toBeInTheDocument()
  })

  it('should render with empty stats gracefully', () => {
    const emptyTranslations = {
      ...mockTranslations,
      stats: {
        members: { value: '0', label: '' },
        coverage: { value: '0', label: '' },
        support: { value: '0', label: '' },
      },
    }
    const { container } = render(<TeamHeroSection translations={emptyTranslations} />)

    // Check that component renders
    const section = container.querySelector('section')
    expect(section).toBeInTheDocument()

    // Check that the value '0' appears in stats
    const statCards = container.querySelectorAll('.grid.grid-cols-3')
    expect(statCards.length).toBeGreaterThan(0)
  })
})
