/**
 * Integration Tests for Rating System
 * Tests interaction between components and API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RatingList } from '../RatingList';
import { RatingStats } from '../RatingStats';
import { StarRating } from '../StarRating';
import { Rating, RatingStats as RatingStatsType } from '@/types/feedback';

// Mock fetch
global.fetch = vi.fn();

const mockRatings: Rating[] = [
  {
    id: '1',
    user_id: 'user-1',
    target_type: 'agent',
    target_id: 'agent-1',
    rating: 5,
    title: 'Excellent',
    description: 'Great experience',
    helpful_count: 10,
    not_helpful_count: 0,
    status: 'approved',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    verified: true,
  },
];

const mockStats: RatingStatsType = {
  total: 1,
  average_rating: 5,
  rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
  by_target_type: { agent: 1 },
  helpful_ratio: 1,
};

describe('Rating System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        ratings: mockRatings,
        meta: { total: 1, page: 1, per_page: 10, total_pages: 1 },
        stats: mockStats,
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and displays ratings with stats', async () => {
    render(<RatingList />);

    await waitFor(() => {
      expect(screen.getByText('Excellent')).toBeInTheDocument();
      expect(screen.getByText('5.0')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ratings?sort_by=created_at&sort_order=desc&page=1&per_page=10',
      expect.anything()
    );
  });

  it('filters ratings by min rating', async () => {
    render(<RatingList initialFilters={{ rating_min: 4 }} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('rating_min=4'),
        expect.anything()
      );
    });
  });

  it('filters ratings by max rating', async () => {
    render(<RatingList initialFilters={{ rating_max: 3 }} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('rating_max=3'),
        expect.anything()
      );
    });
  });

  it('filters by target type and id', async () => {
    render(<RatingList targetType="feature" targetId="feature-1" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('target_type=feature'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('target_id=feature-1'),
        expect.anything()
      );
    });
  });

  it('sorts by rating', async () => {
    render(<RatingList />);

    await waitFor(() => {
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    const ratingSortButton = screen.getByText('Rating');
    fireEvent.click(ratingSortButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort_by=rating'),
        expect.anything()
      );
    });
  });

  it('paginates through results', async () => {
    const multiPageStats = {
      ratings: mockRatings,
      meta: { total: 25, page: 1, per_page: 10, total_pages: 3 },
      stats: mockStats,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => multiPageStats,
    });

    render(<RatingList />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 10 of 25 reviews')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.anything()
      );
    });
  });

  it('searches ratings', async () => {
    render(<RatingList />);

    // Open filters
    const filterButton = screen.getByText(/Filters/);
    fireEvent.click(filterButton);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search reviews...');
      fireEvent.change(searchInput, { target: { value: 'excellent' } });
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=excellent'),
        expect.anything()
      );
    });
  });

  it('displays stats correctly', async () => {
    render(<RatingStats stats={mockStats} />);

    expect(screen.getByText('5.0')).toBeInTheDocument();
    expect(screen.getByText('1 rating')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('allows interactive rating', async () => {
    const mockOnChange = vi.fn();
    render(<StarRating rating={0} interactive onChange={mockOnChange} />);

    const stars = screen.getAllByRole('button');
    await fireEvent.click(stars[4]); // Click 5th star

    expect(mockOnChange).toHaveBeenCalledWith(5);
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<RatingList />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('updates rating after like action', async () => {
    const mockOnLike = vi.fn();
    render(<RatingList onLike={mockOnLike} />);

    await waitFor(() => {
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    // Find and click like button
    const likeButtons = screen.getAllByRole('button');
    const thumbsUpButton = likeButtons.find(btn => btn.textContent?.includes('10'));

    if (thumbsUpButton) {
      fireEvent.click(thumbsUpButton);
      expect(mockOnLike).toHaveBeenCalledWith('1', false);
    }
  });

  it('handles reply submission', async () => {
    const mockOnReply = vi.fn().mockResolvedValue(undefined);
    render(<RatingList onReply={mockOnReply} />);

    await waitFor(() => {
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    // Click reply button
    const replyButtons = screen.getAllByText('Reply');
    if (replyButtons.length > 0) {
      fireEvent.click(replyButtons[0]);

      // Type reply
      const textarea = screen.getByPlaceholderText('Write your reply...');
      fireEvent.change(textarea, { target: { value: 'Thanks!' } });

      // Submit
      const sendButton = screen.getByText('Send Reply');
      fireEvent.click(sendButton);

      expect(mockOnReply).toHaveBeenCalledWith('1', 'Thanks!');
    }
  });

  it('displays rating distribution correctly', async () => {
    const statsWithDistribution: RatingStatsType = {
      total: 100,
      average_rating: 3.8,
      rating_distribution: { 1: 5, 2: 10, 3: 20, 4: 35, 5: 30 },
      by_target_type: { agent: 100 },
      helpful_ratio: 0.9,
    };

    render(<RatingStats stats={statsWithDistribution} />);

    expect(screen.getByText('35')).toBeInTheDocument(); // 4 stars
    expect(screen.getByText('30')).toBeInTheDocument(); // 5 stars
    expect(screen.getByText('20')).toBeInTheDocument(); // 3 stars
  });

  it('supports half-star ratings', () => {
    const { container } = render(<StarRating rating={3.5} showHalfStars />);

    expect(screen.getByText('3.5')).toBeInTheDocument();

    // Check for half-star element
    const halfStars = container.querySelectorAll('.absolute');
    expect(halfStars.length).toBeGreaterThan(0);
  });

  it('resets filters correctly', async () => {
    render(<RatingList />);

    // Open filters
    const filterButton = screen.getByText(/Filters/);
    fireEvent.click(filterButton);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search reviews...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
    });

    // Click reset
    const resetButton = screen.getByText('Reset Filters');
    fireEvent.click(resetButton);

    // Search should be cleared
    const searchInput = screen.getByPlaceholderText('Search reviews...') as HTMLInputElement;
    expect(searchInput.value).toBe('');
  });

  it('toggles sort order', async () => {
    render(<RatingList />);

    const dateSortButton = screen.getByText('Date');
    fireEvent.click(dateSortButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort_order=asc'),
        expect.anything()
      );
    });

    fireEvent.click(dateSortButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort_order=desc'),
        expect.anything()
      );
    });
  });
});
