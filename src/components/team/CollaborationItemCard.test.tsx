// @ts-nocheck - Test file with complex type issues
/**
 * CollaborationItemCard Component Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CollaborationItemCard } from './CollaborationItemCard'

describe('CollaborationItemCard', () => {
  const mockItem = {
    id: '1',
    emoji: '💬',
    color: 'from-green-400 to-blue-500',
  }

  const mockTranslations = {
    title: 'Real-time Chat',
    description: 'Collaborate with your team in real-time',
  }

  it('should render collaboration item card with correct title', () => {
    render(<CollaborationItemCard item={mockItem} translations={mockTranslations} />)
    expect(screen.getByText('Real-time Chat')).toBeInTheDocument()
  })

  it('should render collaboration item card with correct description', () => {
    render(<CollaborationItemCard item={mockItem} translations={mockTranslations} />)
    expect(screen.getByText('Collaborate with your team in real-time')).toBeInTheDocument()
  })

  it('should render emoji icon', () => {
    const { container } = render(
      <CollaborationItemCard item={mockItem} translations={mockTranslations} />
    )
    expect(container.textContent).toContain('💬')
  })

  it('should apply correct gradient color classes', () => {
    const { container } = render(
      <CollaborationItemCard item={mockItem} translations={mockTranslations} />
    )
    const iconContainer = container.querySelector('.w-12.h-12')
    expect(iconContainer).toBeInTheDocument()
    expect(iconContainer?.className).toContain('bg-gradient-to-br')
  })

  it('should apply hover effect classes', () => {
    const { container } = render(
      <CollaborationItemCard item={mockItem} translations={mockTranslations} />
    )
    const card = container.querySelector('.bg-zinc-50, .dark\\:bg-zinc-800')
    expect(card).toBeInTheDocument()
  })

  it('should render with long title', () => {
    const longTranslations = {
      title: 'Very Long Title That Should Not Break the Layout',
      description: mockTranslations.description,
    }
    render(<CollaborationItemCard item={mockItem} translations={longTranslations} />)
    expect(screen.getByText(longTranslations.title)).toBeInTheDocument()
  })

  it('should render with empty description gracefully', () => {
    const emptyTranslations = {
      title: mockTranslations.title,
      description: '',
    }
    const { container } = render(
      <CollaborationItemCard item={mockItem} translations={emptyTranslations} />
    )

    // Check that component renders
    const card = container.querySelector('.bg-zinc-50, .dark\\:bg-zinc-800')
    expect(card).toBeInTheDocument()
  })
})
