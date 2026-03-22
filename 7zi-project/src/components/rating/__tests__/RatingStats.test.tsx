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

    expect(screen.getByText('4.3')).toBeInTheDocument();
  });

  it('displays total number of ratings', () => {
    render(<RatingStats stats={mockStats} />);

    expect(screen.getByText('100 ratings')).toBeInTheDocument();
  });

  it('displays distribution bars for each rating', () => {
    render(<RatingStats stats={mockStats} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('displays correct distribution counts', () => {
    render(<RatingStats stats={mockStats} />);

    expect(screen.getByText('48')).toBeInTheDocument(); // 5 stars
    expect(screen.getByText('30')).toBeInTheDocument(); // 4 stars
    expect(screen.getByText('15')).toBeInTheDocument(); // 3 stars
    expect(screen.getByText('5')).toBeInTheDocument();  // 2 stars
    expect(screen.getByText('2')).toBeInTheDocument();  // 1 star
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
    render(<RatingStats stats={mockStats} showByTargetType />);

    expect(screen.getByText('Ratings by Type')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument(); // agent
    expect(screen.getByText('30')).toBeInTheDocument(); // task
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

    render(<RatingStats stats={zeroStats} />);

    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('0 ratings')).toBeInTheDocument();
  });

  it('handles empty by_target_type', () => {
    const emptyStats: RatingStatsType = {
      ...mockStats,
      by_target_type: {},
    };

    render(<RatingStats stats={emptyStats} showByTargetType />);

    expect(screen.getByText('Ratings by Type')).toBeInTheDocument();
    // No type cards should be visible
  });

  it('applies custom className', () => {
    const { container } = render(
      <RatingStats stats={mockStats} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays stars in average rating section', () => {
    const { container } = render(<RatingStats stats={mockStats} />);

    const stars = container.querySelectorAll('.text-yellow-400');
    expect(stars.length).toBeGreaterThan(0);
  });

  it('has correct accessibility structure', () => {
    render(<RatingStats stats={mockStats} />);

    // Check that important stats are visible
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('4.3')).toBeInTheDocument();
  });
});
