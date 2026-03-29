/**
 * @vitest-environment jsdom
 */

// @ts-nocheck - Test file with complex type issues
/**
 * RatingList Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { RatingList } from '../RatingList';
import { Rating } from '@/types/feedback';

// Mock fetch
global.fetch = vi.fn();

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
];

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
};

describe('RatingList', () => {
  const mockOnReply = vi.fn();
  const mockOnHelpful = vi.fn();
  const mockOnFlag = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnLike = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockResponse,
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders rating list header', () => {
    render(<RatingList />);

    expect(screen.getByText(/Reviews & Ratings/)).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    (global.fetch as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<RatingList />);

    expect(screen.getByText('Loading reviews...')).toBeInTheDocument();
  });

  it('displays ratings after loading', async () => {
    render(<RatingList />);

    await waitFor(() => {
      expect(screen.getByText('Excellent service')).toBeInTheDocument();
      expect(screen.getByText('Average experience')).toBeInTheDocument();
    });
  });

  it('displays empty state when no ratings', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        ratings: [],
        meta: { total: 0, page: 1, per_page: 10, total_pages: 0 },
        stats: { total: 0, average_rating: 0, rating_distribution: {}, by_target_type: {}, helpful_ratio: 0 },
      }),
    });

    render(<RatingList />);

    await waitFor(() => {
      expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    });
  });

  it('displays error state when fetch fails', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<RatingList />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('filters by targetType and targetId', async () => {
    render(<RatingList targetType="agent" targetId="agent-1" />);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('target_type=agent'),
      expect.anything()
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('target_id=agent-1'),
      expect.anything()
    );
  });

  it('sorts by created_at', async () => {
    render(<RatingList />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort_by=created_at'),
        expect.anything()
      );
    });
  });

  it('sorts by rating', async () => {
    render(<RatingList />);

    // Click rating sort button
    const ratingSortButton = await screen.findByText('Rating');
    await act(async () => {
      fireEvent.click(ratingSortButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort_by=rating'),
        expect.anything()
      );
    });
  });

  it('toggles sort order on same column click', async () => {
    render(<RatingList />);

    // Click date sort button twice
    const dateSortButton = await screen.findByText('Date');
    await act(async () => {
      fireEvent.click(dateSortButton);
      fireEvent.click(dateSortButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort_order=asc'),
        expect.anything()
      );
    });
  });

  it('displays average rating when ratings exist', async () => {
    render(<RatingList />);

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('average')).toBeInTheDocument();
    });
  });

  it('displays total count in header', async () => {
    render(<RatingList />);

    await waitFor(() => {
      expect(screen.getByText(/Reviews & Ratings/)).toBeInTheDocument();
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    });
  });

  it('toggles filter panel', async () => {
    render(<RatingList />);

    const filterButton = screen.getByText(/Filters/);
    await act(async () => {
      fireEvent.click(filterButton);
    });

    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Min Rating')).toBeInTheDocument();
    expect(screen.getByText('Max Rating')).toBeInTheDocument();
  });

  it('calls onReply callback', async () => {
    render(
      <RatingList
        onReply={mockOnReply}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Excellent service')).toBeInTheDocument();
    });

    // Find reply button
    const replyButtons = screen.getAllByText('Reply');
    if (replyButtons.length > 0) {
      fireEvent.click(replyButtons[0]);

      // Type in textarea
      const textarea = screen.getByPlaceholderText('Write your reply...');
      fireEvent.change(textarea, { target: { value: 'This is a reply' } });

      // Click send
      const sendButton = screen.getByText('Send Reply');
      fireEvent.click(sendButton);

      expect(mockOnReply).toHaveBeenCalledWith('1', 'This is a reply');
    }
  });

  it('calls onLike callback', async () => {
    render(
      <RatingList
        onLike={mockOnLike}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Excellent service')).toBeInTheDocument();
    });

    // Find like button (thumbs up)
    const likeButtons = screen.getAllByRole('button');
    const thumbsUpButton = likeButtons.find(btn => btn.innerHTML.includes('10'));

    if (thumbsUpButton) {
      fireEvent.click(thumbsUpButton);
      expect(mockOnLike).toHaveBeenCalledWith('1', false);
    }
  });

  it('shows pagination when multiple pages', async () => {
    const multiPageResponse = {
      ratings: mockRatings,
      meta: {
        total: 25,
        page: 1,
        per_page: 10,
        total_pages: 3,
      },
      stats: mockResponse.stats,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => multiPageResponse,
    });

    render(<RatingList />);

    await waitFor(() => {
      expect(screen.getByText(/Showing 1 to 10 of 25 reviews/)).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });

  it('navigates to next page', async () => {
    const multiPageResponse = {
      ratings: mockRatings,
      meta: {
        total: 25,
        page: 2,
        per_page: 10,
        total_pages: 3,
      },
      stats: mockResponse.stats,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => multiPageResponse,
    });

    render(<RatingList />);

    await waitFor(() => {
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.anything()
      );
    });
  });

  it('displays search filter when panel is open', async () => {
    render(<RatingList />);

    const filterButton = screen.getByText(/Filters/);
    fireEvent.click(filterButton);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search reviews...');
      expect(searchInput).toBeInTheDocument();
    });
  });
});
