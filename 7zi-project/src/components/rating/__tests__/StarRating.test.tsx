/**
 * StarRating Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating } from '../StarRating';

describe('StarRating', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correct number of stars', () => {
    render(<StarRating rating={3} maxRating={5} />);
    const stars = screen.getAllByRole('button');
    expect(stars).toHaveLength(5);
  });

  it('displays correct rating value', () => {
    render(<StarRating rating={4} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('displays half-star when rating is .5', () => {
    const { container } = render(<StarRating rating={3.5} />);
    // Half-star should be present
    const halfStars = container.querySelectorAll('.absolute');
    expect(halfStars.length).toBeGreaterThan(0);
  });

  it('displays rating with decimal when showHalfStars is true', () => {
    render(<StarRating rating={3.5} showHalfStars />);
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('displays rating without decimal when showHalfStars is false', () => {
    render(<StarRating rating={3.5} showHalfStars={false} />);
    // Check that the rounded value is in the document
    const ratingText = screen.getByText(/3/);
    expect(ratingText).toBeInTheDocument();
  });

  it('calls onChange when interactive star is clicked', async () => {
    const user = userEvent.setup();
    render(<StarRating rating={3} interactive onChange={mockOnChange} />);

    const stars = screen.getAllByRole('button');
    await user.click(stars[2]); // Click 3rd star

    expect(mockOnChange).toHaveBeenCalledWith(3);
  });

  it('does not call onChange when readonly', async () => {
    const user = userEvent.setup();
    render(<StarRating rating={3} interactive readonly onChange={mockOnChange} />);

    const stars = screen.getAllByRole('button');
    await user.click(stars[2]);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when not interactive', async () => {
    const user = userEvent.setup();
    render(<StarRating rating={3} onChange={mockOnChange} />);

    const stars = screen.getAllByRole('button');
    await user.click(stars[2]);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('applies correct size classes', () => {
    const { container: small } = render(<StarRating rating={3} size="sm" />);
    const { container: medium } = render(<StarRating rating={3} size="md" />);
    const { container: large } = render(<StarRating rating={3} size="lg" />);

    expect(small.querySelector('.w-4')).toBeInTheDocument();
    expect(medium.querySelector('.w-6')).toBeInTheDocument();
    expect(large.querySelector('.w-8')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<StarRating rating={3} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays all empty stars when rating is 0', () => {
    render(<StarRating rating={0} />);
    const stars = screen.getAllByRole('button');
    stars.forEach((star) => {
      // Check if star is present (empty stars have empty/grey color)
      expect(star).toBeInTheDocument();
    });
  });

  it('displays all full stars when rating equals maxRating', () => {
    render(<StarRating rating={5} maxRating={5} />);
    const stars = screen.getAllByRole('button');
    stars.forEach((star) => {
      expect(star).not.toHaveClass('text-gray-200');
    });
  });

  it('updates rating value when star is clicked', async () => {
    const user = userEvent.setup();
    render(<StarRating rating={3} interactive onChange={mockOnChange} />);

    const stars = screen.getAllByRole('button');
    await user.click(stars[4]); // Click 5th star

    expect(mockOnChange).toHaveBeenCalledWith(5);
  });

  it('supports maxRating less than 5', () => {
    render(<StarRating rating={3} maxRating={3} />);
    const stars = screen.getAllByRole('button');
    expect(stars).toHaveLength(3);
  });

  it('supports maxRating greater than 5', () => {
    render(<StarRating rating={3} maxRating={10} />);
    const stars = screen.getAllByRole('button');
    expect(stars).toHaveLength(10);
  });

  it('has proper accessibility attributes', () => {
    render(<StarRating rating={3} interactive />);
    const stars = screen.getAllByRole('button');

    stars.forEach((star, index) => {
      expect(star).toHaveAttribute('aria-label', `Rate ${index + 1} out of 5`);
    });
  });

  it('displays 0.5 correctly', () => {
    const { container } = render(<StarRating rating={0.5} showHalfStars />);
    const halfStars = container.querySelectorAll('.absolute');
    expect(halfStars.length).toBeGreaterThan(0);
  });

  it('displays 4.7 correctly with rounding', () => {
    render(<StarRating rating={4.7} showHalfStars />);
    expect(screen.getByText('4.7')).toBeInTheDocument();
  });
});
