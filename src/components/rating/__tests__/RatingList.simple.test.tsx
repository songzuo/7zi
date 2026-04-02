// @ts-nocheck - Test file with complex type issues
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { RatingList } from '../RatingList'
import { Rating } from '@/types/feedback'

// Mock fetch
global.fetch = vi.fn()

const mockRatings: Rating[] = [
  {
    id: '1',
    user_id: 'user-1',
    target_type: 'agent',
    target_id: 'agent-1',
    rating: 5,
    title: 'Excellent service',
    description: 'Really great experience overall.',
    helpful_count: 10,
    not_helpful_count: 0,
    status: 'approved',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    verified: true,
  },
  {
    id: '2',
    user_id: 'user-2',
    target_type: 'agent',
    target_id: 'agent-1',
    rating: 3,
    title: 'Average experience',
    description: 'It was okay, nothing special.',
    helpful_count: 2,
    not_helpful_count: 1,
    status: 'approved',
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-14T10:00:00Z',
  },
]

const mockResponse = {
  ratings: mockRatings,
  meta: {
    total: 2,
    page: 1,
    per_page: 10,
    total_pages: 1,
  },
  stats: {
    total: 2,
    average_rating: 4,
    rating_distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 },
    by_target_type: { agent: 2 },
    helpful_ratio: 0.8,
  },
}

describe('RatingList - Simplified Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockResponse,
      }),
    })
  })

  it('renders rating list header', async () => {
    render(<RatingList />)

    await waitFor(() => {
      expect(screen.getByText(/Reviews & Ratings/)).toBeInTheDocument()
    })
  })

  it('displays loading state initially', () => {
    ;(global.fetch as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<RatingList />)

    expect(screen.getByText('Loading reviews...')).toBeInTheDocument()
  })

  it('displays ratings after loading', async () => {
    render(<RatingList />)

    await waitFor(() => {
      expect(screen.getByText(/Reviews & Ratings/)).toBeInTheDocument()
      expect(screen.getByText('Excellent service')).toBeInTheDocument()
      expect(screen.getByText('Average experience')).toBeInTheDocument()
    })
  })

  it('displays empty state when no ratings', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          ratings: [],
          meta: { total: 0, page: 1, per_page: 10, total_pages: 0 },
          stats: {
            total: 0,
            average_rating: 0,
            rating_distribution: {},
            by_target_type: {},
            helpful_ratio: 0,
          },
        },
      }),
    })

    render(<RatingList />)

    await waitFor(() => {
      expect(screen.getByText('No reviews yet')).toBeInTheDocument()
    })
  })

  it('displays error state when fetch fails', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

    render(<RatingList />)

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    })
  })
})
