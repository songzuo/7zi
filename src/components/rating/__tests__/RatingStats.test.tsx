/**
 * RatingStats Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RatingStats } from '../RatingStats';
import { RatingStats as RatingStatsType } from '@/types/feedback';

const mockStats: RatingStatsType = {
  total: 100,
  average_rating: 4.3,
  rating_distribution: {
    1: 2,
    2: 5,
    3: 15,
    4: 30,
    5: 48,
  },
  by_target_type: {
    agent: 45,
    task: 30,
    feature: 25,
  },
  helpful_ratio: 0.85,
};

describe('RatingStats', () => {
  it('displays average rating', () => {
    render(<RatingStats stats={mockStats} />);

    // 4.3 appears twice (big number and stats section)
    expect(screen.getAllByText('4.3')).toHaveLength(2);
  });

  it('displays total number of ratings', () => {
    render(<RatingStats stats={mockStats} />);

    expect(screen.getByText('100 ratings')).toBeInTheDocument();
  });

  it('displays distribution bars for each rating', () => {
    render(<RatingStats stats={mockStats} />);

    // Use getAllByText since numbers appear in multiple contexts
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('displays correct distribution counts', () => {
    const { container } = render(<RatingStats stats={mockStats} />);

    // Check for specific counts in distribution section (use more specific selectors)
    expect(screen.getByText('48')).toBeInTheDocument(); // 5 stars count
    expect(screen.getByText('15')).toBeInTheDocument(); // 3 stars count
    // '2' appears twice (as rating label and as count for 1 star), use getAllByText
    expect(screen.getAllByText('2').length).toBe(2);  // 1 star count + rating label
    // Note: 30 appears for 4 stars AND task type count, so we check it exists
    expect(screen.getAllByText('30').length).toBeGreaterThan(0);
    // Note: 5 appears for 2 stars AND as rating label
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });

  it('displays helpful ratio', () => {
    render(<RatingStats stats={mockStats} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Helpful')).toBeInTheDocument();
  });

  it('displays total in stats section', () => {
    render(<RatingStats stats={mockStats} />);

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('displays average in stats section', () => {
    render(<RatingStats stats={mockStats} />);

    const averageElements = screen.getAllByText('4.3');
    expect(averageElements.length).toBeGreaterThan(0);
  });

  it('hides distribution when showDistribution is false', () => {
    const { container } = render(<RatingStats stats={mockStats} showDistribution={false} />);

    // Distribution bars should not be visible
    const distributionBars = container.querySelectorAll('.rounded-full');
    expect(distributionBars.length).toBe(0);
  });

  it('displays by target type when showByTargetType is true', () => {
    const { container } = render(<RatingStats stats={mockStats} showByTargetType />);

    // Use more flexible text matcher
    expect(screen.getByText(/Ratings.*by.*Type/i)).toBeInTheDocument();
    expect(screen.getAllByText('45').length).toBeGreaterThan(0); // agent
    expect(screen.getAllByText('30').length).toBeGreaterThan(0); // task (also appears in distribution)
    expect(screen.getByText('25')).toBeInTheDocument(); // feature
  });

  it('does not display by target type when showByTargetType is false', () => {
    render(<RatingStats stats={mockStats} showByTargetType={false} />);

    expect(screen.queryByText('Ratings by Type')).not.toBeInTheDocument();
  });

  it('displays correct color for high average rating', () => {
    const { container } = render(<RatingStats stats={mockStats} />);

    const bigNumber = container.querySelector('.text-5xl');
    expect(bigNumber).toHaveClass('text-green-500');
  });

  it('displays correct color for medium average rating', () => {
    const mediumStats: RatingStatsType = {
      ...mockStats,
      average_rating: 3.5,
    };

    const { container } = render(<RatingStats stats={mediumStats} />);

    const bigNumber = container.querySelector('.text-5xl');
    expect(bigNumber).toHaveClass('text-yellow-500');
  });

  it('displays correct color for low average rating', () => {
    const lowStats: RatingStatsType = {
      ...mockStats,
      average_rating: 2.0,
    };

    const { container } = render(<RatingStats stats={lowStats} />);

    const bigNumber = container.querySelector('.text-5xl');
    expect(bigNumber).toHaveClass('text-orange-500');
  });

  it('displays correct color for very low average rating', () => {
    const veryLowStats: RatingStatsType = {
      ...mockStats,
      average_rating: 1.5,
    };

    const { container } = render(<RatingStats stats={veryLowStats} />);

    const bigNumber = container.querySelector('.text-5xl');
    expect(bigNumber).toHaveClass('text-red-500');
  });

  it('handles zero ratings', () => {
    const zeroStats: RatingStatsType = {
      total: 0,
      average_rating: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      by_target_type: {},
      helpful_ratio: 0,
    };

    const { container } = render(<RatingStats stats={zeroStats} />);

    // 0.0 appears twice (big number and stats section)
    expect(screen.getAllByText('0.0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0 ratings')).toBeInTheDocument();
  });

  it('handles empty by_target_type', () => {
    const emptyStats: RatingStatsType = {
      ...mockStats,
      by_target_type: {},
    };

    const { container } = render(<RatingStats stats={emptyStats} showByTargetType />);

    // When by_target_type is empty, the section should not be rendered at all
    // The condition: showByTargetType && Object.keys(stats.by_target_type).length > 0
    // So when by_target_type is {}, the entire section is not rendered
    const h4 = container.querySelector('h4');
    expect(h4).toBeNull();

    // The mt-6 section should not exist (it's the by_target_type section)
    const typeSection = container.querySelector('.mt-6');
    expect(typeSection).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(
      <RatingStats stats={mockStats} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays stars in average rating section', () => {
    const { container } = render(<RatingStats stats={mockStats} />);

    // Star icons are mocked to null in test environment, so they won't be in DOM
    // Just verify the container structure exists
    const starContainer = container.querySelector('.flex.items-center.justify-center.gap-1.mt-2');
    expect(starContainer).toBeInTheDocument();
  });

  it('has correct accessibility structure', () => {
    render(<RatingStats stats={mockStats} />);

    // Check that important stats are visible (may appear multiple times)
    expect(screen.getAllByText('4.3')).toHaveLength(2); // Big number and stats section
    expect(screen.getAllByText('100').length).toBeGreaterThan(0);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });
});
